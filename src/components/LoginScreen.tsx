import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gutter, Palette, Radius, Typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { haptics } from "../lib/haptics";
import { SavedServer } from "../services/jellyfin";
import { ServerLoginForm } from "./ServerLoginForm";

export const LoginScreen: React.FC = () => {
  const { savedServers, switchServer, forgetServer } = useAuth();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const hasSavedServers = savedServers.length > 0;

  const handleSwitch = async (server: SavedServer) => {
    haptics.light();
    setSwitchingId(server.id);
    try {
      await switchServer(server);
    } catch (err: any) {
      haptics.error();
      Alert.alert(
        "Server non raggiungibile",
        err.message || `Impossibile connettersi a "${server.serverUrl}".`
      );
    } finally {
      setSwitchingId(null);
    }
  };

  const handleForget = (server: SavedServer) => {
    haptics.medium();
    Alert.alert("Rimuovi server", `Dimenticare l'accesso a "${server.userName}" su ${server.serverUrl}?`, [
      { text: "Annulla", style: "cancel" },
      { text: "Rimuovi", style: "destructive", onPress: () => forgetServer(server.id) },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.brandContainer}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.wordmark}>jellyboxd</Text>
          <Text style={styles.subtitle}>
            {hasSavedServers ? "Scegli un server o aggiungine uno nuovo" : "Accedi al tuo server Jellyfin"}
          </Text>
        </View>

        {hasSavedServers && (
          <View style={styles.savedGroup}>
            {savedServers.map((server, i) => (
              <View key={server.id}>
                {i > 0 && <View style={styles.divider} />}
                <Pressable
                  style={({ pressed }) => [styles.savedRow, pressed && styles.savedRowPressed]}
                  onPress={() => handleSwitch(server)}
                  disabled={switchingId !== null}
                >
                  <View style={styles.savedIcon}>
                    <Ionicons name="server-outline" size={18} color={Palette.label} />
                  </View>
                  <View style={styles.savedTextCol}>
                    <Text style={styles.savedName} numberOfLines={1}>
                      {server.userName}
                    </Text>
                    <Text style={styles.savedSub} numberOfLines={1}>
                      {server.serverUrl}
                    </Text>
                  </View>
                  {switchingId === server.id ? (
                    <ActivityIndicator size="small" color={Palette.labelSecondary} />
                  ) : (
                    <Pressable hitSlop={10} onPress={() => handleForget(server)}>
                      <Ionicons name="trash-outline" size={18} color={Palette.labelTertiary} />
                    </Pressable>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {hasSavedServers && <Text style={styles.orLabel}>OPPURE AGGIUNGI UN NUOVO SERVER</Text>}

        <ServerLoginForm submitLabel={hasSavedServers ? "Aggiungi server" : "Accedi"} />

        <Text style={styles.footerText}>
          I progressi di visione vengono sincronizzati automaticamente con Jellyfin.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Gutter,
    paddingVertical: 32,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 36,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 20,
    marginBottom: 18,
  },
  wordmark: {
    ...Typography.largeTitle,
    fontWeight: "900",
    letterSpacing: -0.8,
    color: Palette.label,
  },
  subtitle: {
    ...Typography.subhead,
    color: Palette.labelSecondary,
    marginTop: 6,
  },
  savedGroup: {
    borderRadius: Radius.card,
    backgroundColor: Palette.surface,
    overflow: "hidden",
    marginBottom: 18,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  savedRowPressed: {
    backgroundColor: Palette.surfaceElevated,
  },
  savedIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  savedTextCol: {
    flex: 1,
  },
  savedName: {
    ...Typography.body,
    fontWeight: "600",
    color: Palette.label,
  },
  savedSub: {
    ...Typography.footnote,
    color: Palette.labelSecondary,
    marginTop: 1,
  },
  orLabel: {
    ...Typography.caption1,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: Palette.labelTertiary,
    textAlign: "center",
    marginBottom: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.separator,
    marginLeft: 16,
  },
  footerText: {
    ...Typography.footnote,
    color: Palette.labelTertiary,
    textAlign: "center",
    marginTop: 28,
  },
});
