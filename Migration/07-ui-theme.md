 # 主题与基础组件

 ## 主题

 - `Colors.light` / `Colors.dark` 提供基础色板
 - `useThemeColor` 根据系统主题选色
 - 文字与背景色通过 `ThemedText` / `ThemedView` 统一适配

 ## 交互与组件

 - `HapticTab`：iOS tab 点击时触觉反馈
 - `Collapsible`：可折叠区域（采集箱列表）
 - `IconSymbol`：iOS 使用 SF Symbols，Android/Web 使用 Material Icons

 ## 迁移建议

 - 新技术栈中可保留“主题注入 + 基础组件封装”的方式。
 - 图标映射应保留“跨平台别名”概念，避免平台差异带来 UI 断裂。
