type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };

/** Source of truth for every user-facing string. `it.ts` must have exactly the same shape. */
export const en = {
  common: {
    cancel: "Cancel",
    error: "Error",
    back: "Back",
  },
  tabs: {
    home: "Home",
    series: "Series",
    movies: "Movies",
    search: "Search",
  },
  library: {
    title: "Library",
  },
  settings: {
    title: "Settings",
    bitrate: {
      original: { label: "Original", sub: "Direct Play, maximum quality" },
      hd1080: { label: "1080p · 10 Mbps", sub: "Optimized high definition" },
      hd720: { label: "720p · 4 Mbps", sub: "Ideal on mobile networks" },
      sd480: { label: "480p · 1.5 Mbps", sub: "Low data usage" },
    },
    status: {
      sessionExpired: "Session expired",
      connected: "Connected",
      unreachable: "Unreachable",
    },
    refresh: {
      startedTitle: "Update started",
      startedMessage:
        "The server is scanning your libraries and downloading missing images. New content and images will appear in a few minutes.",
      failedTitle: "Update failed",
      forbidden: "Only an administrator account can update the server's libraries.",
      unreachable: "Unable to contact the server. Try again later.",
    },
    cache: {
      clearedTitle: "Cache cleared",
      clearedMessage: "The local image cache has been deleted.",
      failedMessage: "Unable to clear the image cache.",
    },
    switchServer: {
      signInAgain: "Sign in again",
      unreachableTitle: "Server unreachable",
      unreachableMessage: 'Unable to connect to "{serverUrl}".',
    },
    forget: {
      title: "Remove server",
      message: 'Forget the login for "{userName}" on {serverUrl}?',
      confirm: "Remove",
    },
    logout: {
      title: "Sign out",
      message: "Do you want to sign out of the account {userName}?",
      confirm: "Sign out",
    },
    server: {
      title: "Server",
      name: "Name",
      version: "Jellyfin version",
      address: "Address",
      status: "Status",
      refreshLibrary: "Refresh library",
    },
    servers: {
      title: "Your servers",
      footer: "Tap a server to switch to that account.",
      add: "Add another server",
    },
    streaming: {
      title: "Streaming quality",
      footer: "Used by the player when starting any movie or episode.",
    },
    account: {
      title: "Account",
      userName: "User name",
      userId: "User ID",
    },
    storage: {
      title: "Storage",
      clearCache: "Clear image cache",
    },
    demo: {
      title: "Demo mode",
      content: "Content",
      contentValue: "Blender open source films",
    },
    language: {
      title: "Language",
      automatic: "Automatic",
      automaticDetail: "Follows your phone ({language})",
      english: "English",
      italian: "Italiano",
      footer: "Choose the language of the app's menus and messages. Titles and descriptions come from your Jellyfin server.",
    },
  },
} as const;

export type Translations = DeepString<typeof en>;
