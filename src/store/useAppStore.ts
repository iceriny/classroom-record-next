import { create } from "zustand";

import { saveSnapshot, loadSnapshot } from "../lib/db";
import { createId } from "../utils/id";
import type {
  AppSnapshot,
  ClassRoom,
  ID,
  MediaItem,
  MediaType,
  Session,
  Student,
} from "./types";
import { emptySnapshot } from "./types";

type StoreState = AppSnapshot & {
  hydrated: boolean;
  initialize: () => Promise<void>;

  addClass: (name: string) => ID;
  addStudentsToClass: (classId: ID, names: string[]) => ID[];
  deleteClass: (classId: ID) => void;

  renameStudent: (studentId: ID, newName: string) => void;
  moveStudentToClass: (studentId: ID, toClassId: ID) => void;
  deleteStudent: (studentId: ID) => void;

  createSession: (classId: ID, label: string) => ID;
  deleteSession: (sessionId: ID) => void;

  addMediaItem: (input: {
    id?: ID;
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

function selectSnapshot(state: StoreState): AppSnapshot {
  return {
    classes: state.classes,
    students: state.students,
    sessions: state.sessions,
    media: state.media,
  };
}

async function persistState(get: () => StoreState) {
  await saveSnapshot(selectSnapshot(get()));
}

export const useAppStore = create<StoreState>((set, get) => ({
  ...emptySnapshot(),
  hydrated: false,

  initialize: async () => {
    const snapshot = await loadSnapshot();
    set({ ...snapshot, hydrated: true });
  },

  addClass: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return "";

    const id = createId("class");
    const classRoom: ClassRoom = { id, name: trimmed, studentIds: [] };
    set((state) => ({ classes: { ...state.classes, [id]: classRoom } }));
    void persistState(get);
    return id;
  },

  addStudentsToClass: (classId, names) => {
    const trimmedNames = names.map((item) => item.trim()).filter(Boolean);
    if (!trimmedNames.length) return [];

    const ids: ID[] = [];
    set((state) => {
      const classRoom = state.classes[classId];
      if (!classRoom) return {};

      const nextStudents = { ...state.students };
      const nextStudentIds = [...classRoom.studentIds];

      for (const name of trimmedNames) {
        const id = createId("student");
        nextStudents[id] = { id, name } satisfies Student;
        nextStudentIds.push(id);
        ids.push(id);
      }

      return {
        students: nextStudents,
        classes: {
          ...state.classes,
          [classId]: { ...classRoom, studentIds: nextStudentIds },
        },
      };
    });
    void persistState(get);
    return ids;
  },

  deleteClass: (classId) => {
    set((state) => {
      const classRoom = state.classes[classId];
      if (!classRoom) return {};

      const nextClasses = { ...state.classes };
      delete nextClasses[classId];

      const nextStudents = { ...state.students };
      for (const studentId of classRoom.studentIds) {
        delete nextStudents[studentId];
      }

      const nextSessions = { ...state.sessions };
      const sessionIds = Object.values(state.sessions)
        .filter((session) => session.classId === classId)
        .map((session) => session.id);
      for (const sessionId of sessionIds) {
        delete nextSessions[sessionId];
      }

      const nextMedia = { ...state.media };
      for (const item of Object.values(state.media)) {
        if (item.classId === classId) {
          delete nextMedia[item.id];
        }
      }

      return {
        classes: nextClasses,
        students: nextStudents,
        sessions: nextSessions,
        media: nextMedia,
      };
    });
    void persistState(get);
  },

  renameStudent: (studentId, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    set((state) => {
      const student = state.students[studentId];
      if (!student) return {};

      return {
        students: {
          ...state.students,
          [studentId]: { ...student, name: trimmed },
        },
      };
    });
    void persistState(get);
  },

  moveStudentToClass: (studentId, toClassId) => {
    set((state) => {
      const targetClass = state.classes[toClassId];
      if (!targetClass) return {};

      let sourceClassId: ID | null = null;
      for (const item of Object.values(state.classes)) {
        if (item.studentIds.includes(studentId)) {
          sourceClassId = item.id;
          break;
        }
      }

      if (!sourceClassId || sourceClassId === toClassId) return {};

      const sourceClass = state.classes[sourceClassId];
      if (!sourceClass) return {};

      return {
        classes: {
          ...state.classes,
          [sourceClassId]: {
            ...sourceClass,
            studentIds: sourceClass.studentIds.filter((id) => id !== studentId),
          },
          [toClassId]: {
            ...targetClass,
            studentIds: targetClass.studentIds.includes(studentId)
              ? targetClass.studentIds
              : [...targetClass.studentIds, studentId],
          },
        },
      };
    });
    void persistState(get);
  },

  deleteStudent: (studentId) => {
    set((state) => {
      const student = state.students[studentId];
      if (!student) return {};

      const nextStudents = { ...state.students };
      delete nextStudents[studentId];

      const nextClasses: Record<ID, ClassRoom> = { ...state.classes };
      for (const classRoom of Object.values(state.classes)) {
        if (!classRoom.studentIds.includes(studentId)) continue;
        nextClasses[classRoom.id] = {
          ...classRoom,
          studentIds: classRoom.studentIds.filter((id) => id !== studentId),
        };
        break;
      }

      return {
        students: nextStudents,
        classes: nextClasses,
      };
    });
    void persistState(get);
  },

  createSession: (classId, label) => {
    const id = createId("session");
    const session: Session = {
      id,
      classId,
      label: label.trim(),
      createdAt: Date.now(),
    };

    set((state) => ({ sessions: { ...state.sessions, [id]: session } }));
    void persistState(get);
    return id;
  },

  deleteSession: (sessionId) => {
    set((state) => {
      const nextSessions = { ...state.sessions };
      delete nextSessions[sessionId];

      const nextMedia = { ...state.media };
      for (const item of Object.values(state.media)) {
        if (item.sessionId === sessionId) {
          delete nextMedia[item.id];
        }
      }

      return { sessions: nextSessions, media: nextMedia };
    });
    void persistState(get);
  },

  addMediaItem: ({
    id,
    classId,
    sessionId,
    studentId,
    type,
    uri,
    createdAt,
  }) => {
    const mediaId = id ?? createId("media");
    const item: MediaItem = {
      id: mediaId,
      classId,
      sessionId,
      studentId,
      type,
      uri,
      createdAt: createdAt ?? Date.now(),
    };

    set((state) => ({ media: { ...state.media, [mediaId]: item } }));
    void persistState(get);
    return mediaId;
  },

  removeMediaItem: (mediaId) => {
    set((state) => {
      const nextMedia = { ...state.media };
      delete nextMedia[mediaId];
      return { media: nextMedia };
    });
    void persistState(get);
  },

  removeMediaForStudentInSession: (sessionId, studentId) => {
    const removed: ID[] = [];
    set((state) => {
      const nextMedia = { ...state.media };
      for (const item of Object.values(state.media)) {
        if (item.sessionId === sessionId && item.studentId === studentId) {
          removed.push(item.id);
          delete nextMedia[item.id];
        }
      }
      return { media: nextMedia };
    });
    void persistState(get);
    return removed;
  },

  getClassSessions: (classId) => {
    return Object.values(get().sessions)
      .filter((session) => session.classId === classId)
      .sort((left, right) => right.createdAt - left.createdAt);
  },

  getSessionMediaForStudent: (sessionId, studentId) => {
    return Object.values(get().media)
      .filter(
        (item) => item.sessionId === sessionId && item.studentId === studentId,
      )
      .sort((left, right) => right.createdAt - left.createdAt);
  },

  getHasMediaForStudent: (sessionId, studentId) => {
    return Object.values(get().media).some(
      (item) => item.sessionId === sessionId && item.studentId === studentId,
    );
  },
}));
