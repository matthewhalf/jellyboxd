import type { Translations } from "./en";

export const it: Translations = {
  common: {
    cancel: "Annulla",
    error: "Errore",
    back: "Indietro",
  },
  tabs: {
    home: "Home",
    series: "Serie",
    movies: "Film",
    search: "Cerca",
  },
  library: {
    title: "Libreria",
  },
  settings: {
    title: "Impostazioni",
    bitrate: {
      original: { label: "Originale", sub: "Direct Play, massima qualità" },
      hd1080: { label: "1080p · 10 Mbps", sub: "Alta definizione ottimizzata" },
      hd720: { label: "720p · 4 Mbps", sub: "Ideale su rete mobile" },
      sd480: { label: "480p · 1,5 Mbps", sub: "Basso consumo dati" },
    },
    status: {
      sessionExpired: "Sessione scaduta",
      connected: "Connesso",
      unreachable: "Non raggiungibile",
    },
    refresh: {
      startedTitle: "Aggiornamento avviato",
      startedMessage:
        "Il server sta scansionando le librerie e scaricando le immagini mancanti. Nuovi contenuti e immagini compariranno tra qualche minuto.",
      failedTitle: "Aggiornamento non riuscito",
      forbidden: "Solo un account amministratore può aggiornare le librerie del server.",
      unreachable: "Impossibile contattare il server. Riprova più tardi.",
    },
    cache: {
      clearedTitle: "Cache svuotata",
      clearedMessage: "La cache locale delle immagini è stata cancellata.",
      failedMessage: "Impossibile cancellare la cache delle immagini.",
    },
    switchServer: {
      signInAgain: "Accedi di nuovo",
      unreachableTitle: "Server non raggiungibile",
      unreachableMessage: 'Impossibile connettersi a "{serverUrl}".',
    },
    forget: {
      title: "Rimuovi server",
      message: 'Dimenticare l\'accesso a "{userName}" su {serverUrl}?',
      confirm: "Rimuovi",
    },
    logout: {
      title: "Disconnessione",
      message: "Vuoi disconnetterti dall'account {userName}?",
      confirm: "Disconnetti",
    },
    server: {
      title: "Server",
      name: "Nome",
      version: "Versione Jellyfin",
      address: "Indirizzo",
      status: "Stato",
      refreshLibrary: "Aggiorna libreria",
    },
    servers: {
      title: "I tuoi server",
      footer: "Tocca un server per passare a quell'account.",
      add: "Aggiungi un altro server",
    },
    streaming: {
      title: "Qualità di streaming",
      footer: "Usata dal player all'avvio di ogni film o episodio.",
    },
    account: {
      title: "Account",
      userName: "Nome utente",
      userId: "ID utente",
    },
    storage: {
      title: "Archiviazione",
      clearCache: "Svuota cache immagini",
    },
    demo: {
      title: "Modalità demo",
      content: "Contenuti",
      contentValue: "Film open source Blender",
    },
    language: {
      title: "Lingua",
      automatic: "Automatica",
      automaticDetail: "Segue il telefono ({language})",
      english: "English",
      italian: "Italiano",
      footer: "Scegli la lingua dei menu e dei messaggi dell'app. Titoli e descrizioni arrivano dal tuo server Jellyfin.",
    },
  },
};
