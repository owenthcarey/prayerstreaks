export type PrayerType = 'rosary' | 'scripture' | 'mass' | 'adoration' | 'other';

export interface CheckIn {
  /** ISO 8601 date string (YYYY-MM-DD) — one per day max */
  date: string;
  /** Optional prayer type tag */
  prayerType?: PrayerType;
  /** Timestamp of the actual check-in */
  checkedInAt: number;
}

export const DEFAULT_PRAYER_TYPES: PrayerType[] = [
  'rosary',
  'scripture',
  'mass',
  'adoration',
];

export function prayerTypeLabel(type: PrayerType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

