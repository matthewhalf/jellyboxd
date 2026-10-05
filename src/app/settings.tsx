import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserAvatar } from "../components/tv/UserAvatar";
import { Gutter, Palette, Radius, Typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useTranslation, type LanguagePreference, type TranslationKey } from "../i18n";
import { haptics } from "../lib/haptics";
import { isDemoServerUrl } from "../services/demo/auth";
import { JellyfinService, SessionExpiredError } from "../services/jellyfin";

// Labels are translation keys, resolved at render time so they follow the selected language
const BITRATE_PRESETS: { bitrate: number; label: TranslationKey; sub: TranslationKey }[] = [
  { bitrate: 0, label: "settings.bitrate.original.label", sub: "settings.bitrate.original.sub" },
  { bitrate: 10000000, label: "settings.bitrate.hd1080.label", sub: "settings.bitrate.hd1080.sub" },
  { bitrate: 4000000, label: "settings.bitrate.hd720.label", sub: "settings.bitrate.hd720.sub" },
  { bitrate: 1500000, label: "settings.bitrate.sd480.label", sub: "settings.bitrate.sd480.sub" },
];

const LANGUAGE_OPTIONS: LanguagePreference[] = ["system", "en", "it"];

export default function SettingsScreen() {
  const { session, savedServers, switchServer, forgetServer, logout } = useAuth();
  const { t, preference, deviceLanguage, setPreference } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const isDemo = session ? isDemoServerUrl(session.serverUrl) : false;
  const activeServerId = session ? `${session.serverUrl}::${session.userId}` : null;

  // Keyed by server id, so switching servers doesn't briefly show the previous one's info as current.
  const [serverInfoResult, setServerInfoResult] = useState<{
    serverId: string | null;
    info: { ServerName?: string; Version?: string; OperatingSystem?: string } | null;
    status: "ok" | "unauthorized" | "unreachable";
  } | null>(null);
  const [selectedBitrate, setSelectedBitrate] = useState<number>(0);
  const [clearingCache, setClearingCache] = useState(false);
  const [refreshingLibrary, setRefreshingLibrary] = useState(false);
  const [scrollY] = useState(() => new Animated.Value(0));

  // Frosted bar + inline title appear only once the large title scrolls under them
  const barOpacity = scrollY.interpolate({
    inputRange: [20, 50],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([
      JellyfinService.fetchServerInfo(session),
      JellyfinService.checkSession(session),
      JellyfinService.getDefaultBitrate(),
    ]).then(([info, status, bitrate]) => {
      if (cancelled) return;
      setServerInfoResult({ serverId: activeServerId, info, status });
      setSelectedBitrate(bitrate);
    });
    return () => {
      cancelled = true;
    };
  }, [session, activeServerId]);

  const loadingServerInfo = serverInfoResult?.serverId !== activeServerId;
  const serverInfo = loadingServerInfo ? null : serverInfoResult?.info ?? null;
  const connectionStatus = loadingServerInfo ? null : serverInfoResult?.status ?? "unreachable";
  const isReachable = connectionStatus === null ? null : connectionStatus === "ok";
  const statusLabel =
    connectionStatus === "unauthorized"
      ? t("settings.status.sessionExpired")
      : connectionStatus === "ok"
        ? t("settings.status.connected")
        : t("settings.status.unreachable");

  const handleSelectBitrate = async (bitrate: number) => {
    haptics.selection();
    setSelectedBitrate(bitrate);
    await JellyfinService.setDefaultBitrate(bitrate);
  };

  const handleRefreshLibrary = async () => {
    if (!session) return;
    haptics.medium();
    setRefreshingLibrary(true);
    const result = await JellyfinService.refreshLibrary(session);
    if (result === "ok") {
      // Image URLs carry no version, so cached artwork would never pick up the new images
      await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]).catch(() => {});
    }
    setRefreshingLibrary(false);
    if (result === "ok") {
      haptics.success();
      Alert.alert(t("settings.refresh.startedTitle"), t("settings.refresh.startedMessage"));
    } else {
      haptics.error();
      Alert.alert(
        t("settings.refresh.failedTitle"),
        result === "forbidden" ? t("settings.refresh.forbidden") : t("settings.refresh.unreachable")
      );
    }
  };

  const handleClearCache = async () => {
    haptics.medium();
    setClearingCache(true);
    try {
      await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]);
      haptics.success();
      Alert.alert(t("settings.cache.clearedTitle"), t("settings.cache.clearedMessage"));
    } catch {
      Alert.alert(t("common.error"), t("settings.cache.failedMessage"));
    } finally {
      setClearingCache(false);
    }
  };

  const handleSwitchServer = async (server: (typeof savedServers)[number]) => {
    if (server.id === activeServerId) return;
    haptics.light();
    setSwitchingId(server.id);
    try {
      await switchServer(server);
    } catch (err: any) {
      haptics.error();
      if (err instanceof SessionExpiredError) {
        Alert.alert(t("settings.status.sessionExpired"), err.message, [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("settings.switchServer.signInAgain"), onPress: () => router.push("/add-server") },
        ]);
      } else {
        Alert.alert(
          t("settings.switchServer.unreachableTitle"),
          err.message || t("settings.switchServer.unreachableMessage", { serverUrl: server.serverUrl })
        );
      }
    } finally {
      setSwitchingId(null);
    }
  };

  const handleForgetServer = (server: (typeof savedServers)[number]) => {
    haptics.medium();
    Alert.alert(
      t("settings.forget.title"),
      t("settings.forget.message", { userName: server.userName, serverUrl: server.serverUrl }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.forget.confirm"),
          style: "destructive",
          onPress: () => {
            forgetServer(server.id);
            if (server.id === activeServerId) router.replace("/");
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    haptics.medium();
    Alert.alert(t("settings.logout.title"), t("settings.logout.message", { userName: session?.userName ?? "" }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.logout.confirm"),
        style: "destructive",
        onPress: () => {
          haptics.warning();
          logout();
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 52 }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
      >
        <Text style={styles.largeTitle}>{t("settings.title")}</Text>

        {session && (
          <View style={styles.profileCard}>
            <UserAvatar session={session} size={60} />
            <View style={styles.profileText}>
              <Text style={styles.profileName} numberOfLines={1}>
                {session.userName}
              </Text>
              <Text style={styles.profileSub} numberOfLines={1}>
                {serverInfo?.ServerName || session.serverUrl}
              </Text>
            </View>
          </View>
        )}

        <Section title={t("settings.server.title")}>
          <InfoRow
            label={t("settings.server.name")}
            value={loadingServerInfo ? null : serverInfo?.ServerName || "Jellyfin"}
          />
          <InfoRow
            label={t("settings.server.version")}
            value={loadingServerInfo ? null : serverInfo?.Version || "—"}
          />
          {!isDemo && <InfoRow label={t("settings.server.address")} value={session?.serverUrl || "—"} />}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t("settings.server.status")}</Text>
            <View style={styles.status}>
              {isReachable === null ? (
                <ActivityIndicator size="small" color={Palette.labelSecondary} />
              ) : (
                <>
                  <View style={[styles.statusDot, !isReachable && styles.statusDotOffline]} />
                  <Text style={styles.rowValue}>{statusLabel}</Text>
                </>
              )}
            </View>
          </View>
          {!isDemo && (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={handleRefreshLibrary}
              disabled={refreshingLibrary}
            >
              <Text style={styles.rowLabel}>{t("settings.server.refreshLibrary")}</Text>
              {refreshingLibrary ? (
                <ActivityIndicator size="small" color={Palette.labelSecondary} />
              ) : (
                <Ionicons name="refresh" size={20} color={Palette.label} />
              )}
            </Pressable>
          )}
        </Section>

        {isDemo && (
          <Section title={t("settings.demo.title")} footer={t("demo.attribution")}>
            <InfoRow label={t("settings.demo.content")} value={t("settings.demo.contentValue")} />
          </Section>
        )}

        {!isDemo && (
          <Section title={t("settings.servers.title")} footer={t("settings.servers.footer")}>
            {savedServers.map((server) => {
              const isActive = server.id === activeServerId;
              return (
                <Pressable
                  key={server.id}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => handleSwitchServer(server)}
                  disabled={switchingId !== null}
                >
                  <View style={styles.rowTextCol}>
                    <Text style={styles.rowLabel}>{server.userName}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {server.serverUrl}
                    </Text>
                  </View>
                  {switchingId === server.id ? (
                    <ActivityIndicator size="small" color={Palette.labelSecondary} />
                  ) : (
                    <View style={styles.status}>
                      {isActive && <Ionicons name="checkmark" size={20} color={Palette.label} />}
                      <Pressable hitSlop={10} onPress={() => handleForgetServer(server)}>
                        <Ionicons name="trash-outline" size={18} color={Palette.labelTertiary} />
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              );
            })}
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => {
                haptics.light();
                router.push("/add-server");
              }}
            >
              <Text style={styles.rowLabel}>{t("settings.servers.add")}</Text>
              <Ionicons name="add-circle-outline" size={20} color={Palette.label} />
            </Pressable>
          </Section>
        )}

        <Section
          title={t("settings.streaming.title")}
          footer={t("settings.streaming.footer")}
        >
          {BITRATE_PRESETS.map((preset) => {
            const isSelected = selectedBitrate === preset.bitrate;
            return (
              <Pressable
                key={preset.bitrate}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => handleSelectBitrate(preset.bitrate)}
              >
                <View style={styles.rowTextCol}>
                  <Text style={styles.rowLabel}>{t(preset.label)}</Text>
                  <Text style={styles.rowSub}>{t(preset.sub)}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark" size={20} color={Palette.label} />}
              </Pressable>
            );
          })}
        </Section>

        <Section title={t("settings.language.title")} footer={t("settings.language.footer")}>
          {LANGUAGE_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => {
                haptics.selection();
                setPreference(option);
              }}
            >
              <View style={styles.rowTextCol}>
                <Text style={styles.rowLabel}>
                  {option === "system"
                    ? t("settings.language.automatic")
                    : t(option === "en" ? "settings.language.english" : "settings.language.italian")}
                </Text>
                {option === "system" && (
                  <Text style={styles.rowSub}>
                    {t("settings.language.automaticDetail", {
                      language: t(
                        deviceLanguage === "it" ? "settings.language.italian" : "settings.language.english"
                      ),
                    })}
                  </Text>
                )}
              </View>
              {preference === option && <Ionicons name="checkmark" size={20} color={Palette.label} />}
            </Pressable>
          ))}
        </Section>

        <Section title={t("settings.account.title")}>
          <InfoRow label={t("settings.account.userName")} value={session?.userName || "—"} />
          <InfoRow label={t("settings.account.userId")} value={session?.userId || "—"} small />
        </Section>

        <Section title={t("settings.storage.title")}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleClearCache}
            disabled={clearingCache}
          >
            <Text style={styles.rowLabel}>{t("settings.storage.clearCache")}</Text>
            {clearingCache && <ActivityIndicator size="small" color={Palette.labelSecondary} />}
          </Pressable>
        </Section>

        <Section>
          <Pressable
            style={({ pressed }) => [styles.row, styles.centerRow, pressed && styles.rowPressed]}
            onPress={handleLogout}
          >
            <Text style={styles.destructive}>{t("settings.logout.confirm")}</Text>
          </Pressable>
        </Section>
      </Animated.ScrollView>

      {/* Floating back button */}
      <View style={[styles.header, { paddingTop: insets.top, height: insets.top + 52 }]}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: barOpacity }]}
          pointerEvents="none"
        >
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.hairline} />
        </Animated.View>
        <Animated.Text
          style={[styles.compactTitle, { top: insets.top, opacity: barOpacity }]}
          pointerEvents="none"
        >
          {t("settings.title")}
        </Animated.Text>
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
      </View>
    </View>
  );
}

function Section({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  const rows = React.Children.toArray(children);
  return (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>}
      <View style={styles.card}>
        {rows.map((row, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={styles.divider} />}
            {row}
          </React.Fragment>
        ))}
      </View>
      {footer && <Text style={styles.sectionFooter}>{footer}</Text>}
    </View>
  );
}

function InfoRow({ label, value, small }: { label: string; value: string | null; small?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value === null ? (
        <ActivityIndicator size="small" color={Palette.labelSecondary} />
      ) : (
        <Text style={[styles.rowValue, small && styles.rowValueSmall]} numberOfLines={1}>
          {value}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  scrollContent: {
    paddingHorizontal: Gutter,
    paddingBottom: 48,
  },
  largeTitle: {
    ...Typography.largeTitle,
    color: Palette.label,
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: Radius.large,
    backgroundColor: Palette.surface,
    marginBottom: 28,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    ...Typography.title3,
    color: Palette.label,
  },
  profileSub: {
    ...Typography.footnote,
    color: Palette.labelSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    ...Typography.footnote,
    color: Palette.labelSecondary,
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  sectionFooter: {
    ...Typography.footnote,
    color: Palette.labelSecondary,
    marginTop: 6,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: Radius.card,
    backgroundColor: Palette.surface,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.separator,
    marginLeft: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  rowPressed: {
    backgroundColor: Palette.surfaceElevated,
  },
  centerRow: {
    justifyContent: "center",
  },
  rowTextCol: {
    flex: 1,
  },
  rowLabel: {
    ...Typography.body,
    color: Palette.label,
  },
  rowSub: {
    ...Typography.footnote,
    color: Palette.labelSecondary,
    marginTop: 1,
  },
  rowValue: {
    ...Typography.body,
    color: Palette.labelSecondary,
    flexShrink: 1,
    textAlign: "right",
  },
  rowValueSmall: {
    ...Typography.footnote,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#30d158",
  },
  statusDotOffline: {
    backgroundColor: "#ff453a",
  },
  destructive: {
    ...Typography.body,
    color: Palette.destructive,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  hairline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.separator,
  },
  compactTitle: {
    ...Typography.headline,
    color: Palette.label,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    lineHeight: 52,
    textAlign: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.glass,
  },
});
