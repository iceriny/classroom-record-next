 import * as FileSystem from "expo-file-system/legacy";

 import type { ClassRoom, Session, Student } from "@/store/types";

 const ROOT_DIR = `${FileSystem.documentDirectory}ClassRecord/`;

 function sanitize(part: string) {
   // Windows/Android/iOS 统一：尽量避免路径非法字符
   return part.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
 }

 export function getRootDir() {
   return ROOT_DIR;
 }

 export function getClassDir(cls: ClassRoom) {
   return `${ROOT_DIR}${sanitize(`${cls.id}_${cls.name}`)}/`;
 }

 export function getSessionDir(cls: ClassRoom, session: Session) {
   return `${getClassDir(cls)}${sanitize(`${session.id}_${session.label}`)}/`;
 }

 export function getStudentDir(
   cls: ClassRoom,
   session: Session,
   student: Student
 ) {
   return `${getSessionDir(cls, session)}${sanitize(
     `${student.id}_${student.name}`
   )}/`;
 }

 export async function ensureDir(dirUri: string) {
   await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
 }
