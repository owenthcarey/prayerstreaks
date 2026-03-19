# Dev Panel — Detailed Plan

## Overview

A developer-only panel embedded in the Settings screen, hidden from production
builds, that provides controls for testing every hard-to-verify feature in the
app. The panel lets you manipulate app state, seed fake data, trigger one-off
events, and inspect internal values — all without modifying source code or
waiting days/weeks for real conditions to occur.

---

## Why This Is Necessary

| Feature | Natural testing effort | With dev panel |
|---------|----------------------|----------------|
| Milestone "Year of Prayer" (365d) | 365 real days | 2 taps |
| Review prompt (90-day cooldown) | Wait 90 days | 1 tap |
| Calendar year view with full data | Months of daily use | 1 tap |
| Shield auto-apply overnight | Miss a day, reopen next day | 1 tap |
| "All slots required" streak break | Multi-day slot tracking | 1 tap |
| Share card variants (all 4 types) | Need milestone + week + month data | 1 tap each |
| Fresh install experience | Reinstall the app | 1 tap |

---

## Gating from Production

### Build-time approach

NativeScript's webpack `env` object includes `env.production` (true for release
builds, false for debug). Use webpack's `DefinePlugin` to expose a global
`__DEV__` constant:

```js
// webpack.config.js
const webpack = require("@nativescript/webpack");
const { DefinePlugin } = require("webpack");

module.exports = (env) => {
  webpack.init(env);

  webpack.chainWebpack((config) => {
    config.plugin("DefinePlugin").use(DefinePlugin, [
      { __DEV__: !env.production },
    ]);
  });

  return webpack.resolveConfig();
};
```

Then in the Settings component:

```typescript
declare const __DEV__: boolean;

// In template: @if (__DEV__) { ... dev panel ... }
showDevPanel = typeof __DEV__ !== 'undefined' && __DEV__;
```

This means:
- `ns debug ios` / `ns debug android` → `__DEV__ = true` → panel visible
- `ns build ios --release` / `ns build android --release` → `__DEV__ = false` →
  panel never renders

**No hidden gestures needed.** The panel is invisible in production — the code
is still shipped in the bundle but never instantiated or rendered, so no user
can see or interact with it.

---

## Location in the App

The dev panel lives as a collapsible section at the bottom of the Settings
screen, between "App Info" and "Reset All Data". This approach:

- Requires no routing changes (no new tab, no named outlet changes)
- Follows the existing UI patterns (section headers, rounded cards, toggles)
- Is immediately accessible — no navigation required
- Has plenty of vertical scroll space for many controls

---

## Panel Sections & Controls

### Section 1: State Inspector

A read-only view of all critical internal values, so you can verify the current
state at a glance before and after using dev controls.

| Display | Source |
|---------|--------|
| Current streak | `checkinService.currentStreak()` |
| Longest streak | `checkinService.longestStreak()` |
| Total check-ins | `checkinService.checkIns().length` |
| Shields available | `checkinService.shieldCount()` |
| Shielded dates count | `checkinService.shieldedDates().length` |
| Shields enabled | `checkinService.shieldsEnabled()` |
| Slots enabled | `checkinService.slotsEnabled()` |
| Slot streak requirement | `checkinService.slotStreakRequirement()` |
| Unlocked milestones | `milestoneService.unlockedIds()` |
| Pending celebration | `milestoneService.pendingCelebration()?.title` |
| Next milestone | `milestoneService.nextMilestone()?.title` |
| Review prompt count | Read from StorageService |
| Last review prompt | Read from StorageService |
| Session dates count | Read from StorageService |
| First 7-day prompted | Read from StorageService |
| Reminder enabled | `reminderService.enabled()` |
| Reminder time | `reminderService.displayTime()` |

**Why:** Before testing anything, you need to know what state you're starting
from. After using a control, you can immediately verify the effect.

---

### Section 2: Streak & Check-in Data Seeding

These controls generate fake check-in history so you can test calendar views,
streak calculations, share cards, and milestone unlocking with realistic data.

#### 2a. Quick Seed Presets

One-tap buttons that populate the app with pre-configured data profiles:

| Preset | What it seeds |
|--------|--------------|
| **"New User"** | 3 check-ins over last 5 days (1 gap). Tests early experience, "First Steps" milestone proximity. |
| **"1 Week"** | 7 consecutive days. Tests "One Week Strong" milestone, first 7-day review prompt trigger, shield earning. |
| **"1 Month"** | 30 consecutive days with ~60% having prayer types, ~30% having notes. Tests monthly share card, calendar view, "Monthly Devotion" milestone. |
| **"3 Months"** | 90 consecutive days with mixed types/notes. Tests "Quarter of Prayer" milestone, year view density, review prompt third-session-this-week trigger. |
| **"Power User"** | 365 consecutive days with varied types, ~40% notes, 3 shields, 5 shielded dates scattered in. Tests year view at full density, all milestones unlocked, "Year of Prayer" celebration. |
| **"Gaps & Shields"** | 45 days total with 3 intentional 1-day gaps filled by shields, plus 2 unfilled gaps. Tests shield auto-apply logic, broken vs preserved streaks, shielded day rendering in calendar/history. |

Each preset:
1. Clears existing check-in data (with confirmation)
2. Generates `CheckIn[]` with dates counting backward from today
3. Assigns random prayer types from the user's configured types
4. Adds journal notes (lorem-style prayer text) to the configured percentage
5. Sets shield count and shielded dates as specified
6. Persists everything via `StorageService`

#### 2b. Custom Seed

For more targeted testing, a custom seed control with inputs:

| Input | Type | Default |
|-------|------|---------|
| Number of days | Numeric input | 30 |
| Start date | "from today" or "from date" | From today |
| Consecutive | Toggle | On |
| Gap frequency | "Every N days" (only when consecutive=off) | 5 |
| % with prayer type | Slider or segmented (0/25/50/75/100) | 50 |
| % with journal note | Slider or segmented | 25 |
| Include slots | Toggle (uses configured slots) | Off |

**Edge cases this enables testing:**
- Year boundary data (seed 60 days starting from Dec 1 of last year)
- Sparse data (every other day for 6 months)
- Dense data with notes (100% notes for testing journal export)
- Slot-mode data (check-ins with slot assignments for slot streak testing)

---

### Section 3: Milestone Controls

#### 3a. Unlock / Lock Individual Milestones

A list of all 8 milestones, each with a toggle to unlock or lock it:

```
☐ First Steps (3d)        ☑ unlock
☐ One Week Strong (7d)    ☑ unlock
☐ Fortnight of Faith (14d) ☐ lock
...
```

Toggling a milestone directly adds/removes it from `unlockedIds` and persists
via `StorageService`. Does NOT trigger celebration — that's a separate control.

**What this tests:**
- Milestone gallery display in Settings (partial unlock states)
- `nextMilestone` computed value updating correctly
- Share card "milestone" type availability (appears only when ≥ 1 unlocked)
- `syncUnlockedMilestones()` backfill behavior on next app start

#### 3b. Trigger Celebration

A dropdown or list to select any milestone, then a "Show Celebration" button.
Sets `pendingCelebration` to the selected milestone, which causes the
celebration card to appear on the Today tab.

**What this tests:**
- Celebration card rendering for each milestone
- Celebration dismiss behavior
- Share prompt after milestone unlock
- Milestone-triggered review prompt (when combined with review controls)

#### 3c. Unlock All / Lock All

Two buttons for bulk operations.

---

### Section 4: Review Prompt Controls

The review prompt has the most complex gating logic in the app. These controls
let you test each condition independently.

#### 4a. State Overrides

| Control | What it sets |
|---------|-------------|
| Set session count | Number of session dates (generates fake dates) |
| Set last prompt date | Date picker or "N days ago" input |
| Set prompt count | Numeric (0–3+) |
| Reset first-7-day flag | Toggle |

#### 4b. Force Trigger

A "Force Review Prompt" button that calls `showNativeReviewPrompt()` directly,
bypassing all `canPrompt()` and trigger condition checks. This tests the actual
platform API integration (iOS `SKStoreReviewController`, Android
`ReviewManagerFactory`).

#### 4c. Evaluate with Override

A "Test Evaluate" button that calls `evaluateReviewPrompt()` with configurable
`currentStreak` and `milestoneUnlocked` parameters. This tests the full logic
path including `canPrompt()` checks.

**What this tests:**
- 90-day cooldown enforcement
- Max 3 per year enforcement and yearly reset
- First 7-day streak trigger (and flag persistence)
- Milestone unlock trigger
- Third session this week trigger
- Platform-specific review dialog appearance

---

### Section 5: Shield Controls

#### 5a. Set Shield Count

A numeric input or stepper (0–5, exceeding MAX_SHIELDS to test cap logic).
Directly sets the shield count in both the signal and storage.

#### 5b. Add Shielded Date

A date picker to add a specific date to `shieldedDates`. Useful for testing
how shielded days render in the calendar and history views.

#### 5c. Trigger Auto-Apply

A button that manually runs `autoApplyShields()`. This tests the overnight
gap-filling logic without waiting a day.

**Setup for testing auto-apply:**
1. Seed check-in data with a gap (e.g., last check-in was 2 days ago)
2. Set shield count to 2
3. Tap "Auto-Apply Shields"
4. Verify: shield count decreases, shielded dates added, streak preserved

#### 5d. Create Gap

A "Create 1-day gap N days ago" control. Removes the check-in for a specific
date, creating a gap in the streak. Useful in combination with shield
auto-apply testing.

**What this tests:**
- `autoApplyShields()` gap detection and fill logic
- Gap too large for available shields (shield count < gap size)
- Shield count capping at MAX_SHIELDS
- Calendar/history rendering of shield vs miss days
- `earnShieldIfEligible()` at 7-day intervals

---

### Section 6: Share Card Preview

Testing share cards normally requires checking in, building streaks, and
navigating through the share flow. The dev panel provides direct card
generation.

#### 6a. Generate Test Cards

Buttons to generate each card type with synthetic data:

| Button | Generates |
|--------|-----------|
| Daily (streak 1) | Daily card showing "Day 1" |
| Daily (streak 100) | Daily card showing "Day 100" |
| Daily (streak 365) | Daily card showing "Day 365" |
| Milestone (each) | One button per milestone → milestone card |
| Weekly (7/7) | Weekly recap with all 7 days checked |
| Weekly (3/7) | Weekly recap with 3 random days checked |
| Weekly (0/7) | Weekly recap with no days checked |
| Monthly (full) | Monthly card with every day checked |
| Monthly (sparse) | Monthly card with ~30% of days checked |

Each button generates the card image and opens the share sheet (or saves to
device for inspection).

#### 6b. Theme / Format Matrix

A toggle to cycle through all 4 themes (Ocean, Sunset, Forest, Royal) × 2
formats (Story, Feed) = 8 combinations per card type. Useful for visual QA.

**What this tests:**
- Card rendering at different streak values (1 vs 100 vs 365)
- Milestone card with each milestone's title and quote
- Weekly card with edge cases (0 days, all days, mix of checked/shielded)
- Monthly card with varying densities
- All gradient themes render correctly
- Story (1080×1920) vs Feed (1080×1080) layout adjustments
- Watermark positioning
- Both iOS (Core Graphics) and Android (Canvas) rendering paths

---

### Section 7: Date / Time Override

Several features depend on "today's date." A date override lets you test
time-dependent behavior without waiting.

#### 7a. Override "Today"

A date picker that overrides `getTodayISO()` globally. When set:

- `calculateCurrentStreak` uses the override date
- `checkedInToday` evaluates against the override date
- `QuoteService.getTodayQuote()` returns the quote for the override day
- Calendar "today" highlight moves to the override date
- `autoApplyShields()` calculates gaps from the override date

Implementation: Add an optional override to `date.utils.ts`:

```typescript
let _todayOverride: string | null = null;

export function setTodayOverride(date: string | null): void {
  _todayOverride = date;
}

export function getTodayISO(): string {
  if (_todayOverride) return _todayOverride;
  return formatDateISO(new Date());
}
```

#### 7b. Preset Jumps

Quick-jump buttons:

| Button | Sets "today" to |
|--------|----------------|
| Tomorrow | +1 day from real today |
| +7 days | 1 week from now |
| +30 days | 1 month from now |
| Dec 31 | Tests year boundary, year-in-review trigger |
| Jan 1 | Tests new year transition |
| Leap day | Feb 29 of nearest leap year |
| Reset | Clears override, back to real today |

**What this tests:**
- Streak calculation when "today" changes (does the streak break correctly?)
- Shield auto-apply with multi-day gaps
- Quote rotation across day boundaries
- Calendar "today" highlighting
- Review prompt cooldown calculations
- Year-in-review trigger timing (future feature)

---

### Section 8: Prayer Slot Testing

#### 8a. Quick Slot Scenarios

Pre-configured slot states to test the "any vs all" streak logic:

| Scenario | State |
|----------|-------|
| All complete | All configured slots checked for today |
| Partial (1 of 3) | Only first slot checked |
| None complete | No slots checked today |
| Mixed history | 7 days: alternating all-complete and partial |

#### 8b. Seed Slot History

Generates check-in history with slot assignments. Configurable:
- Days of history
- Slot completion rate per day (all / random subset / specific slot only)
- Streak requirement mode to set (any / all)

**What this tests:**
- `todayProgress` computed value ("2 of 3 prayers completed")
- `todaySlotsComplete` behavior under "any" vs "all" modes
- `allStreakDates` filtering when "all" mode is active
- Current/longest streak calculations with "all slots required"
- History list view showing slot completion status per day

---

### Section 9: Quote Override

#### 9a. Preview Any Quote

A numeric input for day-of-year (1–366). Displays the quote for that day
without changing the app's actual date.

#### 9b. Jump to Day

Sets the quote override to show a specific day's quote on the Today tab.
Separate from the date override (Section 7) — only affects the quote, not
streaks or calendar.

**What this tests:**
- Quote at day boundaries (day 1, day 365, day 366 for modulo wraparound)
- All 365+ quotes render correctly
- Copy and share functionality with different quote lengths

---

### Section 10: Notification Testing

#### 10a. Fire Test Notification

Sends an immediate local notification with the app's reminder format. Tests
notification permissions, content rendering, and tap-to-open behavior without
waiting for the scheduled time.

#### 10b. View Scheduled

Displays the next scheduled notification time and body text (if available from
the platform API).

**What this tests:**
- Notification permission flow
- Notification content and formatting
- Notification icon and badge behavior
- `rescheduleIfEnabled()` correctness

---

### Section 11: Raw Storage Viewer

A scrollable text view showing all keys and values currently in
`ApplicationSettings`. Read-only. Useful for debugging unexpected state.

Lists all known keys:
- `checkins` (truncated to show count and last 3 entries)
- `prayerTypes`
- `shieldCount`, `shieldedDates`, `shieldsEnabled`
- `unlockedMilestones`
- `lastReviewPrompt`, `reviewPromptCount`, `sessionDates`,
  `first7DayStreakPrompted`
- `reminderEnabled`, `reminderTime`
- `prayerSlots`, `slotsEnabled`, `slotStreakRequirement`

**What this tests:**
- Data persistence correctness
- Storage format (JSON vs string vs boolean)
- Storage after reset operations

---

## Implementation Architecture

### New Files

```
src/app/core/services/dev-tools.service.ts    — State manipulation logic
src/app/features/settings/dev-panel.component.ts   — UI component
src/app/features/settings/dev-panel.component.html — Template
```

### Modified Files

```
webpack.config.js          — Add DefinePlugin for __DEV__
src/app/core/utils/date.utils.ts  — Add getTodayISO override support
src/app/features/settings/settings.component.ts    — Import & show dev panel
src/app/features/settings/settings.component.html  — Add dev panel section
references.d.ts            — Declare __DEV__ global
```

### DevToolsService

Central service that coordinates all dev panel operations. Injected by the dev
panel component. Depends on `CheckInService`, `MilestoneService`,
`ReviewService`, `ReminderService`, `StorageService`, and `QuoteService`.

Key methods:

```typescript
// Data seeding
seedCheckIns(config: SeedConfig): void
clearAllCheckIns(): void

// Milestone overrides
unlockMilestone(id: string): void
lockMilestone(id: string): void
triggerCelebration(milestone: Milestone): void
unlockAll(): void
lockAll(): void

// Review prompt overrides
setReviewState(state: ReviewOverride): void
forceReviewPrompt(): void
testEvaluateReview(streak: number, milestoneUnlocked: boolean): void

// Shield overrides
setShieldCount(count: number): void
addShieldedDate(date: string): void
triggerAutoApplyShields(): void
createGap(daysAgo: number): void

// Date override
setTodayOverride(date: string | null): void

// Quote override
getQuoteForDay(dayOfYear: number): DailyQuote

// Notification testing
fireTestNotification(): void

// Storage inspection
getAllStorageState(): Record<string, any>

// Presets
applyPreset(preset: SeedPreset): void
```

### Conditional Inclusion

The dev panel component uses `@if (showDevPanel)` in the settings template.
The `showDevPanel` property reads the `__DEV__` global. In production builds,
`__DEV__` is replaced with `false` by webpack's `DefinePlugin`, so
`showDevPanel` is always `false` and the panel never renders.

Note: the dev panel component and `DevToolsService` code IS still included in
the production bundle (Angular's `@if` is a runtime construct, not
compile-time). The overhead is negligible for a native app. For true exclusion,
a dynamic `import()` behind the `__DEV__` guard would be needed.

---

## UI Design

The dev panel follows the existing Settings page style:

- Section header: "Developer Tools" with a wrench icon
- Rounded card containers with white/dark backgrounds
- Standard NativeScript controls (buttons, switches, text fields)
- Collapsible sub-sections to keep the panel manageable
- Orange/amber accent color to visually distinguish dev controls from real
  settings

Each section is collapsible (tap header to expand/collapse) so the panel
doesn't overwhelm the settings page.

---

## Implementation Order

| Step | What | Effort |
|------|------|--------|
| 1 | `webpack.config.js` + `__DEV__` global + `references.d.ts` | Small |
| 2 | Date override in `date.utils.ts` | Small |
| 3 | `DevToolsService` with data seeding + milestone + shield methods | Medium |
| 4 | Dev panel component with state inspector + seed presets | Medium |
| 5 | Milestone controls (unlock/lock/celebrate) | Small |
| 6 | Review prompt controls | Small |
| 7 | Shield controls (set count, create gap, trigger auto-apply) | Small |
| 8 | Share card preview generation | Medium |
| 9 | Date/time override UI | Small |
| 10 | Prayer slot scenario seeding | Small |
| 11 | Quote preview | Small |
| 12 | Notification testing | Small |
| 13 | Raw storage viewer | Small |
| 14 | Wire dev panel into Settings component | Small |

Steps 1–6 form the MVP — enough to test the most painful features (milestones,
review prompts, calendar views with data). Steps 7–13 round out the panel for
comprehensive coverage.
