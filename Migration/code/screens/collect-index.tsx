 import dayjs from "dayjs";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

 import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Collapsible } from "@/components/ui/collapsible";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { deleteMediaFile } from "@/lib/mediaSave";
import { useAppStore } from "@/store/useAppStore";

 function sessionLabelNow() {
   const now = dayjs();
   const ap = now.hour() < 12 ? "上午" : "下午";
   return `${now.format("YYYY-MM-DD")}_${ap}`;
 }

 export default function CollectIndexScreen() {
   const theme = useColorScheme() ?? "light";
   const classes = useAppStore((s) => s.classes);
   const sessions = useAppStore((s) => s.sessions);
   const createSession = useAppStore((s) => s.createSession);
   const deleteSession = useAppStore((s) => s.deleteSession);
   const media = useAppStore((s) => s.media);

   const classList = useMemo(() => Object.values(classes), [classes]);
   classList.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));

   const sessionsByClassId = useMemo(() => {
     const map: Record<
       string,
       { id: string; label: string; createdAt: number }[]
     > = {};
     for (const ss of Object.values(sessions)) {
       (map[ss.classId] ??= []).push({
         id: ss.id,
         label: ss.label,
         createdAt: ss.createdAt,
       });
     }
     for (const cid of Object.keys(map)) {
       map[cid].sort((a, b) => b.createdAt - a.createdAt);
     }
     return map;
   }, [sessions]);

   const tint = Colors[theme].tint;

   return (
     <SafeAreaView
       style={[styles.safe, { backgroundColor: Colors[theme].background }]}
     >
       <ThemedView style={styles.container}>
         <View style={styles.headerRow}>
           <ThemedText type="title">采集</ThemedText>
           <Pressable
             onPress={() => router.push("/manage")}
             style={[styles.headerBtn, { borderColor: tint }]}
           >
             <ThemedText style={{ color: tint }}>管理班级</ThemedText>
           </Pressable>
         </View>

         {classList.length === 0 ? (
           <ThemedView style={styles.empty}>
             <ThemedText type="subtitle">还没有班级</ThemedText>
             <ThemedText style={styles.muted}>
               先去“管理”创建班级和学生名单。
             </ThemedText>
             <Pressable
               onPress={() => router.push("/manage")}
               style={[styles.primaryBtn, { backgroundColor: tint }]}
             >
               <ThemedText style={{ color: "#fff" }}>去创建</ThemedText>
             </Pressable>
           </ThemedView>
         ) : (
           <ScrollView contentContainerStyle={styles.scrollContent}>
             {classList.map((cls) => {
               const list = sessionsByClassId[cls.id] ?? [];
               return (
                 <ThemedView key={cls.id} style={styles.classCard}>
                   <View style={styles.classRow}>
                     <ThemedText type="subtitle">{cls.name}</ThemedText>
                     <Pressable
                       onPress={() => {
                         if (!cls.studentIds.length) {
                           Alert.alert(
                             "该班级暂无学生",
                             "请先到“管理”页导入学生名单。"
                           );
                           return;
                         }
                         const label = sessionLabelNow();
                         const sessionId = createSession(cls.id, label);
                         router.push(`/collect/session/${sessionId}`);
                       }}
                       style={[styles.primaryBtn, { backgroundColor: tint }]}
                     >
                       <ThemedText style={{ color: "#fff" }}>
                         新建采集
                       </ThemedText>
                     </Pressable>
                   </View>

                   <ThemedText style={styles.muted}>
                     学生：{cls.studentIds.length} · 采集箱：{list.length}
                   </ThemedText>

                   <Collapsible title="采集箱列表">
                     {list.length === 0 ? (
                       <ThemedText style={styles.muted}>暂无采集箱。</ThemedText>
                     ) : (
                       list.map((ss) => (
                         <View key={ss.id} style={styles.sessionRow}>
                           <Pressable
                             onPress={() =>
                               router.push(`/collect/session/${ss.id}`)
                             }
                             style={{ flex: 1 }}
                           >
                             <ThemedText>
                               {ss.label} {" · "}
                               {
                                 Object.values(media).filter(
                                   (m) => m.sessionId === ss.id
                                 ).length
                               }{" "}
                               / {cls.studentIds.length}
                             </ThemedText>
                             <ThemedText style={styles.mutedSmall}>
                               {dayjs(ss.createdAt).format("MM-DD HH:mm")}
                             </ThemedText>
                           </Pressable>
                           <Pressable
                             onPress={() =>
                               Alert.alert(
                                 "删除采集箱",
                                 "将删除该采集箱下的所有媒体文件与索引，继续吗？",
                                 [
                                   { text: "取消", style: "cancel" },
                                   {
                                     text: "删除",
                                     style: "destructive",
                                     onPress: async () => {
                                       const toDelete = Object.values(
                                         media
                                       ).filter((m) => m.sessionId === ss.id);
                                       await Promise.all(
                                         toDelete.map(async (m) => {
                                           try {
                                             await deleteMediaFile(m.uri);
                                           } catch {
                                             // ignore
                                           }
                                         })
                                       );
                                       deleteSession(ss.id);
                                     },
                                   },
                                 ]
                               )
                             }
                             style={[
                               styles.deleteBtn,
                               { borderColor: "rgba(255,0,0,0.35)" },
                             ]}
                           >
                             <ThemedText style={{ color: "#d00" }}>
                               删除
                             </ThemedText>
                           </Pressable>
                         </View>
                       ))
                     )}
                   </Collapsible>
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
   },
   headerRow: {
     flexDirection: "row",
     alignItems: "center",
     justifyContent: "space-between",
     gap: 12,
     marginBottom: 12,
   },
   headerBtn: {
     paddingHorizontal: 12,
     paddingVertical: 8,
     borderRadius: 10,
     borderWidth: StyleSheet.hairlineWidth,
   },
   empty: {
     padding: 16,
     borderRadius: 12,
     gap: 8,
   },
   scrollContent: {
     paddingBottom: 24,
     gap: 12,
   },
   classCard: {
     padding: 12,
     borderRadius: 12,
     gap: 8,
   },
   classRow: {
     flexDirection: "row",
     alignItems: "center",
     justifyContent: "space-between",
     gap: 12,
   },
   primaryBtn: {
     paddingHorizontal: 12,
     paddingVertical: 8,
     borderRadius: 10,
   },
   sessionRow: {
     paddingVertical: 10,
     flexDirection: "row",
     alignItems: "center",
     gap: 2,
   },
   deleteBtn: {
     paddingHorizontal: 12,
     paddingVertical: 8,
     borderRadius: 10,
     borderWidth: StyleSheet.hairlineWidth,
   },
   muted: {
     opacity: 0.7,
   },
   mutedSmall: {
     opacity: 0.6,
     fontSize: 12,
   },
 });
