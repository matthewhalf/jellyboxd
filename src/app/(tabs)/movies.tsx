import React from "react";
import { PosterGridScreen } from "../../components/tv/PosterGridScreen";
import { useTranslation } from "../../i18n";
import { JellyfinService } from "../../services/jellyfin";

export default function MoviesScreen() {
  const { t } = useTranslation();
  return (
    <PosterGridScreen
      title={t("movies.title")}
      emptyIcon="film-outline"
      emptyText={t("movies.empty")}
      fetchPage={(session, start, limit) => JellyfinService.fetchMoviesPage(session, start, limit)}
    />
  );
}
