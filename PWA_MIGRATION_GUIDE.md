 # PWA 迁移指南（基于 Migration 迁徙包）

 本指南以功能一致为目标，不要求视觉一致。请结合 `Migration/` 内的说明与代码片段逐步完成迁移。

 ## 1. 迁移目标与范围

 - 目标：在 PWA 技术栈中复原“班级-采集箱-学生-媒体”的核心业务流程
 - 范围：采集、预览、画廊、导出、管理、存储与权限
 - 非目标：UI 风格、动效、原生触觉反馈

 ## 2. 推荐技术栈（PWA）

 以下为“功能覆盖优先”的稳定组合：

 - 框架：React + Vite
 - 路由：React Router
 - 状态管理：Zustand（与迁徙包一致）
 - 本地存储：IndexedDB（Dexie）或 localStorage（小规模）
 - 文件系统：File System Access API
 - 相机/麦克风：MediaDevices + getUserMedia + MediaRecorder
 - ZIP 打包：JSZip
 - 图片显示：原生 `<img>` 或 Image 组件
 - 视频播放：原生 `<video>` 控件

 ## 3. 核心对照（从迁徙包映射）

 - 业务概览：`Migration/00-app-overview.md`
 - 路由结构：`Migration/01-navigation.md`
 - 数据模型：`Migration/02-data-model.md`
 - 存储策略：`Migration/03-storage-persistence.md`
 - 媒体采集：`Migration/04-media-capture.md`
 - 画廊与导出：`Migration/05-gallery-export.md`
 - 管理逻辑：`Migration/06-management.md`
 - 依赖映射：`Migration/10-dependencies.md`

 ## 4. PWA 路由与页面建议

 建议按功能而非原文件结构组织：

 - `/collect`：采集首页
 - `/collect/session/:sessionId`：采集箱学生列表
 - `/collect/camera/:sessionId/:studentId`：相机采集
 - `/preview/:sessionId/:studentId`：学生媒体预览
 - `/gallery`：画廊
 - `/manage`：班级与学生管理

 ## 5. 数据模型与持久化

 - 直接复用 `Migration/02-data-model.md` 中的类型定义
 - 使用 IndexedDB 存储 `classes/students/sessions/media` 四张表或一个对象仓储
 - 保持索引与媒体文件分离：索引保存文件句柄或 Object URL

 **推荐字段策略**
 - `MediaItem.uri`：存储 File System Access API 的文件句柄标识或 Blob URL
 - `createdAt`：毫秒时间戳，用于排序与分组

 ## 6. 媒体采集与保存（PWA）

 ### 采集
 - 相机：`navigator.mediaDevices.getUserMedia({ video: true, audio: true })`
 - 拍照：用 `<video>` + `<canvas>` 取帧并导出 Blob
 - 录像：`MediaRecorder` 输出视频 Blob

 ### 保存
 - 优先 File System Access API：
   - 建议目录结构：`ClassRecord/<class>/<session>/<student>/`
   - 文件名策略参考 `Migration/04-media-capture.md`
 - 降级方案：
   - 仅保存 Blob 到 IndexedDB
   - 或触发下载并记录文件名

 ## 7. 画廊与导出 ZIP

 - 分组逻辑：按日期 → 班级（见 `Migration/05-gallery-export.md`）
 - ZIP：使用 JSZip，路径格式 `班级/日期/文件名`
 - 分享：PWA 可用 `navigator.share`（不支持时提供下载）

 ## 8. 权限与兼容性

 - 权限请求需按需触发（进入相机/录像时请求）
 - 在不支持 MediaRecorder 的浏览器，降级为“仅拍照”
 - iOS Safari 的文件系统与后台录制能力受限，需提示用户

 ## 9. 迁移落地步骤（建议顺序）

 1. 完成数据模型与持久化层（对照 `Migration/02` 与 `03`）
 2. 实现班级/学生管理（对照 `Migration/code/screens/manage.tsx`）
 3. 实现采集箱与学生列表（对照 `Migration/code/screens/collect-index.tsx` 与 `session-students.tsx`）
 4. 实现相机采集（对照 `Migration/code/screens/camera-capture.tsx`）
 5. 实现预览页（对照 `Migration/code/screens/student-preview.tsx`）
 6. 实现画廊与导出（对照 `Migration/code/screens/gallery.tsx`）

 ## 10. 最小功能验收清单

 - 创建班级并导入学生
 - 新建采集箱并进入学生列表
 - 拍照/录像并保存到指定结构
 - 预览某学生在采集箱内的所有媒体
 - 画廊按日期与班级分组展示
 - 多选删除与导出 ZIP 可用
