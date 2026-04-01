export type ID = string;

export type MediaType = "photo" | "video";

export type Student = {
  id: ID;
  name: string;
};

export type ClassRoom = {
  id: ID;
  name: string;
  studentIds: ID[];
};

export type Session = {
  id: ID;
  classId: ID;
  label: string;
  createdAt: number;
};

export type MediaItem = {
  id: ID;
  classId: ID;
  sessionId: ID;
  studentId: ID;
  type: MediaType;
  uri: string;
  createdAt: number;
};

export type AppSnapshot = {
  classes: Record<ID, ClassRoom>;
  students: Record<ID, Student>;
  sessions: Record<ID, Session>;
  media: Record<ID, MediaItem>;
};

export const emptySnapshot = (): AppSnapshot => ({
  classes: {},
  students: {},
  sessions: {},
  media: {},
});
