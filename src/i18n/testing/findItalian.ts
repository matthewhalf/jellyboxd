const ITALIAN_WORDS = [
  "Impossibile", "Errore", "Accedi", "Accesso", "Annulla", "Riprova", "Disconnetti", "Impostazioni",
  "Aggiorna", "Aggiornamento", "Rimuovi", "Cerca", "Ricerca", "Libreria", "Stagione", "Stagioni",
  "Episodio", "Episodi", "Riproduci", "Riproduzione", "Continua", "Prossimo", "guardare", "Indietro",
  "Elimina", "Salva", "Chiudi", "Aggiungi", "Nessun", "Nessuno", "Trama", "Preferiti", "Esci",
  "Indirizzo", "Connesso", "Scaduta", "Sessione", "Utente", "Dimentica", "Svuota", "Archiviazione",
  "Mostra", "Nascondi", "Segna", "Riprendi", "Altri", "Tutti", "Tutte", "Nome", "Serie", "Nessuna",
  "trovata", "trovato", "trovati", "Caricamento", "Cancella", "Apri", "Torna", "Conferma", "Condividi",
  "Guarda", "Guardato", "Visto", "Pausa", "Stato", "Versione", "Sconosciuto", "Durata", "Anno", "Genere",
  "Regia", "Attori", "Interpreti", "Sinossi",
];

const WORD_RE = new RegExp(`\\b(${ITALIAN_WORDS.join("|")})\\b`, "i");
const ACCENT_RE = /[àèéìòù]/i;

/**
 * Italian hiding in source or dictionary text: accented letters or common Italian UI words.
 * Comments and console.* lines are ignored (developer-facing, not shown to users).
 */
export function findItalian(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
  return withoutComments
    .split("\n")
    .filter((line) => !line.includes("console."))
    .map((line) => line.trim())
    .filter((line) => ACCENT_RE.test(line) || WORD_RE.test(line));
}
