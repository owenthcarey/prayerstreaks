import { Injectable, computed, inject, signal } from '@angular/core';
import {
  CheckIn,
  PrayerType,
  PrayerSlot,
  SlotStreakRequirement,
  DEFAULT_PRAYER_TYPES,
  DEFAULT_PRAYER_SLOTS,
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
const SLOTS_KEY = 'prayerSlots';
const SLOTS_ENABLED_KEY = 'slotsEnabled';
const SLOT_STREAK_REQ_KEY = 'slotStreakRequirement';
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

  prayerSlots = signal<PrayerSlot[]>(this.loadSlots());
  slotsEnabled = signal<boolean>(
    this.storage.getBoolean(SLOTS_ENABLED_KEY, false)
  );
  slotStreakRequirement = signal<SlotStreakRequirement>(
    this.storage.getJSON<SlotStreakRequirement>(SLOT_STREAK_REQ_KEY, 'any')
  );

  /**
   * Merged set of check-in dates + shielded dates for streak calculation.
   * When "require all" slot mode is active, only dates with every
   * configured slot checked are counted.
   */
  private allStreakDates = computed(() => {
    const checkIns = this.checkIns();
    const shielded = this.shieldsEnabled() ? this.shieldedDates() : [];

    let qualifiedDates: string[];

    if (
      this.slotsEnabled() &&
      this.slotStreakRequirement() === 'all' &&
      this.prayerSlots().length > 0
    ) {
      const slotIds = new Set(this.prayerSlots().map((s) => s.id));
      const dateSlots = new Map<string, Set<string>>();
      for (const c of checkIns) {
        if (!dateSlots.has(c.date)) dateSlots.set(c.date, new Set());
        if (c.slot) dateSlots.get(c.date)!.add(c.slot);
      }

      const uniqueDates = [...new Set(checkIns.map((c) => c.date))];
      qualifiedDates = uniqueDates.filter((date) => {
        if (checkIns.some((c) => c.date === date && !c.slot)) return true;
        const completed = dateSlots.get(date);
        return !!completed && [...slotIds].every((id) => completed.has(id));
      });
    } else {
      qualifiedDates = [...new Set(checkIns.map((c) => c.date))];
    }

    return [...new Set([...qualifiedDates, ...shielded])];
  });

  checkedInToday = computed(() => {
    const today = getTodayISO();
    return this.checkIns().some((c) => c.date === today);
  });

  /** Which slot ids have been checked in today. */
  todayCompletedSlots = computed(() => {
    const today = getTodayISO();
    return this.checkIns()
      .filter((c) => c.date === today && c.slot)
      .map((c) => c.slot!);
  });

  todaySlotsComplete = computed(() => {
    if (!this.slotsEnabled()) return this.checkedInToday();
    const slots = this.prayerSlots();
    if (slots.length === 0) return this.checkedInToday();
    const completed = new Set(this.todayCompletedSlots());
    return slots.every((s) => completed.has(s.id));
  });

  todayProgress = computed(() => {
    if (!this.slotsEnabled()) return null;
    const slots = this.prayerSlots();
    if (slots.length === 0) return null;
    const done = this.todayCompletedSlots().length;
    return { done, total: slots.length };
  });

  todayNote = computed(() => {
    const today = getTodayISO();
    return this.checkIns().find((c) => c.date === today && c.note)?.note ?? '';
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

  checkIn(prayerType?: PrayerType, slot?: string): void {
    const today = getTodayISO();
    const existing = this.checkIns();

    if (slot) {
      if (existing.some((c) => c.date === today && c.slot === slot)) return;
    } else {
      if (existing.some((c) => c.date === today && !c.slot)) return;
    }

    const newCheckIn: CheckIn = {
      date: today,
      checkedInAt: Date.now(),
      ...(prayerType ? { prayerType } : {}),
      ...(slot ? { slot } : {}),
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

  updateNote(date: string, note: string): void {
    const trimmed = note.slice(0, 500);
    const all = this.checkIns();
    const first = all.find((c) => c.date === date);
    if (!first) return;

    const updated = all.map((c) => {
      if (c.date !== date) return c;
      if (c === first) return { ...c, note: trimmed || undefined };
      const { note: _n, ...rest } = c;
      return rest;
    });
    this.checkIns.set(updated);
    this.saveCheckIns(updated);
  }

  searchCheckIns(keyword: string): CheckIn[] {
    if (!keyword.trim()) return [];
    const lower = keyword.toLowerCase();
    return this.checkIns().filter(
      (c) => c.note && c.note.toLowerCase().includes(lower)
    );
  }

  exportJournalText(): string {
    const all = [...this.checkIns()].sort((a, b) =>
      a.date > b.date ? -1 : 1
    );

    const seen = new Set<string>();
    const entries: { date: string; types: string[]; note: string }[] = [];

    for (const c of all) {
      if (!seen.has(c.date)) {
        seen.add(c.date);
        const dayCheckIns = all.filter((ci) => ci.date === c.date);
        const note = dayCheckIns.find((ci) => ci.note)?.note;
        if (note) {
          const types = dayCheckIns
            .filter((ci) => ci.prayerType)
            .map(
              (ci) =>
                ci.prayerType!.charAt(0).toUpperCase() +
                ci.prayerType!.slice(1)
            );
          entries.push({ date: c.date, types, note });
        }
      }
    }

    if (entries.length === 0) return '';

    const lines = entries.map((e) => {
      const typeLabel = e.types.length ? ` (${e.types.join(', ')})` : '';
      return `${e.date}${typeLabel}\n${e.note}\n`;
    });

    return `Prayer Journal\n${'='.repeat(40)}\n\n${lines.join('\n')}`;
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

  setSlotsEnabled(enabled: boolean): void {
    this.slotsEnabled.set(enabled);
    this.storage.setBoolean(SLOTS_ENABLED_KEY, enabled);
  }

  setSlotStreakRequirement(req: SlotStreakRequirement): void {
    this.slotStreakRequirement.set(req);
    this.storage.setJSON(SLOT_STREAK_REQ_KEY, req);
  }

  addSlot(name: string): void {
    const id = name.trim().toLowerCase().replace(/\s+/g, '-');
    const current = this.prayerSlots();
    if (current.some((s) => s.id === id)) return;
    const updated = [...current, { id, name: name.trim() }];
    this.prayerSlots.set(updated);
    this.saveSlots(updated);
  }

  removeSlot(id: string): void {
    const updated = this.prayerSlots().filter((s) => s.id !== id);
    this.prayerSlots.set(updated);
    this.saveSlots(updated);
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
    this.prayerSlots.set([...DEFAULT_PRAYER_SLOTS]);
    this.slotsEnabled.set(false);
    this.slotStreakRequirement.set('any');
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

  private loadSlots(): PrayerSlot[] {
    return this.storage.getJSON<PrayerSlot[]>(SLOTS_KEY, [
      ...DEFAULT_PRAYER_SLOTS,
    ]);
  }

  private saveSlots(slots: PrayerSlot[]): void {
    this.storage.setJSON(SLOTS_KEY, slots);
  }
}

