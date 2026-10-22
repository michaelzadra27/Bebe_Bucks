// Real 12-month utility history (by calendar month, 1 = Jan … 12 = Dec),
// extracted from the household's own statements. Used both to seed the demo
// bills and as one-tap "load history" presets in the bill editor.

export const WATER_MONTHLY: Record<string, number> = {
  "1": 79.25,
  "2": 76.43,
  "3": 79.25,
  "4": 82, // April estimated (interpolated between Mar and May)
  "5": 84.89,
  "6": 152.57,
  "7": 163.85,
  "8": 155.39,
  "9": 130.05,
  "10": 90.53,
  "11": 73.24,
  "12": 78.18,
};

// PG&E gas (SMUD is electric). October is the average of the two Oct readings.
export const PGE_MONTHLY: Record<string, number> = {
  "1": 199.3,
  "2": 209.19,
  "3": 138.19,
  "4": 41.96,
  "5": 63.87,
  "6": 41.26,
  "7": 39.6,
  "8": 34.69,
  "9": 39.8,
  "10": 43.45,
  "11": 60.7,
  "12": 127.68,
};

export interface UtilityPreset {
  id: string;
  label: string;
  monthly: Record<string, number>;
}

/** Presets offered in the seasonal bill editor. */
export const UTILITY_PRESETS: UtilityPreset[] = [
  { id: "water", label: "Water history", monthly: WATER_MONTHLY },
  { id: "pge", label: "PG&E history", monthly: PGE_MONTHLY },
];

export function profileAverage(monthly: Record<string, number>): number {
  const vals = Object.values(monthly);
  if (!vals.length) return 0;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100;
}
