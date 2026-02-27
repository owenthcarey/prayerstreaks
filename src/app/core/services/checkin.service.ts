import { Injectable, computed, inject, signal } from '@angular/core';
import {
  CheckIn,
  PrayerType,
  DEFAULT_PRAYER_TYPES,
} from '../models/checkin.model';
import { StorageService } from './storage.service';
import {
  getTodayISO,
  calculateCurrentStreak,
  calculateLongestStreak,
} from '../utils/date.utils';

const CHECKINS_KEY = 'checkins';
const PRAYER_TYPES_KEY = 'prayerTypes';

@Injectable({ providedIn: 'root' })
export class CheckInService {
  private storage = inject(StorageService);

  /** All check-ins, reactive signal */
  checkIns = signal<CheckIn[]>(this.loadCheckIns());

  /** Available prayer types */
  prayerTypes = signal<PrayerType[]>(this.loadPrayerTypes());

  /** Whether the user has checked in today */
  checkedInToday = computed(() => {
    const today = getTodayISO();
    return this.checkIns().some((c) => c.date === today);
  });

  /** Current consecutive streak */
  currentStreak = computed(() => {
    const dates = this.checkIns()
      .map((c) => c.date)
      .sort((a, b) => (a > b ? -1 : 1));
    return calculateCurrentStreak(dates);
  });

  /** All-time longest streak */
  longestStreak = computed(() => {
    const dates = this.checkIns()
      .map((c) => c.date)
      .sort();
    return calculateLongestStreak(dates);
  });

  /** Record today's check-in (idempotent — only one per day) */
  checkIn(prayerType?: PrayerType): void {
    const today = getTodayISO();
    const existing = this.checkIns();
    if (existing.some((c) => c.date === today)) return;

    const newCheckIn: CheckIn = {
      date: today,
      checkedInAt: Date.now(),
      ...(prayerType ? { prayerType } : {}),
    };

    const updated = [newCheckIn, ...existing];
    this.checkIns.set(updated);
    this.saveCheckIns(updated);
  }

  /** Get history, newest first */
  getHistory(limit?: number): CheckIn[] {
    const sorted = [...this.checkIns()].sort((a, b) =>
      a.date > b.date ? -1 : 1
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /** Add a custom prayer type */
  addPrayerType(type: PrayerType): void {
    const current = this.prayerTypes();
    if (!current.includes(type)) {
      const updated = [...current, type];
      this.prayerTypes.set(updated);
      this.savePrayerTypes(updated);
    }
  }

  /** Remove a prayer type */
  removePrayerType(type: PrayerType): void {
    const updated = this.prayerTypes().filter((t) => t !== type);
    this.prayerTypes.set(updated);
    this.savePrayerTypes(updated);
  }

  /** Reset all data */
  resetAll(): void {
    this.storage.clear();
    this.checkIns.set([]);
    this.prayerTypes.set([...DEFAULT_PRAYER_TYPES]);
  }

  // TEMPORARY — seed demo data for App Store screenshots. Remove after.
  seedDemoData(): void {
    const days: { date: string; prayerType?: PrayerType }[] = [
      // Jan 29 – Feb 1  (4-day streak)
      { date: '2026-01-29', prayerType: 'rosary' },
      { date: '2026-01-30', prayerType: 'scripture' },
      { date: '2026-01-31', prayerType: 'mass' },
      { date: '2026-02-01', prayerType: 'rosary' },
      // Feb 2: missed
      // Feb 3 – Feb 13  (11-day streak — longest)
      { date: '2026-02-03', prayerType: 'adoration' },
      { date: '2026-02-04', prayerType: 'rosary' },
      { date: '2026-02-05', prayerType: 'scripture' },
      { date: '2026-02-06', prayerType: 'mass' },
      { date: '2026-02-07', prayerType: 'rosary' },
      { date: '2026-02-08', prayerType: 'scripture' },
      { date: '2026-02-09', prayerType: 'rosary' },
      { date: '2026-02-10', prayerType: 'adoration' },
      { date: '2026-02-11', prayerType: 'mass' },
      { date: '2026-02-12', prayerType: 'rosary' },
      { date: '2026-02-13', prayerType: 'scripture' },
      // Feb 14–15: missed
      // Feb 16–18  (3-day streak)
      { date: '2026-02-16', prayerType: 'rosary' },
      { date: '2026-02-17', prayerType: 'mass' },
      { date: '2026-02-18', prayerType: 'scripture' },
      // Feb 19: missed
      // Feb 20–26  (7-day current streak)
      { date: '2026-02-20', prayerType: 'rosary' },
      { date: '2026-02-21', prayerType: 'adoration' },
      { date: '2026-02-22', prayerType: 'scripture' },
      { date: '2026-02-23', prayerType: 'mass' },
      { date: '2026-02-24', prayerType: 'rosary' },
      { date: '2026-02-25', prayerType: 'scripture' },
      { date: '2026-02-26', prayerType: 'rosary' },
      // Feb 27 (today): NOT checked in — keeps the button active for screenshot
    ];

    const checkins: CheckIn[] = days.map((d) => ({
      date: d.date,
      checkedInAt: new Date(d.date + 'T08:00:00').getTime(),
      ...(d.prayerType ? { prayerType: d.prayerType } : {}),
    }));

    this.checkIns.set(checkins);
    this.saveCheckIns(checkins);
  }

  private loadCheckIns(): CheckIn[] {
    return this.storage.getJSON<CheckIn[]>(CHECKINS_KEY, []);
  }

  private saveCheckIns(checkins: CheckIn[]): void {
    this.storage.setJSON(CHECKINS_KEY, checkins);
  }

  private loadPrayerTypes(): PrayerType[] {
    return this.storage.getJSON<PrayerType[]>(PRAYER_TYPES_KEY, [
      ...DEFAULT_PRAYER_TYPES,
    ]);
  }

  private savePrayerTypes(types: PrayerType[]): void {
    this.storage.setJSON(PRAYER_TYPES_KEY, types);
  }
}

