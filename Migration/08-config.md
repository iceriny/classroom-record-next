 # 运行时配置与权限

 ## 配置要点

 - 应用名：classroom-record
 - 方向：竖屏
 - 主题：跟随系统（automatic）

 ## Android 权限

 - `RECORD_AUDIO`
 - `MODIFY_AUDIO_SETTINGS`

 ## 相关能力

 - 相机/录像
 - 文件系统读写
 - 分享（导出 ZIP）

 ## 迁移建议

 - 在新技术栈中明确权限请求的时机：首次使用相机/录像时再请求。
 - 允许用户在无权限下进入页面并提示授权，避免阻塞主流程。
