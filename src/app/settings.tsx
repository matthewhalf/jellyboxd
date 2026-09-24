import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { haptics } from "../lib/haptics";
import { JellyfinService } from "../services/jellyfin";

const BITRATE_PRESETS = [
  { label: "Originale (Direct Play)", bitrate: 0, sub: "Massima qualità senza compressione" },
  { label: "1080p - 10 Mbps", bitrate: 10000000, sub: "Alta definizione ottimizzata" },
  { label: "720p - 4 Mbps", bitrate: 4000000, sub: "Ideale sotto rete mobile 4G" },
  { label: "480p - 1.5 Mbps", bitrate: 1500000, sub: "Basso consumo dati" },
];

export default function SettingsScreen() {
  const { session, logout } = useAuth();
  const router = useRouter();

  const [serverInfo, setServerInfo] = useState<{
    ServerName?: string;
    Version?: string;
    OperatingSystem?: string;
  } | null>(null);
  const [loadingServerInfo, setLoadingServerInfo] = useState(false);
  const [selectedBitrate, setSelectedBitrate] = useState<number>(0);
  const [clearingCache, setClearingCache] = useState(false);

  useEffect(() => {
    if (!session) return;
    setLoadingServerInfo(true);
    Promise.all([
      JellyfinService.fetchServerInfo(session),
      JellyfinService.getDefaultBitrate(),
    ])
      .then(([info, bitrate]) => {
        setServerInfo(info);
        setSelectedBitrate(bitrate);
      })
      .finally(() => setLoadingServerInfo(false));
  }, [session]);

  const handleSelectBitrate = async (bitrate: number) => {
    haptics.selection();
    setSelectedBitrate(bitrate);
    await JellyfinService.setDefaultBitrate(bitrate);
  };

  const handleClearCache = async () => {
    haptics.medium();
    setClearingCache(true);
    try {
      await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]);
      haptics.success();
      Alert.alert(
        "Cache svuotata",
        "La cache locale delle immagini è stata cancellata con successo.",
        [{ text: "OK" }]
      );
    } catch {
      Alert.alert("Errore", "Impossibile cancellare la cache delle immagini.");
    } finally {
      setClearingCache(false);
    }
  };

  const handleLogout = () => {
    haptics.medium();
    Alert.alert(
      "Disconnessione",
      `Vuoi disconnetterti dall'account @${session?.userName}?`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Disconnetti",
          style: "destructive",
          onPress: () => {
            haptics.warning();
            logout();
            router.replace("/");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => {
            haptics.light();
            router.back();
          }}
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>Impostazioni</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Server & Connessione */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SERVER & CONNESSIONE</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Nome Server</Text>
              <Text style={styles.rowValue}>
                {loadingServerInfo ? (
                  <ActivityIndicator size="small" color="#8e8e93" />
                ) : (
                  serverInfo?.ServerName || "Jellyfin Server"
                )}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Versione Jellyfin</Text>
              <Text style={styles.rowValue}>
                {loadingServerInfo ? "Caricamento..." : serverInfo?.Version || "10.x"}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Indirizzo Server</Text>
              <Text style={styles.rowValue} numberOfLines={1}>
                {session?.serverUrl || "Non disponibile"}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Stato Connessione</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Connesso</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 2: Profilo Utente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROFILO UTENTE</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Nome Utente</Text>
              <Text style={styles.rowValueHighlight}>@{session?.userName}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>ID Utente</Text>
              <Text style={[styles.rowValue, styles.monoText]} numberOfLines={1}>
                {session?.userId}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 3: Riproduzione & Qualità Predefinita */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUALITÀ STREAMING PREDEFINITA</Text>
          <View style={styles.card}>
            {BITRATE_PRESETS.map((preset, index) => {
              const isSelected = selectedBitrate === preset.bitrate;
              return (
                <React.Fragment key={preset.bitrate}>
                  {index > 0 && <View style={styles.divider} />}
                  <Pressable
                    style={({ pressed }) => [
                      styles.selectableRow,
                      pressed && styles.selectableRowPressed,
                    ]}
                    onPress={() => handleSelectBitrate(preset.bitrate)}
                  >
                    <View style={styles.selectableCol}>
                      <Text style={[styles.selectableLabel, isSelected && styles.selectableLabelActive]}>
                        {preset.label}
                      </Text>
                      <Text style={styles.selectableSub}>{preset.sub}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color="#ffffff" />
                    )}
                  </Pressable>
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Section 4: Archiviazione & Cache */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARCHIVIAZIONE & CACHE</Text>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
              onPress={handleClearCache}
              disabled={clearingCache}
            >
              <View style={styles.actionCol}>
                <Text style={styles.actionLabel}>Svuota cache immagini</Text>
                <Text style={styles.actionSub}>Libera spazio di archiviazione locale su disco</Text>
              </View>
              {clearingCache ? (
                <ActivityIndicator size="small" color="#8e8e93" />
              ) : (
                <Ionicons name="trash-outline" size={18} color="#89a" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Section 5: Account & Logout */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.logoutRow, pressed && styles.logoutRowPressed]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#ff453a" />
              <Text style={styles.logoutLabel}>Disconnetti</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#14181c",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f252c",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#89a",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: "#1f252c",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2c3440",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#2c3440",
    marginLeft: 16,
  },
  rowLabel: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 14,
    color: "#8e8e93",
    maxWidth: "55%",
    textAlign: "right",
  },
  rowValueHighlight: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "700",
  },
  monoText: {
    fontSize: 12,
    color: "#8e8e93",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(52, 199, 89, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34c759",
  },
  statusText: {
    color: "#34c759",
    fontSize: 12,
    fontWeight: "700",
  },
  selectableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectableRowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  selectableCol: {
    flex: 1,
    paddingRight: 12,
  },
  selectableLabel: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
  selectableLabelActive: {
    fontWeight: "700",
    color: "#ffffff",
  },
  selectableSub: {
    fontSize: 12,
    color: "#8e8e93",
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionRowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  actionCol: {
    flex: 1,
    paddingRight: 12,
  },
  actionLabel: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
  actionSub: {
    fontSize: 12,
    color: "#8e8e93",
    marginTop: 2,
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  logoutRowPressed: {
    backgroundColor: "rgba(255, 69, 58, 0.08)",
  },
  logoutLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ff453a",
  },
});
