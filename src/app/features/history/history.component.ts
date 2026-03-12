import {
  ChangeDetectionStrategy,
  Component,
  NO_ERRORS_SCHEMA,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { Application, isIOS } from '@nativescript/core';
import { CheckInService } from '../../core/services/checkin.service';
import { ShareService } from '../../core/services/share.service';
import { CheckIn, prayerTypeLabel } from '../../core/models/checkin.model';
import {
  formatDateISO,
  formatDisplayDate,
  getMonthYear,
  getTodayISO,
  addDays,
} from '../../core/utils/date.utils';

type ViewMode = 'list' | 'calendar' | 'year';

export interface SlotStatus {
  name: string;
  done: boolean;
}

export interface HistoryItem {
  date: string;
  displayDate: string;
  monthYear: string;
  checked: boolean;
  shielded: boolean;
  prayerType?: string;
  note?: string;
  isMonthHeader: boolean;
  isExpanded?: boolean;
  slots?: SlotStatus[];
}

export interface CalendarDay {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  checked: boolean;
  hasNote: boolean;
  shielded: boolean;
  isToday: boolean;
}

export interface CalendarCell extends CalendarDay {
  gridRow: number;
  gridCol: number;
}

export interface MiniMonth {
  name: string;
  monthIndex: number;
  flatCells: CalendarCell[];
  gridRow: number;
  gridCol: number;
  miniRowDefs: string;
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
  private shareService = inject(ShareService);

  isIOS = isIOS;

  checkIcon = String.fromCharCode(0xe86c);
  closeIcon = String.fromCharCode(0xe5cd);
  shieldIcon = String.fromCharCode(0xe8e8);
  searchIcon = String.fromCharCode(0xe8b6);
  exportIcon = String.fromCharCode(0xe2c6);
  expandIcon = String.fromCharCode(0xe5cf);
  collapseIcon = String.fromCharCode(0xe5ce);
  noteIcon = String.fromCharCode(0xe244);
  prevIcon = String.fromCharCode(0xe5cb);
  nextIcon = String.fromCharCode(0xe5cc);

  dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  private monthLabels = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  private shortMonthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  searchQuery = signal('');
  expandedDates = signal<Set<string>>(new Set());
  viewMode = signal<ViewMode>('year');
  calendarMonth = signal(new Date().getMonth());
  calendarYear = signal(new Date().getFullYear());

  hasJournalEntries = computed(() =>
    this.checkinService.checkIns().some((c) => !!c.note)
  );

  currentMonthLabel = computed(
    () => `${this.monthLabels[this.calendarMonth()]} ${this.calendarYear()}`
  );

  private calendarData = computed(() => {
    const checkIns = this.checkinService.checkIns();
    const checkInMap = new Map<string, CheckIn[]>();
    for (const c of checkIns) {
      const list = checkInMap.get(c.date) ?? [];
      list.push(c);
      checkInMap.set(c.date, list);
    }
    return {
      checkInMap,
      shieldedSet: new Set(this.checkinService.shieldedDates()),
      shieldsOn: this.checkinService.shieldsEnabled(),
      today: getTodayISO(),
    };
  });

  historyItems = computed(() => {
    const checkIns = this.checkinService.checkIns();
    const query = this.searchQuery().toLowerCase().trim();
    const expanded = this.expandedDates();
    const slotsOn = this.checkinService.slotsEnabled();
    const configuredSlots = this.checkinService.prayerSlots();

    const checkInMap = new Map<string, CheckIn[]>();
    for (const c of checkIns) {
      const list = checkInMap.get(c.date) ?? [];
      list.push(c);
      checkInMap.set(c.date, list);
    }

    const shieldedSet = new Set(this.checkinService.shieldedDates());
    const shieldsOn = this.checkinService.shieldsEnabled();

    const items: HistoryItem[] = [];
    const today = getTodayISO();
    let lastMonth = '';

    for (let i = 0; i < 30; i++) {
      const date = addDays(today, -i);
      const dayCheckIns = checkInMap.get(date);
      const note = dayCheckIns?.find((c) => c.note)?.note;

      if (query && !(note?.toLowerCase().includes(query))) {
        continue;
      }

      const monthYear = getMonthYear(date);
      if (monthYear !== lastMonth) {
        items.push({
          date: '',
          displayDate: '',
          monthYear,
          checked: false,
          shielded: false,
          isMonthHeader: true,
        });
        lastMonth = monthYear;
      }

      const hasCheckIns = !!dayCheckIns && dayCheckIns.length > 0;
      const prayerTypes = dayCheckIns
        ?.filter((c) => c.prayerType)
        .map((c) => prayerTypeLabel(c.prayerType!)) ?? [];
      const uniqueTypes = [...new Set(prayerTypes)];

      let slots: SlotStatus[] | undefined;
      if (slotsOn && configuredSlots.length > 0 && hasCheckIns) {
        const completedSlotIds = new Set(
          dayCheckIns.filter((c) => c.slot).map((c) => c.slot!)
        );
        slots = configuredSlots.map((s) => ({
          name: s.name,
          done: completedSlotIds.has(s.id),
        }));
      }

      items.push({
        date,
        displayDate: formatDisplayDate(date),
        monthYear,
        checked: hasCheckIns,
        shielded: !hasCheckIns && shieldsOn && shieldedSet.has(date),
        prayerType: uniqueTypes.length > 0 ? uniqueTypes.join(', ') : undefined,
        note,
        isMonthHeader: false,
        isExpanded: expanded.has(date),
        slots,
      });
    }

    return items;
  });

  calendarWeeks = computed(() => {
    const { checkInMap, shieldedSet, shieldsOn, today } = this.calendarData();
    return this.buildWeeksForMonth(
      this.calendarYear(), this.calendarMonth(),
      checkInMap, shieldedSet, shieldsOn, today,
    );
  });

  calendarRowDefs = computed(() => {
    const weekCount = this.calendarWeeks().length;
    return '30, ' + Array(weekCount).fill('44').join(', ');
  });

  flatCalendarCells = computed(() => {
    const weeks = this.calendarWeeks();
    const cells: CalendarCell[] = [];
    weeks.forEach((week, weekIndex) => {
      week.forEach((day, dayIndex) => {
        cells.push({ ...day, gridRow: weekIndex + 1, gridCol: dayIndex });
      });
    });
    return cells;
  });

  yearMonths = computed(() => {
    const year = this.calendarYear();
    const { checkInMap, shieldedSet, shieldsOn, today } = this.calendarData();
    const months: MiniMonth[] = [];
    for (let m = 0; m < 12; m++) {
      const weeks = this.buildWeeksForMonth(year, m, checkInMap, shieldedSet, shieldsOn, today);
      const flatCells: CalendarCell[] = [];
      weeks.forEach((week, weekIndex) => {
        week.forEach((day, dayIndex) => {
          flatCells.push({ ...day, gridRow: weekIndex + 2, gridCol: dayIndex });
        });
      });
      months.push({
        name: this.shortMonthLabels[m],
        monthIndex: m,
        flatCells,
        gridRow: Math.floor(m / 3),
        gridCol: m % 3,
        miniRowDefs: `auto, 12, ${Array(weeks.length).fill('14').join(', ')}`,
      });
    }
    return months;
  });

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  previousMonth(): void {
    if (this.calendarMonth() === 0) {
      this.calendarMonth.set(11);
      this.calendarYear.update((y) => y - 1);
    } else {
      this.calendarMonth.update((m) => m - 1);
    }
  }

  nextMonth(): void {
    if (this.calendarMonth() === 11) {
      this.calendarMonth.set(0);
      this.calendarYear.update((y) => y + 1);
    } else {
      this.calendarMonth.update((m) => m + 1);
    }
  }

  previousYear(): void {
    this.calendarYear.update((y) => y - 1);
  }

  nextYear(): void {
    this.calendarYear.update((y) => y + 1);
  }

  onCalendarSwipe(args: any): void {
    if (args.direction === 2) this.nextMonth();
    else if (args.direction === 1) this.previousMonth();
  }

  onYearSwipe(args: any): void {
    if (args.direction === 2) this.nextYear();
    else if (args.direction === 1) this.previousYear();
  }

  selectMonth(monthIndex: number): void {
    this.calendarMonth.set(monthIndex);
    this.viewMode.set('calendar');
  }

  getCellColor(day: CalendarDay): string {
    if (!day.isCurrentMonth) return 'transparent';
    if (day.shielded) return '#ede9fe';
    if (day.checked && day.hasNote) return '#16a34a';
    if (day.checked) return '#bbf7d0';
    return 'transparent';
  }

  getCellTextColor(day: CalendarDay): string {
    const isDark = Application.systemAppearance() === 'dark';
    if (!day.isCurrentMonth) return isDark ? '#4b5563' : '#d1d5db';
    if (day.checked && day.hasNote) return '#ffffff';
    if (day.checked) return '#166534';
    if (day.shielded) return '#7c3aed';
    if (day.isToday) return '#2563eb';
    return isDark ? '#e5e7eb' : '#374151';
  }

  getMiniCellColor(day: CalendarDay): string {
    if (!day.isCurrentMonth) return 'transparent';
    if (day.shielded) return '#ede9fe';
    if (day.checked && day.hasNote) return '#16a34a';
    if (day.checked) return '#86efac';
    const isDark = Application.systemAppearance() === 'dark';
    return isDark ? '#374151' : '#f3f4f6';
  }

  onSearchInput(text: string): void {
    this.searchQuery.set(text);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  toggleExpand(date: string): void {
    const current = new Set(this.expandedDates());
    if (current.has(date)) {
      current.delete(date);
    } else {
      current.add(date);
    }
    this.expandedDates.set(current);
  }

  onExportJournal(): void {
    const text = this.checkinService.exportJournalText();
    if (!text) return;
    this.shareService.shareTextFile(text, 'prayer-journal.txt');
  }

  private buildWeeksForMonth(
    year: number,
    month: number,
    checkInMap: Map<string, CheckIn[]>,
    shieldedSet: Set<string>,
    shieldsOn: boolean,
    today: string,
  ): CalendarDay[][] {
    const startDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayForDate = (dateStr: string, dayOfMonth: number, isCurrent: boolean): CalendarDay => {
      const cis = checkInMap.get(dateStr);
      const hasCheckins = !!cis && cis.length > 0;
      return {
        date: dateStr, dayOfMonth, isCurrentMonth: isCurrent,
        checked: hasCheckins,
        hasNote: !!cis?.some((c) => c.note),
        shielded: !hasCheckins && shieldsOn && shieldedSet.has(dateStr),
        isToday: dateStr === today,
      };
    };

    const weeks: CalendarDay[][] = [];
    let week: CalendarDay[] = [];

    const prevDays = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevDays - i;
      week.push(dayForDate(formatDateISO(new Date(year, month - 1, day)), day, false));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      week.push(dayForDate(formatDateISO(new Date(year, month, day)), day, true));
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    if (week.length > 0) {
      let nextDay = 1;
      while (week.length < 7) {
        week.push(dayForDate(formatDateISO(new Date(year, month + 1, nextDay)), nextDay, false));
        nextDay++;
      }
      weeks.push(week);
    }

    return weeks;
  }
}
