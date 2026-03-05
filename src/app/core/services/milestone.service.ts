import { Injectable, computed, inject, signal } from '@angular/core';
import { Milestone, MILESTONES } from '../models/milestone.model';
import { CheckInService } from './checkin.service';
import { StorageService } from './storage.service';

const UNLOCKED_KEY = 'unlockedMilestones';

@Injectable({ providedIn: 'root' })
export class MilestoneService {
  private storage = inject(StorageService);
  private checkinService = inject(CheckInService);

  unlockedIds = signal<string[]>(
    this.storage.getJSON<string[]>(UNLOCKED_KEY, [])
  );

  /** Set after check-in when a new milestone is reached; cleared on dismiss. */
  pendingCelebration = signal<Milestone | null>(null);

  allMilestones = computed(() => {
    const unlocked = new Set(this.unlockedIds());
    return MILESTONES.map((m) => ({
      ...m,
      unlocked: unlocked.has(m.id),
    }));
  });

  nextMilestone = computed(() => {
    const unlocked = new Set(this.unlockedIds());
    return MILESTONES.find((m) => !unlocked.has(m.id)) ?? null;
  });

  constructor() {
    this.syncUnlockedMilestones();
  }

  /**
   * Called after each check-in. Unlocks any newly earned milestones and
   * sets pendingCelebration to the highest new one for the celebration card.
   */
  checkForNewMilestones(): Milestone | null {
    const longest = this.checkinService.longestStreak();
    const unlocked = new Set(this.unlockedIds());

    let newMilestone: Milestone | null = null;
    for (const m of MILESTONES) {
      if (longest >= m.days && !unlocked.has(m.id)) {
        unlocked.add(m.id);
        newMilestone = m;
      }
    }

    if (newMilestone) {
      const updated = [...unlocked];
      this.unlockedIds.set(updated);
      this.storage.setJSON(UNLOCKED_KEY, updated);
      this.pendingCelebration.set(newMilestone);
    }

    return newMilestone;
  }

  dismissCelebration(): void {
    this.pendingCelebration.set(null);
  }

  resetAll(): void {
    this.unlockedIds.set([]);
    this.pendingCelebration.set(null);
  }

  /**
   * Silently unlock milestones earned before this feature existed.
   * Does NOT trigger a celebration — only checkForNewMilestones() does.
   */
  private syncUnlockedMilestones(): void {
    const longest = this.checkinService.longestStreak();
    const unlocked = new Set(this.unlockedIds());
    let changed = false;

    for (const m of MILESTONES) {
      if (longest >= m.days && !unlocked.has(m.id)) {
        unlocked.add(m.id);
        changed = true;
      }
    }

    if (changed) {
      const updated = [...unlocked];
      this.unlockedIds.set(updated);
      this.storage.setJSON(UNLOCKED_KEY, updated);
    }
  }
}
