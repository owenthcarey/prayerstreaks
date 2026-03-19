import { Injectable, inject, signal } from '@angular/core';
import { isIOS, isAndroid, Application } from '@nativescript/core';
import { StorageService } from './storage.service';
import { getTodayISO, formatDateISO } from '../utils/date.utils';

const LAST_REVIEW_PROMPT_KEY = 'lastReviewPrompt';
const REVIEW_PROMPT_COUNT_KEY = 'reviewPromptCount';
const SESSION_DATES_KEY = 'sessionDates';
const FIRST_7DAY_PROMPTED_KEY = 'first7DayStreakPrompted';

const MIN_DAYS_BETWEEN_PROMPTS = 90;
const MAX_PROMPTS_PER_YEAR = 3;
const SESSION_HISTORY_DAYS = 90;
const REVIEW_PROMPT_DELAY_MS = 1500;

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private storage = inject(StorageService);

  private lastPromptDate = signal<string>(
    this.storage.getString(LAST_REVIEW_PROMPT_KEY)
  );
  private promptCount = signal<number>(
    this.storage.getJSON<number>(REVIEW_PROMPT_COUNT_KEY, 0)
  );
  private sessionDates = signal<string[]>(
    this.storage.getJSON<string[]>(SESSION_DATES_KEY, [])
  );
  private first7DayPrompted = signal<boolean>(
    this.storage.getBoolean(FIRST_7DAY_PROMPTED_KEY, false)
  );

  constructor() {
    this.recordSession();
  }

  /**
   * Evaluate whether to show a review prompt after check-in.
   * Call this after the check-in and milestone evaluation have completed.
   */
  evaluateReviewPrompt(
    currentStreak: number,
    milestoneUnlocked: boolean
  ): void {
    if (!this.canPrompt(currentStreak)) return;

    const shouldPrompt =
      this.isFirst7DayStreak(currentStreak) ||
      milestoneUnlocked ||
      this.isThirdSessionThisWeek();

    if (shouldPrompt) {
      this.recordPromptAndRequest();
    }
  }

  resetAll(): void {
    this.lastPromptDate.set('');
    this.promptCount.set(0);
    this.sessionDates.set([]);
    this.first7DayPrompted.set(false);
  }

  // ---- Dev-only methods (never called in production — panel is hidden) ----

  devGetState(): {
    lastPromptDate: string;
    promptCount: number;
    sessionDates: string[];
    first7DayPrompted: boolean;
  } {
    return {
      lastPromptDate: this.lastPromptDate(),
      promptCount: this.promptCount(),
      sessionDates: this.sessionDates(),
      first7DayPrompted: this.first7DayPrompted(),
    };
  }

  devSetState(state: {
    lastPromptDate?: string;
    promptCount?: number;
    sessionDates?: string[];
    first7DayPrompted?: boolean;
  }): void {
    if (state.lastPromptDate !== undefined) {
      this.lastPromptDate.set(state.lastPromptDate);
      this.storage.setString(LAST_REVIEW_PROMPT_KEY, state.lastPromptDate);
    }
    if (state.promptCount !== undefined) {
      this.promptCount.set(state.promptCount);
      this.storage.setJSON(REVIEW_PROMPT_COUNT_KEY, state.promptCount);
    }
    if (state.sessionDates !== undefined) {
      this.sessionDates.set(state.sessionDates);
      this.storage.setJSON(SESSION_DATES_KEY, state.sessionDates);
    }
    if (state.first7DayPrompted !== undefined) {
      this.first7DayPrompted.set(state.first7DayPrompted);
      this.storage.setBoolean(FIRST_7DAY_PROMPTED_KEY, state.first7DayPrompted);
    }
  }

  devForcePrompt(): void {
    this.showNativeReviewPrompt();
  }

  private canPrompt(currentStreak: number): boolean {
    if (this.sessionDates().length <= 1) return false;
    if (currentStreak <= 0) return false;

    const lastDate = this.lastPromptDate();
    if (lastDate) {
      const daysSince = this.daysBetween(lastDate, getTodayISO());
      if (daysSince < MIN_DAYS_BETWEEN_PROMPTS) return false;
    }

    if (this.promptCount() >= MAX_PROMPTS_PER_YEAR) {
      if (lastDate && this.daysBetween(lastDate, getTodayISO()) >= 365) {
        this.promptCount.set(0);
        this.storage.setJSON(REVIEW_PROMPT_COUNT_KEY, 0);
      } else {
        return false;
      }
    }

    return true;
  }

  private isFirst7DayStreak(currentStreak: number): boolean {
    if (this.first7DayPrompted()) return false;
    return currentStreak >= 7;
  }

  private isThirdSessionThisWeek(): boolean {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekStartISO = formatDateISO(weekStart);

    return this.sessionDates().filter((d) => d >= weekStartISO).length >= 3;
  }

  private recordSession(): void {
    const today = getTodayISO();
    const sessions = this.sessionDates();
    if (sessions.includes(today)) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - SESSION_HISTORY_DAYS);
    const cutoffISO = formatDateISO(cutoff);

    const updated = [...sessions.filter((d) => d > cutoffISO), today];
    this.sessionDates.set(updated);
    this.storage.setJSON(SESSION_DATES_KEY, updated);
  }

  private recordPromptAndRequest(): void {
    const today = getTodayISO();
    this.lastPromptDate.set(today);
    this.promptCount.update((c) => c + 1);
    this.storage.setString(LAST_REVIEW_PROMPT_KEY, today);
    this.storage.setJSON(REVIEW_PROMPT_COUNT_KEY, this.promptCount());

    if (!this.first7DayPrompted()) {
      this.first7DayPrompted.set(true);
      this.storage.setBoolean(FIRST_7DAY_PROMPTED_KEY, true);
    }

    setTimeout(() => this.showNativeReviewPrompt(), REVIEW_PROMPT_DELAY_MS);
  }

  private showNativeReviewPrompt(): void {
    try {
      if (isIOS) {
        this.requestReviewIOS();
      } else if (isAndroid) {
        this.requestReviewAndroid();
      }
    } catch (e) {
      console.error('ReviewService: failed to show review prompt', e);
    }
  }

  private requestReviewIOS(): void {
    const app: any = UIApplication.sharedApplication;
    const scenes = app.connectedScenes;
    if (scenes && scenes.count > 0) {
      const scene = scenes.allObjects.objectAtIndex(0);
      if (scene instanceof UIWindowScene) {
        (SKStoreReviewController as any).requestReviewInScene(scene);
        return;
      }
    }
    SKStoreReviewController.requestReview();
  }

  private requestReviewAndroid(): void {
    const activity =
      Application.android.foregroundActivity ||
      Application.android.startActivity;
    if (!activity) return;

    const ReviewManagerFactory = (com as any).google.android.play.core.review
      .ReviewManagerFactory;
    const manager = ReviewManagerFactory.create(activity);
    const request = manager.requestReviewFlow();
    request.addOnCompleteListener(
      new (com as any).google.android.gms.tasks.OnCompleteListener({
        onComplete(task: any) {
          if (task.isSuccessful()) {
            manager.launchReviewFlow(activity, task.getResult());
          }
        },
      })
    );
  }

  private daysBetween(dateA: string, dateB: string): number {
    const a = new Date(dateA + 'T12:00:00');
    const b = new Date(dateB + 'T12:00:00');
    return Math.floor(
      Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)
    );
  }
}
