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
  search: {
    all: "All",
    emptyTitle: "Search your library",
    emptySubtitle: "Movies and TV shows available on your Jellyfin server",
    noResultsTitle: "No results",
    noResultsMessage: "No title matches “{query}”",
    placeholder: "Movies, TV shows",
  },
  item: {
    more: "MORE",
    noEpisodes: "No episodes in this season.",
    castAndCrew: "Cast & Crew",
    information: "Information",
    genre: "Genre",
    year: "Year",
    duration: "Duration",
    seasons: "Seasons",
    contentRating: "Content rating",
    rating: "Rating",
    director: "Director",
    episode: "EPISODE {number}",
    episodeTimeLeft: " · {time} LEFT",
  },
  menu: {
    play: "Play",
    resume: "Resume",
    goToSeries: "Go to series",
    markWatched: "Mark as watched",
    markUnwatched: "Mark as unwatched",
  },
  player: {
    failedTitle: "Playback failed",
    failedMessage: "Unable to start the video stream.",
    itemNotFound: "Item not found",
  },
  errors: {
    unreachable: 'Unable to reach the server "{serverUrl}". Check that it is online and try again.',
    sessionExpired: 'The login of "{userName}" on {serverUrl} has expired. Sign in again to load the library.',
    loginUnreachable:
      'Unable to reach the server at {serverUrl}.\n\nIf the server is running on this computer, use its local IP (e.g. http://192.168.1.238:8096) and not "localhost".',
    invalidCredentials: "Incorrect credentials (wrong user name or password).",
    serverError: "Jellyfin server error ({status}): {details}",
  },
  demo: {
    libraries: { movies: "Movies", series: "TV Shows" },
    genres: {
      animation: "Animation",
      comedy: "Comedy",
      fantasy: "Fantasy",
      scifi: "Sci-Fi",
      surreal: "Surreal",
      anthology: "Anthology",
    },
    season1: "Season 1",
    overview: {
      "demo-movie-bbb": "A gentle giant rabbit takes revenge on three mischievous rodents who have disturbed his peace.",
      "demo-movie-sintel": "A young woman sets out to track down the dragon that took her young friend.",
      "demo-movie-tos":
        "In a future ravaged by robots, a band of warriors and scientists tries to save the world from a mistake of the past.",
      "demo-movie-ed": "Two men explore a vast, mysterious machine, somewhere between dream and reality.",
      "demo-movie-cosmos": "Franck, a sheep on the edge, meets a strange salesman who offers him a new life.",
      "demo-movie-spring": "A shepherd girl and her dog face ancient spirits to bring back the spring.",
      "demo-series-caminandes": "The adventures of Koro, a llama looking for food in the Patagonian snow.",
      "demo-series-shorts": "A collection of open source animated shorts from Blender Studio.",
      "demo-ep-cam1": "Koro tries to cross a fence to reach some delicious bushes.",
      "demo-ep-cam2": "Koro tries to reach the grass across the road, hindered by a mischievous armadillo.",
      "demo-ep-cam3": "Koro and Oti fight over a piece of fruit in a freezing winter.",
      "demo-ep-hero": "Open source animated short film from Blender Studio.",
      "demo-ep-wingit": "Open source animated short film from Blender Studio.",
      "demo-ep-sprite": "Open source animated short film from Blender Studio, somewhere between comedy and thrills.",
    },
    attribution:
      "Sample content: open source films from the Blender Foundation and Blender Studio. Artwork consists of frames taken from the films themselves.\n\nBig Buck Bunny (2008), Sintel (2010), Tears of Steel (2012), Caminandes: Llama Drama, Gran Dillama and Llamigos: © Blender Foundation, CC BY 3.0.\n\nElephants Dream (2006): © Blender Foundation / Netherlands Media Art Institute, CC BY 2.5.\n\nCosmos Laundromat (2015), Spring (2019), Hero, Wing It! and Sprite Fright: © Blender Foundation / Blender Studio, CC BY 4.0.\n\nLicenses: creativecommons.org/licenses/by. Jellyboxd is not affiliated with the Blender Foundation.",
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
