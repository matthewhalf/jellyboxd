import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { createContext, useContext, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { haptics } from "../lib/haptics";
import { JellyfinItem, JellyfinService, JellyfinSession } from "../services/jellyfin";

interface OpenMenuOptions {
  item: JellyfinItem;
  session?: JellyfinSession | null;
  onRefresh?: () => void;
  seriesOnly?: boolean;
}

interface LiquidGlassMenuContextType {
  openMenu: (options: OpenMenuOptions) => void;
  closeMenu: () => void;
}

const LiquidGlassMenuContext = createContext<LiquidGlassMenuContextType | null>(null);

export function useLiquidGlassMenu() {
  const ctx = useContext(LiquidGlassMenuContext);
  if (!ctx) {
    throw new Error("useLiquidGlassMenu must be used within a LiquidGlassMenuProvider");
  }
  return ctx;
}

export function LiquidGlassMenuProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [menuData, setMenuData] = useState<OpenMenuOptions | null>(null);

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const openMenu = (options: OpenMenuOptions) => {
    haptics.heavy();
    setMenuData(options);
    setVisible(true);

    scaleAnim.setValue(0.92);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.94,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setMenuData(null);
    });
  };

  const item = menuData?.item;
  const session = menuData?.session;
  const seriesId =
    item?.SeriesId || (item?.Type === "Series" ? item?.Id : null);
  const isPlayed = !!item?.UserData?.Played;

  // Thumbnail
  const thumbUrl =
    session && item
      ? item.Type === "Episode"
        ? JellyfinService.getImageUrl(session.serverUrl, item.Id, "Primary", 300)
        : JellyfinService.getImageUrl(
            session.serverUrl,
            item.ParentBackdropItemId || item.Id,
            item.Type === "Movie" ? "Primary" : "Backdrop",
            300
          )
      : null;

  const handleGoToSeries = () => {
    if (seriesId) {
      haptics.light();
      closeMenu();
      router.push(`/item/${seriesId}`);
    }
  };

  const handleTogglePlayed = async () => {
    if (session && item) {
      haptics.medium();
      closeMenu();
      const success = await JellyfinService.markItemPlayed(
        session,
        item.Id,
        !isPlayed
      );
      if (success) {
        haptics.success();
        menuData.onRefresh?.();
      }
    }
  };

  return (
    <LiquidGlassMenuContext.Provider value={{ openMenu, closeMenu }}>
      {children}

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={styles.modalOverlay}>
          {/* Frosted liquid background blur */}
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />

          {/* Animated Liquid Glass Sheet */}
          {item && (
            <Animated.View
              style={[
                styles.sheetWrapper,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <View style={styles.sheetContainer}>
                <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

                {/* Header Preview */}
                <View style={styles.header}>
                  {thumbUrl && (
                    <Image
                      source={{ uri: thumbUrl }}
                      style={styles.headerThumb}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.headerTextCol}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                      {item.Type === "Episode"
                        ? item.SeriesName || item.Name
                        : item.Name}
                    </Text>
                    {item.Type === "Episode" ? (
                      <Text style={styles.headerSub} numberOfLines={1}>
                        S{item.ParentIndexNumber ?? 1}:E{item.IndexNumber ?? 1} •{" "}
                        {item.Name}
                      </Text>
                    ) : item.ProductionYear ? (
                      <Text style={styles.headerSub}>
                        {item.ProductionYear}
                        {item.Type ? ` • ${item.Type === "Movie" ? "Film" : "Serie"}` : ""}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Action 1: Vai alla serie */}
                {seriesId && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionRow,
                      pressed && styles.actionRowPressed,
                    ]}
                    onPress={handleGoToSeries}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons name="tv-outline" size={20} color="#ffffff" />
                    </View>
                    <Text style={styles.actionText}>Vai alla serie</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#678"
                      style={styles.chevron}
                    />
                  </Pressable>
                )}

                {/* Action 2: Segna come visto / non visto (if not seriesOnly) */}
                {!menuData?.seriesOnly && session && item.Type !== "Series" && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionRow,
                      pressed && styles.actionRowPressed,
                    ]}
                    onPress={handleTogglePlayed}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons
                        name={
                          isPlayed
                            ? "checkmark-circle"
                            : "checkmark-circle-outline"
                        }
                        size={20}
                        color={isPlayed ? "#ffffff" : "rgba(255,255,255,0.6)"}
                      />
                    </View>
                    <Text style={styles.actionText}>
                      {isPlayed ? "Segna come non visto" : "Segna come visto"}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#678"
                      style={styles.chevron}
                    />
                  </Pressable>
                )}

                {/* Action 3: Annulla */}
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.cancelButtonPressed,
                  ]}
                  onPress={closeMenu}
                >
                  <Text style={styles.cancelText}>Annulla</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>
    </LiquidGlassMenuContext.Provider>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  sheetWrapper: {
    width: "100%",
    maxWidth: 420,
  },
  sheetContainer: {
    backgroundColor: "rgba(20, 24, 30, 0.78)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    overflow: "hidden",
    padding: 16,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  headerThumb: {
    width: 58,
    height: 58,
    borderRadius: 6,
    backgroundColor: "#2c3440",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  headerTextCol: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  headerSub: {
    fontSize: 13,
    color: "#9ab",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 12,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  actionRowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  chevron: {
    marginLeft: 6,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cancelButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#9ab",
  },
});
