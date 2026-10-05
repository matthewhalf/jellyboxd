type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };

/** Source of truth for every user-facing string. `it.ts` must have exactly the same shape. */
export const en = {
  common: {
    cancel: "Cancel",
    back: "Back",
  },
  settings: {
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
