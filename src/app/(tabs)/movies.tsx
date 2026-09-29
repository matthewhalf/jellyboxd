import React from "react";
import { PosterGridScreen } from "../../components/tv/PosterGridScreen";
import { JellyfinService } from "../../services/jellyfin";

export default function MoviesScreen() {
  return (
    <PosterGridScreen
      title="Film"
      emptyIcon="film-outline"
      emptyText="Nessun film trovato nel server"
      fetchPage={(session, start, limit) => JellyfinService.fetchMoviesPage(session, start, limit)}
    />
  );
}
