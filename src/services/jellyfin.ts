import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export interface JellyfinSession {
  serverUrl: string;
  token: string;
  userId: string;
  userName: string;
  serverId?: string;
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  Type: "Movie" | "Series" | "Episode" | "CollectionFolder" | string;
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
  SeasonName?: string;
  IndexNumber?: number; // Episode number
  ParentIndexNumber?: number; // Season number
  PremiereDate?: string;
  OfficialRating?: string;
  Genres?: string[];
  Taglines?: string[];
}

const STORAGE_KEYS = {
  SERVER_URL: "jellyboxd_server_url",
  TOKEN: "jellyboxd_token",
  USER_ID: "jellyboxd_user_id",
  USER_NAME: "jellyboxd_user_name",
  DEVICE_ID: "jellyboxd_device_id",
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

  static async getStoredSession(): Promise<JellyfinSession | null> {
    try {
      const [serverUrl, token, userId, userName] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL),
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
        AsyncStorage.getItem(STORAGE_KEYS.USER_NAME),
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
      AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, session.serverUrl),
      AsyncStorage.setItem(STORAGE_KEYS.TOKEN, session.token),
      AsyncStorage.setItem(STORAGE_KEYS.USER_ID, session.userId),
      AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, session.userName),
    ]);
  }

  static async clearSession(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.SERVER_URL),
      AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_ID),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_NAME),
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

    const endpoint = `${cleanUrl}/Users/AuthenticateByName`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Emby-Authorization": this.getAuthHeader(),
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
      throw new Error(`Errore di connessione al server (${res.status} ${res.statusText}).`);
    }

    const data = await res.json();
    const session: JellyfinSession = {
      serverUrl: cleanUrl,
      token: data.AccessToken,
      userId: data.User.Id,
      userName: data.User.Name,
      serverId: data.ServerId,
    };

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

  static getStreamUrl(serverUrl: string, itemId: string, token: string): string {
    return `${serverUrl}/Videos/${itemId}/stream?static=true&api_key=${token}`;
  }

  static async fetchResumeItems(session: JellyfinSession): Promise<JellyfinItem[]> {
    const url = `${session.serverUrl}/UserViews/${session.userId}/Items?Recursive=true&Filters=IsResumable&SortBy=DatePlayed&SortOrder=Descending&Limit=15`;
    const res = await fetch(url, {
      headers: {
        "X-Emby-Authorization": this.getAuthHeader(session.token),
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  }

  static async fetchLibraries(session: JellyfinSession): Promise<JellyfinItem[]> {
    const url = `${session.serverUrl}/Users/${session.userId}/Views`;
    const res = await fetch(url, {
      headers: {
        "X-Emby-Authorization": this.getAuthHeader(session.token),
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  }

  static async fetchLibraryItems(
    session: JellyfinSession,
    parentId: string
  ): Promise<JellyfinItem[]> {
    const url = `${session.serverUrl}/Users/${session.userId}/Items?ParentId=${parentId}&Recursive=true&SortBy=SortName&Limit=100`;
    const res = await fetch(url, {
      headers: {
        "X-Emby-Authorization": this.getAuthHeader(session.token),
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  }

  static async fetchItemDetails(
    session: JellyfinSession,
    itemId: string
  ): Promise<JellyfinItem | null> {
    const url = `${session.serverUrl}/Users/${session.userId}/Items/${itemId}`;
    const res = await fetch(url, {
      headers: {
        "X-Emby-Authorization": this.getAuthHeader(session.token),
      },
    });
    if (!res.ok) return null;
    return await res.json();
  }

  // Playback reporting for live progress sync
  static async reportPlaybackStart(session: JellyfinSession, itemId: string): Promise<void> {
    try {
      await fetch(`${session.serverUrl}/Sessions/Playing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Emby-Authorization": this.getAuthHeader(session.token),
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
          "X-Emby-Authorization": this.getAuthHeader(session.token),
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
          "X-Emby-Authorization": this.getAuthHeader(session.token),
        },
        body: JSON.stringify({
          ItemId: itemId,
          PositionTicks: positionTicks,
        }),
      });
    } catch {}
  }
}
