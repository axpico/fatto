import { extractFirstUrl } from "@/lib/videoPlatforms";
import { ImportPage } from "./ImportPage";

type SearchParams = Promise<{ url?: string | string[]; text?: string | string[] }>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// also the PWA share target (manifest.json): Android puts the shared link in `url` or, more
// often, inside `text` ("Guarda questa ricetta https://...")
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const text = first(params.text);
  const sharedUrl = first(params.url) || extractFirstUrl(text) || "";
  return <ImportPage sharedUrl={sharedUrl} sharedText={text} />;
}
