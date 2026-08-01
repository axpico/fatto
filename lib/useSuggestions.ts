import { useEffect, useState } from "react";

/** Fetches a JSON array from `url` once on mount and maps it with `pick`, swallowing failures
 * (suggestions are a nice-to-have, never worth blocking or erroring the form over). */
export function useSuggestions<T>(url: string, pick: (row: T) => string): string[] {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((rows: T[]) => setSuggestions(rows.map(pick)))
      .catch((err) => console.error(`useSuggestions(${url}) failed`, err));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once per mount, url is expected static per call site
  }, [url]);

  return suggestions;
}
