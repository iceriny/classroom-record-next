import dayjs from "dayjs";

import type { ClassRoom, MediaType, Session, Student } from "../store/types";
import {
  clearRootDirectoryHandle,
  deleteMediaBlobRecord,
  getMediaBlobRecord,
  loadRootDirectoryHandle,
  putMediaBlobRecord,
  saveRootDirectoryHandle,
} from "./db";

const ROOT_FOLDER_NAME = "ClassRecord";

export function sanitizePathPart(part: string) {
  return part
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

export function isFileSystemAccessSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export function getFilenameFromUri(uri: string) {
  const parts = uri.split("/");
  return decodeURIComponent(parts[parts.length - 1] ?? "file");
}

function extensionFromBlob(blob: Blob, type: MediaType) {
  if (blob.type.includes("png")) return "png";
  if (blob.type.includes("webm")) return "webm";
  if (blob.type.includes("mp4")) return "mp4";
  if (blob.type.includes("jpeg") || blob.type.includes("jpg")) return "jpg";
  return type === "photo" ? "jpg" : "webm";
}

function buildFileName(params: {
  student: Student;
  blob: Blob;
  type: MediaType;
  capturedAt: number;
}) {
  const stamp = dayjs(params.capturedAt).format("YYYYMMDD_HHmmss_SSS");
  const ext = extensionFromBlob(params.blob, params.type);
  return `${sanitizePathPart(params.student.name)}_${stamp}.${ext}`;
}

function buildRelativePath(params: {
  classRoom: ClassRoom;
  session: Session;
  student: Student;
  fileName: string;
}) {
  return [
    ROOT_FOLDER_NAME,
    sanitizePathPart(params.classRoom.name),
    sanitizePathPart(params.session.label),
    sanitizePathPart(params.student.name),
    sanitizePathPart(params.fileName),
  ];
}

async function ensureSubdirectory(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  return parent.getDirectoryHandle(name, { create: true });
}

async function ensureWritePermission(handle: FileSystemDirectoryHandle) {
  if (typeof handle.queryPermission !== "function") return true;

  const current = await handle.queryPermission({ mode: "readwrite" });
  if (current === "granted") return true;
  if (typeof handle.requestPermission !== "function") return false;

  const requested = await handle.requestPermission({ mode: "readwrite" });
  return requested === "granted";
}

async function writeBlobToPickedDirectory(
  handle: FileSystemDirectoryHandle,
  parts: string[],
  blob: Blob,
) {
  let current = handle;
  for (const part of parts.slice(0, -1)) {
    current = await ensureSubdirectory(current, part);
  }

  const fileHandle = await current.getFileHandle(parts[parts.length - 1], {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function mirrorBlobToFileSystem(params: {
  classRoom: ClassRoom;
  session: Session;
  student: Student;
  fileName: string;
  blob: Blob;
}) {
  const handle = await loadRootDirectoryHandle();
  if (!handle) return;

  try {
    const permitted = await ensureWritePermission(handle);
    if (!permitted) return;

    const parts = buildRelativePath({
      classRoom: params.classRoom,
      session: params.session,
      student: params.student,
      fileName: params.fileName,
    });
    await writeBlobToPickedDirectory(handle, parts, params.blob);
  } catch {
    // Ignore mirrored file-system failures and keep IndexedDB copy as source of truth.
  }
}

export async function chooseRootDirectory() {
  if (!isFileSystemAccessSupported()) return null;
  const picker =
    window.showDirectoryPicker as () => Promise<FileSystemDirectoryHandle>;
  const handle = await picker();
  await saveRootDirectoryHandle(handle);
  return handle;
}

export async function getConfiguredRootDirectory() {
  return loadRootDirectoryHandle();
}

export async function removeConfiguredRootDirectory() {
  await clearRootDirectoryHandle();
}

export async function saveCapturedMediaAsset(params: {
  mediaId: string;
  blob: Blob;
  type: MediaType;
  classRoom: ClassRoom;
  session: Session;
  student: Student;
  capturedAt?: number;
}) {
  const capturedAt = params.capturedAt ?? Date.now();
  const fileName = buildFileName({
    student: params.student,
    blob: params.blob,
    type: params.type,
    capturedAt,
  });
  const uri = `idb://media/${params.mediaId}/${encodeURIComponent(fileName)}`;

  await putMediaBlobRecord({
    id: params.mediaId,
    blob: params.blob,
    fileName,
    mimeType: params.blob.type,
    updatedAt: capturedAt,
  });

  await mirrorBlobToFileSystem({
    classRoom: params.classRoom,
    session: params.session,
    student: params.student,
    fileName,
    blob: params.blob,
  });

  return { uri, createdAt: capturedAt };
}

export async function getMediaBlob(mediaId: string) {
  const record = await getMediaBlobRecord(mediaId);
  return record?.blob ?? null;
}

export async function deleteMediaAsset(mediaId: string) {
  await deleteMediaBlobRecord(mediaId);
}
