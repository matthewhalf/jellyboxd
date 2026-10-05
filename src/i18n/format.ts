import type { TranslateParams, TranslationKey } from "./translate";

type Translate = (key: TranslationKey, params?: TranslateParams) => string;

/** "45 min", "2 h" or "2 h 5 min", in the language `t` translates to. */
export function formatMinutes(mins: number, t: Translate): string {
  if (mins < 60) return t("common.durationMinutes", { minutes: mins });
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return minutes > 0
    ? t("common.durationHoursMinutes", { hours, minutes })
    : t("common.durationHours", { hours });
}
