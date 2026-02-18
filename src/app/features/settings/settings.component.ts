import {
  ChangeDetectionStrategy,
  Component,
  NO_ERRORS_SCHEMA,
  inject,
} from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { Dialogs, isIOS } from '@nativescript/core';
import { CheckInService } from '../../core/services/checkin.service';
import { PrayerType, prayerTypeLabel } from '../../core/models/checkin.model';

@Component({
  selector: 'ns-settings',
  templateUrl: './settings.component.html',
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  checkinService = inject(CheckInService);
  prayerTypeLabel = prayerTypeLabel;

  isIOS = isIOS;

  // Material Icons glyphs (Android)
  cancelIcon = String.fromCharCode(0xe5c9);  // cancel (filled circle with x)
  addIcon = String.fromCharCode(0xe145);     // add

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
        'This will permanently delete all your check-ins and streaks. Are you sure?',
      okButtonText: 'Reset',
      cancelButtonText: 'Cancel',
    });

    if (confirmed) {
      this.checkinService.resetAll();
    }
  }
}

