import { put, get } from "@vercel/blob";
import { StoreData, defaultSettings, defaultSecurity } from "./types";

// A single JSON file holds every gate + the site settings. Fine for a
// personal/small-traffic tool. If you outgrow it (lots of concurrent writes),
// swap this file for a real database - everything else calls only the
// functions below, so that's the only file you'd need to touch.
const STORE_PATH = "linkgate-store.json";

let memoryFallback: StoreData | null = null;

function withDefaults(data: Partial<StoreData> | null | undefined): StoreData {
  return {
    gates: data?.gates ?? [],
    settings: { ...defaultSettings(), ...(data?.settings ?? {}) },
    security: { ...defaultSecurity(), ...(data?.security ?? {}) },
  };
}

export async function readStore(): Promise<StoreData> {
  try {
    const result = await get(STORE_PATH, { access: "private" });
    if (!result) {
      // No store yet (first run) - start fresh.
      return memoryFallback ?? withDefaults(null);
    }
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text) as Partial<StoreData>;
    // withDefaults backfills any fields added in later versions of this app
    // (e.g. an older store created before "security" or "quickLinks" existed).
    return withDefaults(parsed);
  } catch {
    // Blob not configured yet, or some other read error - don't 500 the page.
    return memoryFallback ?? withDefaults(null);
  }
}

export async function writeStore(data: StoreData): Promise<void> {
  memoryFallback = data;
  await put(STORE_PATH, JSON.stringify(data, null, 2), {
    access: "private",
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
