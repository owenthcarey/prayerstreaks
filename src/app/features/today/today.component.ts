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
  flameIcon = String.fromCharCode(0xef55);  // local_fire_department
  checkIcon = String.fromCharCode(0xe86c);  // check_circle
  shareIcon = String.fromCharCode(0xe80d);  // share
  shieldIcon = String.fromCharCode(0xe8e8); // verified_user
  starIcon = String.fromCharCode(0xe838);   // star

  prayerTypeLabel = prayerTypeLabel;

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

  onShare(): void {
    this.shareService.shareStreak(
      this.checkinService.currentStreak(),
      this.checkinService.longestStreak()
    );
  }
}

