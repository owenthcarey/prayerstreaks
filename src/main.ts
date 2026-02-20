import {
  bootstrapApplication,
  provideNativeScriptHttpClient,
  provideNativeScriptRouter,
  runNativeScriptAngularApp,
} from '@nativescript/angular';
import { provideZonelessChangeDetection } from '@angular/core';
import { withInterceptorsFromDi } from '@angular/common/http';
import { initNorrix } from '@norrix/client-sdk';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

initNorrix({
  updateUrl: 'https://norrix.net',
  checkForUpdatesOnLaunch: true,
  installUpdatesAutomatically: true,
  promptToRestartAfterInstall: true,
});

runNativeScriptAngularApp({
  appModuleBootstrap: () => {
    return bootstrapApplication(AppComponent, {
      providers: [
        provideNativeScriptHttpClient(withInterceptorsFromDi()),
        provideNativeScriptRouter(routes),
        provideZonelessChangeDetection(),
      ],
    });
  },
});
