import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import React, { useEffect } from "react";
import { AuthProvider } from "../context/AuthContext";
import { LiquidGlassMenuProvider } from "../context/LiquidGlassMenuContext";

export default function RootLayout() {
  useEffect(() => {
    try {
      SystemUI.setBackgroundColorAsync("#14181c");
    } catch {}
  }, []);

  return (
    <AuthProvider>
      <LiquidGlassMenuProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#14181c" },
            headerTintColor: "#ffffff",
            headerTitleStyle: { fontWeight: "700", color: "#ffffff" },
            contentStyle: { backgroundColor: "#14181c" },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="library/[id]"
            options={{ title: "Library", headerBackTitle: "Home" }}
          />
          <Stack.Screen
            name="item/[id]"
            options={{
              headerShown: false,
              animation: "slide_from_right",
              gestureEnabled: true,
              fullScreenGestureEnabled: false,
              contentStyle: { backgroundColor: "#14181c" },
            }}
          />
          <Stack.Screen
            name="player/[id]"
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              headerShown: false,
              animation: "slide_from_right",
              gestureEnabled: true,
              contentStyle: { backgroundColor: "#14181c" },
            }}
          />
        </Stack>
      </LiquidGlassMenuProvider>
    </AuthProvider>
  );
}
