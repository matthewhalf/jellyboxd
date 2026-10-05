import type { ItemsPage, JellyfinItem } from "../jellyfin";
import { DEMO_EPISODES, DEMO_LIBRARIES, DEMO_MOVIES, DEMO_SEASONS, DEMO_SERIES } from "./fixtures";

type UserData = NonNullable<JellyfinItem["UserData"]>;

const ALL_ITEMS: JellyfinItem[] = [
  ...DEMO_LIBRARIES,
  ...DEMO_MOVIES,
  ...DEMO_SERIES,
  ...DEMO_SEASONS,
  ...DEMO_EPISODES,
];

const DAY_MS = 24 * 60 * 60 * 1000;
const TICKS_PER_MINUTE = 600_000_000;

/** Mutable per-user state (favorites, progress, played), kept apart so the exported fixtures are never touched. */
const userState = new Map<string, UserData>();

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function find(itemId: string): JellyfinItem | undefined {
  return ALL_ITEMS.find((i) => i.Id === itemId);
}

function withState(item: JellyfinItem): JellyfinItem {
  return { ...item, UserData: { ...item.UserData, ...userState.get(item.Id) } };
}

function patchState(itemId: string, patch: Partial<UserData>): void {
  userState.set(itemId, { ...userState.get(itemId), ...patch });
}

function lastPlayed(item: JellyfinItem): number {
  const date = withState(item).UserData?.LastPlayedDate;
  return date ? Date.parse(date) : 0;
}

function byName(a: JellyfinItem, b: JellyfinItem): number {
  return a.Name.localeCompare(b.Name);
}

function byNewest(a: JellyfinItem, b: JellyfinItem): number {
  return (b.DateCreated ?? "").localeCompare(a.DateCreated ?? "");
}

function page(items: JellyfinItem[], startIndex: number, limit: number): ItemsPage {
  return { items: items.slice(startIndex, startIndex + limit).map(withState), total: items.length, ok: true };
}

function episodesOf(seriesId: string): JellyfinItem[] {
  return DEMO_EPISODES.filter((e) => e.SeriesId === seriesId).sort(
    (a, b) => (a.ParentIndexNumber ?? 0) - (b.ParentIndexNumber ?? 0) || (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0)
  );
}

function resetState(): void {
  userState.clear();
  // Something to "continue watching" from the very first screen the reviewer sees
  patchState("demo-movie-bbb", {
    PlaybackPositionTicks: 4 * TICKS_PER_MINUTE,
    PlayedPercentage: 40,
    LastPlayedDate: new Date(Date.now() - DAY_MS).toISOString(),
  });
  patchState("demo-ep-cam1", { Played: true, LastPlayedDate: new Date(Date.now() - 2 * DAY_MS).toISOString() });
}

function nextUpForSeries(seriesId: string): JellyfinItem | null {
  const episodes = episodesOf(seriesId);
  let lastPlayedIndex = -1;
  episodes.forEach((e, index) => {
    if (withState(e).UserData?.Played) lastPlayedIndex = index;
  });
  if (lastPlayedIndex === -1) return null;
  const next = episodes.slice(lastPlayedIndex + 1).find((e) => !withState(e).UserData?.Played);
  return next ? withState(next) : null;
}

function nextUp(limit: number): JellyfinItem[] {
  return DEMO_SERIES.map((s) => nextUpForSeries(s.Id))
    .filter((e): e is JellyfinItem => e !== null)
    .sort((a, b) => seriesRecency(b.SeriesId) - seriesRecency(a.SeriesId))
    .slice(0, limit);
}

function seriesRecency(seriesId?: string): number {
  return Math.max(0, ...episodesOf(seriesId ?? "").map(lastPlayed));
}

function resumeItems(): JellyfinItem[] {
  return [...DEMO_MOVIES, ...DEMO_EPISODES]
    .map(withState)
    .filter((i) => (i.UserData?.PlaybackPositionTicks ?? 0) > 0 && !i.UserData?.Played)
    .sort((a, b) => lastPlayed(b) - lastPlayed(a));
}

function lastPlayedDates(): Map<string, number> {
  const dates = new Map<string, number>();
  for (const item of [...DEMO_MOVIES, ...DEMO_EPISODES]) {
    const state = withState(item).UserData;
    if (!state?.Played || !state.LastPlayedDate) continue;
    const key = item.SeriesId || item.Id;
    const played = Date.parse(state.LastPlayedDate);
    if (played > (dates.get(key) ?? 0)) dates.set(key, played);
  }
  return dates;
}

function continueWatching(): JellyfinItem[] {
  const resume = resumeItems();
  const seenSeries = new Set(resume.map((i) => i.SeriesId).filter(Boolean));
  const upcoming = nextUp(20).filter((i) => {
    if (i.SeriesId && seenSeries.has(i.SeriesId)) return false;
    if (i.SeriesId) seenSeries.add(i.SeriesId);
    return true;
  });
  const recency = (item: JellyfinItem) => Math.max(lastPlayed(item), seriesRecency(item.SeriesId));
  return [...resume, ...upcoming]
    .map((item, index) => ({ item, index, time: recency(item) }))
    .sort((a, b) => b.time - a.time || a.index - b.index)
    .map(({ item }) => item);
}

function setPlayed(itemId: string, played: boolean): boolean {
  const item = find(itemId);
  if (!item) return false;
  const targets = item.Type === "Series" ? episodesOf(item.Id) : [item];
  for (const target of targets) {
    patchState(target.Id, {
      Played: played,
      PlaybackPositionTicks: 0,
      PlayedPercentage: 0,
      LastPlayedDate: played ? new Date().toISOString() : undefined,
    });
  }
  return true;
}

function setFavorite(itemId: string, favorite: boolean): boolean {
  if (!find(itemId)) return false;
  patchState(itemId, { IsFavorite: favorite });
  return true;
}

function reportProgress(itemId: string, positionTicks: number): void {
  const item = find(itemId);
  if (!item?.RunTimeTicks) return;
  const percentage = Math.min(100, (positionTicks / item.RunTimeTicks) * 100);
  if (percentage >= 95) {
    setPlayed(itemId, true);
    return;
  }
  patchState(itemId, {
    PlaybackPositionTicks: positionTicks,
    PlayedPercentage: percentage,
    LastPlayedDate: new Date().toISOString(),
  });
}

function search(query: string, types: string): JellyfinItem[] {
  const needle = fold(query);
  if (!needle) return [];
  const wanted = new Set(types.split(",").map((t) => t.trim()));
  return [...DEMO_MOVIES, ...DEMO_SERIES, ...DEMO_EPISODES]
    .filter((i) => wanted.has(i.Type) && fold(i.Name).includes(needle))
    .sort(byName)
    .map(withState);
}

resetState();

export const demoBackend = {
  resetState,
  featured: (limit: number) => [...DEMO_SERIES, ...DEMO_MOVIES].sort(byNewest).slice(0, limit).map(withState),
  continueWatching,
  resumeItems,
  lastPlayedDates,
  libraries: () => DEMO_LIBRARIES.map(withState),
  libraryItemsPage: (parentId: string, startIndex: number, limit: number): ItemsPage => {
    const source = parentId === "demo-lib-movies" ? DEMO_MOVIES : parentId === "demo-lib-series" ? DEMO_SERIES : [];
    return page([...source].sort(byName), startIndex, limit);
  },
  moviesPage: (startIndex: number, limit: number) => page([...DEMO_MOVIES].sort(byName), startIndex, limit),
  seriesPage: (startIndex: number, limit: number) => page([...DEMO_SERIES].sort(byName), startIndex, limit),
  latestMovies: (limit: number) => [...DEMO_MOVIES].sort(byNewest).slice(0, limit).map(withState),
  latestSeries: (limit: number) => [...DEMO_SERIES].sort(byNewest).slice(0, limit).map(withState),
  nextUp,
  nextUpForSeries,
  search,
  seasons: (seriesId: string) => DEMO_SEASONS.filter((s) => s.SeriesId === seriesId).map(withState),
  episodes: (seriesId: string, seasonId: string) =>
    episodesOf(seriesId)
      .filter((e) => e.SeasonId === seasonId)
      .map(withState),
  itemDetails: (itemId: string): JellyfinItem | null => {
    const item = find(itemId);
    return item ? withState(item) : null;
  },
  setPlayed,
  setFavorite,
  reportProgress,
};
