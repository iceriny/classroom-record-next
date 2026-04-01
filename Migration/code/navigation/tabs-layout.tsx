 import { Tabs } from "expo-router";
import React from "react";

 import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

 export default function TabLayout() {
   const colorScheme = useColorScheme();

   return (
     <Tabs
       screenOptions={{
         tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
         headerShown: false,
         tabBarButton: HapticTab,
       }}
       initialRouteName="collect"
     >
       <Tabs.Screen
         name="collect"
         options={{
           title: "采集",
           tabBarIcon: ({ color }) => (
             <IconSymbol size={28} name="camera.fill" color={color} />
           ),
         }}
       />
       <Tabs.Screen
         name="gallery"
         options={{
           title: "画廊",
           tabBarIcon: ({ color }) => (
             <IconSymbol size={28} name="photo.on.rectangle" color={color} />
           ),
         }}
       />
       <Tabs.Screen
         name="manage"
         options={{
           title: "管理",
           tabBarIcon: ({ color }) => (
             <IconSymbol size={28} name="gearshape.fill" color={color} />
           ),
         }}
       />
     </Tabs>
   );
 }
