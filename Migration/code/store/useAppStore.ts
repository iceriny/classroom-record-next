 import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

 import type {
    ClassRoom,
    ID,
    MediaItem,
    MediaType,
    Session,
    Student,
} from "./types";

 type StoreState = {
   classes: Record<ID, ClassRoom>;
   students: Record<ID, Student>;
   sessions: Record<ID, Session>;
   media: Record<ID, MediaItem>;

   addClass: (name: string) => ID;
   addStudentsToClass: (classId: ID, names: string[]) => ID[];
   deleteClass: (classId: ID) => void;

   renameStudent: (studentId: ID, newName: string) => void;
   moveStudentToClass: (studentId: ID, toClassId: ID) => void;
   deleteStudent: (studentId: ID) => void;

   createSession: (classId: ID, label: string) => ID;
   deleteSession: (sessionId: ID) => void;

   addMediaItem: (input: {
     classId: ID;
     sessionId: ID;
     studentId: ID;
     type: MediaType;
     uri: string;
     createdAt?: number;
   }) => ID;
   removeMediaItem: (mediaId: ID) => void;
   removeMediaForStudentInSession: (sessionId: ID, studentId: ID) => ID[];

   getClassSessions: (classId: ID) => Session[];
   getSessionMediaForStudent: (sessionId: ID, studentId: ID) => MediaItem[];
   getHasMediaForStudent: (sessionId: ID, studentId: ID) => boolean;
 };

 function newId(prefix: string) {
   return `${prefix}_${Date.now().toString(36)}_${Math.random()
     .toString(36)
     .slice(2, 10)}`;
 }

 export const useAppStore = create<StoreState>()(
   persist(
     (set, get) => ({
       classes: {},
       students: {},
       sessions: {},
       media: {},

       addClass: (name) => {
         const id = newId("class");
         const classRoom: ClassRoom = { id, name: name.trim(), studentIds: [] };
         set((s) => ({ classes: { ...s.classes, [id]: classRoom } }));
         return id;
       },

       addStudentsToClass: (classId, names) => {
         const trimmed = names.map((n) => n.trim()).filter(Boolean);
         if (!trimmed.length) return [];
         const ids: ID[] = [];

         set((s) => {
           const cls = s.classes[classId];
           if (!cls) return s;

           const nextStudents = { ...s.students };
           const nextStudentIds = [...cls.studentIds];

           for (const name of trimmed) {
             const id = newId("student");
             nextStudents[id] = { id, name };
             nextStudentIds.push(id);
             ids.push(id);
           }

           return {
             ...s,
             students: nextStudents,
             classes: {
               ...s.classes,
               [classId]: { ...cls, studentIds: nextStudentIds },
             },
           };
         });

         return ids;
       },

       deleteClass: (classId) => {
         set((s) => {
           const cls = s.classes[classId];
           if (!cls) return s;

           const nextClasses = { ...s.classes };
           delete nextClasses[classId];

           const nextStudents = { ...s.students };
           for (const sid of cls.studentIds) delete nextStudents[sid];

           const nextSessions = { ...s.sessions };
           const sessionIds = Object.values(s.sessions)
             .filter((ss) => ss.classId === classId)
             .map((ss) => ss.id);
           for (const id of sessionIds) delete nextSessions[id];

           const nextMedia = { ...s.media };
           for (const m of Object.values(s.media)) {
             if (m.classId === classId) delete nextMedia[m.id];
           }

           return {
             ...s,
             classes: nextClasses,
             students: nextStudents,
             sessions: nextSessions,
             media: nextMedia,
           };
         });
       },

       renameStudent: (studentId, newName) => {
         const name = newName.trim();
         if (!name) return;
         set((s) => {
           const st = s.students[studentId];
           if (!st) return s;
           return {
             ...s,
             students: {
               ...s.students,
               [studentId]: { ...st, name },
             },
           };
         });
       },

       moveStudentToClass: (studentId, toClassId) => {
         set((s) => {
           const st = s.students[studentId];
           const toCls = s.classes[toClassId];
           if (!st || !toCls) return s;

           // find current class by membership
           let fromClassId: ID | null = null;
           for (const cls of Object.values(s.classes)) {
             if (cls.studentIds.includes(studentId)) {
               fromClassId = cls.id;
               break;
             }
           }
           if (!fromClassId) return s;
           if (fromClassId === toClassId) return s;

           const fromCls = s.classes[fromClassId];
           if (!fromCls) return s;

           const nextClasses: Record<ID, ClassRoom> = { ...s.classes };
           nextClasses[fromClassId] = {
             ...fromCls,
             studentIds: fromCls.studentIds.filter((id) => id !== studentId),
           };
           nextClasses[toClassId] = {
             ...toCls,
             studentIds: toCls.studentIds.includes(studentId)
               ? toCls.studentIds
               : [...toCls.studentIds, studentId],
           };

           return { ...s, classes: nextClasses };
         });
       },

       deleteStudent: (studentId) => {
         set((s) => {
           const st = s.students[studentId];
           if (!st) return s;

           const nextStudents = { ...s.students };
           delete nextStudents[studentId];

           // remove from whichever class contains it
           const nextClasses: Record<ID, ClassRoom> = { ...s.classes };
           for (const cls of Object.values(s.classes)) {
             if (!cls.studentIds.includes(studentId)) continue;
             nextClasses[cls.id] = {
               ...cls,
               studentIds: cls.studentIds.filter((id) => id !== studentId),
             };
             break;
           }

           // NOTE: media/sessions are preserved; they may reference removed studentId.
           return { ...s, students: nextStudents, classes: nextClasses };
         });
       },

       createSession: (classId, label) => {
         const id = newId("session");
         const session: Session = { id, classId, label, createdAt: Date.now() };
         set((s) => ({ sessions: { ...s.sessions, [id]: session } }));
         return id;
       },

       deleteSession: (sessionId) => {
         set((s) => {
           const nextSessions = { ...s.sessions };
           delete nextSessions[sessionId];

           const nextMedia = { ...s.media };
           for (const m of Object.values(s.media)) {
             if (m.sessionId === sessionId) delete nextMedia[m.id];
           }

           return { ...s, sessions: nextSessions, media: nextMedia };
         });
       },

       addMediaItem: ({ classId, sessionId, studentId, type, uri, createdAt }) => {
         const id = newId("media");
         const item: MediaItem = {
           id,
           classId,
           sessionId,
           studentId,
           type,
           uri,
           createdAt: createdAt ?? Date.now(),
         };
         set((s) => ({ media: { ...s.media, [id]: item } }));
         return id;
       },

       removeMediaItem: (mediaId) => {
         set((s) => {
           const nextMedia = { ...s.media };
           delete nextMedia[mediaId];
           return { ...s, media: nextMedia };
         });
       },

       removeMediaForStudentInSession: (sessionId, studentId) => {
         const removed: ID[] = [];
         set((s) => {
           const nextMedia = { ...s.media };
           for (const m of Object.values(s.media)) {
             if (m.sessionId === sessionId && m.studentId === studentId) {
               delete nextMedia[m.id];
               removed.push(m.id);
             }
           }
           return { ...s, media: nextMedia };
         });
         return removed;
       },

       getClassSessions: (classId) => {
         const all = Object.values(get().sessions).filter(
           (ss) => ss.classId === classId
         );
         all.sort((a, b) => b.createdAt - a.createdAt);
         return all;
       },

       getSessionMediaForStudent: (sessionId, studentId) => {
         const all = Object.values(get().media).filter(
           (m) => m.sessionId === sessionId && m.studentId === studentId
         );
         all.sort((a, b) => b.createdAt - a.createdAt);
         return all;
       },

       getHasMediaForStudent: (sessionId, studentId) => {
         return Object.values(get().media).some(
           (m) => m.sessionId === sessionId && m.studentId === studentId
         );
       },
     }),
     {
       name: "classrecord_store_v1",
       storage: createJSONStorage(() => AsyncStorage),
       version: 1,
     }
   )
 );
