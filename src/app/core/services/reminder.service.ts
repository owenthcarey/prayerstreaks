import { Injectable, computed, inject, signal } from '@angular/core';
import { LocalNotifications } from '@nativescript/local-notifications';
import { StorageService } from './storage.service';

const REMINDER_ENABLED_KEY = 'reminderEnabled';
const REMINDER_TIME_KEY = 'reminderTime';
const NOTIFICATION_ID = 1;
const DEFAULT_TIME = '08:00';

const REMINDER_MESSAGES = [
  'Time for your daily prayer. Tap to check in.',
  "Your daily prayer awaits \u2014 don't break the chain!",
  'A moment of prayer can change your whole day.',
  'Keep your streak alive. Take a moment to pray.',
  'Your prayer streak is waiting for you today.',
];

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private storage = inject(StorageService);

  enabled = signal<boolean>(
    this.storage.getBoolean(REMINDER_ENABLED_KEY, false)
  );
  time = signal<string>(
    this.storage.getString(REMINDER_TIME_KEY, DEFAULT_TIME)
  );

  hour = computed(() => parseInt(this.time().split(':')[0], 10));
  minute = computed(() => parseInt(this.time().split(':')[1], 10));
  displayTime = computed(() => {
    const h = this.hour();
    const m = this.minute();
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
  });

  async toggle(enable: boolean): Promise<boolean> {
    if (enable) {
      const granted = await LocalNotifications.requestPermission();
      if (!granted) {
        this.enabled.set(false);
        return false;
      }
      this.enabled.set(true);
      this.storage.setBoolean(REMINDER_ENABLED_KEY, true);
      await this.schedule();
      return true;
    }

    this.enabled.set(false);
    this.storage.setBoolean(REMINDER_ENABLED_KEY, false);
    await LocalNotifications.cancel(NOTIFICATION_ID);
    return true;
  }

  async updateTime(hour: number, minute: number): Promise<void> {
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    this.time.set(time);
    this.storage.setString(REMINDER_TIME_KEY, time);
    if (this.enabled()) {
      await this.schedule();
    }
  }

  async rescheduleIfEnabled(): Promise<void> {
    if (this.enabled()) {
      await this.schedule();
    }
  }

  // ---- Dev-only methods (never called in production — panel is hidden) ----

  async devFireTestNotification(): Promise<void> {
    const at = new Date();
    at.setSeconds(at.getSeconds() + 3);
    await LocalNotifications.schedule([
      {
        id: 999,
        title: 'Prayer Streaks (Test)',
        body: 'This is a test notification from the dev panel.',
        at,
      },
    ]);
  }

  private async schedule(): Promise<void> {
    await LocalNotifications.cancel(NOTIFICATION_ID);

    const now = new Date();
    const at = new Date();
    at.setHours(this.hour(), this.minute(), 0, 0);

    if (at <= now) {
      at.setDate(at.getDate() + 1);
    }

    const body =
      REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];

    await LocalNotifications.schedule([
      {
        id: NOTIFICATION_ID,
        title: 'Prayer Streaks',
        body,
        at,
        interval: 'day',
      },
    ]);
  }
}
