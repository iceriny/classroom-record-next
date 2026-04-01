 # 路由与页面结构

 原工程基于 Expo Router（文件路由），并在根部使用 Stack + Tabs。

 ## 路由结构（语义层）

 - 入口：重定向到采集页
 - Tab 结构：采集 / 画廊 / 管理
 - 采集栈：采集首页 → 采集箱 → 相机
 - 预览页：从相机页或画廊跳转进入
 - 模态页：示例用途（非业务核心）

 ## 关键路由

 - `/` → `/(tabs)/collect`
 - `/(tabs)/collect`：采集首页
 - `/(tabs)/collect/session/[sessionId]`：某采集箱下学生列表
 - `/(tabs)/collect/camera/[sessionId]/[studentId]`：相机采集页
 - `/preview/[sessionId]/[studentId]`：该学生在采集箱内的媒体预览
 - `/(tabs)/gallery`：画廊
 - `/(tabs)/manage`：管理

 ## 交互特性

 - 相机页需隐藏 TabBar（在进入时隐藏，离开时恢复）。
 - 预览页/相机页通过参数传递 sessionId 与 studentId。
