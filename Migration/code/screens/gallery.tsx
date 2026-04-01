 import dayjs from "dayjs";
import { router } from "expo-router";
import { useVideoPlayer } from "expo-video";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, SectionList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

 import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { deleteMediaFile } from "@/lib/mediaSave";
import {
    createZipToCache,
    sanitizeZipPathPart,
    shareZip,
} from "@/lib/zipExport";
import type { ID, MediaItem } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { Image } from "expo-image";

 type GalleryRow = MediaItem & {
   className: string;
   studentName: string;
   sessionLabel: string;
   dateKey: string; // YYYY-MM-DD
 };

 type GallerySection = {
   title: string; // YYYY-MM-DD
   data: {
     classId: ID;
     className: string;
     items: GalleryRow[];
   }[];
 };

 function getFilenameFromUri(uri: string) {
   const parts = uri.split("/");
   const last = parts[parts.length - 1];
   return last || "file";
 }

 function PhotoThumb({ uri }: { uri: string }) {
   return <Image source={{ uri }} style={styles.thumb} contentFit="cover" />;
 }

 function VideoThumb({ uri }: { uri: string }) {
   // video thumbnail: generate a native image ref via expo-video, then render with expo-image
   const player = useVideoPlayer({ uri }, (p) => {
     p.muted = true;
     p.loop = false;
   });
   const [thumb, setThumb] = useState<any>(null);

   React.useEffect(() => {
     let cancelled = false;
     (async () => {
       try {
         const thumbs = await player.generateThumbnailsAsync(0, {
           maxWidth: 160,
           maxHeight: 160,
         });
         if (!cancelled) setThumb(thumbs?.[0] ?? null);
       } catch {
         if (!cancelled) setThumb(null);
       }
     })();
     return () => {
       cancelled = true;
     };
   }, [player]);

   if (thumb) {
     return <Image source={thumb} style={styles.thumb} contentFit="cover" />;
   }
   return (
     <View style={[styles.thumb, styles.videoThumbFallback]}>
       <ThemedText style={styles.videoThumbText}>视频</ThemedText>
     </View>
   );
 }

 function MediaThumb({ item }: { item: GalleryRow }) {
   return item.type === "photo" ? (
     <PhotoThumb uri={item.uri} />
   ) : (
     <VideoThumb uri={item.uri} />
   );
 }

 export default function GalleryScreen() {
   const theme = useColorScheme() ?? "light";
   const tint = Colors[theme].tint;

   const classes = useAppStore((s) => s.classes);
   const students = useAppStore((s) => s.students);
   const sessions = useAppStore((s) => s.sessions);
   const media = useAppStore((s) => s.media);
   const removeMediaItem = useAppStore((s) => s.removeMediaItem);

   const [multi, setMulti] = useState(false);
   const [selected, setSelected] = useState<Record<ID, boolean>>({});

   function getSelectionState(ids: ID[]) {
     if (ids.length === 0) return "none" as const;
     let any = false;
     let all = true;
     for (const id of ids) {
       const checked = !!selected[id];
       any ||= checked;
       all &&= checked;
     }
     if (!any) return "none" as const;
     if (all) return "all" as const;
     return "some" as const;
   }

   function applySelection(ids: ID[], value: boolean) {
     setSelected((prev) => {
       const next = { ...prev };
       for (const id of ids) {
         if (value) next[id] = true;
         else delete next[id];
       }
       return next;
     });
   }

   function toggleGroup(ids: ID[]) {
     if (!ids.length) return;
     if (!multi) setMulti(true);
     const state = getSelectionState(ids);
     applySelection(ids, state !== "all");
   }

   const rows = useMemo(() => {
     const list: GalleryRow[] = [];
     for (const m of Object.values(media)) {
       const cls = classes[m.classId];
       const st = students[m.studentId];
       const ss = sessions[m.sessionId];
       if (!cls || !st || !ss) continue;
       list.push({
         ...m,
         className: cls.name,
         studentName: st.name,
         sessionLabel: ss.label,
         dateKey: dayjs(m.createdAt).format("YYYY-MM-DD"),
       });
     }
     list.sort((a, b) => b.createdAt - a.createdAt);
     return list;
   }, [classes, media, sessions, students]);

   const sections: GallerySection[] = useMemo(() => {
     // dateKey -> classId -> items
     const map = new Map<
       string,
       Map<ID, { classId: ID; className: string; items: GalleryRow[] }>
     >();
     for (const r of rows) {
       let byClass = map.get(r.dateKey);
       if (!byClass) {
         byClass = new Map();
         map.set(r.dateKey, byClass);
       }
       let bucket = byClass.get(r.classId);
       if (!bucket) {
         bucket = { classId: r.classId, className: r.className, items: [] };
         byClass.set(r.classId, bucket);
       }
       bucket.items.push(r);
     }

     const out: GallerySection[] = [];
     const dateKeys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
     for (const dateKey of dateKeys) {
       const byClass = map.get(dateKey)!;
       const classGroups = Array.from(byClass.values());
       // 班级名排序（同一天内）
       classGroups.sort((a, b) =>
         a.className.localeCompare(b.className, "zh-Hans-CN")
       );
       out.push({ title: dateKey, data: classGroups });
     }
     return out;
   }, [rows]);

   async function deleteSelected() {
     const ids = Object.keys(selected).filter((k) => selected[k]);
     if (!ids.length) return;

     const targets = ids.map((id) => media[id]).filter(Boolean);

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

   async function exportSelectedZip() {
     const ids = Object.keys(selected).filter((k) => selected[k]);
     if (!ids.length) return;
     const selectedRows = rows.filter((r) => ids.includes(r.id));
     if (!selectedRows.length) return;

     const zipName = `ClassRecord_${dayjs().format("YYYYMMDD_HHmmss")}.zip`;
     const entries = selectedRows.map((r) => {
       const classPart = sanitizeZipPathPart(r.className);
       const datePart = sanitizeZipPathPart(r.dateKey);
       const filename = sanitizeZipPathPart(getFilenameFromUri(r.uri));
       return {
         zipPath: `${classPart}/${datePart}/${filename}`,
         fileUri: r.uri,
       };
     });

     const zipUri = await createZipToCache({ entries, zipFileName: zipName });
     await shareZip(zipUri, "导出并分享");
   }

   return (
     <SafeAreaView
       style={[styles.safe, { backgroundColor: Colors[theme].background }]}
     >
       <ThemedView style={styles.container}>
         <View style={styles.headerRow}>
           <ThemedText type="title">画廊</ThemedText>
           <View style={styles.headerActions}>
             <Pressable
               onPress={() => {
                 setMulti((v) => !v);
                 setSelected({});
               }}
               style={[styles.headerBtn, { borderColor: tint }]}
             >
               <ThemedText style={{ color: tint }}>
                 {multi ? "退出多选" : "多选"}
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
                 style={styles.dangerBtn}
               >
                 <ThemedText style={{ color: "#fff" }}>删除</ThemedText>
               </Pressable>
             ) : null}
             {multi ? (
               <Pressable
                 onPress={() =>
                   Alert.alert(
                     "导出 ZIP",
                     "将把所选媒体打包为 zip 并调用系统分享，继续吗？",
                     [
                       { text: "取消", style: "cancel" },
                       {
                         text: "导出并分享",
                         onPress: () => exportSelectedZip().catch(() => {}),
                       },
                     ]
                   )
                 }
                 style={[styles.headerBtn, { borderColor: tint }]}
               >
                 <ThemedText style={{ color: tint }}>导出ZIP</ThemedText>
               </Pressable>
             ) : null}
           </View>
         </View>

         {rows.length === 0 ? (
           <ThemedView style={styles.empty}>
             <ThemedText type="subtitle">暂无媒体</ThemedText>
             <ThemedText style={styles.muted}>
               去“采集”拍照/录像后，这里会按日期→班级展示。
             </ThemedText>
           </ThemedView>
         ) : (
           <SectionList
             sections={sections}
             keyExtractor={(item) => item.classId}
             stickySectionHeadersEnabled
             contentContainerStyle={styles.listContent}
             renderSectionHeader={({ section }) => {
               const ids = section.data.flatMap((g) => g.items.map((m) => m.id));
               const state = getSelectionState(ids);
               const mark = state === "all" ? "✓" : state === "some" ? "−" : "○";
               return (
                 <ThemedView style={styles.dateHeader}>
                   <View style={styles.groupHeaderRow}>
                     <ThemedText type="defaultSemiBold">
                       {section.title}
                     </ThemedText>
                     {multi ? (
                       <Pressable
                         onPress={() => toggleGroup(ids)}
                         style={[
                           // styles.groupSelectBtn,
                           { borderColor: tint },
                         ]}
                       >
                         <ThemedText style={{ color: tint }}>
                           {mark}
                           {/* {state === "all" ? "取消本日" : "全选"} */}
                         </ThemedText>
                       </Pressable>
                     ) : null}
                   </View>
                 </ThemedView>
               );
             }}
             renderItem={({ item: group, section }) => (
               <ThemedView style={styles.classBlock}>
                 <View style={styles.groupHeaderRow}>
                   <ThemedText type="subtitle">{group.className}</ThemedText>
                   {multi
                     ? (() => {
                         const ids = group.items.map((m) => m.id);
                         const state = getSelectionState(ids);
                         const mark =
                           state === "all" ? "✓" : state === "some" ? "−" : "○";
                         return (
                           <Pressable
                             onPress={() => toggleGroup(ids)}
                             style={[
                               // styles.groupSelectBtn,
                               { borderColor: tint },
                             ]}
                           >
                             <ThemedText style={{ color: tint }}>
                               {mark}
                               {/* {state === "all" ? "取消本班" : "全选本班"} */}
                             </ThemedText>
                           </Pressable>
                         );
                       })()
                     : null}
                 </View>
                 <ThemedText style={styles.mutedSmall}>
                   共 {group.items.length} 条
                 </ThemedText>

                 <View style={styles.itemsWrap}>
                   {group.items.map((m) => {
                     const checked = !!selected[m.id];
                     return (
                       <Pressable
                         key={m.id}
                         onLongPress={() => {
                           setMulti(true);
                           setSelected((s) => ({ ...s, [m.id]: true }));
                         }}
                         onPress={() => {
                           if (multi) {
                             setSelected((s) => ({ ...s, [m.id]: !s[m.id] }));
                             return;
                           }
                           // 进入该学生在该采集箱的预览（展示该学生本次采集全部媒体）
                           router.push({
                             pathname: "/preview/[sessionId]/[studentId]",
                             params: {
                               sessionId: m.sessionId,
                               studentId: m.studentId,
                             },
                           });
                         }}
                         style={[
                           styles.itemRow,
                           multi && checked ? { borderColor: tint } : undefined,
                         ]}
                       >
                         <MediaThumb item={m} />
                         <View style={{ flex: 1 }}>
                           <ThemedText type="defaultSemiBold">
                             {multi ? (checked ? "✓ " : "○ ") : ""}
                             {m.studentName}
                           </ThemedText>
                           <ThemedText style={styles.mutedSmall}>
                             {m.type === "photo" ? "照片" : "视频"} ·{" "}
                             {m.sessionLabel} ·{" "}
                             {dayjs(m.createdAt).format("HH:mm:ss")}
                           </ThemedText>
                         </View>
                         <ThemedText style={styles.mutedSmall}>打开</ThemedText>
                       </Pressable>
                     );
                   })}
                 </View>
               </ThemedView>
             )}
           />
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
   },
   headerRow: {
     flexDirection: "row",
     alignItems: "center",
     justifyContent: "space-between",
     gap: 12,
     marginBottom: 10,
   },
   headerActions: { flexDirection: "row", gap: 10, alignItems: "center" },
   headerBtn: {
     paddingHorizontal: 12,
     paddingVertical: 8,
     borderRadius: 10,
     borderWidth: StyleSheet.hairlineWidth,
   },
   dangerBtn: {
     paddingHorizontal: 12,
     paddingVertical: 8,
     borderRadius: 10,
     backgroundColor: "#d00",
   },
   empty: { padding: 16, borderRadius: 12, gap: 8 },
   listContent: { paddingBottom: 24 },
   dateHeader: {
     paddingVertical: 8,
     paddingHorizontal: 8,
     borderRadius: 10,
     marginBottom: 10,
   },
   groupHeaderRow: {
     flexDirection: "row",
     alignItems: "center",
     justifyContent: "space-between",
     gap: 10,
   },
   groupSelectBtn: {
     paddingHorizontal: 10,
     paddingVertical: 6,
     borderRadius: 999,
     borderWidth: StyleSheet.hairlineWidth,
   },
   classBlock: {
     padding: 12,
     borderRadius: 12,
     gap: 6,
     marginBottom: 12,
   },
   itemsWrap: { marginTop: 8, gap: 10 },
   itemRow: {
     paddingVertical: 10,
     paddingHorizontal: 10,
     borderRadius: 12,
     borderWidth: StyleSheet.hairlineWidth,
     borderColor: "rgba(127,127,127,0.25)",
     flexDirection: "row",
     alignItems: "center",
     gap: 12,
   },
   thumb: {
     width: 56,
     height: 56,
     borderRadius: 12,
     backgroundColor: "rgba(127,127,127,0.18)",
   },
   videoThumbFallback: {
     justifyContent: "center",
     alignItems: "center",
   },
   videoThumbText: {
     fontSize: 12,
     opacity: 0.8,
   },
   muted: { opacity: 0.7 },
   mutedSmall: { opacity: 0.6, fontSize: 12 },
 });
