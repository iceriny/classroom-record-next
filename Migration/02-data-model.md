 # 数据模型

 迁移时可保持以下结构与字段语义，确保业务行为一致。

 ```ts
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
 ```

 ## 关键关系

 - `ClassRoom.studentIds` 与 `Student` 是一对多关系。
 - `Session.classId` 指向班级。
 - `MediaItem` 绑定班级、采集箱与学生。

 ## 排序规则

 - 采集箱列表：按 `createdAt` 倒序。
 - 画廊媒体：按 `createdAt` 倒序。
