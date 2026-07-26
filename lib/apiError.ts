type ToastLike = { error: (message: string) => void };

// ponytail: revert logic per-caller (state shapes differ), solo il "dillo all'utente" è condiviso
export async function reportIfFailed(res: Response, toast: ToastLike): Promise<boolean> {
  if (res.ok) return false;
  const data = await res.json().catch(() => ({}));
  toast.error(data.error ?? "Operazione non riuscita, riprova.");
  return true;
}
