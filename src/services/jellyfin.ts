import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { t } from "../i18n/translate";
import { createDemoSession, isDemoCredentials, isDemoServerUrl } from "./demo/auth";
import { demoBackend } from "./demo/backend";
import { DEMO_STREAMS } from "./demo/fixtures";
import { demoImageUrl } from "./demo/images";
import { normalizeServerUrl } from "./server-url";

export interface JellyfinSession {
  serverUrl: string;
  token: string;
  userId: string;
  userName: string;
  serverId?: string;
}

/** A remembered login, so the user can switch between Jellyfin servers/accounts without retyping credentials. */
export interface SavedServer extends JellyfinSession {
  /** Stable key: serverUrl + userId, since the same server can have several saved users. */
  id: string;
  /** Optional label chosen by the user; the UI falls back to the user name when it's missing. */
  name?: string;
}

/** What to show as a saved server's title: its custom name, or the account it logs into. */
export function savedServerLabel(server: SavedServer): string {
  return server.name || server.userName;
}

/** Secondary line under a saved server's title: the account is only repeated when a custom name hides it. */
export function savedServerSubtitle(server: SavedServer): string {
  return server.name ? `${server.userName} · ${server.serverUrl}` : server.serverUrl;
}

export interface MediaStreamInfo {
  Type: "Video" | "Audio" | "Subtitle";
  Codec?: string;
  Language?: string;
  DisplayTitle?: string;
  Title?: string;
  Index: number;
  IsDefault?: boolean;
  IsForced?: boolean;
  /** Set by Jellyfin for subtitles it can convert to WebVTT (SRT, ASS, ...), unlike image-based ones (PGS, VobSub). */
  IsTextSubtitleStream?: boolean;
  Width?: number;
  Height?: number;
  VideoRange?: string;
  VideoRangeType?: string;
  Channels?: number;
  ChannelLayout?: string;
  BitRate?: number;
  AudioSpatialFormat?: string;
}

/**
 * How Jellyfin delivers subtitles in the HLS stream. "Hls" lists every text subtitle in the manifest,
 * so the iOS player shows them in its own subtitles menu; "Encode" burns a single one into the video.
 * (Left out, master.m3u8 defaults to "External" and the player never sees any subtitle.)
 */
export type SubtitleMethod = "Hls" | "Encode";

export interface MediaSourceInfo {
  Id: string;
  Container?: string;
  MediaStreams?: MediaStreamInfo[];
}

export interface JellyfinPerson {
  Id: string;
  Name: string;
  Role?: string;
  Type?: "Actor" | "Director" | "Writer" | "Producer" | "GuestStar" | string;
  PrimaryImageTag?: string;
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  Type: "Movie" | "Series" | "Episode" | "Season" | "CollectionFolder" | string;
  Overview?: string;
  CommunityRating?: number;
  ProductionYear?: number;
  RunTimeTicks?: number;
  UserData?: {
    PlaybackPositionTicks?: number;
    PlayedPercentage?: number;
    IsFavorite?: boolean;
    Played?: boolean;
    LastPlayedDate?: string;
  };
  SeriesName?: string;
  SeriesId?: string;
  SeasonName?: string;
  SeasonId?: string;
  IndexNumber?: number; // Episode number or Season number
  ParentIndexNumber?: number; // Season number
  ParentBackdropItemId?: string;
  ParentLogoItemId?: string;
  ImageTags?: Partial<Record<"Primary" | "Logo" | "Thumb" | string, string>>;
  BackdropImageTags?: string[];
  PremiereDate?: string;
  /** When the item was added to the library. */
  DateCreated?: string;
  /** Series only: when the latest episode/season was added. */
  DateLastMediaAdded?: string;
  OfficialRating?: string;
  Genres?: string[];
  Taglines?: string[];
  People?: JellyfinPerson[];
  MediaSources?: MediaSourceInfo[];
}

export interface ItemsPage {
  items: JellyfinItem[];
  /** Number of items matching the query on the server, across all pages. */
  total: number;
  ok: boolean;
}

const STORAGE_KEYS = {
  SERVER_URL: "jellyboxd_server_url",
  TOKEN: "jellyboxd_token",
  USER_ID: "jellyboxd_user_id",
  USER_NAME: "jellyboxd_user_name",
  DEVICE_ID: "jellyboxd_device_id",
  DEFAULT_BITRATE: "jellyboxd_default_bitrate",
  SAVED_SERVERS: "jellyboxd_saved_servers",
  /** One key per saved server: the saved-servers blob would otherwise outgrow SecureStore's value size limit. */
  PASSWORD_PREFIX: "jellyboxd_pw_",
};

/** The stored token was rejected by the server: the user has to log in again. */
export class SessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionExpiredError";
  }
}

/** The server rejected the username/password. */
export class InvalidCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

function savedServerId(session: JellyfinSession): string {
  return `${session.serverUrl}::${session.userId}`;
}

/** SecureStore keys only allow [A-Za-z0-9._-], so every other character of the server id is hex-escaped. */
function passwordKey(id: string): string {
  const safe = id.replace(/[^A-Za-z0-9.\-]/g, (c) => `_${c.charCodeAt(0).toString(16)}_`);
  return `${STORAGE_KEYS.PASSWORD_PREFIX}${safe}`;
}

export type JellyfinImageType = "Primary" | "Backdrop" | "Thumb" | "Logo";

const HOME_ITEM_FIELDS =
  "Overview,RunTimeTicks,UserData,ParentBackdropItemId,SeriesId,SeriesName,Genres,OfficialRating,ProductionYear,CommunityRating";

export class JellyfinService {
  /** Identifies this installation; the DeviceId actually sent is derived from it per server address. */
  private static installDeviceId = "jellyboxd-" + (Platform.OS === "ios" ? "ios" : "android");
  /** DeviceId sent with requests: see `useServer`. */
  private static deviceId = this.installDeviceId;
  private static deviceIdInitialized = false;

  static async initDeviceId(): Promise<string> {
    if (this.deviceIdInitialized) return this.installDeviceId;
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_ID);
      if (stored) {
        this.installDeviceId = stored;
        this.deviceIdInitialized = true;
        return stored;
      }
      const newId = `jellyboxd-${Platform.OS === "ios" ? "ios" : "android"}-${Math.random().toString(36).substring(2, 10)}`;
      await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_ID, newId);
      this.installDeviceId = newId;
      this.deviceIdInitialized = true;
      return newId;
    } catch {
      return this.installDeviceId;
    }
  }

  /**
   * Picks the DeviceId to send for the server at `serverUrl`.
   * Jellyfin logs out a user's existing sessions on a device whenever that user logs in again on the same
   * DeviceId, so a single DeviceId for every saved login makes the same server saved under two addresses
   * (e.g. LAN and Tailscale) revoke each other's token. One DeviceId per address avoids that.
   * Requests are authenticated by token alone, so this is harmless for tokens issued before this change.
   */
  private static useServer(serverUrl: string): void {
    const normalized = serverUrl.trim().replace(/\/+$/, "").toLowerCase();
    let hash = 5381;
    for (let i = 0; i < normalized.length; i++) {
      hash = ((hash * 33) ^ normalized.charCodeAt(i)) >>> 0;
    }
    this.deviceId = `${this.installDeviceId}-${hash.toString(36)}`;
  }

  static async fetchWithTimeoutAndRetry(
    url: string,
    options: RequestInit = {},
    retries: number = 2,
    timeoutMs: number = 9000
  ): Promise<Response> {
    let lastError: any = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timer);
        return res;
      } catch (err: any) {
        clearTimeout(timer);
        lastError = err;
        if (attempt < retries) {
          // exponential backoff
          await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt)));
        }
      }
    }
    throw lastError || new Error(`Fetch failed for ${url}`);
  }

  private static getAuthHeader(token?: string): string {
    const parts = [
      'MediaBrowser Client="Jellyboxd"',
      `Device="${Platform.OS === "ios" ? "iPhone" : "Android"}"`,
      `DeviceId="${this.deviceId}"`,
      'Version="1.0.0"',
    ];
    if (token) {
      parts.push(`Token="${token}"`);
    }
    return parts.join(", ");
  }

  private static getAuthHeaders(token?: string): Record<string, string> {
    const auth = this.getAuthHeader(token);
    const headers: Record<string, string> = {
      Authorization: auth,
      "X-Emby-Authorization": auth,
    };
    if (token) {
      headers["X-MediaBrowser-Token"] = token;
      headers["X-Emby-Token"] = token;
    }
    return headers;
  }

  static async getStoredSession(): Promise<JellyfinSession | null> {
    try {
      await this.initDeviceId();
      const [serverUrl, token, userId, userName] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.SERVER_URL),
        SecureStore.getItemAsync(STORAGE_KEYS.TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.USER_ID),
        SecureStore.getItemAsync(STORAGE_KEYS.USER_NAME),
      ]);

      if (serverUrl && token && userId) {
        this.useServer(serverUrl);
        return {
          serverUrl,
          token,
          userId,
          userName: userName || "User",
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  static async saveSession(session: JellyfinSession): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.SERVER_URL, session.serverUrl),
      SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, session.token),
      SecureStore.setItemAsync(STORAGE_KEYS.USER_ID, session.userId),
      SecureStore.setItemAsync(STORAGE_KEYS.USER_NAME, session.userName),
    ]);
  }

  static async clearSession(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.SERVER_URL),
      SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ID),
      SecureStore.deleteItemAsync(STORAGE_KEYS.USER_NAME),
    ]);
  }

  /** All remembered server logins, most recently used first. */
  static async getSavedServers(): Promise<SavedServer[]> {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEYS.SAVED_SERVERS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /** Remembers (or updates the token for) a successful login, so it can be switched back to later. */
  static async upsertSavedServer(session: JellyfinSession): Promise<SavedServer[]> {
    const id = savedServerId(session);
    const existing = await this.getSavedServers();
    const { name } = existing.find((s) => s.id === id) ?? {};
    const next = [{ ...session, id, ...(name ? { name } : {}) }, ...existing.filter((s) => s.id !== id)];
    await SecureStore.setItemAsync(STORAGE_KEYS.SAVED_SERVERS, JSON.stringify(next));
    return next;
  }

  /** Sets the custom name of a saved server; a blank name removes it. */
  static async renameSavedServer(id: string, name: string): Promise<SavedServer[]> {
    const trimmed = name.trim();
    const existing = await this.getSavedServers();
    const next = existing.map((s) => {
      if (s.id !== id) return s;
      const { name: _old, ...rest } = s;
      return trimmed ? { ...rest, name: trimmed } : rest;
    });
    await SecureStore.setItemAsync(STORAGE_KEYS.SAVED_SERVERS, JSON.stringify(next));
    return next;
  }

  static async removeSavedServer(id: string): Promise<SavedServer[]> {
    const existing = await this.getSavedServers();
    const next = existing.filter((s) => s.id !== id);
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.SAVED_SERVERS, JSON.stringify(next)),
      SecureStore.deleteItemAsync(passwordKey(id)).catch(() => {}),
    ]);
    return next;
  }

  /**
   * Checks that the session's token is still accepted by its server. The public info endpoint
   * answers without authentication, so it can't tell an expired/revoked token from a working one.
   */
  static async checkSession(
    session: JellyfinSession,
    timeoutMs: number = 6000
  ): Promise<"ok" | "unauthorized" | "unreachable"> {
    if (isDemoServerUrl(session.serverUrl)) return "ok";
    try {
      const res = await this.fetchWithTimeoutAndRetry(
        `${session.serverUrl}/Users/${session.userId}`,
        { headers: this.getAuthHeaders(session.token) },
        0,
        timeoutMs
      );
      if (res.ok) return "ok";
      if (res.status === 401 || res.status === 403 || res.status === 404) return "unauthorized";
      return "unreachable";
    } catch {
      return "unreachable";
    }
  }

  /** Makes an already-saved server the active session, reusing its stored token. */
  static async switchToSavedServer(server: SavedServer): Promise<JellyfinSession> {
    await this.initDeviceId();

    const { id, name: _name, ...stored } = server;
    let session: JellyfinSession = stored;
    const status = await this.checkSession(session);
    if (status === "unreachable") {
      throw new Error(t("errors.unreachable", { serverUrl: server.serverUrl }));
    }
    if (status === "unauthorized") {
      // Servers behind a reverse proxy revoke tokens whenever the client's IP changes (e.g. Wi-Fi <-> mobile),
      // so try to get a fresh token with the remembered password before bothering the user.
      const renewed = await this.renewSession(id, session);
      if (!renewed) {
        throw new SessionExpiredError(
          t("errors.sessionExpired", { userName: server.userName, serverUrl: server.serverUrl })
        );
      }
      session = renewed;
    }

    this.useServer(session.serverUrl);
    await this.saveSession(session);
    return session;
  }

  /**
   * Logs in again with the password remembered for this saved server.
   * Returns null when there's nothing to retry with, or the password is no longer valid;
   * network failures propagate so the caller reports the server as unreachable.
   */
  private static async renewSession(
    id: string,
    session: JellyfinSession
  ): Promise<JellyfinSession | null> {
    const password = await SecureStore.getItemAsync(passwordKey(id)).catch(() => null);
    if (!password) return null;

    this.useServer(session.serverUrl);
    try {
      const renewed = await this.authenticate(session.serverUrl, session.userName, password);
      // Same server URL, but a different account behind those credentials: not the login the user saved.
      if (renewed.userId !== session.userId) return null;
      return renewed;
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        // Password changed on the server: forget it so we stop retrying a dead credential.
        await SecureStore.deleteItemAsync(passwordKey(id)).catch(() => {});
        return null;
      }
      throw err;
    }
  }

  static async login(
    rawServerUrl: string,
    username: string,
    password: string,
    name?: string
  ): Promise<JellyfinSession> {
    // Review credentials documented in docs/store/review-notes.md: an in-memory session, nothing persisted
    if (isDemoCredentials(rawServerUrl, username, password)) {
      demoBackend.resetState();
      return createDemoSession();
    }
    const cleanUrl = normalizeServerUrl(rawServerUrl);

    console.log(`[JellyfinService] Connessione a: ${cleanUrl}`);
    await this.initDeviceId();
    this.useServer(cleanUrl);

    // Verifica preliminare raggiungibilità server (System/Info/Public)
    try {
      const pingRes = await fetch(`${cleanUrl}/System/Info/Public`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!pingRes.ok) {
        console.warn(`[JellyfinService] Ping server non riuscito: ${pingRes.status}`);
      }
    } catch (netErr: any) {
      console.error(`[JellyfinService] Errore di rete verso ${cleanUrl}:`, netErr);
      throw new Error(t("errors.loginUnreachable", { serverUrl: cleanUrl }));
    }

    const session = await this.authenticate(cleanUrl, username, password);

    console.log(`[JellyfinService] Login completato per ${session.userName} (${session.userId})`);
    await Promise.all([
      this.saveSession(session),
      this.upsertSavedServer(session).then(() =>
        name?.trim() ? this.renameSavedServer(savedServerId(session), name) : undefined
      ),
      // Remembered so an expired token can be renewed silently when switching back to this server
      SecureStore.setItemAsync(passwordKey(savedServerId(session)), password).catch(() => {}),
    ]);
    return session;
  }

  /** Exchanges username/password for a fresh access token. Doesn't persist anything. */
  private static async authenticate(
    serverUrl: string,
    username: string,
    password: string
  ): Promise<JellyfinSession> {
    const res = await fetch(`${serverUrl}/Users/AuthenticateByName`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        Username: username,
        Pw: password,
      }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new InvalidCredentialsError(t("errors.invalidCredentials"));
      }
      const errText = await res.text().catch(() => "");
      console.error(`[JellyfinService] Errore login ${res.status}: ${errText}`);
      throw new Error(t("errors.serverError", { status: res.status, details: errText || res.statusText }));
    }

    const data = await res.json();
    return {
      serverUrl,
      token: data.AccessToken,
      userId: data.User.Id,
      userName: data.User.Name,
      serverId: data.ServerId,
    };
  }

  static getImageUrl(
    serverUrl: string,
    itemId: string,
    type: JellyfinImageType = "Primary",
    maxWidth: number = 600
  ): string {
    if (isDemoServerUrl(serverUrl)) return demoImageUrl(itemId, type);
    // Logos carry transparency, so request PNG instead of a lossy re-encode
    const format = type === "Logo" ? "&format=png" : "&quality=85";
    return `${serverUrl}/Items/${itemId}/Images/${type}?maxWidth=${maxWidth}${format}`;
  }

  static getUserImageUrl(session: JellyfinSession, maxWidth: number = 120): string {
    if (isDemoServerUrl(session.serverUrl)) return demoImageUrl(session.userId, "Primary");
    return `${session.serverUrl}/Users/${session.userId}/Images/Primary?maxWidth=${maxWidth}&quality=90`;
  }

  /** Id of the item whose Logo image represents `item` (episodes use their series logo). */
  static getLogoItemId(item: JellyfinItem): string | null {
    if (item.ImageTags?.Logo) return item.Id;
    if (item.ParentLogoItemId) return item.ParentLogoItemId;
    return null;
  }

  /**
   * Items for the home hero carousel: the latest `limit` movies and series added, mixed.
   * Series count from their last added episode/season (DateLastContentAdded), movies from
   * DateCreated. Runs on every home load, so new additions show up right away.
   */
  static async fetchFeatured(session: JellyfinSession, limit: number = 4): Promise<JellyfinItem[]> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.featured(limit);
    const fetchType = async (type: "Series" | "Movie", sortBy: string): Promise<JellyfinItem[]> => {
      try {
        const url = `${session.serverUrl}/Users/${session.userId}/Items?IncludeItemTypes=${type}&Recursive=true&SortBy=${sortBy}&SortOrder=Descending&ImageTypes=Backdrop&Limit=${limit}&Fields=${HOME_ITEM_FIELDS},DateCreated,DateLastMediaAdded`;
        const res = await this.fetchWithTimeoutAndRetry(url, {
          headers: this.getAuthHeaders(session.token),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.Items || [];
      } catch (e) {
        console.warn(`[JellyfinService] fetchFeatured(${type}) error:`, e);
        return [];
      }
    };

    const [series, movies] = await Promise.all([
      fetchType("Series", "DateLastContentAdded,DateCreated"),
      fetchType("Movie", "DateCreated"),
    ]);
    const addedAt = (item: JellyfinItem) =>
      Date.parse(item.DateLastMediaAdded ?? item.DateCreated ?? "") || 0;
    return [...series, ...movies].sort((a, b) => addedAt(b) - addedAt(a)).slice(0, limit);
  }

  /**
   * Last time each series (or movie) was watched, from the most recently played episodes/movies.
   * Keyed by SeriesId for episodes and by item Id for movies.
   */
  static async fetchLastPlayedDates(session: JellyfinSession): Promise<Map<string, number>> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.lastPlayedDates();
    const dates = new Map<string, number>();
    try {
      const url = `${session.serverUrl}/Users/${session.userId}/Items?IncludeItemTypes=Episode,Movie&Recursive=true&Filters=IsPlayed&SortBy=DatePlayed&SortOrder=Descending&Limit=100&Fields=SeriesId`;
      const res = await this.fetchWithTimeoutAndRetry(url, {
        headers: this.getAuthHeaders(session.token),
      });
      if (!res.ok) return dates;
      const data = await res.json();
      for (const item of (data.Items || []) as JellyfinItem[]) {
        const key = item.SeriesId || item.Id;
        const played = item.UserData?.LastPlayedDate ? Date.parse(item.UserData.LastPlayedDate) : 0;
        if (played > (dates.get(key) ?? 0)) dates.set(key, played);
      }
    } catch (e) {
      console.warn("[JellyfinService] fetchLastPlayedDates error:", e);
    }
    return dates;
  }

  /**
   * Single "Continua a guardare" list: in-progress items plus the next episode of each
   * series, one card per series, ordered so the most recently watched series comes first.
   */
  static async fetchContinueWatching(session: JellyfinSession): Promise<JellyfinItem[]> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.continueWatching();
    const [resume, nextUp, lastPlayed] = await Promise.all([
      this.fetchResumeItems(session),
      this.fetchNextUp(session, 20),
      this.fetchLastPlayedDates(session),
    ]);
    const seenIds = new Set(resume.map((i) => i.Id));
    const seenSeries = new Set(resume.map((i) => i.SeriesId).filter(Boolean));
    const upcoming = nextUp.filter((i) => {
      if (seenIds.has(i.Id) || (i.SeriesId && seenSeries.has(i.SeriesId))) return false;
      if (i.SeriesId) seenSeries.add(i.SeriesId);
      return true;
    });

    const recency = (item: JellyfinItem) => {
      const own = item.UserData?.LastPlayedDate ? Date.parse(item.UserData.LastPlayedDate) : 0;
      return Math.max(own, lastPlayed.get(item.SeriesId || item.Id) ?? 0);
    };
    // Stable sort: items without any play date keep Jellyfin's order at the end
    return [...resume, ...upcoming]
      .map((item, index) => ({ item, index, time: recency(item) }))
      .sort((a, b) => b.time - a.time || a.index - b.index)
      .map(({ item }) => item);
  }

  static getStreamUrl(
    serverUrl: string,
    itemId: string,
    token: string,
    options?: {
      audioStreamIndex?: number;
      subtitleStreamIndex?: number;
      subtitleMethod?: SubtitleMethod;
      maxStreamingBitrate?: number;
    }
  ): string {
    if (isDemoServerUrl(serverUrl)) return DEMO_STREAMS[itemId] ?? DEMO_STREAMS["demo-movie-bbb"];
    let url = `${serverUrl}/Videos/${itemId}/master.m3u8?MediaSourceId=${itemId}&ApiKey=${token}&api_key=${token}`;
    if (options?.audioStreamIndex !== undefined) {
      url += `&AudioStreamIndex=${options.audioStreamIndex}`;
    }
    if (options?.subtitleStreamIndex !== undefined) {
      url += `&SubtitleStreamIndex=${options.subtitleStreamIndex}`;
    }
    if (options?.subtitleMethod) {
      url += `&SubtitleMethod=${options.subtitleMethod}`;
    }
    if (options?.maxStreamingBitrate && options.maxStreamingBitrate > 0) {
      url += `&MaxStreamingBitrate=${options.maxStreamingBitrate}&VideoCodec=h264,hevc&AudioCodec=aac,mp3,ac3,eac3`;
    }
    return url;
  }

  static async fetchResumeItems(session: JellyfinSession): Promise<JellyfinItem[]> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.resumeItems();
    try {
      const url = `${session.serverUrl}/Users/${session.userId}/Items/Resume?Limit=15&Fields=Overview,RunTimeTicks,UserData,ParentBackdropItemId,SeriesId,SeriesName`;
      const res = await this.fetchWithTimeoutAndRetry(url, {
        headers: this.getAuthHeaders(session.token),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const rawItems: JellyfinItem[] = data.Items || [];

      // Only show episodes and movies that the user has ACTUALLY started playing (ticks > 0)
      return rawItems.filter(
        (item) =>
          (item.Type === "Episode" || item.Type === "Movie") &&
          item.UserData &&
          (item.UserData.PlaybackPositionTicks || 0) > 0 &&
          !item.UserData.Played
      );
    } catch (e) {
      console.warn("[JellyfinService] fetchResumeItems error:", e);
      return [];
    }
  }

  static async fetchLibraries(session: JellyfinSession): Promise<JellyfinItem[]> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.libraries();
    try {
      const url = `${session.serverUrl}/Users/${session.userId}/Views`;
      const res = await this.fetchWithTimeoutAndRetry(url, {
        headers: this.getAuthHeaders(session.token),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.Items || [];
    } catch (e) {
      console.warn("[JellyfinService] fetchLibraries error:", e);
      return [];
    }
  }

  /** One page of a paged item query; `ok` is false when the request failed (as opposed to an empty result). */
  private static async fetchItemsPage(
    session: JellyfinSession,
    query: string,
    startIndex: number,
    limit: number
  ): Promise<ItemsPage> {
    try {
      const url = `${session.serverUrl}/Users/${session.userId}/Items?${query}&StartIndex=${startIndex}&Limit=${limit}&EnableTotalRecordCount=true`;
      const res = await this.fetchWithTimeoutAndRetry(url, {
        headers: this.getAuthHeaders(session.token),
      });
      if (!res.ok) return { items: [], total: 0, ok: false };
      const data = await res.json();
      const items: JellyfinItem[] = data.Items || [];
      return { items, total: data.TotalRecordCount ?? startIndex + items.length, ok: true };
    } catch (e) {
      console.warn("[JellyfinService] fetchItemsPage error:", e);
      return { items: [], total: 0, ok: false };
    }
  }

  static fetchLibraryItemsPage(
    session: JellyfinSession,
    parentId: string,
    startIndex: number,
    limit: number
  ): Promise<ItemsPage> {
    if (isDemoServerUrl(session.serverUrl)) return Promise.resolve(demoBackend.libraryItemsPage(parentId, startIndex, limit));
    // Only top-level series or movies in the library, never loose episodes or seasons
    return this.fetchItemsPage(
      session,
      `ParentId=${parentId}&Recursive=true&IncludeItemTypes=Movie,Series&SortBy=SortName`,
      startIndex,
      limit
    );
  }

  static fetchSeriesPage(session: JellyfinSession, startIndex: number, limit: number): Promise<ItemsPage> {
    if (isDemoServerUrl(session.serverUrl)) return Promise.resolve(demoBackend.seriesPage(startIndex, limit));
    return this.fetchItemsPage(
      session,
      "IncludeItemTypes=Series&Recursive=true&SortBy=SortName",
      startIndex,
      limit
    );
  }

  static async fetchLatestSeries(session: JellyfinSession, limit: number = 20): Promise<JellyfinItem[]> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.latestSeries(limit);
    try {
      const url = `${session.serverUrl}/Users/${session.userId}/Items?IncludeItemTypes=Series&Recursive=true&SortBy=DateCreated&SortOrder=Descending&Limit=${limit}`;
      const res = await this.fetchWithTimeoutAndRetry(url, {
        headers: this.getAuthHeaders(session.token),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.Items || [];
    } catch (e) {
      console.warn("[JellyfinService] fetchLatestSeries error:", e);
      return [];
    }
  }

  static async fetchNextUp(session: JellyfinSession, limit: number = 20): Promise<JellyfinItem[]> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.nextUp(limit);
    try {
      const url = `${session.serverUrl}/Shows/NextUp?userId=${session.userId}&Limit=${limit}&Fields=Overview,RunTimeTicks,UserData,ParentBackdropItemId,SeriesId,SeriesName`;
      const res = await this.fetchWithTimeoutAndRetry(url, {
        headers: this.getAuthHeaders(session.token),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.Items || [];
    } catch (e) {
      console.warn("[JellyfinService] fetchNextUp error:", e);
      return [];
    }
  }

  static async fetchNextUpForSeries(
    session: JellyfinSession,
    seriesId: string
  ): Promise<JellyfinItem | null> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.nextUpForSeries(seriesId);
    try {
      const url = `${session.serverUrl}/Shows/NextUp?seriesId=${seriesId}&userId=${session.userId}&Limit=1&Fields=Overview,RunTimeTicks,UserData,ParentBackdropItemId,SeriesId,SeriesName`;
      const res = await this.fetchWithTimeoutAndRetry(url, {
        headers: this.getAuthHeaders(session.token),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.Items && data.Items.length > 0) {
        return data.Items[0];
      }
      return null;
    } catch (e) {
      console.warn("[JellyfinService] fetchNextUpForSeries error:", e);
      return null;
    }
  }

  static async searchItems(
    session: JellyfinSession,
    query: string,
    types: string = "Movie,Series"
  ): Promise<JellyfinItem[]> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.search(query, types);
    try {
      const url = `${session.serverUrl}/Users/${session.userId}/Items?SearchTerm=${encodeURIComponent(
        query
      )}&IncludeItemTypes=${types}&Recursive=true&Fields=Overview,RunTimeTicks,CommunityRating,ProductionYear,UserData&Limit=60`;
      const res = await this.fetchWithTimeoutAndRetry(url, {
        headers: this.getAuthHeaders(session.token),
      }, 1, 6000);
      if (!res.ok) return [];
      const data = await res.json();
      return data.Items || [];
    } catch (e) {
      console.warn("[JellyfinService] searchItems error:", e);
      return [];
    }
  }

  static async fetchLatestMovies(session: JellyfinSession, limit: number = 20): Promise<JellyfinItem[]> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.latestMovies(limit);
    try {
      const url = `${session.serverUrl}/Users/${session.userId}/Items?IncludeItemTypes=Movie&Recursive=true&SortBy=DateCreated&SortOrder=Descending&Limit=${limit}`;
      const res = await this.fetchWithTimeoutAndRetry(url, {
        headers: this.getAuthHeaders(session.token),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.Items || [];
    } catch (e) {
      console.warn("[JellyfinService] fetchLatestMovies error:", e);
      return [];
    }
  }

  static fetchMoviesPage(session: JellyfinSession, startIndex: number, limit: number): Promise<ItemsPage> {
    if (isDemoServerUrl(session.serverUrl)) return Promise.resolve(demoBackend.moviesPage(startIndex, limit));
    return this.fetchItemsPage(
      session,
      "IncludeItemTypes=Movie&Recursive=true&SortBy=SortName",
      startIndex,
      limit
    );
  }

  static async fetchSeasons(session: JellyfinSession, seriesId: string): Promise<JellyfinItem[]> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.seasons(seriesId);
    try {
      const url = `${session.serverUrl}/Shows/${seriesId}/Seasons?userId=${session.userId}`;
      const res = await this.fetchWithTimeoutAndRetry(url, {
        headers: this.getAuthHeaders(session.token),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.Items || [];
    } catch (e) {
      console.warn("[JellyfinService] fetchSeasons error:", e);
      return [];
    }
  }

  static async fetchEpisodes(
    session: JellyfinSession,
    seriesId: string,
    seasonId: string
  ): Promise<JellyfinItem[]> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.episodes(seriesId, seasonId);
    try {
      const url = `${session.serverUrl}/Shows/${seriesId}/Episodes?seasonId=${seasonId}&userId=${session.userId}&Fields=Overview,PrimaryImageAspectRatio,MediaSources`;
      const res = await this.fetchWithTimeoutAndRetry(url, {
        headers: this.getAuthHeaders(session.token),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.Items || [];
    } catch (e) {
      console.warn("[JellyfinService] fetchEpisodes error:", e);
      return [];
    }
  }

  static async fetchItemDetails(
    session: JellyfinSession,
    itemId: string
  ): Promise<JellyfinItem | null> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.itemDetails(itemId);
    try {
      const url = `${session.serverUrl}/Users/${session.userId}/Items/${itemId}?Fields=MediaSources,MediaStreams,Overview,RunTimeTicks,CommunityRating,ProductionYear,OfficialRating,Genres,Taglines,People,UserData`;
      const res = await this.fetchWithTimeoutAndRetry(url, {
        headers: this.getAuthHeaders(session.token),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn("[JellyfinService] fetchItemDetails error:", e);
      return null;
    }
  }

  static getMediaBadges(item?: JellyfinItem | null): string[] {
    if (!item?.MediaSources || item.MediaSources.length === 0) return [];
    const streams = item.MediaSources[0]?.MediaStreams || [];
    const videoStream = streams.find((s) => s.Type === "Video");
    const audioStreams = streams.filter((s) => s.Type === "Audio");
    const badges: string[] = [];

    // Resolution badge
    if (videoStream) {
      const width = videoStream.Width || 0;
      const height = videoStream.Height || 0;
      if (width >= 3800 || height >= 2100) {
        badges.push("4K");
      } else if (width >= 1900 || height >= 1000) {
        badges.push("1080p");
      } else if (height >= 700) {
        badges.push("720p");
      }

      // HDR / Dolby Vision badge
      const vrType = (videoStream.VideoRangeType || "").toUpperCase();
      const vr = (videoStream.VideoRange || "").toUpperCase();
      if (vrType.includes("DOVI") || vrType.includes("DOLBY VISION")) {
        badges.push("Dolby Vision");
      } else if (vrType.includes("HDR10")) {
        badges.push("HDR10");
      } else if (vr === "HDR" || vrType.includes("HDR")) {
        badges.push("HDR");
      }

      // Video Codec badge
      const codec = (videoStream.Codec || "").toUpperCase();
      if (codec === "HEVC" || codec === "H265") {
        badges.push("HEVC");
      } else if (codec === "AV1") {
        badges.push("AV1");
      }
    }

    // Audio format badge
    if (audioStreams.length > 0) {
      const defaultAudio = audioStreams.find((s) => s.IsDefault) || audioStreams[0];
      const audioTitle = (defaultAudio.DisplayTitle || defaultAudio.Title || "").toUpperCase();
      const spatial = (defaultAudio.AudioSpatialFormat || "").toUpperCase();

      if (spatial.includes("ATMOS") || audioTitle.includes("ATMOS")) {
        badges.push("Dolby Atmos");
      } else if (defaultAudio.Channels === 8) {
        badges.push("7.1");
      } else if (defaultAudio.Channels === 6) {
        badges.push("5.1");
      }
    }

    return badges;
  }

  static async getDefaultBitrate(): Promise<number> {
    try {
      const val = await SecureStore.getItemAsync(STORAGE_KEYS.DEFAULT_BITRATE);
      return val ? parseInt(val, 10) : 0; // 0 = Direct Play / Original
    } catch {
      return 0;
    }
  }

  static async setDefaultBitrate(bitrate: number): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.DEFAULT_BITRATE, bitrate.toString());
    } catch {}
  }

  /** Tracks to start with when none were picked: the file's default audio and default subtitle (if any). */
  static pickDefaultStreams(streams: MediaStreamInfo[]): {
    audioStreamIndex?: number;
    subtitleStreamIndex: number;
    subtitleMethod: SubtitleMethod;
  } {
    const audio =
      streams.find((s) => s.Type === "Audio" && s.IsDefault) || streams.find((s) => s.Type === "Audio");
    const subtitle = streams.find((s) => s.Type === "Subtitle" && s.IsDefault);
    // Image-based subtitles can't go in the HLS manifest, so a default one is burned into the video instead
    if (subtitle && !subtitle.IsTextSubtitleStream) {
      return { audioStreamIndex: audio?.Index, subtitleStreamIndex: subtitle.Index, subtitleMethod: "Encode" };
    }
    return { audioStreamIndex: audio?.Index, subtitleStreamIndex: subtitle ? subtitle.Index : -1, subtitleMethod: "Hls" };
  }

  static async fetchServerInfo(session: JellyfinSession): Promise<{
    ServerName?: string;
    Version?: string;
    OperatingSystem?: string;
  } | null> {
    if (isDemoServerUrl(session.serverUrl)) return { ServerName: "Jellyboxd Demo", Version: "1.0.0", OperatingSystem: "iOS" };
    try {
      const res = await fetch(`${session.serverUrl}/System/Info`, {
        headers: this.getAuthHeaders(session.token),
      });
      if (res.ok) {
        return await res.json();
      }
      const pubRes = await fetch(`${session.serverUrl}/System/Info/Public`);
      if (pubRes.ok) return await pubRes.json();
      return null;
    } catch {
      return null;
    }
  }

  // Playback reporting for live progress sync
  static async reportPlaybackStart(session: JellyfinSession, itemId: string): Promise<void> {
    if (isDemoServerUrl(session.serverUrl)) return;
    try {
      await fetch(`${session.serverUrl}/Sessions/Playing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(session.token),
        },
        body: JSON.stringify({
          ItemId: itemId,
          CanSeek: true,
          PlayMethod: "DirectPlay",
        }),
      });
    } catch {}
  }

  static async reportPlaybackProgress(
    session: JellyfinSession,
    itemId: string,
    positionTicks: number,
    isPaused: boolean = false
  ): Promise<void> {
    if (isDemoServerUrl(session.serverUrl)) {
      demoBackend.reportProgress(itemId, positionTicks);
      return;
    }
    try {
      await fetch(`${session.serverUrl}/Sessions/Playing/Progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(session.token),
        },
        body: JSON.stringify({
          ItemId: itemId,
          PositionTicks: positionTicks,
          IsPaused: isPaused,
          PlayMethod: "DirectPlay",
        }),
      });
    } catch {}
  }

  static async reportPlaybackStopped(
    session: JellyfinSession,
    itemId: string,
    positionTicks: number
  ): Promise<void> {
    if (isDemoServerUrl(session.serverUrl)) {
      demoBackend.reportProgress(itemId, positionTicks);
      return;
    }
    try {
      await fetch(`${session.serverUrl}/Sessions/Playing/Stopped`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(session.token),
        },
        body: JSON.stringify({
          ItemId: itemId,
          PositionTicks: positionTicks,
        }),
      });
    } catch {}
  }

  /**
   * Rescans every library of the user (new/removed files) and downloads missing
   * images, keeping existing metadata and artwork (admin accounts only).
   */
  static async refreshLibrary(session: JellyfinSession): Promise<"ok" | "forbidden" | "error"> {
    if (isDemoServerUrl(session.serverUrl)) return "forbidden";
    try {
      const libraries = await this.fetchLibraries(session);
      if (libraries.length === 0) return "error";
      const params =
        "Recursive=true&MetadataRefreshMode=Default&ImageRefreshMode=FullRefresh&ReplaceAllMetadata=false&ReplaceAllImages=false";
      const responses = await Promise.all(
        libraries.map((library) =>
          fetch(`${session.serverUrl}/Items/${library.Id}/Refresh?${params}`, {
            method: "POST",
            headers: this.getAuthHeaders(session.token),
          })
        )
      );
      if (responses.every((res) => res.ok)) return "ok";
      return responses.some((res) => res.status === 401 || res.status === 403) ? "forbidden" : "error";
    } catch {
      return "error";
    }
  }

  static async markItemPlayed(
    session: JellyfinSession,
    itemId: string,
    played: boolean = true
  ): Promise<boolean> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.setPlayed(itemId, played);
    try {
      const url = `${session.serverUrl}/Users/${session.userId}/PlayedItems/${itemId}`;
      const res = await fetch(url, {
        method: played ? "POST" : "DELETE",
        headers: this.getAuthHeaders(session.token),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  static async setFavorite(
    session: JellyfinSession,
    itemId: string,
    favorite: boolean = true
  ): Promise<boolean> {
    if (isDemoServerUrl(session.serverUrl)) return demoBackend.setFavorite(itemId, favorite);
    try {
      const url = `${session.serverUrl}/Users/${session.userId}/FavoriteItems/${itemId}`;
      const res = await fetch(url, {
        method: favorite ? "POST" : "DELETE",
        headers: this.getAuthHeaders(session.token),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
