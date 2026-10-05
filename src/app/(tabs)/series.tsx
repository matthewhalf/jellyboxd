import React from "react";
import { PosterGridScreen } from "../../components/tv/PosterGridScreen";
import { useTranslation } from "../../i18n";
import { JellyfinService } from "../../services/jellyfin";

export default function SeriesScreen() {
  const { t } = useTranslation();
  return (
    <PosterGridScreen
      title={t("series.title")}
      emptyIcon="tv-outline"
      emptyText={t("series.empty")}
      fetchPage={(session, start, limit) => JellyfinService.fetchSeriesPage(session, start, limit)}
      seriesOnly
    />
  );
}
