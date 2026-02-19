import { Routes } from '@angular/router';
import { TodayComponent } from './features/today/today.component';
import { HistoryComponent } from './features/history/history.component';
import { SettingsComponent } from './features/settings/settings.component';

export const routes: Routes = [
  {
    path: 'today',
    component: TodayComponent,
    outlet: 'todayTab',
  },
  {
    path: 'history',
    component: HistoryComponent,
    outlet: 'historyTab',
  },
  {
    path: 'settings',
    component: SettingsComponent,
    outlet: 'settingsTab',
  },
];
