 import * as FileSystem from "expo-file-system/legacy";

 export type DiskMediaEntry = {
   uri: string;
   name: string;
   size?: number;
   modifiedAt?: number;
 };

 async function safeGetInfo(uri: string) {
   try {
     return await FileSystem.getInfoAsync(uri);
   } catch {
     return null;
   }
 }

 /**
  * 轻量扫描某目录下的媒体文件（不递归）。
  * MVP 主要靠 store 索引；此函数用于后续做“索引修复/对账”。
  */
 export async function listMediaFilesInDir(
   dirUri: string
 ): Promise<DiskMediaEntry[]> {
   const info = await safeGetInfo(dirUri);
   if (!info?.exists) return [];
   if (!info.isDirectory) return [];

   const names = await FileSystem.readDirectoryAsync(dirUri);
   const results: DiskMediaEntry[] = [];

   for (const name of names) {
     const uri = `${dirUri}${name}`;
     const child = await safeGetInfo(uri);
     if (!child?.exists || child.isDirectory) continue;
     results.push({
       uri,
       name,
       size: child.size,
       modifiedAt: child.modificationTime ? child.modificationTime * 1000 : undefined,
     });
   }

   results.sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
   return results;
 }
