# Recipe Book

App self-hosted per archiviare le ricette che cucini davvero: ricerca (anche per ingredienti disponibili), import assistito da AI da link/screenshot/PDF, pianificazione settimanale con lista spesa, modalità cottura hands-free, storico e export PDF.

## Stack

Next.js (App Router) + TypeScript, PostgreSQL + Prisma, Tailwind CSS, Anthropic API per l'estrazione ricette, tesseract.js per l'OCR. Tutto in un solo repo, deploy via Docker Compose.

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

## Limiti noti (v1)

- Nessuna gestione dispensa/inventario persistente.
- Nessuna conversione di unità di misura (lo scaling porzioni è una moltiplicazione lineare).
- Nessun catalogo ingredienti condiviso: ogni ricetta ha i propri ingredienti in testo libero.
- L'import da PDF funziona solo su PDF con testo selezionabile — un PDF scansionato va importato come screenshot (immagine), non come PDF.
- Nessun comando vocale in modalità cottura.
- Quando l'import AI passa al fallback OpenRouter (modelli gratuiti), le risposte possono essere più lente o meno accurate di Claude — rivedi sempre i dati precompilati prima di salvare.
- Le foto non vengono ridimensionate lato server: usa immagini già di dimensioni ragionevoli.
