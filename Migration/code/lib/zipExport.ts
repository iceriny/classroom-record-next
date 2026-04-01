 import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";

 export type ZipEntryInput = {
   /** Path inside zip, e.g. 班级/2026-01-04/张三_20260104_083012.jpg */
   zipPath: string;
   /** file:// uri */
   fileUri: string;
 };

 export function sanitizeZipPathPart(part: string) {
   return part
     .replace(/[\\/:*?"<>|]/g, "_")
     .replace(/\s+/g, " ")
     .trim();
 }

 export async function createZipToCache(params: {
   entries: ZipEntryInput[];
   zipFileName: string; // should end with .zip
 }) {
   if (!FileSystem.cacheDirectory) {
     throw new Error("FileSystem.cacheDirectory is not available");
   }
   const zip = new JSZip();

   for (const entry of params.entries) {
     const b64 = await FileSystem.readAsStringAsync(entry.fileUri, {
       encoding: FileSystem.EncodingType.Base64,
     });
     zip.file(entry.zipPath, b64, { base64: true });
   }

   const zipBase64 = await zip.generateAsync({ type: "base64" });
   const zipUri = `${FileSystem.cacheDirectory}${params.zipFileName}`;

   await FileSystem.writeAsStringAsync(zipUri, zipBase64, {
     encoding: FileSystem.EncodingType.Base64,
   });

   return zipUri;
 }

 export async function shareZip(zipUri: string, dialogTitle = "分享导出文件") {
   const ok = await Sharing.isAvailableAsync();
   if (!ok) {
     throw new Error("Sharing is not available on this platform");
   }
   await Sharing.shareAsync(zipUri, {
     mimeType: "application/zip",
     dialogTitle,
     UTI: "public.zip-archive",
   });
 }
