type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };

/** Source of truth for every user-facing string. `it.ts` must have exactly the same shape. */
export const en = {
  common: {
    cancel: "Cancel",
    error: "Error",
    durationMinutes: "{minutes} min",
    durationHours: "{hours} h",
    durationHoursMinutes: "{hours} h {minutes} min",
    back: "Back",
  },
  login: {
    signIn: "Sign in",
    addServer: "Add server",
    subtitleSaved: "Choose a server or add a new one",
    subtitleNew: "Sign in to your Jellyfin server",
    orAddNew: "OR ADD A NEW SERVER",
    footer: "Watch progress is synced automatically with Jellyfin.",
    attentionTitle: "Attention",
    missingFields: "Enter the server address and the user name.",
    failedTitle: "Sign-in error",
    failedMessage: "Unable to connect to the server.",
    serverPlaceholder: "Server address (e.g. http://192.168.1.10:8096)",
    usernamePlaceholder: "User name",
    passwordPlaceholder: "Password",
  },
  addServer: {
    title: "Add server",
    subtitle:
      "Sign in with the credentials of another Jellyfin server. It will stay saved so you can switch between accounts in one tap.",
  },
  home: {
    continueWatching: "Continue Watching",
    recentSeries: "Recent series",
    recentMovies: "Recent movies",
    errorTitle: "Connection failed",
    errorMessage: "Unable to load content from the Jellyfin server.",
    retry: "Try again",
  },
  hero: {
    movie: "Movie",
    series: "TV series",
    details: "Learn more",
  },
  continueCard: {
    resume: "Resume",
    nextEpisode: "Next episode",
    toWatch: "To watch",
    timeLeft: "{time} left",
  },
  movies: {
    title: "Movies",
    empty: "No movies found on the server",
  },
  series: {
    title: "TV Shows",
    empty: "No series found on the server",
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
