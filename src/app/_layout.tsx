import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#14181c" },
          headerTintColor: "#00e054",
          headerTitleStyle: { fontWeight: "700", color: "#ffffff" },
          contentStyle: { backgroundColor: "#14181c" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="library/[id]"
          options={{ title: "Library", headerBackTitle: "Home" }}
        />
        <Stack.Screen
          name="item/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="player/[id]"
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
      </Stack>
    </AuthProvider>
  );
}
