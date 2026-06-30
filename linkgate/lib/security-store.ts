import { readJsonBlob, writeJsonBlob } from "./blob";
import { SecurityState, defaultSecurity } from "./types";

const SECURITY_PATH = "linkgate-security.json";

let memoryFallback: SecurityState | null = null;

function withDefaults(data: Partial<SecurityState> | null | undefined): SecurityState {
  return {
    failedAttempts: data?.failedAttempts ?? {},
    usedTokens: data?.usedTokens ?? {},
    sessionStarts: data?.sessionStarts ?? {},
  };
}

export async function readSecurity(): Promise<SecurityState> {
  try {
    const parsed = await readJsonBlob<Partial<SecurityState>>(SECURITY_PATH);
    if (!parsed) return memoryFallback ?? withDefaults(null);
    return withDefaults(parsed);
  } catch {
    return memoryFallback ?? withDefaults(null);
  }
}

export async function writeSecurity(data: SecurityState): Promise<void> {
  memoryFallback = data;
  await writeJsonBlob(SECURITY_PATH, data);
}

export async function updateSecurity<T>(
  mutator: (data: SecurityState) => T
): Promise<T> {
  const data = await readSecurity();
  const result = mutator(data);
  await writeSecurity(data);
  return result;
}
