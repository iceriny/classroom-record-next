 # 媒体采集

 ## 采集交互

 - 单击：拍照
 - 双击：开始/结束录像
 - 左右滑：切换学生
 - 录制时显示红点与计时

 ## 权限

 - 相机权限：必须
 - 麦克风权限：仅录像时需要

 ## 保存策略

 - 文件落地到 `documentDirectory/ClassRecord/...`
 - 目录层级：班级 -> 采集箱 -> 学生
 - 文件命名：`学生名_YYYYMMDD_HHmmss_SSS.ext`
 - 保存后写入索引（MediaItem）

 ## 平台注意点

 - Android 上需要先切换 CameraView 为 video 模式再调用录制。
 - Android 短录制会抛异常，视为“取消录制”即可。
