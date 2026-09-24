import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export interface JellyfinSession {
  serverUrl: string;
  token: string;
  userId: string;
  userName: string;
  serverId?: string;
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
  Width?: number;
  Height?: number;
  VideoRange?: string;
  VideoRangeType?: string;
  Channels?: number;
  ChannelLayout?: string;
  BitRate?: number;
  AudioSpatialFormat?: string;
}

export interface MediaSourceInfo {
  Id: string;
  Container?: string;
  MediaStreams?: MediaStreamInfo[];
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
  };
  SeriesName?: string;
  SeriesId?: string;
  SeasonName?: string;
  SeasonId?: string;
  IndexNumber?: number; // Episode number or Season number
  ParentIndexNumber?: number; // Season number
  ParentBackdropItemId?: string;
  PremiereDate?: string;
  OfficialRating?: string;
  Genres?: string[];
  Taglines?: string[];
  MediaSources?: MediaSourceInfo[];
}

const STORAGE_KEYS = {
  SERVER_URL: "jellyboxd_server_url",
  TOKEN: "jellyboxd_token",
  USER_ID: "jellyboxd_user_id",
  USER_NAME: "jellyboxd_user_name",
  DEVICE_ID: "jellyboxd_device_id",
  DEFAULT_BITRATE: "jellyboxd_default_bitrate",
};

export class JellyfinService {
  private static deviceId = "jellyboxd-ios-" + Math.random().toString(36).substring(2, 10);

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
      const [serverUrl, token, userId, userName] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.SERVER_URL),
        SecureStore.getItemAsync(STORAGE_KEYS.TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.USER_ID),
        SecureStore.getItemAsync(STORAGE_KEYS.USER_NAME),
      ]);

      if (serverUrl && token && userId) {
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

  static async login(
    rawServerUrl: string,
    username: string,
    password: string
  ): Promise<JellyfinSession> {
    let cleanUrl = rawServerUrl.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `http://${cleanUrl}`;
    }
    if (cleanUrl.endsWith("/")) {
      cleanUrl = cleanUrl.slice(0, -1);
    }

    console.log(`[JellyfinService] Connessione a: ${cleanUrl}`);

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
      throw new Error(
        `Impossibile raggiungere il server all'indirizzo ${cleanUrl}.\n\nSe il server è in esecuzione su questo computer, usa l'IP locale (es. http://192.168.1.238:8096) e non "localhost".`
      );
    }

    const endpoint = `${cleanUrl}/Users/AuthenticateByName`;
    const res = await fetch(endpoint, {
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
        throw new Error("Credenziali non corrette (username o password errati).");
      }
      const errText = await res.text().catch(() => "");
      console.error(`[JellyfinService] Errore login ${res.status}: ${errText}`);
      throw new Error(`Errore dal server Jellyfin (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const session: JellyfinSession = {
      serverUrl: cleanUrl,
      token: data.AccessToken,
      userId: data.User.Id,
      userName: data.User.Name,
      serverId: data.ServerId,
    };

    console.log(`[JellyfinService] Login completato per ${session.userName} (${session.userId})`);
    await this.saveSession(session);
    return session;
  }

  static getImageUrl(
    serverUrl: string,
    itemId: string,
    type: "Primary" | "Backdrop" | "Thumb" = "Primary",
    maxWidth: number = 600
  ): string {
    return `${serverUrl}/Items/${itemId}/Images/${type}?maxWidth=${maxWidth}&quality=85`;
  }

  static getStreamUrl(
    serverUrl: string,
    itemId: string,
    token: string,
    options?: {
      audioStreamIndex?: number;
      subtitleStreamIndex?: number;
      maxStreamingBitrate?: number;
    }
  ): string {
    let url = `${serverUrl}/Videos/${itemId}/master.m3u8?MediaSourceId=${itemId}&ApiKey=${token}&api_key=${token}`;
    if (options?.audioStreamIndex !== undefined) {
      url += `&AudioStreamIndex=${options.audioStreamIndex}`;
    }
    if (options?.subtitleStreamIndex !== undefined) {
      url += `&SubtitleStreamIndex=${options.subtitleStreamIndex}`;
    }
    if (options?.maxStreamingBitrate && options.maxStreamingBitrate > 0) {
      url += `&MaxStreamingBitrate=${options.maxStreamingBitrate}&VideoCodec=h264,hevc&AudioCodec=aac,mp3,ac3,eac3`;
    }
    return url;
  }

  static async fetchResumeItems(session: JellyfinSession): Promise<JellyfinItem[]> {
    const url = `${session.serverUrl}/Users/${session.userId}/Items/Resume?Limit=15&Fields=Overview,RunTimeTicks,UserData,ParentBackdropItemId,SeriesId,SeriesName`;
    const res = await fetch(url, {
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
  }

  static async fetchLibraries(session: JellyfinSession): Promise<JellyfinItem[]> {
    const url = `${session.serverUrl}/Users/${session.userId}/Views`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders(session.token),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  }

  static async fetchLibraryItems(
    session: JellyfinSession,
    parentId: string
  ): Promise<JellyfinItem[]> {
    // Only return top-level series or movies in the library, never loose episodes or seasons
    const url = `${session.serverUrl}/Users/${session.userId}/Items?ParentId=${parentId}&Recursive=true&IncludeItemTypes=Movie,Series&SortBy=SortName&Limit=200`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders(session.token),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  }

  static async fetchSeries(session: JellyfinSession, limit: number = 25): Promise<JellyfinItem[]> {
    const url = `${session.serverUrl}/Users/${session.userId}/Items?IncludeItemTypes=Series&Recursive=true&SortBy=SortName&Limit=${limit}`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders(session.token),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  }

  static async fetchLatestSeries(session: JellyfinSession, limit: number = 20): Promise<JellyfinItem[]> {
    const url = `${session.serverUrl}/Users/${session.userId}/Items?IncludeItemTypes=Series&Recursive=true&SortBy=DateCreated&SortOrder=Descending&Limit=${limit}`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders(session.token),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  }

  static async fetchNextUp(session: JellyfinSession, limit: number = 20): Promise<JellyfinItem[]> {
    const url = `${session.serverUrl}/Shows/NextUp?userId=${session.userId}&Limit=${limit}&Fields=Overview,RunTimeTicks,UserData,ParentBackdropItemId,SeriesId,SeriesName`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders(session.token),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  }

  static async fetchNextUpForSeries(
    session: JellyfinSession,
    seriesId: string
  ): Promise<JellyfinItem | null> {
    const url = `${session.serverUrl}/Shows/NextUp?seriesId=${seriesId}&userId=${session.userId}&Limit=1&Fields=Overview,RunTimeTicks,UserData,ParentBackdropItemId,SeriesId,SeriesName`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders(session.token),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.Items && data.Items.length > 0) {
      return data.Items[0];
    }
    return null;
  }

  static async searchItems(
    session: JellyfinSession,
    query: string,
    types: string = "Movie,Series"
  ): Promise<JellyfinItem[]> {
    const url = `${session.serverUrl}/Users/${session.userId}/Items?SearchTerm=${encodeURIComponent(
      query
    )}&IncludeItemTypes=${types}&Recursive=true&Fields=Overview,RunTimeTicks,CommunityRating,ProductionYear,UserData&Limit=60`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders(session.token),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  }

  static async fetchMovies(session: JellyfinSession, limit: number = 25): Promise<JellyfinItem[]> {
    const url = `${session.serverUrl}/Users/${session.userId}/Items?IncludeItemTypes=Movie&Recursive=true&SortBy=SortName&Limit=${limit}`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders(session.token),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  }

  static async fetchSeasons(session: JellyfinSession, seriesId: string): Promise<JellyfinItem[]> {
    const url = `${session.serverUrl}/Shows/${seriesId}/Seasons?userId=${session.userId}`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders(session.token),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  }

  static async fetchEpisodes(
    session: JellyfinSession,
    seriesId: string,
    seasonId: string
  ): Promise<JellyfinItem[]> {
    const url = `${session.serverUrl}/Shows/${seriesId}/Episodes?seasonId=${seasonId}&userId=${session.userId}&Fields=Overview,PrimaryImageAspectRatio,MediaSources`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders(session.token),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  }

  static async fetchItemDetails(
    session: JellyfinSession,
    itemId: string
  ): Promise<JellyfinItem | null> {
    const url = `${session.serverUrl}/Users/${session.userId}/Items/${itemId}?Fields=MediaSources,MediaStreams,Overview,RunTimeTicks,CommunityRating,ProductionYear,OfficialRating,Genres,Taglines,People,UserData`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders(session.token),
    });
    if (!res.ok) return null;
    return await res.json();
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

  static async fetchServerInfo(session: JellyfinSession): Promise<{
    ServerName?: string;
    Version?: string;
    OperatingSystem?: string;
  } | null> {
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

  static async markItemPlayed(
    session: JellyfinSession,
    itemId: string,
    played: boolean = true
  ): Promise<boolean> {
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
}
