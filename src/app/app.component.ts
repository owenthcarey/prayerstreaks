import { Component, NO_ERRORS_SCHEMA, OnDestroy } from '@angular/core';
import {
  NativeScriptCommonModule,
  PageRouterOutlet,
  RouterExtensions,
} from '@nativescript/angular';
import {
  isIOS,
  isAndroid,
  TabView,
  ImageSource,
  Font,
  Color,
  Application,
} from '@nativescript/core';

@Component({
  selector: 'ns-app',
  templateUrl: './app.component.html',
  imports: [PageRouterOutlet, NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class AppComponent implements OnDestroy {
  todayIcon = isIOS ? 'sys://checkmark.seal.fill' : '';
  historyIcon = isIOS ? 'sys://calendar' : '';
  settingsIcon = isIOS ? 'sys://gear' : '';

  private androidIcons = [
    String.fromCharCode(0xe86c), // check_circle  (Today)
    String.fromCharCode(0xe889), // history        (History)
    String.fromCharCode(0xe8b8), // settings       (Settings)
  ];

  private tabView: TabView | null = null;
  private readonly iconFont = Font.default
    .withFontFamily('MaterialIcons-Regular')
    .withFontSize(24);
  private readonly accentColor = new Color('#2563eb');
  private readonly grayColor = new Color('#8e8e93');

  private resumeHandler = () =>
    this.updateAndroidIcons(this.tabView?.selectedIndex ?? 0);

  private appearanceHandler = () =>
    this.updateAndroidSystemBars(Application.systemAppearance() === 'dark');

  constructor(private routerExtensions: RouterExtensions) {}

  /**
   * WORKAROUND — NativeScript TabView Android font:// icon bug
   * ============================================================
   * @nativescript/core ~9.0.0, @nativescript/android 9.0.2
   *
   * Bug: On Android, TabView font:// icons render as invisible 12×12px bitmaps.
   *
   * Root cause (traced through node_modules/@nativescript/core/ui/tab-view/):
   *
   *   1. createTabItemSpec() in index.android.js reads icon-font-family, color,
   *      and font-size from item.style — but those CSS properties are never
   *      applied to TabViewItem styles by the time createTabItemSpec() first runs
   *      during setAdapterItems(). All three are undefined.
   *
   *   2. Without icon-font-family, it falls back to Font.default (fontSize=undefined).
   *      fromFontIconCodeSync() in image-source/index.android.js then renders with
   *      Android Paint's default 12px text size and no color — producing a tiny,
   *      effectively invisible bitmap.
   *
   *   3. The iconSource setter in tab-view-common.js has a change guard
   *      (if this._iconSource !== value), so re-setting the same value after
   *      fixing iconFontFamily does NOT trigger a re-render.
   *
   *   4. Calling _update() directly also doesn't help because the CSS style
   *      properties (icon-font-family, color, font-size) remain undefined on
   *      TabViewItem even after the loaded event fires.
   *
   * Note: font icons work perfectly on regular views (Label, Button, etc.) via
   * text + font-family CSS. The bug is specific to TabView's icon rendering
   * pipeline on Android.
   *
   * Workaround: Generate icon bitmaps manually with explicit font, size, and
   * color via ImageSource.fromFontIconCodeSync(), then set them as native
   * BitmapDrawables on each tab's tabItemSpec.
   */
  loadedTabs(args: any): void {
    if (isAndroid) {
      this.tabView = args.object as TabView;
      Application.android.on('activityResumed', this.resumeHandler);
      Application.on('systemAppearanceChanged', this.appearanceHandler);
      this.updateAndroidIcons(0);
    }

    this.routerExtensions.navigate([
      {
        outlets: {
          todayTab: ['today'],
          historyTab: ['history'],
          settingsTab: ['settings'],
        },
      },
    ]);
  }

  ngOnDestroy(): void {
    if (isAndroid) {
      Application.android.off('activityResumed', this.resumeHandler);
      Application.off('systemAppearanceChanged', this.appearanceHandler);
    }
  }

  selectedIndexChange(args: any): void {
    if (!isAndroid) return;
    this.updateAndroidIcons(this.tabView?.selectedIndex ?? 0);
  }

  /**
   * WORKAROUND — Android system bar colors not updating on live theme switch
   * =========================================================================
   * NativeScript's AndroidManifest declares android:configChanges="...uiMode"
   * so the activity is NOT recreated when the user toggles dark mode. This
   * preserves app state but means the Android theme XML (values/values-night
   * color resources) is never re-applied — the status bar and navigation bar
   * keep their original colors.
   *
   * Fix: listen for NativeScript's 'systemAppearanceChanged' event and
   * programmatically call Window.setStatusBarColor/setNavigationBarColor
   * plus WindowInsetsController (API 30+) or setSystemUiVisibility (older)
   * to flip the light/dark icon appearance.
   */
  private updateAndroidSystemBars(isDark: boolean): void {
    const activity =
      Application.android?.foregroundActivity ||
      Application.android?.startActivity;
    if (!activity) return;

    const window = activity.getWindow();
    const statusColor = new Color(isDark ? '#1c1c1e' : '#ffffff').android;
    const navColor = new Color(isDark ? '#1c1c1e' : '#f8fafc').android;

    window.setStatusBarColor(statusColor);
    window.setNavigationBarColor(navColor);

    if (android.os.Build.VERSION.SDK_INT >= 30) {
      const controller = window.getInsetsController();
      if (controller) {
        const LIGHT_BARS =
          android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS |
          android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
        controller.setSystemBarsAppearance(isDark ? 0 : LIGHT_BARS, LIGHT_BARS);
      }
    } else {
      const decorView = window.getDecorView();
      let flags = decorView.getSystemUiVisibility();
      const LIGHT_STATUS_BAR = 0x00002000;
      const LIGHT_NAV_BAR = 0x00000010;
      if (isDark) {
        flags &= ~LIGHT_STATUS_BAR;
        flags &= ~LIGHT_NAV_BAR;
      } else {
        flags |= LIGHT_STATUS_BAR;
        flags |= LIGHT_NAV_BAR;
      }
      decorView.setSystemUiVisibility(flags);
    }
  }

  private updateAndroidIcons(selected: number): void {
    if (!this.tabView?.items) return;

    this.tabView.items.forEach((item, i) => {
      const color = i === selected ? this.accentColor : this.grayColor;
      const imgSource = ImageSource.fromFontIconCodeSync(
        this.androidIcons[i],
        this.iconFont,
        color,
      );
      if (!imgSource) return;

      const tabItemSpec = (item as any).tabItemSpec;
      if (!tabItemSpec) return;

      tabItemSpec.iconDrawable =
        new android.graphics.drawable.BitmapDrawable(
          item.nativeViewProtected?.getContext()?.getResources(),
          imgSource.android,
        );
      (this.tabView as any).updateAndroidItemAt(i, tabItemSpec);
    });
  }
}
