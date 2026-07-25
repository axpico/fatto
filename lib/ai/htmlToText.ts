const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

// ponytail: regex strip, non un parser HTML completo — Claude tollera il rumore residuo
export function htmlToText(html: string): string {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  const withoutTags = withoutNoise.replace(/<[^>]+>/g, " ");

  const decoded = withoutTags.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);

  return decoded.replace(/\s+/g, " ").trim().slice(0, 15000);
}
