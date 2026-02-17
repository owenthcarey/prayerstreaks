import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { isIOS } from '@nativescript/core';
import { TodayComponent } from '../today/today.component';
import { HistoryComponent } from '../history/history.component';
import { SettingsComponent } from '../settings/settings.component';

@Component({
  selector: 'ns-home',
  templateUrl: './home.component.html',
  imports: [
    NativeScriptCommonModule,
    TodayComponent,
    HistoryComponent,
    SettingsComponent,
  ],
  schemas: [NO_ERRORS_SCHEMA],
})
export class HomeComponent {
  isIOS = isIOS;

  // Platform-conditional icon sources
  // iOS: SFSymbols via sys:// prefix
  // Android: Material Icons font glyphs via font:// prefix
  todayIcon = isIOS
    ? 'sys://checkmark.seal.fill'
    : `font://${String.fromCharCode(0xe86c)}`;
  historyIcon = isIOS
    ? 'sys://calendar'
    : `font://${String.fromCharCode(0xe889)}`;
  settingsIcon = isIOS
    ? 'sys://gear'
    : `font://${String.fromCharCode(0xe8b8)}`;

  loadedHome(args: any): void {
    // Home layout loaded
  }

  loadedTabs(args: any): void {
    // TabView loaded
  }

  selectedIndexChange(args: any): void {
    // Tab changed
  }
}

