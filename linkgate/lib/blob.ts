import { put, get } from "@vercel/blob";
import { StoreData, defaultSettings } from "./types";

// Gates + settings only. Security bookkeeping and per-gate stats live in
// their own files (lib/security-store.ts, lib/stats.ts) so the much more
// frequent writes from public traffic don't contend with this one, which is
// only written by admin actions (create/edit/delete a gate, save settings).
// IMPORTANT: keep this path exactly as-is - it's the same file used since
// the first version of this app, and renaming it would orphan existing data.
const CONFIG_PATH = "linkgate-store.json";

let memoryFallback: StoreData | null = null;

function withDefaults(data: Partial<StoreData> | null | undefined): StoreData {
  return {
    gates: data?.gates ?? [],
    settings: { ...defaultSettings(), ...(data?.settings ?? {}) },
  };
}

export async function readJsonBlob<T>(path: string): Promise<T | null> {
  const result = await get(path, { access: "private" });
  if (!result) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as T;
}

export async function writeJsonBlob(path: string, data: unknown): Promise<void> {
  await put(path, JSON.stringify(data, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function readStore(): Promise<StoreData> {
  try {
    const parsed = await readJsonBlob<Partial<StoreData>>(CONFIG_PATH);
    if (!parsed) return memoryFallback ?? withDefaults(null);
    // withDefaults backfills any fields added in later versions of this app.
    return withDefaults(parsed);
  } catch {
    // Blob not configured yet, or some other read error - don't 500 the page.
    return memoryFallback ?? withDefaults(null);
  }
}

export async function writeStore(data: StoreData): Promise<void> {
  memoryFallback = data;
  await writeJsonBlob(CONFIG_PATH, data);
}

/**
 * Convenience helper: read the store, let the caller mutate it, then write
 * it back. Not a real transaction - if two writes race, the last one wins.
 * That's an acceptable tradeoff for this scale; gates/settings are only
 * touched by admin actions, so collisions here should be rare.
 */
export async function updateStore<T>(
  mutator: (data: StoreData) => T
): Promise<T> {
  const data = await readStore();
  const result = mutator(data);
  await writeStore(data);
  return result;
}
