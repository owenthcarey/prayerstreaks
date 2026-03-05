import {
  ChangeDetectionStrategy,
  Component,
  NO_ERRORS_SCHEMA,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { isIOS } from '@nativescript/core';
import { CheckInService } from '../../core/services/checkin.service';
import { MilestoneService } from '../../core/services/milestone.service';
import { ReminderService } from '../../core/services/reminder.service';
import { ShareService } from '../../core/services/share.service';
import { PrayerType, prayerTypeLabel } from '../../core/models/checkin.model';
import { MILESTONES } from '../../core/models/milestone.model';
import { formatDateISO, getTodayISO } from '../../core/utils/date.utils';
import {
  ShareCardType,
  ShareCardFormat,
  ShareCardTheme,
  ShareCardData,
  WeeklyDayData,
  WeeklyCardData,
  MonthlyCardData,
  SHARE_CARD_GRADIENTS,
  SHARE_CARD_TYPE_LABELS,
  MILESTONE_QUOTES,
} from '../../core/models/share-card.model';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

@Component({
  selector: 'ns-today',
  templateUrl: './today.component.html',
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayComponent {
  checkinService = inject(CheckInService);
  milestoneService = inject(MilestoneService);
  private reminderService = inject(ReminderService);
  private shareService = inject(ShareService);
  selectedType = signal<PrayerType | undefined>(undefined);

  isIOS = isIOS;
  flameIcon = String.fromCharCode(0xef55);
  checkIcon = String.fromCharCode(0xe86c);
  shareIcon = String.fromCharCode(0xe80d);
  shieldIcon = String.fromCharCode(0xe8e8);
  starIcon = String.fromCharCode(0xe838);

  prayerTypeLabel = prayerTypeLabel;

  // --- Share panel state ---

  showSharePanel = signal(false);
  selectedCardType = signal<ShareCardType>('daily');
  selectedTheme = signal<ShareCardTheme>('ocean');
  selectedFormat = signal<ShareCardFormat>('story');

  gradients = SHARE_CARD_GRADIENTS;
  cardTypeLabels = SHARE_CARD_TYPE_LABELS;

  availableCardTypes = computed(() => {
    const types: ShareCardType[] = ['daily'];
    if (this.milestoneService.unlockedIds().length > 0) {
      types.push('milestone');
    }
    types.push('weekly', 'monthly');
    return types;
  });

  milestoneForShare = computed(() => {
    const pending = this.milestoneService.pendingCelebration();
    if (pending) return pending;
    const unlocked = new Set(this.milestoneService.unlockedIds());
    return [...MILESTONES].reverse().find((m) => unlocked.has(m.id)) ?? null;
  });

  todaysPrayerType = computed(() => {
    const today = getTodayISO();
    return this.checkinService.checkIns().find((c) => c.date === today)
      ?.prayerType;
  });

  weeklyRecapData = computed((): WeeklyCardData => {
    const today = new Date();
    const checkins = this.checkinService.checkIns();
    const shielded = new Set(this.checkinService.shieldedDates());
    const checkinDates = new Set(checkins.map((c) => c.date));
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days: WeeklyDayData[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = formatDateISO(d);
      days.push({
        dayLabel: dayLabels[d.getDay()],
        checked: checkinDates.has(iso),
        shielded: shielded.has(iso) && !checkinDates.has(iso),
      });
    }

    return {
      type: 'weekly',
      days,
      totalPrayers: days.filter((d) => d.checked).length,
    };
  });

  monthlyRecapData = computed((): MonthlyCardData => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const checkins = this.checkinService.checkIns();
    const shielded = this.checkinService.shieldedDates();

    const checkedDays: number[] = [];
    const shieldedDays: number[] = [];

    for (const c of checkins) {
      const d = new Date(c.date + 'T12:00:00');
      if (d.getFullYear() === year && d.getMonth() === month) {
        checkedDays.push(d.getDate());
      }
    }

    for (const s of shielded) {
      const d = new Date(s + 'T12:00:00');
      if (d.getFullYear() === year && d.getMonth() === month) {
        shieldedDays.push(d.getDate());
      }
    }

    return {
      type: 'monthly',
      monthLabel: MONTH_NAMES[month],
      year,
      daysInMonth,
      firstDayOfWeek,
      checkedDays,
      shieldedDays,
      totalPrayed: checkedDays.length,
      currentStreak: this.checkinService.currentStreak(),
    };
  });

  // --- Existing computed ---

  streakText = computed(() => {
    const streak = this.checkinService.currentStreak();
    if (streak === 0) return 'Start your streak!';
    if (streak === 1) return '1-day streak!';
    return `${streak}-day streak!`;
  });

  shieldCountText = computed(() => {
    const count = this.checkinService.shieldCount();
    return count === 1 ? '1 shield' : `${count} shields`;
  });

  nextMilestoneText = computed(() => {
    const next = this.milestoneService.nextMilestone();
    if (!next) return null;
    const remaining = next.days - this.checkinService.currentStreak();
    if (remaining <= 0) return `${next.title} \u2014 check in to unlock!`;
    return `${next.title} in ${remaining} ${remaining === 1 ? 'day' : 'days'}`;
  });

  celebrationDaysText = computed(() => {
    const m = this.milestoneService.pendingCelebration();
    return m ? `${m.days}-day streak achieved!` : '';
  });

  // --- Actions ---

  selectType(type: PrayerType): void {
    this.selectedType.set(
      this.selectedType() === type ? undefined : type
    );
  }

  onCheckIn(): void {
    this.checkinService.checkIn(this.selectedType());
    this.milestoneService.checkForNewMilestones();
    this.reminderService.rescheduleIfEnabled();
  }

  dismissCelebration(): void {
    this.milestoneService.dismissCelebration();
  }

  onShare(preselectedType: ShareCardType = 'daily'): void {
    this.selectedCardType.set(preselectedType);
    this.showSharePanel.set(true);
  }

  closeSharePanel(): void {
    this.showSharePanel.set(false);
  }

  selectCardType(type: ShareCardType): void {
    this.selectedCardType.set(type);
  }

  selectTheme(theme: ShareCardTheme): void {
    this.selectedTheme.set(theme);
  }

  selectFormat(format: ShareCardFormat): void {
    this.selectedFormat.set(format);
  }

  onShareNow(): void {
    this.shareService.shareCard(
      this.assembleShareData(),
      this.selectedTheme(),
      this.selectedFormat()
    );
    this.showSharePanel.set(false);
  }

  onShareInstagram(): void {
    this.shareService.shareToInstagramStories(
      this.assembleShareData(),
      this.selectedTheme()
    );
    this.showSharePanel.set(false);
  }

  private assembleShareData(): ShareCardData {
    switch (this.selectedCardType()) {
      case 'daily':
        return {
          type: 'daily',
          currentStreak: this.checkinService.currentStreak(),
          prayerType: this.todaysPrayerType() ?? this.selectedType(),
        };
      case 'milestone': {
        const m = this.milestoneForShare()!;
        return {
          type: 'milestone',
          title: m.title,
          days: m.days,
          quote: MILESTONE_QUOTES[m.id] ?? '',
        };
      }
      case 'weekly':
        return this.weeklyRecapData();
      case 'monthly':
        return this.monthlyRecapData();
    }
  }
}
