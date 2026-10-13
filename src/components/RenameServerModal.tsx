import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Palette, Radius, Typography } from "../constants/theme";
import { useTranslation } from "../i18n";
import type { SavedServer } from "../services/jellyfin";

interface RenameServerModalProps {
  /** The server being renamed; the modal is hidden while this is null. */
  server: SavedServer | null;
  onCancel: () => void;
  onSave: (name: string) => void;
}

/** Cross-platform text prompt for a saved server's custom name (Alert.prompt is iOS-only). */
export function RenameServerModal({ server, onCancel, onSave }: RenameServerModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");

  useEffect(() => {
    if (server) setName(server.name ?? "");
  }, [server]);

  const save = () => onSave(name);

  return (
    <Modal visible={server !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={t("common.cancel")} />
        <View style={styles.card}>
          <Text style={styles.title}>{t("settings.rename.title")}</Text>
          {server && (
            <Text style={styles.message} numberOfLines={2}>
              {t("settings.rename.message", { userName: server.userName, serverUrl: server.serverUrl })}
            </Text>
          )}
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={server?.userName ?? t("settings.rename.placeholder")}
            placeholderTextColor={Palette.labelTertiary}
            autoFocus
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={save}
            selectionColor={Palette.label}
          />
          <View style={styles.actions}>
            <Pressable style={styles.action} onPress={onCancel} accessibilityRole="button">
              <Text style={styles.actionText}>{t("common.cancel")}</Text>
            </Pressable>
            <View style={styles.actionDivider} />
            <Pressable style={styles.action} onPress={save} accessibilityRole="button">
              <Text style={[styles.actionText, styles.actionPrimary]}>{t("settings.rename.save")}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.scrim,
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: Radius.large,
    backgroundColor: Palette.surfaceElevated,
    paddingTop: 20,
    overflow: "hidden",
  },
  title: {
    ...Typography.headline,
    color: Palette.label,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  message: {
    ...Typography.footnote,
    color: Palette.labelSecondary,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 16,
  },
  input: {
    ...Typography.body,
    color: Palette.label,
    backgroundColor: Palette.surface,
    borderRadius: Radius.small,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actions: {
    flexDirection: "row",
    marginTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.separator,
  },
  action: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Palette.separator,
  },
  actionText: {
    ...Typography.body,
    color: Palette.label,
  },
  actionPrimary: {
    fontWeight: "600",
  },
});
