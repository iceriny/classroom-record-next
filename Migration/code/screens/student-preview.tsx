 import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

 import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { deleteMediaFile } from "@/lib/mediaSave";
import type { ID } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";

 function VideoPreview({ uri }: { uri: string }) {
   const player = useVideoPlayer({ uri }, (p) => {
     p.loop = false;
   });

   return (
     <VideoView
       player={player}
       style={styles.preview}
       nativeControls
       contentFit="contain"
     />
   );
 }

 export default function StudentPreviewScreen() {
   const theme = useColorScheme() ?? "light";
   const tint = Colors[theme].tint;
   const { sessionId, studentId } = useLocalSearchParams<{
     sessionId: string;
     studentId: string;
   }>();

   const session = useAppStore((s) =>
     sessionId ? s.sessions[sessionId] : undefined
   );
   const classRoom = useAppStore((s) =>
     session ? s.classes[session.classId] : undefined
   );
   const student = useAppStore((s) =>
     studentId ? s.students[studentId] : undefined
   );
   const removeMediaItem = useAppStore((s) => s.removeMediaItem);

   // 关键：不要在 selector 里“现算并返回新数组”，否则 React 19 DEV 下会触发
   // `getSnapshot should be cached` 并导致无限更新。
   // 这里仅订阅 store 内稳定引用（media map），再在组件内 useMemo 过滤。
   const mediaMap = useAppStore((s) => s.media);
   const media = React.useMemo(() => {
     if (!sessionId || !studentId) return [];
     return Object.values(mediaMap).filter(
       (m) => m.sessionId === sessionId && m.studentId === studentId
     );
   }, [mediaMap, sessionId, studentId]);

   const [multi, setMulti] = useState(false);
   const [selected, setSelected] = useState<Record<ID, boolean>>({});

   async function deleteOne(id: string, uri: string) {
     await deleteMediaFile(uri);
     removeMediaItem(id);
   }

   async function deleteSelected() {
     const ids = Object.keys(selected).filter((k) => selected[k]);
     if (!ids.length) return;
     const targets = media.filter((m) => ids.includes(m.id));
     await Promise.all(
       targets.map(async (m) => {
         try {
           await deleteMediaFile(m.uri);
         } finally {
           removeMediaItem(m.id);
         }
       })
     );
     setSelected({});
     setMulti(false);
   }

   async function recaptureAll() {
     if (!session || !student) return;
     const targets = media;
     await Promise.all(
       targets.map(async (m) => {
         try {
           await deleteMediaFile(m.uri);
         } finally {
           removeMediaItem(m.id);
         }
       })
     );
     router.replace({
       pathname: "/(tabs)/collect/camera/[sessionId]/[studentId]",
       params: { sessionId: session.id, studentId: student.id },
     });
   }

   if (!session || !classRoom || !student) {
     return (
       <SafeAreaView
         style={[styles.safe, { backgroundColor: Colors[theme].background }]}
       >
         <ThemedView style={styles.container}>
           <ThemedText type="title">预览不存在</ThemedText>
           <Pressable
             onPress={() => router.back()}
             style={[styles.primaryBtn, { backgroundColor: tint }]}
           >
             <ThemedText style={{ color: "#fff" }}>返回</ThemedText>
           </Pressable>
         </ThemedView>
       </SafeAreaView>
     );
   }

   return (
     <SafeAreaView
       style={[styles.safe, { backgroundColor: Colors[theme].background }]}
     >
       <ThemedView style={styles.container}>
         <View style={styles.headerRow}>
           <View style={{ flex: 1 }}>
             <ThemedText type="title">{student.name}</ThemedText>
             <ThemedText style={styles.muted}>
               {classRoom.name} · {session.label}
             </ThemedText>
           </View>
           <Pressable
             onPress={() => router.back()}
             style={[styles.headerBtn, { borderColor: tint }]}
           >
             <ThemedText style={{ color: tint }}>返回</ThemedText>
           </Pressable>
         </View>

         <View style={styles.actionRow}>
           <Pressable
             onPress={() =>
               router.replace({
                 pathname: "/(tabs)/collect/camera/[sessionId]/[studentId]",
                 params: { sessionId: session.id, studentId: student.id },
               })
             }
             style={[styles.primaryBtn, { backgroundColor: tint }]}
           >
             <ThemedText style={{ color: "#fff" }}>继续采集</ThemedText>
           </Pressable>
           <Pressable
             onPress={() =>
               Alert.alert(
                 "重新采集",
                 "将删除该学生在本采集箱内的全部媒体，继续吗？",
                 [
                   { text: "取消", style: "cancel" },
                   {
                     text: "删除并重新采集",
                     style: "destructive",
                     onPress: recaptureAll,
                   },
                 ]
               )
             }
             style={[styles.dangerBtn]}
           >
             <ThemedText style={{ color: "#fff" }}>重新采集</ThemedText>
           </Pressable>
         </View>

         <View style={styles.actionRow}>
           <Pressable
             onPress={() => {
               setMulti((v) => !v);
               setSelected({});
             }}
             style={[styles.headerBtn, { borderColor: tint }]}
           >
             <ThemedText style={{ color: tint }}>
               {multi ? "退出多选" : "多选删除"}
             </ThemedText>
           </Pressable>
           {multi ? (
             <Pressable
               onPress={() =>
                 Alert.alert("删除所选", "确定删除所选媒体吗？", [
                   { text: "取消", style: "cancel" },
                   {
                     text: "删除",
                     style: "destructive",
                     onPress: deleteSelected,
                   },
                 ])
               }
               style={[styles.dangerBtn]}
             >
               <ThemedText style={{ color: "#fff" }}>删除所选</ThemedText>
             </Pressable>
           ) : null}
         </View>

         {media.length === 0 ? (
           <ThemedView style={styles.empty}>
             <ThemedText type="subtitle">暂无媒体</ThemedText>
             <ThemedText style={styles.muted}>返回相机开始采集。</ThemedText>
           </ThemedView>
         ) : (
           <ScrollView contentContainerStyle={styles.scroll}>
             {media.map((m) => {
               const checked = !!selected[m.id];
               return (
                 <ThemedView key={m.id} style={styles.itemCard}>
                   <Pressable
                     onPress={() => {
                       if (!multi) return;
                       setSelected((s) => ({ ...s, [m.id]: !s[m.id] }));
                     }}
                     style={styles.itemHeader}
                   >
                     <ThemedText type="defaultSemiBold">
                       {m.type === "photo" ? "照片" : "视频"}{" "}
                       {multi ? (checked ? "✓" : "○") : ""}
                     </ThemedText>
                     {!multi ? (
                       <Pressable
                         onPress={() =>
                           Alert.alert("删除", "确定删除该媒体吗？", [
                             { text: "取消", style: "cancel" },
                             {
                               text: "删除",
                               style: "destructive",
                               onPress: () =>
                                 deleteOne(m.id, m.uri).catch(() => {}),
                             },
                           ])
                         }
                         style={[
                           styles.headerBtn,
                           { borderColor: "rgba(255,0,0,0.5)" },
                         ]}
                       >
                         <ThemedText style={{ color: "#d00" }}>删除</ThemedText>
                       </Pressable>
                     ) : null}
                   </Pressable>

                   {m.type === "photo" ? (
                     <Image
                       source={{ uri: m.uri }}
                       style={styles.preview}
                       contentFit="cover"
                     />
                   ) : (
                     <VideoPreview uri={m.uri} />
                   )}
                 </ThemedView>
               );
             })}
           </ScrollView>
         )}
       </ThemedView>
     </SafeAreaView>
   );
 }

 const styles = StyleSheet.create({
   safe: { flex: 1 },
   container: {
     flex: 1,
     paddingHorizontal: 16,
     paddingTop: 8,
     gap: 12,
   },
   headerRow: {
     flexDirection: "row",
     alignItems: "center",
     justifyContent: "space-between",
     gap: 12,
   },
   actionRow: {
     flexDirection: "row",
     alignItems: "center",
     justifyContent: "space-between",
     gap: 10,
   },
   headerBtn: {
     paddingHorizontal: 12,
     paddingVertical: 8,
     borderRadius: 10,
     borderWidth: StyleSheet.hairlineWidth,
   },
   primaryBtn: {
     paddingHorizontal: 12,
     paddingVertical: 10,
     borderRadius: 10,
   },
   dangerBtn: {
     paddingHorizontal: 12,
     paddingVertical: 10,
     borderRadius: 10,
     backgroundColor: "#d00",
   },
   empty: {
     padding: 16,
     borderRadius: 12,
     gap: 8,
   },
   scroll: { paddingBottom: 24, gap: 12 },
   itemCard: { padding: 10, borderRadius: 12, gap: 8 },
   itemHeader: {
     flexDirection: "row",
     alignItems: "center",
     justifyContent: "space-between",
     gap: 12,
   },
   preview: {
     width: "100%",
     height: 220,
     borderRadius: 12,
     backgroundColor: "#000",
   },
   muted: { opacity: 0.7 },
 });
