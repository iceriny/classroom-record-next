 import React, { useMemo, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

 import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store/useAppStore";

 function splitNames(text: string) {
   return text
     .split(/\r?\n|,|，/)
     .map((s) => s.trim())
     .filter(Boolean);
 }

 export default function ManageScreen() {
   const theme = useColorScheme() ?? "light";
   const tint = Colors[theme].tint;

   const classes = useAppStore((s) => s.classes);
   const students = useAppStore((s) => s.students);
   const addClass = useAppStore((s) => s.addClass);
   const addStudentsToClass = useAppStore((s) => s.addStudentsToClass);
   const deleteClass = useAppStore((s) => s.deleteClass);
   const renameStudent = useAppStore((s) => s.renameStudent);
   const moveStudentToClass = useAppStore((s) => s.moveStudentToClass);
   const deleteStudent = useAppStore((s) => s.deleteStudent);

   const classList = useMemo(() => Object.values(classes), [classes]);
   classList.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));

   const [className, setClassName] = useState("");
   const [studentText, setStudentText] = useState("");
   const [addingToClassId, setAddingToClassId] = useState<string | null>(null);
   const [addingStudentsText, setAddingStudentsText] = useState("");
   const [createClassOpen, setCreateClassOpen] = useState(false);

   const [studentMenu, setStudentMenu] = useState<null | {
     studentId: string;
     fromClassId: string;
   }>(null);
   const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<
     string | null
   >(null);

   const [studentAction, setStudentAction] = useState<null | {
     mode: "rename" | "move";
     studentId: string;
     fromClassId: string;
   }>(null);
   const [editName, setEditName] = useState("");
   const [moveToClassId, setMoveToClassId] = useState<string>("");

   function closeStudentAction() {
     setStudentAction(null);
     setEditName("");
     setMoveToClassId("");
   }

   function closeStudentMenu() {
     setStudentMenu(null);
     setConfirmDeleteStudentId(null);
   }

   function openStudentActions(opts: {
     studentId: string;
     fromClassId: string;
   }) {
     setCreateClassOpen(false);
     closeStudentAction();
     setStudentMenu({
       studentId: opts.studentId,
       fromClassId: opts.fromClassId,
     });
   }

   function createClassNow() {
     const name = className.trim();
     if (!name) {
       Alert.alert("请输入班级名");
       return;
     }
     const cid = addClass(name);
     const names = splitNames(studentText);
     if (names.length) addStudentsToClass(cid, names);
     setClassName("");
     setStudentText("");
     setCreateClassOpen(false);
   }

   return (
     <SafeAreaView
       style={[styles.safe, { backgroundColor: Colors[theme].background }]}
     >
       <ThemedView style={styles.container}>
         <View style={styles.topRow}>
           <ThemedText type="title">管理</ThemedText>
           <Pressable
             onPress={() => {
               setCreateClassOpen(true);
               closeStudentAction();
             }}
             style={[styles.headerBtn, { borderColor: tint }]}
           >
             <ThemedText style={{ color: tint }}>新建班级</ThemedText>
           </Pressable>
         </View>

         <ThemedText type="subtitle">已有班级</ThemedText>
         {classList.length === 0 ? (
           <ThemedText style={styles.muted}>暂无班级。</ThemedText>
         ) : (
           <ScrollView contentContainerStyle={styles.scroll}>
             {classList.map((c) => (
               <ThemedView key={c.id} style={styles.card}>
                 <View style={styles.row}>
                   <View style={{ flex: 1 }}>
                     <ThemedText type="defaultSemiBold">{c.name}</ThemedText>
                     <ThemedText style={styles.muted}>
                       学生：{c.studentIds.length}
                     </ThemedText>
                   </View>
                   <Pressable
                     onPress={() =>
                       Alert.alert(
                         "删除班级",
                         "将删除该班级及其所有数据索引（文件需后续做清理），继续吗？",
                         [
                           { text: "取消", style: "cancel" },
                           {
                             text: "删除",
                             style: "destructive",
                             onPress: () => deleteClass(c.id),
                           },
                         ]
                       )
                     }
                     style={[styles.dangerBtn]}
                   >
                     <ThemedText style={{ color: "#fff" }}>删除</ThemedText>
                   </Pressable>
                 </View>

                 <Pressable
                   onPress={() => {
                     setAddingToClassId((prev) => (prev === c.id ? null : c.id));
                     setAddingStudentsText("");
                   }}
                   style={[styles.headerBtn, { borderColor: tint }]}
                 >
                   <ThemedText style={{ color: tint }}>添加学生</ThemedText>
                 </Pressable>

                 {addingToClassId === c.id ? (
                   <View style={{ gap: 10 }}>
                     <TextInput
                       value={addingStudentsText}
                       onChangeText={setAddingStudentsText}
                       placeholder={
                         "输入学生姓名（一行一个，或逗号分隔）\n例如：张三\n李四\n王五"
                       }
                       placeholderTextColor="rgba(127,127,127,0.7)"
                       multiline
                       style={[
                         styles.textarea,
                         {
                           color: Colors[theme].text,
                           borderColor: "rgba(127,127,127,0.35)",
                         },
                       ]}
                     />
                     <Pressable
                       onPress={() => {
                         const names = splitNames(addingStudentsText);
                         if (!names.length) {
                           Alert.alert("请输入学生姓名");
                           return;
                         }
                         addStudentsToClass(c.id, names);
                         setAddingStudentsText("");
                         setAddingToClassId(null);
                       }}
                       style={[styles.primaryBtn, { backgroundColor: tint }]}
                     >
                       <ThemedText style={{ color: "#fff" }}>
                         确认添加
                       </ThemedText>
                     </Pressable>
                   </View>
                 ) : null}

                 {c.studentIds.length ? (
                   <View style={styles.studentWrap}>
                     {c.studentIds.map((sid) => (
                       <Pressable
                         key={sid}
                         onLongPress={() =>
                           openStudentActions({
                             studentId: sid,
                             fromClassId: c.id,
                           })
                         }
                         style={styles.studentChip}
                       >
                         <ThemedText style={styles.studentChipText}>
                           {students[sid]?.name ?? sid}
                         </ThemedText>
                       </Pressable>
                     ))}
                   </View>
                 ) : null}
               </ThemedView>
             ))}
           </ScrollView>
         )}

         {studentAction ? (
           <View style={styles.overlay}>
             <Pressable style={styles.backdrop} onPress={closeStudentAction} />
             <ThemedView style={styles.sheet}>
               <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
                 {studentAction.mode === "rename" ? "修改姓名" : "调班"}
               </ThemedText>

               {studentAction.mode === "rename" ? (
                 <>
                   <TextInput
                     value={editName}
                     onChangeText={setEditName}
                     placeholder="请输入新姓名"
                     placeholderTextColor="rgba(127,127,127,0.7)"
                     style={[
                       styles.input,
                       {
                         color: Colors[theme].text,
                         borderColor: "rgba(127,127,127,0.35)",
                       },
                     ]}
                   />
                   <View style={styles.sheetRow}>
                     <Pressable
                       onPress={closeStudentAction}
                       style={[styles.headerBtn, { borderColor: tint }]}
                     >
                       <ThemedText style={{ color: tint }}>取消</ThemedText>
                     </Pressable>
                     <Pressable
                       onPress={() => {
                         const name = editName.trim();
                         if (!name) {
                           Alert.alert("请输入新姓名");
                           return;
                         }
                         renameStudent(studentAction.studentId, name);
                         closeStudentAction();
                       }}
                       style={[styles.primaryBtn, { backgroundColor: tint }]}
                     >
                       <ThemedText style={{ color: "#fff" }}>保存</ThemedText>
                     </Pressable>
                   </View>
                 </>
               ) : (
                 <>
                   <ThemedText style={styles.muted}>
                     选择要调入的班级：
                   </ThemedText>
                   <ScrollView style={{ maxHeight: 260 }}>
                     {classList
                       .filter((c) => c.id !== studentAction.fromClassId)
                       .map((c) => {
                         const selected = moveToClassId === c.id;
                         return (
                           <Pressable
                             key={c.id}
                             onPress={() => setMoveToClassId(c.id)}
                             style={[
                               styles.classPickRow,
                               selected ? { borderColor: tint } : null,
                             ]}
                           >
                             <ThemedText type="defaultSemiBold">
                               {c.name}
                             </ThemedText>
                             <ThemedText style={styles.muted}>
                               {selected ? "已选" : ""}
                             </ThemedText>
                           </Pressable>
                         );
                       })}
                   </ScrollView>
                   <View style={styles.sheetRow}>
                     <Pressable
                       onPress={closeStudentAction}
                       style={[styles.headerBtn, { borderColor: tint }]}
                     >
                       <ThemedText style={{ color: tint }}>取消</ThemedText>
                     </Pressable>
                     <Pressable
                       onPress={() => {
                         if (!moveToClassId) {
                           Alert.alert("请选择目标班级");
                           return;
                         }
                         moveStudentToClass(
                           studentAction.studentId,
                           moveToClassId
                         );
                         closeStudentAction();
                       }}
                       style={[styles.primaryBtn, { backgroundColor: tint }]}
                     >
                       <ThemedText style={{ color: "#fff" }}>
                         确认调班
                       </ThemedText>
                     </Pressable>
                   </View>
                 </>
               )}
             </ThemedView>
           </View>
         ) : null}

         {studentMenu ? (
           <View style={styles.overlay}>
             <Pressable style={styles.backdrop} onPress={closeStudentMenu} />
             <ThemedView style={styles.sheet}>
               <ThemedText type="subtitle" style={{ marginBottom: 6 }}>
                 学生操作
               </ThemedText>
               <ThemedText style={styles.muted}>
                 {students[studentMenu.studentId]?.name ?? studentMenu.studentId}
               </ThemedText>

               {confirmDeleteStudentId ? (
                 <>
                   <ThemedText style={styles.muted}>
                     将从班级名单中移除该学生。历史采集媒体不会自动删除（仍可能在画廊中出现）。继续吗？
                   </ThemedText>
                   <View style={styles.sheetRow}>
                     <Pressable
                       onPress={() => setConfirmDeleteStudentId(null)}
                       style={[styles.headerBtn, { borderColor: tint }]}
                     >
                       <ThemedText style={{ color: tint }}>取消</ThemedText>
                     </Pressable>
                     <Pressable
                       onPress={() => {
                         deleteStudent(confirmDeleteStudentId);
                         closeStudentMenu();
                       }}
                       style={[styles.dangerBtn]}
                     >
                       <ThemedText style={{ color: "#fff" }}>删除</ThemedText>
                     </Pressable>
                   </View>
                 </>
               ) : (
                 <>
                   <View style={styles.menuBtnList}>
                     <Pressable
                       onPress={() => {
                         const st = students[studentMenu.studentId];
                         setEditName(st?.name ?? "");
                         setStudentAction({
                           mode: "rename",
                           studentId: studentMenu.studentId,
                           fromClassId: studentMenu.fromClassId,
                         });
                         closeStudentMenu();
                       }}
                       style={[styles.menuBtn, { borderColor: tint }]}
                     >
                       <ThemedText style={{ color: tint }}>修改姓名</ThemedText>
                     </Pressable>
                     <Pressable
                       onPress={() => {
                         const firstOther = classList.find(
                           (c) => c.id !== studentMenu.fromClassId
                         );
                         setMoveToClassId(firstOther?.id ?? "");
                         setStudentAction({
                           mode: "move",
                           studentId: studentMenu.studentId,
                           fromClassId: studentMenu.fromClassId,
                         });
                         closeStudentMenu();
                       }}
                       style={[styles.menuBtn, { borderColor: tint }]}
                     >
                       <ThemedText style={{ color: tint }}>调班</ThemedText>
                     </Pressable>
                     <Pressable
                       onPress={() =>
                         setConfirmDeleteStudentId(studentMenu.studentId)
                       }
                       style={[
                         styles.menuBtn,
                         { borderColor: "rgba(255,0,0,0.5)" },
                       ]}
                     >
                       <ThemedText style={{ color: "#d00" }}>删除</ThemedText>
                     </Pressable>
                   </View>
                   <View style={styles.sheetRow}>
                     <Pressable
                       onPress={closeStudentMenu}
                       style={[styles.headerBtn, { borderColor: tint }]}
                     >
                       <ThemedText style={{ color: tint }}>关闭</ThemedText>
                     </Pressable>
                   </View>
                 </>
               )}
             </ThemedView>
           </View>
         ) : null}

         {createClassOpen ? (
           <View style={styles.overlay}>
             <Pressable
               style={styles.backdrop}
               onPress={() => setCreateClassOpen(false)}
             />
             <ThemedView style={styles.sheet}>
               <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
                 新建班级
               </ThemedText>
               <TextInput
                 value={className}
                 onChangeText={setClassName}
                 placeholder="班级名，例如：小班A / 一年级3班"
                 placeholderTextColor="rgba(127,127,127,0.7)"
                 style={[
                   styles.input,
                   {
                     color: Colors[theme].text,
                     borderColor: "rgba(127,127,127,0.35)",
                   },
                 ]}
               />
               <TextInput
                 value={studentText}
                 onChangeText={setStudentText}
                 placeholder={
                   "学生名单（可选）：一行一个，或用逗号分隔\n例如：张三\n李四\n王五"
                 }
                 placeholderTextColor="rgba(127,127,127,0.7)"
                 multiline
                 style={[
                   styles.textarea,
                   {
                     color: Colors[theme].text,
                     borderColor: "rgba(127,127,127,0.35)",
                   },
                 ]}
               />
               <View style={styles.sheetRow}>
                 <Pressable
                   onPress={() => setCreateClassOpen(false)}
                   style={[styles.headerBtn, { borderColor: tint }]}
                 >
                   <ThemedText style={{ color: tint }}>取消</ThemedText>
                 </Pressable>
                 <Pressable
                   onPress={createClassNow}
                   style={[styles.primaryBtn, { backgroundColor: tint }]}
                 >
                   <ThemedText style={{ color: "#fff" }}>创建</ThemedText>
                 </Pressable>
               </View>
             </ThemedView>
           </View>
         ) : null}
       </ThemedView>
     </SafeAreaView>
   );
 }

 const styles = StyleSheet.create({
   safe: { flex: 1 },
   container: { flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 12 },
   topRow: {
     flexDirection: "row",
     alignItems: "center",
     justifyContent: "space-between",
     gap: 12,
   },
   card: { padding: 12, borderRadius: 12, gap: 10 },
   input: {
     borderWidth: StyleSheet.hairlineWidth,
     borderRadius: 10,
     paddingHorizontal: 12,
     paddingVertical: 10,
   },
   textarea: {
     borderWidth: StyleSheet.hairlineWidth,
     borderRadius: 10,
     paddingHorizontal: 12,
     paddingVertical: 10,
     minHeight: 90,
     textAlignVertical: "top",
   },
   primaryBtn: {
     paddingHorizontal: 12,
     paddingVertical: 10,
     borderRadius: 10,
     alignSelf: "flex-start",
   },
   dangerBtn: {
     paddingHorizontal: 12,
     paddingVertical: 10,
     borderRadius: 10,
     backgroundColor: "#d00",
   },
   headerBtn: {
     paddingHorizontal: 12,
     paddingVertical: 10,
     borderRadius: 10,
     borderWidth: StyleSheet.hairlineWidth,
     alignSelf: "flex-start",
   },
   scroll: { paddingBottom: 24, gap: 12 },
   row: {
     flexDirection: "row",
     alignItems: "center",
     justifyContent: "space-between",
     gap: 10,
   },
   muted: { opacity: 0.7 },
   studentWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
   studentChip: {
     paddingHorizontal: 10,
     paddingVertical: 6,
     borderRadius: 999,
     backgroundColor: "rgba(127,127,127,0.18)",
   },
   studentChipText: { fontSize: 12 },
   overlay: {
     ...StyleSheet.absoluteFillObject,
     paddingTop: 100,
     justifyContent: "flex-start",
   },
   backdrop: {
     ...StyleSheet.absoluteFillObject,
     backgroundColor: "rgba(0,0,0,0.35)",
   },
   sheet: {
     margin: 16,
     padding: 12,
     borderRadius: 14,
     gap: 10,
   },
   sheetRow: {
     flexDirection: "row",
     justifyContent: "flex-end",
     alignItems: "center",
     gap: 10,
   },
   menuBtnList: { gap: 10, marginTop: 6 },
   menuBtn: {
     paddingHorizontal: 12,
     paddingVertical: 12,
     borderRadius: 12,
     borderWidth: StyleSheet.hairlineWidth,
   },
   classPickRow: {
     paddingHorizontal: 12,
     paddingVertical: 12,
     borderRadius: 12,
     borderWidth: StyleSheet.hairlineWidth,
     borderColor: "rgba(127,127,127,0.25)",
     marginTop: 10,
     flexDirection: "row",
     justifyContent: "space-between",
     alignItems: "center",
     gap: 12,
   },
 });
