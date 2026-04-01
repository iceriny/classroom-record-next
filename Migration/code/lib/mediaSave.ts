 import dayjs from "dayjs";
import * as FileSystem from "expo-file-system/legacy";

 import type { ClassRoom, MediaType, Session, Student } from "@/store/types";

 import { ensureDir, getStudentDir } from "./fsPaths";

 function getExtFromUri(uri: string) {
   const m = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
   return m?.[1]?.toLowerCase();
 }

 function defaultExt(type: MediaType) {
   return type === "photo" ? "jpg" : "mp4";
 }

 export async function saveCapturedMedia(params: {
   tempUri: string;
   type: MediaType;
   classRoom: ClassRoom;
   session: Session;
   student: Student;
   capturedAt?: number;
 }) {
   const capturedAt = params.capturedAt ?? Date.now();
   const dir = getStudentDir(params.classRoom, params.session, params.student);
   await ensureDir(dir);

   const ext = getExtFromUri(params.tempUri) ?? defaultExt(params.type);
   const ts = dayjs(capturedAt).format("YYYYMMDD_HHmmss_SSS");
   const filename = `${params.student.name}_${ts}.${ext}`;
   const destUri = `${dir}${filename}`;

   // SDK54: 旧 FileSystem API 需要从 legacy 导入；同时用 copy+delete 更稳妥（相机缓存文件可能跨目录/卷）
   await FileSystem.copyAsync({ from: params.tempUri, to: destUri });
   await FileSystem.deleteAsync(params.tempUri, { idempotent: true });

   return { uri: destUri, filename, capturedAt };
 }

 export async function deleteMediaFile(uri: string) {
   await FileSystem.deleteAsync(uri, { idempotent: true });
 }
