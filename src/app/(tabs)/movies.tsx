import React from "react";
import { PosterGridScreen } from "../../components/tv/PosterGridScreen";
import { JellyfinService } from "../../services/jellyfin";

export default function MoviesScreen() {
  return (
    <PosterGridScreen
      title="Film"
      emptyIcon="film-outline"
      emptyText="Nessun film trovato nel server"
      fetchItems={(session) => JellyfinService.fetchMovies(session, 100)}
    />
  );
}
