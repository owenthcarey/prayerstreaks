import {
  ChangeDetectionStrategy,
  Component,
  NO_ERRORS_SCHEMA,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { CheckInService } from '../../core/services/checkin.service';
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
  selectedType = signal<PrayerType | undefined>(undefined);

  prayerTypeLabel = prayerTypeLabel;

  streakText = computed(() => {
    const streak = this.checkinService.currentStreak();
    if (streak === 0) return 'Start your streak!';
    if (streak === 1) return '1-day streak!';
    return `${streak}-day streak!`;
  });

  selectType(type: PrayerType): void {
    this.selectedType.set(
      this.selectedType() === type ? undefined : type
    );
  }

  onCheckIn(): void {
    this.checkinService.checkIn(this.selectedType());
  }
}

