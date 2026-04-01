 import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

 import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store/useAppStore";

 export default function SessionStudentsScreen() {
   const theme = useColorScheme() ?? "light";
   const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

   const session = useAppStore((s) =>
     sessionId ? s.sessions[sessionId] : undefined
   );
   const classRoom = useAppStore((s) =>
     session ? s.classes[session.classId] : undefined
   );
   const students = useAppStore((s) => s.students);
   const media = useAppStore((s) => s.media);

   const list = useMemo(() => {
     if (!classRoom) return [];
     return classRoom.studentIds
       .map((id) => students[id])
       .filter(Boolean)
       .map((st) => ({ id: st.id, name: st.name }));
   }, [classRoom, students]);

   const hasMediaStudentIdSet = useMemo(() => {
     const set = new Set<string>();
     if (!session) return set;
     for (const m of Object.values(media)) {
       if (m.sessionId === session.id) set.add(m.studentId);
     }
     return set;
   }, [media, session]);

   const tint = Colors[theme].tint;

   if (!session || !classRoom) {
     return (
       <SafeAreaView
         style={[styles.safe, { backgroundColor: Colors[theme].background }]}
       >
         <ThemedView style={styles.container}>
           <ThemedText type="title">采集箱不存在</ThemedText>
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
             <ThemedText type="title">{classRoom.name}</ThemedText>
             <ThemedText style={styles.muted}>{session.label}</ThemedText>
           </View>
           <Pressable
             onPress={() => router.back()}
             style={[styles.headerBtn, { borderColor: tint }]}
           >
             <ThemedText style={{ color: tint }}>返回</ThemedText>
           </Pressable>
         </View>

         <FlatList
           data={list}
           keyExtractor={(it) => it.id}
           contentContainerStyle={styles.listContent}
           renderItem={({ item }) => {
             const has = hasMediaStudentIdSet.has(item.id);
             return (
               <Pressable
                 onPress={() =>
                   router.push(`/collect/camera/${session.id}/${item.id}`)
                 }
                 onLongPress={() => {
                   if (!has) return;
                   router.push({
                     pathname: "/preview/[sessionId]/[studentId]",
                     params: { sessionId: session.id, studentId: item.id },
                   });
                 }}
                 style={styles.row}
               >
                 <View style={{ flex: 1 }}>
                   <ThemedText>{item.name}</ThemedText>
                   <ThemedText style={styles.mutedSmall}>
                     {has ? "长按可预览" : "未采集"}
                   </ThemedText>
                 </View>
                 <ThemedText style={styles.mutedSmall}>
                   {has
                     ? `已采集: ${
                         Object.values(media).filter(
                           (m) =>
                             m.sessionId === session.id &&
                             m.studentId === item.id
                         ).length
                       }`
                     : "未采集"}
                 </ThemedText>
                 <ThemedText style={{ color: has ? tint : undefined }}>
                   {has ? "✓" : ""}
                 </ThemedText>
               </Pressable>
             );
           }}
         />
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
   listContent: { paddingBottom: 24 },
   row: {
     paddingVertical: 14,
     flexDirection: "row",
     alignItems: "center",
     gap: 12,
     borderBottomWidth: StyleSheet.hairlineWidth,
     borderBottomColor: "rgba(127,127,127,0.25)",
   },
   primaryBtn: {
     marginTop: 12,
     paddingHorizontal: 12,
     paddingVertical: 10,
     borderRadius: 10,
     alignSelf: "flex-start",
   },
   muted: { opacity: 0.7 },
   mutedSmall: { opacity: 0.6, fontSize: 12 },
 });
