import { loadLanguagePreference, resolveLanguage, saveLanguagePreference, type LanguagePreference } from "./language";
import { setCurrentLanguage, type Language } from "./translate";

type DeviceCodes = readonly (string | null | undefined)[];

/** Loads the saved preference (or the phone's language) and makes it the current language. */
export async function initLanguage(
  deviceLanguageCodes: DeviceCodes
): Promise<{ preference: LanguagePreference; language: Language }> {
  const preference = await loadLanguagePreference();
  const language = resolveLanguage(preference, deviceLanguageCodes);
  setCurrentLanguage(language);
  return { preference, language };
}

/** Saves a new preference and switches the current language, notifying subscribers. */
export async function applyPreference(
  preference: LanguagePreference,
  deviceLanguageCodes: DeviceCodes
): Promise<Language> {
  await saveLanguagePreference(preference);
  const language = resolveLanguage(preference, deviceLanguageCodes);
  setCurrentLanguage(language);
  return language;
}
