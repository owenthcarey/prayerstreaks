import { Injectable, inject } from '@angular/core';
import { CheckInService } from './checkin.service';
import { MilestoneService } from './milestone.service';
import { ReviewService } from './review.service';
import { ReminderService } from './reminder.service';
import { StorageService } from './storage.service';
import { ShareService } from './share.service';
import { CheckIn } from '../models/checkin.model';
import { Milestone, MILESTONES } from '../models/milestone.model';
import { DailyQuote } from '../models/quote.model';
import { DAILY_QUOTES } from '../data/quotes';
import { WeeklyDayData, MILESTONE_QUOTES } from '../models/share-card.model';
import {
  getTodayISO,
  getTodayOverride,
  setTodayOverride,
  addDays,
  formatDateISO,
} from '../utils/date.utils';

export type SeedPreset =
  | 'new-user'
  | 'one-week'
  | 'one-month'
  | 'three-months'
  | 'power-user'
  | 'gaps-shields';

export interface SeedConfig {
  days: number;
  consecutive: boolean;
  gapFrequency: number;
  prayerTypePercent: number;
  notePercent: number;
  includeSlots: boolean;
}

const SAMPLE_NOTES = [
  'Thank you Lord for this beautiful day and all your blessings.',
  'Prayed for healing and comfort for my family.',
  'Felt a deep peace during prayer time today.',
  'Interceding for friends going through difficult times.',
  'Grateful for answered prayers this week.',
  'Seeking guidance for important decisions ahead.',
  'Meditating on Psalm 23 — the Lord is my shepherd.',
  'Praying for patience and wisdom in daily life.',
  'Thankful for community, fellowship, and love.',
  'Asking for strength during this challenging season.',
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STORAGE_KEYS = [
  'checkins',
  'prayerTypes',
  'shieldCount',
  'shieldedDates',
  'shieldsEnabled',
  'prayerSlots',
  'slotsEnabled',
  'slotStreakRequirement',
  'unlockedMilestones',
  'lastReviewPrompt',
  'reviewPromptCount',
  'sessionDates',
  'first7DayStreakPrompted',
  'reminderEnabled',
  'reminderTime',
];

@Injectable({ providedIn: 'root' })
export class DevToolsService {
  checkinService = inject(CheckInService);
  milestoneService = inject(MilestoneService);
  reviewService = inject(ReviewService);
  reminderService = inject(ReminderService);
  private storage = inject(StorageService);
  private shareService = inject(ShareService);

  // ---------------------------------------------------------------------------
  // Presets
  // ---------------------------------------------------------------------------

  applyPreset(preset: SeedPreset): void {
    this.clearCheckInData();

    switch (preset) {
      case 'new-user':
        this.seedFromConfig({
          days: 5,
          consecutive: false,
          gapFrequency: 3,
          prayerTypePercent: 50,
          notePercent: 0,
          includeSlots: false,
        });
        break;
      case 'one-week':
        this.seedFromConfig({
          days: 7,
          consecutive: true,
          gapFrequency: 0,
          prayerTypePercent: 60,
          notePercent: 20,
          includeSlots: false,
        });
        break;
      case 'one-month':
        this.seedFromConfig({
          days: 30,
          consecutive: true,
          gapFrequency: 0,
          prayerTypePercent: 60,
          notePercent: 30,
          includeSlots: false,
        });
        break;
      case 'three-months':
        this.seedFromConfig({
          days: 90,
          consecutive: true,
          gapFrequency: 0,
          prayerTypePercent: 70,
          notePercent: 35,
          includeSlots: false,
        });
        break;
      case 'power-user':
        this.seedFromConfig({
          days: 365,
          consecutive: true,
          gapFrequency: 0,
          prayerTypePercent: 80,
          notePercent: 40,
          includeSlots: false,
        });
        this.checkinService.devSetShieldCount(3);
        break;
      case 'gaps-shields':
        this.seedGapsAndShields();
        break;
    }

    this.milestoneService.devSyncMilestones();
  }

  // ---------------------------------------------------------------------------
  // Data Seeding
  // ---------------------------------------------------------------------------

  seedFromConfig(config: SeedConfig): void {
    const today = getTodayISO();
    const types = this.checkinService.prayerTypes();
    const slots = this.checkinService.prayerSlots();
    const checkIns: CheckIn[] = [];

    let seeded = 0;
    for (let i = 0; seeded < config.days; i++) {
      if (
        !config.consecutive &&
        config.gapFrequency > 0 &&
        i > 0 &&
        i % config.gapFrequency === 0
      ) {
        continue;
      }

      const date = addDays(today, -i);
      const base: CheckIn = {
        date,
        checkedInAt: new Date(date + 'T12:00:00').getTime(),
      };

      if (Math.random() * 100 < config.prayerTypePercent && types.length > 0) {
        base.prayerType = types[Math.floor(Math.random() * types.length)];
      }

      if (Math.random() * 100 < config.notePercent) {
        base.note =
          SAMPLE_NOTES[Math.floor(Math.random() * SAMPLE_NOTES.length)];
      }

      if (config.includeSlots && slots.length > 0) {
        for (const slot of slots) {
          checkIns.push({ ...base, slot: slot.id });
        }
      } else {
        checkIns.push(base);
      }

      seeded++;
    }

    this.checkinService.devSetCheckIns(checkIns);
  }

  seedCustom(days: number, notePercent: number, typePercent: number): void {
    this.clearCheckInData();
    this.seedFromConfig({
      days,
      consecutive: true,
      gapFrequency: 0,
      prayerTypePercent: typePercent,
      notePercent,
      includeSlots: false,
    });
    this.milestoneService.devSyncMilestones();
  }

  private seedGapsAndShields(): void {
    const today = getTodayISO();
    const types = this.checkinService.prayerTypes();
    const checkIns: CheckIn[] = [];
    const shieldedDates: string[] = [];
    const gapDays = new Set([10, 20, 30, 35, 40]);

    for (let i = 0; i < 45; i++) {
      const date = addDays(today, -i);
      if (gapDays.has(i)) {
        if (i === 10 || i === 20 || i === 30) {
          shieldedDates.push(date);
        }
        continue;
      }

      const checkIn: CheckIn = {
        date,
        checkedInAt: new Date(date + 'T12:00:00').getTime(),
      };

      if (types.length > 0 && Math.random() > 0.4) {
        checkIn.prayerType = types[Math.floor(Math.random() * types.length)];
      }

      if (Math.random() > 0.7) {
        checkIn.note =
          SAMPLE_NOTES[Math.floor(Math.random() * SAMPLE_NOTES.length)];
      }

      checkIns.push(checkIn);
    }

    this.checkinService.devSetCheckIns(checkIns);
    this.checkinService.devSetShieldedDates(shieldedDates);
    this.checkinService.devSetShieldCount(1);
  }

  clearCheckInData(): void {
    this.checkinService.devSetCheckIns([]);
    this.checkinService.devSetShieldCount(0);
    this.checkinService.devSetShieldedDates([]);
  }

  // ---------------------------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------------------------

  unlockMilestone(id: string): void {
    const current = new Set(this.milestoneService.unlockedIds());
    current.add(id);
    this.milestoneService.devSetUnlockedIds([...current]);
  }

  lockMilestone(id: string): void {
    const current = this.milestoneService
      .unlockedIds()
      .filter((uid) => uid !== id);
    this.milestoneService.devSetUnlockedIds(current);
  }

  unlockAllMilestones(): void {
    this.milestoneService.devSetUnlockedIds(MILESTONES.map((m) => m.id));
  }

  lockAllMilestones(): void {
    this.milestoneService.devSetUnlockedIds([]);
  }

  triggerCelebration(milestone: Milestone): void {
    this.milestoneService.pendingCelebration.set(milestone);
  }

  // ---------------------------------------------------------------------------
  // Review Prompt
  // ---------------------------------------------------------------------------

  setReviewSessionCount(count: number): void {
    const today = getTodayISO();
    const dates: string[] = [];
    for (let i = 0; i < count; i++) {
      dates.push(addDays(today, -i));
    }
    this.reviewService.devSetState({ sessionDates: dates });
  }

  setReviewLastPrompt(value: 'never' | 'today' | '90-days-ago'): void {
    switch (value) {
      case 'never':
        this.reviewService.devSetState({ lastPromptDate: '' });
        break;
      case 'today':
        this.reviewService.devSetState({ lastPromptDate: getTodayISO() });
        break;
      case '90-days-ago':
        this.reviewService.devSetState({
          lastPromptDate: addDays(getTodayISO(), -91),
        });
        break;
    }
  }

  setReviewPromptCount(count: number): void {
    this.reviewService.devSetState({ promptCount: count });
  }

  setFirst7DayPrompted(value: boolean): void {
    this.reviewService.devSetState({ first7DayPrompted: value });
  }

  forceReviewPrompt(): void {
    this.reviewService.devForcePrompt();
  }

  // ---------------------------------------------------------------------------
  // Shields
  // ---------------------------------------------------------------------------

  setShieldCount(count: number): void {
    this.checkinService.devSetShieldCount(count);
  }

  addShieldedDate(date: string): void {
    const current = [...this.checkinService.shieldedDates()];
    if (!current.includes(date)) {
      current.push(date);
      this.checkinService.devSetShieldedDates(current);
    }
  }

  addShieldedDateYesterday(): void {
    this.addShieldedDate(addDays(getTodayISO(), -1));
  }

  triggerAutoApplyShields(): void {
    this.checkinService.devAutoApplyShields();
  }

  createGap(daysAgo: number): void {
    const date = addDays(getTodayISO(), -daysAgo);
    const checkIns = this.checkinService
      .checkIns()
      .filter((c) => c.date !== date);
    this.checkinService.devSetCheckIns(checkIns);
  }

  // ---------------------------------------------------------------------------
  // Date Override
  // ---------------------------------------------------------------------------

  get currentDateOverride(): string | null {
    return getTodayOverride();
  }

  setDateOverride(date: string | null): void {
    setTodayOverride(date);
    const current = this.checkinService.checkIns();
    this.checkinService.checkIns.set([...current]);
  }

  setDateOffsetDays(days: number): void {
    const real = formatDateISO(new Date());
    this.setDateOverride(addDays(real, days));
  }

  setDateToDecember31(): void {
    const year = new Date().getFullYear();
    this.setDateOverride(`${year}-12-31`);
  }

  setDateToJanuary1(): void {
    const year = new Date().getFullYear() + 1;
    this.setDateOverride(`${year}-01-01`);
  }

  setDateToLeapDay(): void {
    let year = new Date().getFullYear();
    while (year % 4 !== 0 || (year % 100 === 0 && year % 400 !== 0)) {
      year++;
    }
    this.setDateOverride(`${year}-02-29`);
  }

  clearDateOverride(): void {
    this.setDateOverride(null);
  }

  // ---------------------------------------------------------------------------
  // Prayer Slot Scenarios
  // ---------------------------------------------------------------------------

  seedAllSlotsComplete(): void {
    const today = getTodayISO();
    const slots = this.checkinService.prayerSlots();
    const existing = this.checkinService
      .checkIns()
      .filter((c) => c.date !== today);

    const todayCheckIns: CheckIn[] = slots.map((s) => ({
      date: today,
      checkedInAt: Date.now(),
      slot: s.id,
    }));

    this.checkinService.devSetCheckIns([...todayCheckIns, ...existing]);
  }

  seedPartialSlots(): void {
    const today = getTodayISO();
    const slots = this.checkinService.prayerSlots();
    if (slots.length === 0) return;

    const existing = this.checkinService
      .checkIns()
      .filter((c) => c.date !== today);
    const todayCheckIns: CheckIn[] = [
      { date: today, checkedInAt: Date.now(), slot: slots[0].id },
    ];

    this.checkinService.devSetCheckIns([...todayCheckIns, ...existing]);
  }

  seedSlotHistory(days: number): void {
    this.clearCheckInData();
    const today = getTodayISO();
    const slots = this.checkinService.prayerSlots();
    const types = this.checkinService.prayerTypes();
    const checkIns: CheckIn[] = [];

    for (let i = 0; i < days; i++) {
      const date = addDays(today, -i);
      const completeAll = Math.random() > 0.3;

      for (const slot of slots) {
        if (!completeAll && Math.random() > 0.5) continue;

        const ci: CheckIn = {
          date,
          checkedInAt: new Date(date + 'T12:00:00').getTime(),
          slot: slot.id,
        };

        if (types.length > 0 && Math.random() > 0.5) {
          ci.prayerType = types[Math.floor(Math.random() * types.length)];
        }

        checkIns.push(ci);
      }
    }

    this.checkinService.devSetCheckIns(checkIns);
    this.milestoneService.devSyncMilestones();
  }

  // ---------------------------------------------------------------------------
  // Quote Preview
  // ---------------------------------------------------------------------------

  getQuoteForDay(dayOfYear: number): DailyQuote {
    const index =
      ((dayOfYear - 1) % DAILY_QUOTES.length + DAILY_QUOTES.length) %
      DAILY_QUOTES.length;
    return DAILY_QUOTES[index];
  }

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  async fireTestNotification(): Promise<void> {
    await this.reminderService.devFireTestNotification();
  }

  // ---------------------------------------------------------------------------
  // Share Card Preview
  // ---------------------------------------------------------------------------

  previewDailyCard(streak: number): void {
    this.shareService.shareCard(
      { type: 'daily', currentStreak: streak },
      'ocean',
      'feed'
    );
  }

  previewMilestoneCard(milestone: Milestone): void {
    this.shareService.shareCard(
      {
        type: 'milestone',
        title: milestone.title,
        days: milestone.days,
        quote: MILESTONE_QUOTES[milestone.id] ?? '',
      },
      'ocean',
      'feed'
    );
  }

  previewWeeklyCard(): void {
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days: WeeklyDayData[] = dayLabels.map((dayLabel) => ({
      dayLabel,
      checked: Math.random() > 0.3,
      shielded: false,
    }));
    this.shareService.shareCard(
      {
        type: 'weekly',
        days,
        totalPrayers: days.filter((d) => d.checked).length,
      },
      'ocean',
      'feed'
    );
  }

  previewMonthlyCard(): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const checkedDays = Array.from(
      { length: daysInMonth },
      (_, i) => i + 1
    ).filter(() => Math.random() > 0.3);

    this.shareService.shareCard(
      {
        type: 'monthly',
        monthLabel: MONTH_NAMES[month],
        year,
        daysInMonth,
        firstDayOfWeek,
        checkedDays,
        shieldedDays: [],
        totalPrayed: checkedDays.length,
        currentStreak: this.checkinService.currentStreak(),
      },
      'ocean',
      'feed'
    );
  }

  // ---------------------------------------------------------------------------
  // Storage Viewer
  // ---------------------------------------------------------------------------

  getAllStorageState(): { key: string; value: string }[] {
    return STORAGE_KEYS.map((key) => {
      const raw = this.storage.getString(key);
      if (!raw) return { key, value: '(empty)' };

      if (key === 'checkins') {
        try {
          const arr = JSON.parse(raw);
          return { key, value: `[${arr.length} check-ins]` };
        } catch {
          return { key, value: raw };
        }
      }

      if (key === 'sessionDates') {
        try {
          const arr = JSON.parse(raw);
          return { key, value: `[${arr.length} dates]` };
        } catch {
          return { key, value: raw };
        }
      }

      if (raw.length > 80) {
        return { key, value: raw.slice(0, 77) + '...' };
      }

      return { key, value: raw };
    });
  }
}
