# Recipe Book

App self-hosted per archiviare le ricette che cucini davvero: ricerca (anche per ingredienti disponibili), import assistito da AI da link/screenshot/PDF/Reel Instagram (con traduzione automatica su richiesta), pianificazione settimanale con lista spesa e dispensa, modalità cottura hands-free con comandi vocali, storico e export PDF.

## Stack

Next.js (App Router) + TypeScript, PostgreSQL + Prisma, Tailwind CSS, Anthropic API per l'estrazione ricette, tesseract.js per l'OCR, yt-dlp/ffmpeg/whisper.cpp per l'import da Reel Instagram. Tutto in un solo repo, deploy via Docker Compose.

## Setup

1. Copia `.env.example` in `.env` e compila i valori:

   ```bash
   cp .env.example .env
   ```

   - `POSTGRES_PASSWORD`: password del database (scegline una qualsiasi, robusta)
   - `ANTHROPIC_API_KEY`: la tua chiave API Anthropic ([console.anthropic.com](https://console.anthropic.com)) per l'import AI delle ricette. Opzionale se imposti `OPENROUTER_API_KEY`.
   - `ANTHROPIC_MODEL`: modello da usare per l'estrazione (default `claude-haiku-4-5`, economico e sufficiente per estrarre dati strutturati)
   - `OPENROUTER_API_KEY`: chiave [OpenRouter](https://openrouter.ai/keys), opzionale — usata come fallback automatico se Anthropic non è configurata o la chiamata fallisce (chiave scaduta, rate limit, ecc.). Prova in sequenza i modelli gratuiti disponibili, scoperti a runtime (nessuna lista da configurare). Se nessuna delle due chiavi è impostata, l'import AI non è disponibile ma il resto dell'app funziona normalmente (inserimento manuale sempre possibile).
   - `OPENROUTER_MODEL_OVERRIDE`: solo per debug, forza un modello OpenRouter specifico saltando la scoperta automatica.
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`: credenziali del primo utente, create automaticamente all'avvio
   - `COOKIE_SECURE`: lascia `true` se l'app è dietro HTTPS (reverse proxy); metti `false` per un deploy su LAN in solo HTTP

2. Avvia lo stack:

   ```bash
   docker compose up -d --build
   ```

   Il primo avvio scarica le immagini, builda l'app, applica le migrazioni del database e crea l'utente admin. Segui i log con `docker compose logs -f app` se vuoi vedere il progresso.

3. Apri `http://localhost:3000` (o l'indirizzo del tuo server/NAS) e accedi con `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

4. Da telefono: apri l'app nel browser e usa "Aggiungi a schermata Home" per installarla come PWA.

## Aggiungere un altro utente

Non c'è una pagina di registrazione pubblica (è un'app per uso familiare chiuso). Per aggiungere o resettare un utente:

1. Modifica `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` in `.env` con i dati del nuovo utente.
2. Riavvia il container app: `docker compose up -d --force-recreate app`.
3. Se vuoi mantenere anche l'utente precedente, ripeti il processo cambiando di nuovo le variabili — ogni riavvio fa solo un upsert per email, non tocca gli altri utenti.

## Sviluppo locale (senza Docker)

Serve un Postgres raggiungibile (anche solo `docker compose up -d db`), poi:

```bash
npm install
npx prisma migrate deploy
npm run dev
```

Assicurati che `.env` punti al Postgres corretto (`DATABASE_URL`) e abbia `ANTHROPIC_API_KEY` valorizzata (anche un placeholder, se non ti serve testare l'import AI).

## Test

```bash
npm test
```

Copre la logica non banale: scaling porzioni, aggregazione quantità della lista spesa, ranking della ricerca per ingredienti disponibili.

## Dispensa e conversione unità

C'è una dispensa condivisa (`/pantry`, raggiungibile dalla lista della spesa): spuntare un articolo della lista lo aggiunge automaticamente in dispensa, e la pagina di ogni ricetta mostra un badge "in dispensa" sugli ingredienti che hai già (match sul nome, anche approssimato). Le quantità si sommano automaticamente anche quando le unità sono diverse ma compatibili (g/kg/hg, ml/l/cl, cucchiaio/cucchiaino/tazza/bicchiere trattate come volume approssimato). Non c'è conversione tra massa e volume (dipende dalla densità dell'ingrediente, non deducibile in modo affidabile), né deduplicazione retroattiva del catalogo ingredienti (usato solo per l'autocompletamento, cresce con l'uso).

## Import da Reel Instagram e traduzione

Nella pagina di import, oltre a link e screenshot/PDF, c'è una terza opzione "Da un Reel Instagram": incolla l'URL di un reel pubblico (`instagram.com/reel/...` o `/p/...`) e, opzionalmente, delle note manuali. Il server scarica il video (`yt-dlp`), ne trascrive l'audio (`whisper.cpp`, modello multilingua, rilevamento lingua automatico), estrae la caption e — se disponibili — i commenti, unisce tutto e lo passa alla stessa pipeline AI usata per link/screenshot/PDF. Le note manuali sono sempre incluse e sono l'unico modo per procedere se il download del video fallisce (reel privato, rimosso, o non raggiungibile) — in quel caso appare un errore chiaro e si può comunque proseguire scrivendo a mano cosa ricordi dalla descrizione/commenti.

Nella schermata "Rivedi e salva" (per qualunque metodo di import) c'è anche un selettore lingua + bottone "Traduci": traduce titolo, descrizione, nomi ingredienti e passaggi nella lingua scelta, lasciando invariati quantità/unità/porzioni/tempi (che non vengono mai inviati all'AI di traduzione). È un'azione esplicita, mai automatica.

## Limiti noti (v1)

- L'import da PDF funziona solo su PDF con testo selezionabile. Questo è un limite permanente, non temporaneo: un PDF scansionato va importato come screenshot (immagine, già supportato via OCR) — renderizzare le pagine PDF come immagini richiederebbe un binding nativo (canvas/cairo) fragile da compilare in Docker su Alpine, per un caso già coperto dal workaround.
- Quando l'import AI (estrazione o traduzione) passa al fallback OpenRouter (modelli gratuiti), le risposte possono essere più lente o meno accurate di Claude — la pagina di importazione lo segnala esplicitamente quando succede, ma rivedi comunque sempre i dati precompilati prima di salvare.
- L'import da Reel funziona solo con reel/post video pubblici e singoli: niente Stories, niente caroselli multi-immagine, niente login Instagram per contenuti privati.
- L'estrazione dei commenti Instagram è best-effort: se Instagram nega l'accesso (serve login, rate limit) viene saltata silenziosamente, senza bloccare l'import — resta sempre disponibile il campo note manuali.
