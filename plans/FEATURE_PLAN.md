# Prayer Streaks — Feature Plan

## Current State

Prayer Streaks is a NativeScript + Angular offline-first app with three tabs
(Today, History, Settings). Users can check in once per day, optionally tag a
prayer type, and track current/longest streaks. There is a basic share feature
and custom prayer type management. All data is stored locally via
ApplicationSettings.

The app works — but it is a v1. The features below are prioritized by their
potential to increase **daily retention**, **organic virality**, and **overall
polish**, all while remaining fully offline with no backend.

---

## Priority 1 — High Impact, Moderate Effort

These features directly address the two biggest risks for a habit-tracking app:
users forgetting to open it, and users quietly churning after a broken streak.

### 1.1 Local Push Notification Reminders - [x]

**Why:** The single most effective retention lever. Users who set a daily
reminder are 3-4x more likely to maintain a streak. Without reminders, the app
is invisible once the home screen is swiped past.

**What to build:**

- Toggle in Settings: "Daily Reminder" on/off
- Time picker: let the user choose their reminder time (default 8:00 AM)
- Notification content: rotate between motivating messages
  - "Time to pray! Keep your 12-day streak going"
  - "Your streak is waiting — just one prayer today"
  - "Don't break the chain! Tap to check in"
- Smart suppression: skip the notification if the user already checked in today
- Permission request flow with a gentle explanation screen before the OS prompt

**Storage:** `reminderEnabled: boolean`, `reminderTime: string` (HH:mm) in
ApplicationSettings.

**Platform APIs:**
- iOS: `UNUserNotificationCenter` via `@nativescript/local-notifications`
- Android: `AlarmManager` / `NotificationCompat` via the same plugin

---

### 1.2 Streak Shield (Freeze / Grace Day) - [x]

**Why:** Broken streaks are the #1 reason habit apps lose users permanently. A
grace mechanism turns a frustration moment into a relief moment, keeping the
user engaged instead of churning.

**What to build:**

- Users earn 1 streak shield for every 7 consecutive days
- Max 3 shields banked at a time
- If a user misses a day and has a shield, it auto-applies overnight — streak
  stays intact, shield is consumed
- Shield indicator on the Today tab (e.g., "2 shields" with a small
  icon)
- History tab shows shielded days with a distinct icon (neither check nor miss)
- Settings toggle: "Use Streak Shields" (on by default)

**Storage:** `shieldCount: number`, `shieldedDates: string[]` in
ApplicationSettings.

**Model change:** Add `shielded?: boolean` to the `CheckIn` interface or track
separately.

---

### 1.3 Milestones & Achievements - [x]

**Why:** Variable rewards keep users engaged long after the novelty wears off.
Milestones give users something to work toward and something to share.

**What to build:**

- Milestone levels with unlockable badges:
  - 3 days — "First Steps"
  - 7 days — "One Week Strong"
  - 14 days — "Fortnight of Faith"
  - 30 days — "Monthly Devotion"
  - 60 days — "Steadfast"
  - 90 days — "Quarter of Prayer"
  - 180 days — "Half-Year Faithful"
  - 365 days — "Year of Prayer"
- Celebration screen when a milestone is hit (confetti animation, badge reveal)
- Badge gallery accessible from the Today tab or a new section in Settings
- Each milestone generates a shareable card (auto-prompts share on unlock)

**Storage:** `unlockedMilestones: string[]`, `lastMilestoneSeen: string` in
ApplicationSettings.

---

### 1.4 Home Screen Widgets - [ ]

**Why:** Widgets keep the app visible without requiring the user to open it.
They serve as both a reminder and a reward (seeing a high streak number). Widget
taps deep-link into the app for instant check-in.

**What to build:**

- **iOS WidgetKit** (SwiftUI):
  - Small widget: flame icon + streak count
  - Medium widget: streak count + last 7 days mini-calendar
  - Lock screen widget: streak count (circular gauge)
- **Android Glance** (Jetpack Compose):
  - Small widget: streak count with flame
  - Medium widget: streak + 7-day mini-calendar
- Data sharing: write streak data to App Group (iOS) / SharedPreferences
  (Android) so the widget can read it without launching the app

**Note:** Widgets require native code (Swift / Kotlin). These ship as native
extensions alongside the NativeScript app.

---

## Priority 2 — Viral Growth Features

These features turn every engaged user into a distribution channel.

### 2.1 Enhanced Share Cards - [x]

**Why:** The current share image is functional but generic. Beautiful,
personalized share cards get posted to Instagram Stories, iMessage, and Twitter —
each post is a free impression.

**What to build:**

- Multiple share card templates:
  - **Daily check-in card**: "Day 45 — I prayed today" with prayer type icon
  - **Milestone card**: badge artwork + streak number + motivational quote
  - **Weekly recap card**: 7-day grid showing prayer types for the week
  - **Monthly recap card**: calendar heat map for the month
- Card customization: 3-4 background gradient/color options
- Optimized dimensions: 1080x1920 for Stories, 1080x1080 for feed posts
- "Share to Stories" direct intent for Instagram (iOS/Android deep link)
- Subtle "prayerstreaks.com" watermark on every card

---

### 2.2 App Store Review Prompts - [ ]

**Why:** Ratings drive App Store ranking. Prompting at the right moment (peak
positive emotion) dramatically increases 5-star review rates.

**What to build:**

- Trigger `SKStoreReviewController.requestReview()` (iOS) /
  `ReviewManager` (Android) at high-emotion moments:
  - After hitting a 7-day streak for the first time
  - After unlocking any milestone badge
  - After the 3rd session in a week (engaged user signal)
- Rate-limit: max once per 90 days, max 3 per year (Apple guideline)
- Never prompt on a broken streak or first session

**Storage:** `lastReviewPrompt: string` (ISO date), `reviewPromptCount: number`.

---

### 2.3 Year-in-Review / Annual Recap - [ ]

**Why:** Spotify Wrapped proved that personalized annual recaps are the most
viral content format in consumer apps. Users share them because the content is
about *them*.

**What to build:**

- Triggered automatically when the app detects December or the user's
  one-year anniversary
- Multi-screen slideshow (swipeable):
  1. Total days prayed this year
  2. Longest streak achieved
  3. Most common prayer type
  4. Monthly prayer calendar heat map
  5. "Your prayer word of the year" (based on most-used type)
  6. Shareable summary card
- Each screen is exportable as an image for sharing
- Available on-demand from Settings after first generation

---

## Priority 3 — Depth & Engagement Features

These features increase session duration and emotional investment.

### 3.1 Prayer Journal / Notes - [ ]

**Why:** Turning a binary check-in into a reflective moment deepens the user's
relationship with the app and makes the history tab far more valuable.

**What to build:**

- Optional text field on the Today tab after checking in: "What's on your heart
  today?" (max 500 characters)
- Journal entries visible in the History tab (expandable rows)
- Search/filter journal entries by keyword
- Export journal as plain text file (share sheet)

**Model change:** Add `note?: string` to the `CheckIn` interface.

---

### 3.2 Calendar Heat Map View - [ ]

**Why:** GitHub's contribution graph is iconic because it makes consistency
*visible*. A prayer calendar heat map gives users a powerful visual of their
devotion over time.

**What to build:**

- Full calendar view (month grid) as an alternative to the list view in History
- Toggle between list view and calendar view
- Color intensity based on prayer type count or streak status:
  - Empty: no check-in
  - Light: checked in
  - Dark: checked in + journal note
  - Shield icon: grace day used
- Swipe between months
- Year-at-a-glance view (12 mini-months in a grid)

---

### 3.3 Multiple Daily Prayer Slots - [ ]

**Why:** Many users pray multiple times per day (morning, evening, before meals).
Supporting this makes the app useful for the most devout users and increases
daily sessions.

**What to build:**

- Configurable prayer slots in Settings: Morning, Midday, Evening, Night
  (or custom names)
- Each slot can be independently checked in
- Today tab shows progress: "2 of 3 prayers completed"
- Streak logic: streak counts a "day" as complete if *at least one* slot is
  checked (configurable: require all slots vs. any slot)
- History shows which slots were completed per day

**Model change:** Add `slot?: string` to `CheckIn`, allow multiple check-ins per
day with different slot values.

---

### 3.4 Daily Scripture / Inspirational Quote - [ ]

**Why:** Gives the user a reason to open the app even if they've already checked
in. Creates a "daily discovery" moment.

**What to build:**

- Curated set of 365+ quotes/verses bundled in the app (JSON file)
- One shown per day on the Today tab (below the check-in area)
- "Copy" and "Share" buttons on the quote card
- Quotes rotate based on day-of-year, so every user sees the same quote on the
  same day (enables shared experience)

**Storage:** Bundle `quotes.json` as an app asset. No network needed.

---

## Priority 4 — Polish & Platform Quality

These features elevate the app from "functional" to "delightful."

### 4.1 Onboarding Flow - [ ]

**Why:** First-time users who understand the value proposition and set up
reminders in onboarding retain at 2-3x the rate of users who skip it.

**What to build:**

- 3-4 screen welcome flow (only shown once):
  1. Welcome: "Build a daily prayer habit, one day at a time"
  2. How it works: check in, build streaks, earn milestones
  3. Set your reminder time (pre-fills notification permission)
  4. Choose your prayer types
- Skip button available but not prominent
- Deep link back to onboarding from Settings ("Replay Welcome")

---

### 4.2 Haptic Feedback & Animations - [ ]

**Why:** Micro-interactions make check-ins feel rewarding. The "click" of a
streak incrementing should feel satisfying.

**What to build:**

- Haptic feedback on check-in button press (success pattern)
- Animated streak counter (number rolls up)
- Flame icon animation when streak increases
- Confetti burst on milestone unlock
- Smooth transitions between checked-in and not-checked-in states
- Subtle pulse animation on the check-in button to draw attention

**Platform APIs:** `UIImpactFeedbackGenerator` (iOS), `Vibrator` (Android).

---

### 4.3 Alternative App Icons - [ ]

**Why:** Customizable app icons are a low-effort delight feature. Users who
personalize their icon feel more ownership over the app.

**What to build:**

- 4-6 icon variants in Settings:
  - Default (current)
  - Dark mode variant
  - Minimal / monochrome
  - Gold / premium feel
  - Seasonal (Christmas, Lent, Easter)
- iOS: `UIApplication.shared.setAlternateIconName()`
- Android: Activity aliases in AndroidManifest

---

### 4.4 Customizable Themes - [ ]

**Why:** Personalization increases attachment. Even 3-4 theme options make users
feel the app is "theirs."

**What to build:**

- Theme picker in Settings with 4 options:
  - System (current default — follows light/dark)
  - Always Light
  - Always Dark
  - Warm (sepia-toned, softer on the eyes for evening prayer)
- Accent color picker: 5-6 preset colors for the streak flame, buttons, and
  highlights

**Storage:** `theme: string`, `accentColor: string` in ApplicationSettings.

---

### 4.5 Apple Watch App - [ ]

**Why:** Wrist-based check-in removes all friction. Users can check in without
pulling out their phone, which is especially valuable during/after prayer.

**What to build:**

- watchOS companion app (SwiftUI):
  - Single screen: streak count + "I Prayed" button
  - Complication: streak count on watch face
- Data sync via WatchConnectivity (no network — phone-to-watch only)
- Haptic confirmation on check-in

---

## Implementation Roadmap

| Phase | Features | Estimated Effort | Impact |
|-------|----------|-----------------|--------|
| **Phase 1** | 1.1 Reminders, 4.1 Onboarding, 4.2 Haptics | 1-2 weeks | Retention baseline |
| **Phase 2** | 1.2 Streak Shield, 1.3 Milestones, 2.2 Review Prompts | 1-2 weeks | Retention + ratings |
| **Phase 3** | 2.1 Share Cards, 3.2 Calendar Heat Map | 1-2 weeks | Virality + depth |
| **Phase 4** | 3.1 Prayer Journal, 3.4 Daily Quote | 1 week | Session depth |
| **Phase 5** | 1.4 Widgets, 4.3 Alt Icons | 1-2 weeks | Visibility + delight |
| **Phase 6** | 3.3 Prayer Slots, 4.4 Themes | 1 week | Power users |
| **Phase 7** | 2.3 Year-in-Review, 4.5 Apple Watch | 2-3 weeks | Viral moments + platform |

---

## Key Principles

1. **Never punish the user.** Streak shields, gentle copy, and no guilt-tripping
   on missed days. The app should feel like a supportive companion, not a
   disappointed parent.

2. **Make sharing feel natural, not forced.** Share prompts should appear at
   moments of pride (milestones, weekly recaps), never after a miss.

3. **Keep it fast.** Every screen should load instantly. No spinners, no network
   waits. Offline-first is a feature, not a limitation.

4. **Respect the context.** This is a prayer app. Animations should be warm, not
   flashy. Colors should be calming. The tone should be reverent but
   encouraging.

5. **Earn the right to ask.** Review prompts and share prompts come after the
   user has experienced value, never before.
