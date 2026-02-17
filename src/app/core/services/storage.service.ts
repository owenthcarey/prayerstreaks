import { Injectable } from '@angular/core';
import { ApplicationSettings } from '@nativescript/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  getJSON<T>(key: string, defaultValue: T): T {
    const raw = ApplicationSettings.getString(key, '');
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  setJSON<T>(key: string, value: T): void {
    ApplicationSettings.setString(key, JSON.stringify(value));
  }

  getString(key: string, defaultValue = ''): string {
    return ApplicationSettings.getString(key, defaultValue);
  }

  setString(key: string, value: string): void {
    ApplicationSettings.setString(key, value);
  }

  clear(): void {
    ApplicationSettings.clear();
  }
}

