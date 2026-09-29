import React from "react";
import { PosterGridScreen } from "../../components/tv/PosterGridScreen";
import { JellyfinService } from "../../services/jellyfin";

export default function SeriesScreen() {
  return (
    <PosterGridScreen
      title="Serie TV"
      emptyIcon="tv-outline"
      emptyText="Nessuna serie trovata nel server"
      fetchPage={(session, start, limit) => JellyfinService.fetchSeriesPage(session, start, limit)}
      seriesOnly
    />
  );
}
