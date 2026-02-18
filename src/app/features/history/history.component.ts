import {
  ChangeDetectionStrategy,
  Component,
  NO_ERRORS_SCHEMA,
  computed,
  inject,
} from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { isIOS } from '@nativescript/core';
import { CheckInService } from '../../core/services/checkin.service';
import { CheckIn, prayerTypeLabel } from '../../core/models/checkin.model';
import {
  formatDisplayDate,
  getMonthYear,
  getTodayISO,
  addDays,
} from '../../core/utils/date.utils';

export interface HistoryItem {
  date: string;
  displayDate: string;
  monthYear: string;
  checked: boolean;
  prayerType?: string;
  isMonthHeader: boolean;
}

@Component({
  selector: 'ns-history',
  templateUrl: './history.component.html',
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent {
  checkinService = inject(CheckInService);

  isIOS = isIOS;

  // Material Icons glyphs (Android)
  checkIcon = String.fromCharCode(0xe86c);   // check_circle
  closeIcon = String.fromCharCode(0xe5cd);   // close

  historyItems = computed(() => {
    const checkIns = this.checkinService.checkIns();
    const checkInMap = new Map<string, CheckIn>();
    for (const c of checkIns) {
      checkInMap.set(c.date, c);
    }

    const items: HistoryItem[] = [];
    const today = getTodayISO();
    let lastMonth = '';

    // Show last 30 days
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, -i);
      const monthYear = getMonthYear(date);
      const checkIn = checkInMap.get(date);

      // Insert month header when the month changes
      if (monthYear !== lastMonth) {
        items.push({
          date: '',
          displayDate: '',
          monthYear,
          checked: false,
          isMonthHeader: true,
        });
        lastMonth = monthYear;
      }

      items.push({
        date,
        displayDate: formatDisplayDate(date),
        monthYear,
        checked: !!checkIn,
        prayerType: checkIn?.prayerType
          ? prayerTypeLabel(checkIn.prayerType)
          : undefined,
        isMonthHeader: false,
      });
    }

    return items;
  });
}

