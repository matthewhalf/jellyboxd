import { en, type Translations } from "./en";
import { it } from "./it";

export type Language = "en" | "it";

type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

type StripPlural<K extends string> = K extends `${infer Base}_${"zero" | "one" | "other"}` ? Base : K;

/** Dotted path of a string in the dictionary; plural variants (`key_one`, `key_other`) are addressed as `key`. */
export type TranslationKey = StripPlural<Paths<Translations>>;

export type TranslateParams = Record<string, string | number>;

function lookup(dict: object, path: string): unknown {
  return path.split(".").reduce<unknown>((node, part) => {
    return node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined;
  }, dict);
}

function pluralRule(language: Language, count: number): string {
  try {
    return new Intl.PluralRules(language).select(count);
  } catch {
    // Intl.PluralRules is not guaranteed on every JS engine; en and it only distinguish 1 from the rest
    return count === 1 ? "one" : "other";
  }
}

export function createTranslator(
  dicts: Record<Language, object>,
  getLanguage: () => Language
): (key: string, params?: TranslateParams) => string {
  const find = (language: Language, key: string, count?: number): string | undefined => {
    const dict = dicts[language];
    if (count !== undefined) {
      for (const suffix of [pluralRule(language, count), "other"]) {
        const plural = lookup(dict, `${key}_${suffix}`);
        if (typeof plural === "string") return plural;
      }
    }
    const value = lookup(dict, key);
    return typeof value === "string" ? value : undefined;
  };

  return (key, params) => {
    const count = typeof params?.count === "number" ? params.count : undefined;
    const raw = find(getLanguage(), key, count) ?? find("en", key, count) ?? key;
    if (!params) return raw;
    return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
      params[name] === undefined ? match : String(params[name])
    );
  };
}

let currentLanguage: Language = "en";
const listeners = new Set<() => void>();

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

export function setCurrentLanguage(language: Language): void {
  if (language === currentLanguage) return;
  currentLanguage = language;
  listeners.forEach((listener) => listener());
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Translates in the current language. Safe to call from non-React code, but never at module load. */
export const t = createTranslator({ en, it }, getCurrentLanguage) as (
  key: TranslationKey,
  params?: TranslateParams
) => string;
