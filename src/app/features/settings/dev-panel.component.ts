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
import {
  DevToolsService,
  SeedPreset,
} from '../../core/services/dev-tools.service';
import { Milestone, MILESTONES } from '../../core/models/milestone.model';
import { DailyQuote } from '../../core/models/quote.model';

@Component({
  selector: 'ns-dev-panel',
  templateUrl: './dev-panel.component.html',
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevPanelComponent {
  devTools = inject(DevToolsService);

  isIOS = isIOS;
  expandIcon = String.fromCharCode(0xe5cf);
  collapseIcon = String.fromCharCode(0xe5ce);

  milestones = MILESTONES;

  expandedSections = signal<Set<string>>(new Set(['inspector']));
  customDays = signal(30);
  customNotePercent = signal(25);
  customTypePercent = signal(50);
  quoteDay = signal(1);
  quotePreview = signal<DailyQuote | null>(null);
  storageEntries = signal<{ key: string; value: string }[]>([]);

  reviewState = computed(() => this.devTools.reviewService.devGetState());

  dateOverride = computed(() => {
    this.devTools.checkinService.checkIns();
    return this.devTools.currentDateOverride;
  });

  milestoneForSharePreview = computed(() => {
    const unlocked = new Set(this.devTools.milestoneService.unlockedIds());
    return (
      [...MILESTONES].reverse().find((m) => unlocked.has(m.id)) ??
      MILESTONES[0]
    );
  });

  isExpanded(section: string): boolean {
    return this.expandedSections().has(section);
  }

  toggleSection(section: string): void {
    const current = new Set(this.expandedSections());
    if (current.has(section)) {
      current.delete(section);
    } else {
      current.add(section);
      if (section === 'storage') {
        this.refreshStorage();
      }
    }
    this.expandedSections.set(current);
  }

  applyPreset(preset: SeedPreset): void {
    this.devTools.applyPreset(preset);
  }

  onCustomDaysInput(text: string): void {
    const n = parseInt(text, 10);
    if (!isNaN(n) && n > 0) this.customDays.set(n);
  }

  seedCustom(): void {
    this.devTools.seedCustom(
      this.customDays(),
      this.customNotePercent(),
      this.customTypePercent()
    );
  }

  isMilestoneUnlocked(id: string): boolean {
    return this.devTools.milestoneService.unlockedIds().includes(id);
  }

  toggleMilestone(m: Milestone): void {
    if (this.isMilestoneUnlocked(m.id)) {
      this.devTools.lockMilestone(m.id);
    } else {
      this.devTools.unlockMilestone(m.id);
    }
  }

  toggleFirst7Day(): void {
    const current = this.reviewState().first7DayPrompted;
    this.devTools.setFirst7DayPrompted(!current);
  }

  onQuoteDayInput(text: string): void {
    const n = parseInt(text, 10);
    if (!isNaN(n) && n >= 1 && n <= 366) this.quoteDay.set(n);
  }

  previewQuote(): void {
    this.quotePreview.set(this.devTools.getQuoteForDay(this.quoteDay()));
  }

  refreshStorage(): void {
    this.storageEntries.set(this.devTools.getAllStorageState());
  }
}
