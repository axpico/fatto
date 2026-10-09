type ToastLike = { error: (message: string) => void };

export const NETWORK_ERROR = "Connessione assente, riprova.";

/** Estrae `{ error }` dal body di una risposta fallita, con fallback se non è JSON valido. */
export async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return data.error ?? fallback;
}

// ponytail: revert logic per-caller (state shapes differ), solo il "dillo all'utente" è condiviso
export async function reportIfFailed(res: Response, toast: ToastLike): Promise<boolean> {
  if (res.ok) return false;
  toast.error(await readErrorMessage(res, "Operazione non riuscita, riprova."));
  return true;
}

// GET-and-parse per liste (tags/duplicates, users): stesso fallimento silenzioso evitato in un posto solo.
// Prende il setter come callback (stile `.then(setFoo)`) invece di restituire il dato, così l'effetto
// chiamante non contiene una call expression diretta a setState (react-hooks/set-state-in-effect).
export async function loadJson<T>(url: string, toast: ToastLike, onSuccess: (data: T) => void): Promise<void> {
  try {
    const res = await fetch(url);
    if (await reportIfFailed(res, toast)) return;
    onSuccess((await res.json()) as T);
  } catch {
    toast.error("Caricamento non riuscito, riprova.");
  }
}
