import { Image } from "react-native";
import type { JellyfinImageType } from "../jellyfin";

/** Frames extracted from the demo films (see docs/store/attribution.md). Metro needs static require()s. */
const ART = {
  bbb: { poster: require("../../../assets/demo/bbb-poster.jpg"), backdrop: require("../../../assets/demo/bbb-backdrop.jpg") },
  sintel: { poster: require("../../../assets/demo/sintel-poster.jpg"), backdrop: require("../../../assets/demo/sintel-backdrop.jpg") },
  tos: { poster: require("../../../assets/demo/tos-poster.jpg"), backdrop: require("../../../assets/demo/tos-backdrop.jpg") },
  ed: { poster: require("../../../assets/demo/ed-poster.jpg"), backdrop: require("../../../assets/demo/ed-backdrop.jpg") },
  cosmos: { poster: require("../../../assets/demo/cosmos-poster.jpg"), backdrop: require("../../../assets/demo/cosmos-backdrop.jpg") },
  spring: { poster: require("../../../assets/demo/spring-poster.jpg"), backdrop: require("../../../assets/demo/spring-backdrop.jpg") },
  cam1: { poster: require("../../../assets/demo/cam1-poster.jpg"), backdrop: require("../../../assets/demo/cam1-backdrop.jpg") },
  cam2: { poster: require("../../../assets/demo/cam2-poster.jpg"), backdrop: require("../../../assets/demo/cam2-backdrop.jpg") },
  cam3: { poster: require("../../../assets/demo/cam3-poster.jpg"), backdrop: require("../../../assets/demo/cam3-backdrop.jpg") },
  hero: { poster: require("../../../assets/demo/hero-poster.jpg"), backdrop: require("../../../assets/demo/hero-backdrop.jpg") },
  wingit: { poster: require("../../../assets/demo/wingit-poster.jpg"), backdrop: require("../../../assets/demo/wingit-backdrop.jpg") },
  sprite: { poster: require("../../../assets/demo/sprite-poster.jpg"), backdrop: require("../../../assets/demo/sprite-backdrop.jpg") },
} as const;

export type DemoArtKey = keyof typeof ART;

/** Which frame represents which item. Episodes use their own frame as a 16:9 thumbnail; series and seasons borrow one. */
const ART_BY_ID: Record<string, { key: DemoArtKey; primary: "poster" | "backdrop" }> = {
  "demo-movie-bbb": { key: "bbb", primary: "poster" },
  "demo-movie-sintel": { key: "sintel", primary: "poster" },
  "demo-movie-tos": { key: "tos", primary: "poster" },
  "demo-movie-ed": { key: "ed", primary: "poster" },
  "demo-movie-cosmos": { key: "cosmos", primary: "poster" },
  "demo-movie-spring": { key: "spring", primary: "poster" },
  "demo-series-caminandes": { key: "cam1", primary: "poster" },
  "demo-season-caminandes-1": { key: "cam1", primary: "poster" },
  "demo-series-shorts": { key: "sprite", primary: "poster" },
  "demo-season-shorts-1": { key: "sprite", primary: "poster" },
  "demo-ep-cam1": { key: "cam1", primary: "backdrop" },
  "demo-ep-cam2": { key: "cam2", primary: "backdrop" },
  "demo-ep-cam3": { key: "cam3", primary: "backdrop" },
  "demo-ep-hero": { key: "hero", primary: "backdrop" },
  "demo-ep-wingit": { key: "wingit", primary: "backdrop" },
  "demo-ep-sprite": { key: "sprite", primary: "backdrop" },
};

const FALLBACK = { key: "bbb", primary: "backdrop" } as const;
/** Last resort if a bundled asset can't be resolved: the Big Buck Bunny thumbnail on archive.org. */
const FALLBACK_URI = "https://archive.org/services/img/BigBuckBunny_124";

/** Resolves an item's artwork to a uri that expo-image can load (a bundled asset), never a demo:// url. */
export function demoImageUrl(itemId: string, type: JellyfinImageType): string {
  const entry = ART_BY_ID[itemId] ?? FALLBACK;
  const which = type === "Primary" ? entry.primary : "backdrop";
  return Image.resolveAssetSource(ART[entry.key][which])?.uri ?? FALLBACK_URI;
}
