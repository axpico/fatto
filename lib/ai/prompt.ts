export const SYSTEM_PROMPT = `Sei un assistente che estrae ricette da testo grezzo (pagine web o OCR di
screenshot/PDF). Estrai SOLO i dati esplicitamente presenti nel testo. Se un valore non è
determinabile, usa null — non inventare quantità, tempi o porzioni. Mantieni l'ordine originale
di ingredienti e passaggi.`;

// ponytail: descrizione JSON a mano invece di zod-to-json-schema — schema piccolo e stabile,
// serve solo ai modelli OpenRouter che non supportano structured output nativo come Anthropic
export const JSON_INSTRUCTIONS = `Rispondi ESCLUSIVAMENTE con un oggetto JSON valido (nessun testo
prima o dopo, nessun blocco di codice markdown), con esattamente questa forma:
{
  "title": string,
  "servings": number | null,
  "prep_time_minutes": number | null,
  "cook_time_minutes": number | null,
  "ingredients": [{ "name": string, "quantity": number | null, "unit": string | null }],
  "steps": [{ "instruction": string, "timer_minutes": number | null }]
}`;
