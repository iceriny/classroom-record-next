import Dexie, { type Table } from "dexie";

import type { AppSnapshot } from "../store/types";
import { emptySnapshot } from "../store/types";

const SNAPSHOT_KEY = "root";
const ROOT_HANDLE_KEY = "root-directory-handle";

type SnapshotRecord = {
  key: string;
  value: AppSnapshot;
};

type MediaBlobRecord = {
  id: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  updatedAt: number;
};

type SettingRecord = {
  key: string;
  value: unknown;
};

class ClassRecordDB extends Dexie {
  appState!: Table<SnapshotRecord, string>;
  mediaBlobs!: Table<MediaBlobRecord, string>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super("classroom-record-next");

    this.version(1).stores({
      appState: "key",
      mediaBlobs: "id, updatedAt",
      settings: "key",
    });
  }
}

export const appDb = new ClassRecordDB();

export async function loadSnapshot(): Promise<AppSnapshot> {
  const record = await appDb.appState.get(SNAPSHOT_KEY);
  return record?.value ?? emptySnapshot();
}

export async function saveSnapshot(snapshot: AppSnapshot) {
  await appDb.appState.put({ key: SNAPSHOT_KEY, value: snapshot });
}

export async function putMediaBlobRecord(record: MediaBlobRecord) {
  await appDb.mediaBlobs.put(record);
}

export async function getMediaBlobRecord(id: string) {
  return appDb.mediaBlobs.get(id);
}

export async function deleteMediaBlobRecord(id: string) {
  await appDb.mediaBlobs.delete(id);
}

export async function saveRootDirectoryHandle(
  handle: FileSystemDirectoryHandle,
) {
  await appDb.settings.put({ key: ROOT_HANDLE_KEY, value: handle });
}

export async function loadRootDirectoryHandle() {
  const record = await appDb.settings.get(ROOT_HANDLE_KEY);
  return (record?.value as FileSystemDirectoryHandle | undefined) ?? null;
}

export async function clearRootDirectoryHandle() {
  await appDb.settings.delete(ROOT_HANDLE_KEY);
}
