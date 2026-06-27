import { put, head } from "@vercel/blob";
import { StoreData, defaultSettings } from "./types";

// A single JSON file holds every gate + the site settings. Fine for a
// personal/small-traffic tool. If you outgrow it (lots of concurrent writes),
// swap this file for a real database - everything else calls only the
// functions below, so that's the only file you'd need to touch.
const STORE_PATH = "linkgate-store.json";

let memoryFallback: StoreData | null = null;

export async function readStore(): Promise<StoreData> {
  try {
    const info = await head(STORE_PATH);
    const res = await fetch(info.url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
    const data = (await res.json()) as StoreData;
    return data;
  } catch {
    // No store yet (first run) or blob not configured - start fresh.
    return memoryFallback ?? { gates: [], settings: defaultSettings() };
  }
}

export async function writeStore(data: StoreData): Promise<void> {
  memoryFallback = data;
  await put(STORE_PATH, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

/**
 * Convenience helper: read the store, let the caller mutate it, then write
 * it back. Not a real transaction - if two writes race, the last one wins.
 * That's an acceptable tradeoff for this scale; see note above.
 */
export async function updateStore<T>(
  mutator: (data: StoreData) => T
): Promise<T> {
  const data = await readStore();
  const result = mutator(data);
  await writeStore(data);
  return result;
}
