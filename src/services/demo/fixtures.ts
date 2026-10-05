import type { JellyfinItem, MediaSourceInfo } from "../jellyfin";

const TICKS_PER_SECOND = 10_000_000;
const ARCHIVE = "https://archive.org/download";

/** Public CC-BY / public-domain Blender films. Every url answers 200 with a progressive mp4/mov that AVPlayer plays. */
export const DEMO_STREAMS: Record<string, string> = {
  "demo-movie-bbb": `${ARCHIVE}/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4`,
  "demo-movie-sintel": `${ARCHIVE}/Sintel/sintel-2048-stereo_512kb.mp4`,
  "demo-movie-tos": "https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov",
  "demo-movie-ed": "https://download.blender.org/ED/elephantsdream-480-h264-st-aac.mov",
  "demo-movie-cosmos": `${ARCHIVE}/CosmosLaundromatFirstCycle/Cosmos%20Laundromat%20-%20First%20Cycle%20%281080p%29.mp4`,
  "demo-movie-spring": `${ARCHIVE}/spring_blenderopenmovie/Spring%20-%20Blender%20Open%20Movie%20-%20YouTube.mp4`,
  "demo-ep-cam1": `${ARCHIVE}/Caminandes1LlamaDrama/01_llama_drama_1080p.mp4`,
  "demo-ep-cam2": `${ARCHIVE}/Caminandes2GranDillama/02_gran_dillama_1080p.mp4`,
  "demo-ep-cam3": `${ARCHIVE}/CaminandesLlamigos/Caminandes_%20Llamigos-1080p.mp4`,
  "demo-ep-hero": `${ARCHIVE}/hero_20260106/hero.mp4`,
  "demo-ep-wingit": `${ARCHIVE}/wing_it/wing_it.mp4`,
  "demo-ep-sprite": `${ARCHIVE}/sprite-fright-2021/Sprite%20Fright%20%282021%29.mp4`,
};

function mediaSource(id: string): MediaSourceInfo[] {
  return [
    {
      Id: id,
      Container: "mp4",
      MediaStreams: [
        { Type: "Video", Codec: "h264", Index: 0, Width: 1280, Height: 720, IsDefault: true, DisplayTitle: "720p H264" },
        { Type: "Audio", Codec: "aac", Index: 1, Language: "eng", Channels: 2, IsDefault: true, DisplayTitle: "English - AAC - Stereo" },
      ],
    },
  ];
}

function movie(
  slug: string,
  name: string,
  year: number,
  seconds: number,
  rating: number,
  dateCreated: string,
  genres: string[],
  overview: string
): JellyfinItem {
  const id = `demo-movie-${slug}`;
  return {
    Id: id,
    Name: name,
    Type: "Movie",
    Overview: overview,
    ProductionYear: year,
    CommunityRating: rating,
    RunTimeTicks: Math.round(seconds * TICKS_PER_SECOND),
    OfficialRating: "G",
    Genres: genres,
    DateCreated: dateCreated,
    ImageTags: { Primary: "demo" },
    BackdropImageTags: ["demo"],
    MediaSources: mediaSource(id),
    UserData: { Played: false, IsFavorite: false, PlaybackPositionTicks: 0 },
  };
}

function series(
  slug: string,
  name: string,
  year: number,
  dateCreated: string,
  genres: string[],
  overview: string
): JellyfinItem {
  return {
    Id: `demo-series-${slug}`,
    Name: name,
    Type: "Series",
    Overview: overview,
    ProductionYear: year,
    CommunityRating: 8,
    OfficialRating: "G",
    Genres: genres,
    DateCreated: dateCreated,
    DateLastMediaAdded: dateCreated,
    ImageTags: { Primary: "demo" },
    BackdropImageTags: ["demo"],
    UserData: { Played: false, IsFavorite: false },
  };
}

function season(seriesSlug: string, seriesName: string): JellyfinItem {
  return {
    Id: `demo-season-${seriesSlug}-1`,
    Name: "Stagione 1",
    Type: "Season",
    SeriesId: `demo-series-${seriesSlug}`,
    SeriesName: seriesName,
    IndexNumber: 1,
    ImageTags: { Primary: "demo" },
    UserData: { Played: false },
  };
}

function episode(
  slug: string,
  seriesSlug: string,
  seriesName: string,
  number: number,
  name: string,
  seconds: number,
  dateCreated: string,
  overview: string
): JellyfinItem {
  const id = `demo-ep-${slug}`;
  return {
    Id: id,
    Name: name,
    Type: "Episode",
    Overview: overview,
    RunTimeTicks: Math.round(seconds * TICKS_PER_SECOND),
    SeriesId: `demo-series-${seriesSlug}`,
    SeriesName: seriesName,
    SeasonId: `demo-season-${seriesSlug}-1`,
    SeasonName: "Stagione 1",
    ParentIndexNumber: 1,
    IndexNumber: number,
    ParentBackdropItemId: `demo-series-${seriesSlug}`,
    DateCreated: dateCreated,
    ImageTags: { Primary: "demo" },
    MediaSources: mediaSource(id),
    UserData: { Played: false, IsFavorite: false, PlaybackPositionTicks: 0 },
  };
}

export const DEMO_LIBRARIES: JellyfinItem[] = [
  { Id: "demo-lib-movies", Name: "Film", Type: "CollectionFolder" },
  { Id: "demo-lib-series", Name: "Serie TV", Type: "CollectionFolder" },
];

export const DEMO_MOVIES: JellyfinItem[] = [
  movie("bbb", "Big Buck Bunny", 2008, 596.48, 7.6, "2026-09-01T10:00:00.0000000Z", ["Animazione", "Commedia"],
    "Un enorme coniglio dal cuore gentile si vendica di tre roditori dispettosi che hanno disturbato la sua quiete."),
  movie("sintel", "Sintel", 2010, 888.064, 7.5, "2026-09-02T10:00:00.0000000Z", ["Animazione", "Fantasy"],
    "Una giovane donna si mette sulle tracce del drago che le ha portato via il suo cucciolo."),
  movie("tos", "Tears of Steel", 2012, 734.167, 6.8, "2026-09-03T10:00:00.0000000Z", ["Fantascienza"],
    "In un futuro devastato dai robot, un gruppo di guerrieri e scienziati tenta di salvare il mondo da un errore del passato."),
  movie("ed", "Elephants Dream", 2006, 658.32, 6.2, "2026-09-04T10:00:00.0000000Z", ["Animazione", "Surreale"],
    "Due uomini esplorano una macchina enorme e misteriosa, tra sogno e realtà."),
  movie("cosmos", "Cosmos Laundromat", 2015, 730.616, 7.1, "2026-09-05T10:00:00.0000000Z", ["Animazione", "Fantasy"],
    "Franck, una pecora sull'orlo del baratro, incontra uno strano venditore che gli offre una nuova vita."),
  movie("spring", "Spring", 2019, 464.127, 7.9, "2026-09-06T10:00:00.0000000Z", ["Animazione", "Fantasy"],
    "Una pastorella e il suo cane affrontano gli spiriti antichi per il ritorno della primavera."),
];

export const DEMO_SERIES: JellyfinItem[] = [
  series("caminandes", "Caminandes", 2013, "2026-09-07T10:00:00.0000000Z", ["Animazione", "Commedia"],
    "Le avventure di Koro, un lama in cerca di cibo tra la neve della Patagonia."),
  series("shorts", "Blender Studio Shorts", 2023, "2026-09-08T10:00:00.0000000Z", ["Animazione", "Antologia"],
    "Una raccolta di cortometraggi open source dal Blender Studio."),
];

export const DEMO_SEASONS: JellyfinItem[] = [
  season("caminandes", "Caminandes"),
  season("shorts", "Blender Studio Shorts"),
];

export const DEMO_EPISODES: JellyfinItem[] = [
  episode("cam1", "caminandes", "Caminandes", 1, "Llama Drama", 90.001, "2026-09-07T10:01:00.0000000Z",
    "Koro cerca di attraversare un recinto per raggiungere dei deliziosi cespugli."),
  episode("cam2", "caminandes", "Caminandes", 2, "Gran Dillama", 146.042, "2026-09-07T10:02:00.0000000Z",
    "Koro tenta di raggiungere l'erba oltre la strada, ostacolato da un armadillo dispettoso."),
  episode("cam3", "caminandes", "Caminandes", 3, "Llamigos", 150.101, "2026-09-07T10:03:00.0000000Z",
    "Koro e Oti si contendono un pezzo di frutta in un inverno gelido."),
  episode("hero", "shorts", "Blender Studio Shorts", 1, "Hero", 236.665, "2026-09-08T10:01:00.0000000Z",
    "Cortometraggio d'animazione open source del Blender Studio."),
  episode("wingit", "shorts", "Blender Studio Shorts", 2, "Wing It!", 237.937, "2026-09-08T10:02:00.0000000Z",
    "Cortometraggio d'animazione open source del Blender Studio."),
  {
    ...episode("sprite", "shorts", "Blender Studio Shorts", 3, "Sprite Fright", 629.841, "2026-09-08T10:03:00.0000000Z",
      "Cortometraggio d'animazione open source del Blender Studio, tra commedia e brivido."),
    OfficialRating: "PG",
  },
];
