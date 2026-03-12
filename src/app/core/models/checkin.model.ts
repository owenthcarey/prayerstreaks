export type PrayerType = 'rosary' | 'scripture' | 'mass' | 'adoration' | 'other';

export type SlotStreakRequirement = 'any' | 'all';

export interface PrayerSlot {
  id: string;
  name: string;
}

export interface CheckIn {
  /** ISO 8601 date string (YYYY-MM-DD) */
  date: string;
  /** Optional prayer type tag */
  prayerType?: PrayerType;
  /** Timestamp of the actual check-in */
  checkedInAt: number;
  /** Optional journal note (max 500 chars) */
  note?: string;
  /** Prayer slot id when slots are enabled */
  slot?: string;
}

export const DEFAULT_PRAYER_TYPES: PrayerType[] = [
  'rosary',
  'scripture',
  'mass',
  'adoration',
];

export const DEFAULT_PRAYER_SLOTS: PrayerSlot[] = [
  { id: 'morning', name: 'Morning' },
  { id: 'midday', name: 'Midday' },
  { id: 'evening', name: 'Evening' },
];

export function prayerTypeLabel(type: PrayerType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

