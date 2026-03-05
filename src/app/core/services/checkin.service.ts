import { Injectable, computed, inject, signal } from '@angular/core';
import {
  CheckIn,
  PrayerType,
  DEFAULT_PRAYER_TYPES,
} from '../models/checkin.model';
import { StorageService } from './storage.service';
import {
  getTodayISO,
  addDays,
  calculateCurrentStreak,
  calculateLongestStreak,
} from '../utils/date.utils';

const CHECKINS_KEY = 'checkins';
const PRAYER_TYPES_KEY = 'prayerTypes';
const SHIELD_COUNT_KEY = 'shieldCount';
const SHIELDED_DATES_KEY = 'shieldedDates';
const SHIELDS_ENABLED_KEY = 'shieldsEnabled';
const MAX_SHIELDS = 3;
const SHIELD_EARN_INTERVAL = 7;

@Injectable({ providedIn: 'root' })
export class CheckInService {
  private storage = inject(StorageService);

  checkIns = signal<CheckIn[]>(this.loadCheckIns());
  prayerTypes = signal<PrayerType[]>(this.loadPrayerTypes());
  shieldCount = signal<number>(
    this.storage.getJSON<number>(SHIELD_COUNT_KEY, 0)
  );
  shieldedDates = signal<string[]>(
    this.storage.getJSON<string[]>(SHIELDED_DATES_KEY, [])
  );
  shieldsEnabled = signal<boolean>(
    this.storage.getBoolean(SHIELDS_ENABLED_KEY, true)
  );

  /**
   * Merged set of check-in dates + shielded dates for streak calculation.
   * When shields are disabled, shielded dates are excluded.
   */
  private allStreakDates = computed(() => {
    const checkInDates = this.checkIns().map((c) => c.date);
    const shielded = this.shieldsEnabled() ? this.shieldedDates() : [];
    return [...new Set([...checkInDates, ...shielded])];
  });

  checkedInToday = computed(() => {
    const today = getTodayISO();
    return this.checkIns().some((c) => c.date === today);
  });

  currentStreak = computed(() => {
    const dates = [...this.allStreakDates()].sort((a, b) =>
      a > b ? -1 : 1
    );
    return calculateCurrentStreak(dates);
  });

  longestStreak = computed(() => {
    const dates = [...this.allStreakDates()].sort();
    return calculateLongestStreak(dates);
  });

  constructor() {
    this.autoApplyShields();
  }

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
    this.earnShieldIfEligible();
  }

  getHistory(limit?: number): CheckIn[] {
    const sorted = [...this.checkIns()].sort((a, b) =>
      a.date > b.date ? -1 : 1
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  addPrayerType(type: PrayerType): void {
    const current = this.prayerTypes();
    if (!current.includes(type)) {
      const updated = [...current, type];
      this.prayerTypes.set(updated);
      this.savePrayerTypes(updated);
    }
  }

  removePrayerType(type: PrayerType): void {
    const updated = this.prayerTypes().filter((t) => t !== type);
    this.prayerTypes.set(updated);
    this.savePrayerTypes(updated);
  }

  setShieldsEnabled(enabled: boolean): void {
    this.shieldsEnabled.set(enabled);
    this.storage.setBoolean(SHIELDS_ENABLED_KEY, enabled);
    if (enabled) {
      this.autoApplyShields();
    }
  }

  resetAll(): void {
    this.storage.clear();
    this.checkIns.set([]);
    this.prayerTypes.set([...DEFAULT_PRAYER_TYPES]);
    this.shieldCount.set(0);
    this.shieldedDates.set([]);
    this.shieldsEnabled.set(true);
  }

  /**
   * On app open, check for gaps between the most recent covered date and
   * yesterday. If the gap can be fully bridged by available shields,
   * auto-apply them to preserve the streak.
   */
  private autoApplyShields(): void {
    if (!this.shieldsEnabled() || this.shieldCount() === 0) return;

    const allDates = [...this.allStreakDates()];
    if (allDates.length === 0) return;

    allDates.sort((a, b) => (a > b ? -1 : 1));

    const today = getTodayISO();
    const yesterday = addDays(today, -1);
    const mostRecent = allDates[0];

    if (mostRecent === today || mostRecent === yesterday) return;

    const gapDates: string[] = [];
    let d = addDays(mostRecent, 1);
    while (d <= yesterday) {
      gapDates.push(d);
      d = addDays(d, 1);
    }

    if (gapDates.length === 0 || gapDates.length > this.shieldCount()) return;

    const newShielded = [...this.shieldedDates(), ...gapDates];
    const newCount = this.shieldCount() - gapDates.length;

    this.shieldedDates.set(newShielded);
    this.shieldCount.set(newCount);
    this.storage.setJSON(SHIELDED_DATES_KEY, newShielded);
    this.storage.setJSON(SHIELD_COUNT_KEY, newCount);
  }

  /** Award a shield when the streak hits a 7-day milestone. */
  private earnShieldIfEligible(): void {
    if (!this.shieldsEnabled()) return;

    const streak = this.currentStreak();
    if (
      streak > 0 &&
      streak % SHIELD_EARN_INTERVAL === 0 &&
      this.shieldCount() < MAX_SHIELDS
    ) {
      const newCount = this.shieldCount() + 1;
      this.shieldCount.set(newCount);
      this.storage.setJSON(SHIELD_COUNT_KEY, newCount);
    }
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

