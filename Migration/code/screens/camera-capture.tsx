 import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
    CameraView,
    useCameraPermissions,
    useMicrophonePermissions,
} from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

 import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { saveCapturedMedia } from "@/lib/mediaSave";
import { useAppStore } from "@/store/useAppStore";

 export default function CameraCaptureScreen() {
   const theme = useColorScheme() ?? "light";
   const tint = Colors[theme].tint;
   const { sessionId, studentId } = useLocalSearchParams<{
     sessionId: string;
     studentId: string;
   }>();

   const [cameraPerm, requestCameraPerm] = useCameraPermissions();
   const [micPerm, requestMicPerm] = useMicrophonePermissions();

   const camRef = useRef<CameraView>(null);
   const [cameraMode, setCameraMode] = useState<"picture" | "video">("picture");
   const [isBusy, setIsBusy] = useState(false);
   const [isRecording, setIsRecording] = useState(false);
   const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(
     null
   );
   const [recordingSeconds, setRecordingSeconds] = useState(0);
   const recordingStartedAtRef = useRef<number | null>(null);
   const [showHintPill, setShowHintPill] = useState(true);

   const navigation = useNavigation();
   useFocusEffect(
     React.useCallback(() => {
       // 当前页面在 (tabs) -> collect stack 内部：需要把 tab bar 隐藏掉
       const tabsNav: any =
         (navigation as any)?.getParent?.()?.getParent?.() ??
         (navigation as any)?.getParent?.();
       tabsNav?.setOptions?.({ tabBarStyle: { display: "none" } });
       return () => {
         tabsNav?.setOptions?.({ tabBarStyle: undefined });
       };
     }, [navigation])
   );

   const session = useAppStore((s) =>
     sessionId ? s.sessions[sessionId] : undefined
   );
   const classRoom = useAppStore((s) =>
     session ? s.classes[session.classId] : undefined
   );
   const student = useAppStore((s) =>
     studentId ? s.students[studentId] : undefined
   );
   const addMediaItem = useAppStore((s) => s.addMediaItem);
   const media = useAppStore((s) => s.media);

   const mediaCount = useMemo(() => {
     if (!sessionId || !studentId) return 0;
     let count = 0;
     for (const m of Object.values(media)) {
       if (m.sessionId === sessionId && m.studentId === studentId) count++;
     }
     return count;
   }, [media, sessionId, studentId]);

   async function ensureCameraGranted(): Promise<boolean> {
     if (cameraPerm?.granted) return true;
     const res = await requestCameraPerm();
     return !!res?.granted;
   }

   async function ensureMicGranted(): Promise<boolean> {
     if (micPerm?.granted) return true;
     const res = await requestMicPerm();
     return !!res?.granted;
   }

   async function takePhoto() {
     if (!session || !classRoom || !student) return;
     if (!camRef.current) return;
     if (isBusy || isRecording) return;

     setCameraMode("picture");
     const camOk = await ensureCameraGranted();
     if (!camOk) {
       Alert.alert("需要相机权限", "请授予相机权限后再尝试。");
       return;
     }

     setIsBusy(true);
     try {
       const pic = await camRef.current.takePictureAsync({ quality: 0.7 });
       const saved = await saveCapturedMedia({
         tempUri: pic.uri,
         type: "photo",
         classRoom,
         session,
         student,
       });
       addMediaItem({
         classId: classRoom.id,
         sessionId: session.id,
         studentId: student.id,
         type: "photo",
         uri: saved.uri,
       });
     } catch (e: any) {
       Alert.alert("采集失败", e?.message ?? "未知错误");
     } finally {
       setIsBusy(false);
     }
   }

   async function startVideoRecording() {
     if (!session || !classRoom || !student) return;
     if (!camRef.current) return;
     if (isRecording || isBusy) return;

     const camOk = await ensureCameraGranted();
     if (!camOk) {
       Alert.alert("需要相机权限", "请授予相机权限后再尝试。");
       return;
     }
     const micOk = await ensureMicGranted();
     if (!micOk) {
       Alert.alert("需要麦克风权限", "录像需要麦克风权限。");
       return;
     }

     const startedAt = Date.now();
     recordingStartedAtRef.current = startedAt;
     setCameraMode("video");
     setIsRecording(true);
     setRecordingStartedAt(startedAt);
     setRecordingSeconds(0);
     try {
       // 关键：Android 上需要让 CameraView 先切到 video 模式再调用 recordAsync，否则可能拿不到 uri
       await new Promise((r) => setTimeout(r, 180));
       // recordAsync 会在 stopRecording 后 resolve
       const res = await camRef.current.recordAsync();
       if (res?.uri) {
         setIsBusy(true);
         const saved = await saveCapturedMedia({
           tempUri: res.uri,
           type: "video",
           classRoom,
           session,
           student,
         });
         addMediaItem({
           classId: classRoom.id,
           sessionId: session.id,
           studentId: student.id,
           type: "video",
           uri: saved.uri,
         });
       }
     } catch (e: any) {
       // Android 上录制过短时会抛：Recording was stopped before any data could be produced.
       // 这种情况应视为“取消录制”，不提示错误。
       const msg = String(e?.message ?? "");
       const isTooShort =
         msg.includes(
           "Recording was stopped before any data could be produced"
         ) || msg.includes("stopped before any data");
       if (!isTooShort) {
         Alert.alert("录像失败", msg || "未知错误");
       }
     } finally {
       setIsRecording(false);
       setIsBusy(false);
       setCameraMode("picture");
       setRecordingStartedAt(null);
       setRecordingSeconds(0);
       recordingStartedAtRef.current = null;
     }
   }

   function stopVideoRecording() {
     if (!camRef.current) return;
     try {
       // 防止“刚开始就 stop”导致 Android 抛出过短录制异常：最短等待 ~400ms
       const startedAt = recordingStartedAtRef.current;
       const elapsed = startedAt ? Date.now() - startedAt : 999999;
       const minMs = 400;
       if (elapsed < minMs) {
         setTimeout(() => {
           try {
             camRef.current?.stopRecording();
           } catch {
             // ignore
           }
         }, minMs - elapsed);
         return;
       }
       camRef.current.stopRecording();
     } catch {
       // ignore
     }
   }

   useEffect(() => {
     if (!isRecording || !recordingStartedAt) return;
     const id = setInterval(() => {
       setRecordingSeconds(
         Math.max(0, Math.floor((Date.now() - recordingStartedAt) / 1000))
       );
     }, 250);
     return () => clearInterval(id);
   }, [isRecording, recordingStartedAt]);

   function formatMmSs(sec: number) {
     const m = Math.floor(sec / 60);
     const s = sec % 60;
     return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
   }

   useEffect(() => {
     const t = setTimeout(() => {
       // 用户新增：提示 1s 后自动隐藏
       setShowHintPill(false);
     }, 1000);
     return () => clearTimeout(t);
   }, [isRecording]);
   useEffect(() => {
     setTimeout(() => {
       setShowHintPill(false);
     }, 1000);
   }, [isRecording]);

   if (!session || !classRoom || !student) {
     return (
       <SafeAreaView
         style={[styles.safe, { backgroundColor: Colors[theme].background }]}
       >
         <View style={styles.fallback}>
           <ThemedText type="title">无法进入相机</ThemedText>
           <ThemedText style={styles.muted}>采集箱/学生信息不存在。</ThemedText>
           <Pressable
             onPress={() => router.back()}
             style={[styles.primaryBtn, { backgroundColor: tint }]}
           >
             <ThemedText style={{ color: "#fff" }}>返回</ThemedText>
           </Pressable>
         </View>
       </SafeAreaView>
     );
   }

   // 非空快照：避免在闭包/手势回调里被 TS 推断为可空
   const sessionOk = session;
   const classRoomOk = classRoom;
   const studentOk = student;

   // 交互变为：单击拍照、双击录像；所以只在缺相机权限时做底部提示
   const showPermHint = !cameraPerm?.granted;

   const studentIds = classRoomOk.studentIds;
   const currentIndex = studentIds.findIndex((id) => id === studentOk.id);

   function goToStudent(delta: number) {
     if (isBusy || isRecording) return;
     if (studentIds.length <= 1) return;
     if (currentIndex < 0) return;
     const nextIndex =
       (currentIndex + delta + studentIds.length) % studentIds.length;
     const nextStudentId = studentIds[nextIndex];
     if (!nextStudentId || nextStudentId === studentOk.id) return;
     router.replace({
       pathname: "/(tabs)/collect/camera/[sessionId]/[studentId]",
       params: { sessionId: sessionOk.id, studentId: nextStudentId },
     });
   }

   const swipeGesture = Gesture.Pan()
     // 关键：让回调在 JS 线程执行，否则会在 UI worklet 里直接调用 JS 函数导致崩溃
     .runOnJS(true)
     .enabled(!isBusy && !isRecording && studentIds.length > 1)
     .activeOffsetX([-20, 20])
     .failOffsetY([-20, 20])
     .onEnd((e) => {
       const dx = e.translationX;
       const vx = e.velocityX;
       // 左滑：下一位；右滑：上一位
       if (dx < -60 || vx < -800) goToStudent(1);
       if (dx > 60 || vx > 800) goToStudent(-1);
     });

   // 沉浸式交互：单击拍照；双击开始录像；录像中单击/双击都停止录像
   const singleTapPhotoGesture = Gesture.Tap()
     .numberOfTaps(1)
     .runOnJS(true)
     .enabled(!isBusy)
     .onEnd(() => {
       if (showPermHint) return;
       // 录制中（或刚开始录制）时：单击应停止录像
       if (recordingStartedAtRef.current) stopVideoRecording();
       else takePhoto();
     });

   const doubleTapRecordGesture = Gesture.Tap()
     .numberOfTaps(2)
     .runOnJS(true)
     .enabled(!isBusy)
     .onEnd(() => {
       if (showPermHint) return;
       // 录制中（或刚开始录制）时：双击也应停止录像
       if (recordingStartedAtRef.current) stopVideoRecording();
       else startVideoRecording();
     });

   const tapGesture = Gesture.Exclusive(
     doubleTapRecordGesture,
     singleTapPhotoGesture
   );

   const cameraGesture = Gesture.Simultaneous(swipeGesture, tapGesture);

   return (
     <SafeAreaView style={[styles.safe, { backgroundColor: "#000" }]}>
       <View style={styles.root}>
         <GestureDetector gesture={cameraGesture}>
           <View style={styles.cameraWrap}>
             <CameraView
               ref={camRef}
               style={StyleSheet.absoluteFill}
               facing="back"
               mode={cameraMode}
               onMountError={(e) =>
                 Alert.alert("相机错误", e?.message ?? "无法打开相机")
               }
             />

             {isRecording ? (
               <View style={styles.recordingBadge}>
                 <View style={styles.redDot} />
                 <ThemedText style={{ color: "#fff" }}>
                   录制中 {formatMmSs(recordingSeconds)} · 单击/双击停止
                 </ThemedText>
               </View>
             ) : null}

             {showPermHint ? (
               <View style={styles.permHint}>
                 <ThemedText style={{ color: "#fff" }}>需要相机权限</ThemedText>
                 <Pressable
                   onPress={async () => {
                     const camOk = await ensureCameraGranted();
                     if (!camOk) return;
                   }}
                   style={[styles.primaryBtn, { backgroundColor: tint }]}
                 >
                   <ThemedText style={{ color: "#fff" }}>授权</ThemedText>
                 </Pressable>
               </View>
             ) : null}
           </View>
         </GestureDetector>

         <View style={styles.topBar}>
           <View style={{ flex: 1 }}>
             <ThemedText style={{ color: "#fff", fontSize: 16 }}>
               {studentOk.name}
             </ThemedText>
             <ThemedText
               style={{ color: "rgba(255, 255, 255, 0.62)", fontSize: 12 }}
             >
               {classRoomOk.name} · {sessionOk.label}
             </ThemedText>
           </View>
           <Pressable
             onPress={() =>
               router.push({
                 pathname: "/preview/[sessionId]/[studentId]",
                 params: { sessionId: sessionOk.id, studentId: studentOk.id },
               })
             }
             style={styles.topBtn}
           >
             <ThemedText style={{ color: "#fff" }}>
               预览({mediaCount})
             </ThemedText>
           </Pressable>
           <Pressable onPress={() => router.back()} style={styles.topBtn}>
             <ThemedText style={{ color: "#fff" }}>返回</ThemedText>
           </Pressable>
         </View>

         {showHintPill ? (
           <View style={styles.hintPill}>
             <ThemedText style={{ color: "#fff", fontSize: 24 }}>
               单击拍照 · 双击录像
             </ThemedText>
           </View>
         ) : null}
       </View>
     </SafeAreaView>
   );
 }

 const styles = StyleSheet.create({
   safe: { flex: 1 },
   root: { flex: 1 },
   fallback: { flex: 1, padding: 16, gap: 8 },
   muted: { opacity: 0.7 },
   topBar: {
     position: "absolute",
     top: 0,
     left: 0,
     right: 0,
     paddingHorizontal: 12,
     paddingVertical: 10,
     flexDirection: "row",
     alignItems: "center",
     gap: 10,
     backgroundColor: "rgba(0,0,0,0.3)",
     borderBottomEndRadius: 24,
     borderBottomStartRadius: 24,
   },
   topBtn: {
     paddingHorizontal: 10,
     paddingVertical: 8,
     borderRadius: 999,
     backgroundColor: "rgba(255,255,255,0.12)",
     borderWidth: StyleSheet.hairlineWidth,
     borderColor: "transparent",
   },
   cameraWrap: { flex: 1, position: "relative" },
   recordingBadge: {
     position: "absolute",
     left: "50%",
     transform: [{ translateX: "-50%" }],
     top: 120,
     paddingHorizontal: 12,
     paddingVertical: 8,
     borderRadius: 999,
     flexDirection: "row",
     alignItems: "center",
     gap: 8,
     backgroundColor: "rgba(0,0,0,0.3)",
   },
   redDot: {
     width: 10,
     height: 10,
     borderRadius: 999,
     backgroundColor: "#ff4d4f",
   },
   permHint: {
     position: "absolute",
     left: 12,
     right: 12,
     bottom: 12,
     padding: 12,
     borderRadius: 12,
     gap: 10,
     backgroundColor: "rgba(0,0,0,0.6)",
   },
   primaryBtn: {
     alignSelf: "flex-start",
     paddingHorizontal: 12,
     paddingVertical: 10,
     borderRadius: 10,
   },
   hintPill: {
     position: "absolute",
     left: "50%",
     transform: [{ translateX: "-50%" }],
     bottom: 80,
     borderRadius: 999,
     // 鼠标穿透
     pointerEvents: "none",
   },
 });
