 # 存储与持久化

 原工程使用 Zustand + AsyncStorage 作为本地持久化。

 ## 数据存储策略

 - 使用 key-value 存储序列化整个 store。
 - 存储 Key：`classrecord_store_v1`（含版本号）。
 - 媒体文件本身存在文件系统，store 只保存 URI 索引。

 ## 关键行为

 - 删除班级：删除其学生、采集箱、媒体索引。
 - 删除采集箱：删除该采集箱内媒体索引。
 - 删除学生：从班级移除，但不清理历史媒体索引。

 ## 迁移建议

 - 在新技术栈中，保持“索引与文件分离”的模式，以简化清理与对账。
 - 若使用数据库，建议为 `classId` / `sessionId` / `studentId` 建立索引。
 - 若不支持 AsyncStorage，可使用 SQLite / IndexedDB / 本地文件 JSON 等替代。
