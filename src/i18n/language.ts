import * as SecureStore from "expo-secure-store";
import type { Language } from "./translate";

export type LanguagePreference = "system" | Language;

const STORAGE_KEY = "jellyboxd_language";

const VALID: readonly string[] = ["system", "en", "it"];

/** `system` follows the phone's first language: Italian gives Italian, everything else English. */
export function resolveLanguage(
  preference: LanguagePreference,
  deviceLanguageCodes: readonly (string | null | undefined)[]
): Language {
  if (preference !== "system") return preference;
  const first = deviceLanguageCodes.find((code) => code && code.trim());
  return first?.trim().toLowerCase().startsWith("it") ? "it" : "en";
}

export async function loadLanguagePreference(): Promise<LanguagePreference> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    return stored && VALID.includes(stored) ? (stored as LanguagePreference) : "system";
  } catch {
    return "system";
  }
}

export async function saveLanguagePreference(preference: LanguagePreference): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, preference);
  } catch {
    // The choice still applies for this session; it just won't survive a restart
  }
}
