import {
  ChangeDetectionStrategy,
  Component,
  NO_ERRORS_SCHEMA,
  inject,
} from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { Dialogs, isIOS } from '@nativescript/core';
import { CheckInService } from '../../core/services/checkin.service';
import { MilestoneService } from '../../core/services/milestone.service';
import { ReminderService } from '../../core/services/reminder.service';
import { ReviewService } from '../../core/services/review.service';
import {
  PrayerType,
  SlotStreakRequirement,
  prayerTypeLabel,
} from '../../core/models/checkin.model';
import { DevPanelComponent } from './dev-panel.component';

@Component({
  selector: 'ns-settings',
  templateUrl: './settings.component.html',
  imports: [NativeScriptCommonModule, DevPanelComponent],
  schemas: [NO_ERRORS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  checkinService = inject(CheckInService);
  milestoneService = inject(MilestoneService);
  reminderService = inject(ReminderService);
  private reviewService = inject(ReviewService);
  prayerTypeLabel = prayerTypeLabel;

  isIOS = isIOS;
  showDevPanel = typeof __DEV__ !== 'undefined' && __DEV__;

  cancelIcon = String.fromCharCode(0xe5c9);
  addIcon = String.fromCharCode(0xe145);
  shieldIcon = String.fromCharCode(0xe8e8);
  starIcon = String.fromCharCode(0xe838);
  lockIcon = String.fromCharCode(0xe897);
  checkSmallIcon = String.fromCharCode(0xe5ca);

  private updatingReminder = false;
  private timeChangeTimeout: ReturnType<typeof setTimeout> | undefined;

  async onReminderToggle(args: any): Promise<void> {
    if (this.updatingReminder) return;
    this.updatingReminder = true;

    try {
      const wantEnabled = args.value;
      const success = await this.reminderService.toggle(wantEnabled);

      if (!success && wantEnabled) {
        await Dialogs.alert({
          title: 'Permission Required',
          message:
            'To receive daily reminders, please enable notifications for Prayer Streaks in your device settings.',
          okButtonText: 'OK',
        });
      }
    } finally {
      this.updatingReminder = false;
    }
  }

  onTimePickerLoaded(args: any): void {
    const tp = args.object;
    tp.hour = this.reminderService.hour();
    tp.minute = this.reminderService.minute();

    tp.on('timeChange', () => {
      clearTimeout(this.timeChangeTimeout);
      this.timeChangeTimeout = setTimeout(() => {
        this.reminderService.updateTime(tp.hour, tp.minute);
      }, 500);
    });
  }

  onShieldToggle(args: any): void {
    this.checkinService.setShieldsEnabled(args.value);
  }

  onSlotsToggle(args: any): void {
    this.checkinService.setSlotsEnabled(args.value);
  }

  onStreakRequirementChange(req: SlotStreakRequirement): void {
    this.checkinService.setSlotStreakRequirement(req);
  }

  async addSlot(): Promise<void> {
    const result = await Dialogs.prompt({
      title: 'Add Prayer Slot',
      message: 'Enter a name for the new slot (e.g. "Night"):',
      okButtonText: 'Add',
      cancelButtonText: 'Cancel',
      defaultText: '',
    });

    if (result.result && result.text?.trim()) {
      this.checkinService.addSlot(result.text);
    }
  }

  async addCustomType(): Promise<void> {
    const result = await Dialogs.prompt({
      title: 'Add Prayer Type',
      message: 'Enter a name for the new prayer type:',
      okButtonText: 'Add',
      cancelButtonText: 'Cancel',
      defaultText: '',
    });

    if (result.result && result.text?.trim()) {
      const typeName = result.text.trim().toLowerCase() as PrayerType;
      this.checkinService.addPrayerType(typeName);
    }
  }

  async resetAllData(): Promise<void> {
    const confirmed = await Dialogs.confirm({
      title: 'Reset All Data',
      message:
        'This will permanently delete all your check-ins, streaks, and reminder settings. Are you sure?',
      okButtonText: 'Reset',
      cancelButtonText: 'Cancel',
    });

    if (confirmed) {
      if (this.reminderService.enabled()) {
        await this.reminderService.toggle(false);
      }
      this.milestoneService.resetAll();
      this.reviewService.resetAll();
      this.checkinService.resetAll();
    }
  }
}
