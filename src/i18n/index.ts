export { applyPreference, initLanguage } from "./controller";
export { loadLanguagePreference, resolveLanguage, saveLanguagePreference } from "./language";
export type { LanguagePreference } from "./language";
export {
  createTranslator,
  getCurrentLanguage,
  setCurrentLanguage,
  subscribeLanguage,
  t,
} from "./translate";
export type { Language, TranslateParams, TranslationKey } from "./translate";
