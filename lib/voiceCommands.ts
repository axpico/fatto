type VoiceCommand =
  | { type: "next" }
  | { type: "prev" }
  | { type: "timer" }
  | { type: "pauseTimer" }
  | { type: "cancelTimer" }
  | { type: "repeat" }
  | { type: "jump"; step: number }
  | { type: "timeLeft" };

const NUMBER_WORDS: Record<string, number> = {
  uno: 1,
  due: 2,
  tre: 3,
  quattro: 4,
  cinque: 5,
  sei: 6,
  sette: 7,
  otto: 8,
  nove: 9,
  dieci: 10,
  undici: 11,
  dodici: 12,
  tredici: 13,
  quattordici: 14,
  quindici: 15,
  sedici: 16,
  diciassette: 17,
  diciotto: 18,
  diciannove: 19,
  venti: 20,
};

// ponytail: euristica su parola di negazione, non vera comprensione della frase — basta per comandi
// vocali brevi in cucina ("non voglio andare indietro" non deve attivare "prev")
const NEGATION = /\b(non|no)\b/;

function has(text: string, phrase: string): boolean {
  return new RegExp(`\\b${phrase}\\b`).test(text);
}

export function matchVoiceCommand(transcript: string): VoiceCommand | null {
  const t = transcript.trim().toLowerCase();
  if (!t || NEGATION.test(t)) return null;

  const jumpMatch = t.match(/passaggio\s+(\d+|[a-zà]+)/);
  if (jumpMatch) {
    const raw = jumpMatch[1];
    const step = /^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS[raw];
    if (step) return { type: "jump", step };
  }

  if (has(t, "ripeti")) return { type: "repeat" };
  if (has(t, "quanto manca")) return { type: "timeLeft" };
  if (has(t, "indietro") || has(t, "precedente")) return { type: "prev" };
  if (has(t, "avanti") || has(t, "prossimo") || has(t, "successivo") || has(t, "dopo")) return { type: "next" };
  if (has(t, "annulla timer") || has(t, "ferma timer")) return { type: "cancelTimer" };
  if (has(t, "pausa") || has(t, "metti in pausa")) return { type: "pauseTimer" };
  if (has(t, "avvia timer") || has(t, "parti")) return { type: "timer" };
  return null;
}
