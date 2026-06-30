import { readJsonBlob, writeJsonBlob } from "./blob";
import { GateStats, defaultStats } from "./types";

function statsPath(gateId: string): string {
  return `linkgate-stats-${gateId}.json`;
}

export async function readGateStats(gateId: string): Promise<GateStats> {
  try {
    const parsed = await readJsonBlob<Partial<GateStats>>(statsPath(gateId));
    if (!parsed) return defaultStats();
    return { views: parsed.views ?? 0, completions: parsed.completions ?? 0 };
  } catch {
    return defaultStats();
  }
}

async function writeGateStats(gateId: string, stats: GateStats): Promise<void> {
  await writeJsonBlob(statsPath(gateId), stats);
}

/**
 * Bumps one counter for one gate. `legacySeed` is the stats value still
 * embedded on the Gate object from before this file-per-gate split existed -
 * if this gate's dedicated file has never been written, we seed it from that
 * value first so historical counts aren't lost, then increment on top of it.
 */
export async function incrementGateStat(
  gateId: string,
  field: keyof GateStats,
  legacySeed?: GateStats
): Promise<GateStats> {
  let stats = await readGateStats(gateId);
  const neverWritten = stats.views === 0 && stats.completions === 0;
  if (neverWritten && legacySeed && (legacySeed.views > 0 || legacySeed.completions > 0)) {
    stats = { ...legacySeed };
  }
  stats[field] += 1;
  await writeGateStats(gateId, stats);
  return stats;
}

/** Read-only version of the same migration logic, used when just displaying
 * stats in the admin panel (so the UI shows the right number even before the
 * dedicated file has been written to for the first time). */
export async function readEffectiveStats(gateId: string, legacySeed: GateStats): Promise<GateStats> {
  const live = await readGateStats(gateId);
  const neverWritten = live.views === 0 && live.completions === 0;
  if (neverWritten && (legacySeed.views > 0 || legacySeed.completions > 0)) {
    return legacySeed;
  }
  return live;
}
