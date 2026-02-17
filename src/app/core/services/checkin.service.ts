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

