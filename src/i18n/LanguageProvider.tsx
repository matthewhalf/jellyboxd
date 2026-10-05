import { getLocales } from "expo-localization";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { applyPreference, initLanguage } from "./controller";
import { resolveLanguage, type LanguagePreference } from "./language";
import { getCurrentLanguage, subscribeLanguage, t, type Language } from "./translate";

interface LanguageContextValue {
  t: typeof t;
  /** The language actually in use. */
  language: Language;
  /** What the user picked: "system" follows the phone. */
  preference: LanguagePreference;
  /** The language the phone would give with "system". */
  deviceLanguage: Language;
  setPreference: (preference: LanguagePreference) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within a LanguageProvider");
  return ctx;
}

/** Loads the saved language before rendering anything, then re-renders every consumer on change. */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ preference: LanguagePreference; language: Language } | null>(null);
  const deviceCodes = useMemo(() => getLocales().map((locale) => locale.languageCode), []);

  useEffect(() => {
    let active = true;
    initLanguage(deviceCodes).then((initial) => {
      if (active) setState(initial);
    });
    return () => {
      active = false;
    };
  }, [deviceCodes]);

  useEffect(
    () =>
      subscribeLanguage(() =>
        setState((prev) => (prev ? { ...prev, language: getCurrentLanguage() } : prev))
      ),
    []
  );

  const setPreference = useCallback(
    async (preference: LanguagePreference) => {
      await applyPreference(preference, deviceCodes);
      setState({ preference, language: getCurrentLanguage() });
    },
    [deviceCodes]
  );

  const value = useMemo<LanguageContextValue | null>(
    () =>
      state && {
        t,
        language: state.language,
        preference: state.preference,
        deviceLanguage: resolveLanguage("system", deviceCodes),
        setPreference,
      },
    [state, deviceCodes, setPreference]
  );

  if (!value) return null;
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
