import React, { useState } from "react";
import { ActivityIndicator, Alert, Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Palette, Radius, Typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { usePressScale } from "../hooks/use-press-scale";
import { useTranslation } from "../i18n";

interface ServerLoginFormProps {
  submitLabel?: string;
  onSuccess?: () => void;
}

/** Server URL + credentials fields and submit button, shared by the first-time login screen and "add server". */
export function ServerLoginForm({ submitLabel, onSuccess }: ServerLoginFormProps) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);

  const handleLogin = async () => {
    if (!serverUrl.trim() || !username.trim()) {
      Alert.alert(t("login.attentionTitle"), t("login.missingFields"));
      return;
    }

    setIsLoading(true);
    try {
      await login(serverUrl.trim(), username.trim(), password);
      onSuccess?.();
    } catch (err: any) {
      Alert.alert(t("login.failedTitle"), err.message || t("login.failedMessage"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <View style={styles.fieldGroup}>
        <TextInput
          style={styles.input}
          placeholder={t("login.serverPlaceholder")}
          placeholderTextColor={Palette.labelTertiary}
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          textContentType="URL"
          selectionColor={Palette.label}
        />
        <View style={styles.divider} />
        <TextInput
          style={styles.input}
          placeholder={t("login.usernamePlaceholder")}
          placeholderTextColor={Palette.labelTertiary}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          selectionColor={Palette.label}
        />
        <View style={styles.divider} />
        <TextInput
          style={styles.input}
          placeholder={t("login.passwordPlaceholder")}
          placeholderTextColor={Palette.labelTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
          selectionColor={Palette.label}
        />
      </View>

      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={handleLogin}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={isLoading}
          accessibilityRole="button"
          style={[styles.button, isLoading && styles.buttonDisabled]}
        >
          {isLoading ? (
            <ActivityIndicator color={Palette.buttonPrimaryLabel} />
          ) : (
            <Text style={styles.buttonText}>{submitLabel ?? t("login.signIn")}</Text>
          )}
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    borderRadius: Radius.card,
    backgroundColor: Palette.surface,
    overflow: "hidden",
  },
  input: {
    ...Typography.body,
    color: Palette.label,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.separator,
    marginLeft: 16,
  },
  button: {
    height: 50,
    marginTop: 24,
    borderRadius: Radius.pill,
    backgroundColor: Palette.buttonPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...Typography.headline,
    color: Palette.buttonPrimaryLabel,
  },
});
