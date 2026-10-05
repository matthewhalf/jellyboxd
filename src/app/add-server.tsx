import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ServerLoginForm } from "../components/ServerLoginForm";
import { Gutter, Palette, Typography } from "../constants/theme";
import { useTranslation } from "../i18n";
import { haptics } from "../lib/haptics";

export default function AddServerScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top, height: insets.top + 52 }]}>
        <Pressable
          onPress={() => {
            haptics.light();
            router.back();
          }}
          hitSlop={10}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="chevron-back" size={22} color={Palette.label} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("addServer.title")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 68 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>{t("addServer.subtitle")}</Text>

        <ServerLoginForm submitLabel={t("login.signIn")} onSuccess={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 1,
  },
  headerTitle: {
    ...Typography.headline,
    color: Palette.label,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.glass,
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Gutter,
    paddingBottom: 32,
  },
  subtitle: {
    ...Typography.subhead,
    color: Palette.labelSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
});
