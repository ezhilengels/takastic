# Taskastic Mobile App Documentation

This document explains how Taskastic mobile is built, how data flows through the app, and how to run, build, release, and troubleshoot it.

## 1. What This App Is

Taskastic is an Expo + React Native task manager with:
- Email/password auth via Supabase
- Google Sign-In via native Android Google auth + Supabase token exchange
- Offline-first task operations (local cache + queued sync)
- Task reminders via local notifications (`expo-notifications`)
- Android Play Store release support (AAB signing configured)

Primary app package:
- Android package: `com.taskastic.app`
- iOS bundle: `com.taskastic.app`

## 2. Tech Stack

- Expo SDK 54
- React Native 0.81
- React 19
- Supabase JS v2
- `@react-native-google-signin/google-signin`
- `@react-native-async-storage/async-storage`
- `expo-notifications`
- Cloudflare Worker proxy in front of Supabase API

## 3. Repository Layout

Top-level repo includes multiple older pieces (`client/`, `server/`) and the active mobile app:

- `mobile/` - active React Native app (main product)
- `cloudflare-worker.js` - Supabase proxy worker used by mobile
- `migrations/` - SQL schema history

Inside `mobile/`:

- `App.js` - root app UI + modal workflow + list rendering
- `src/context/AuthContext.js` - auth state + sign-in/sign-up/Google sign-in
- `src/context/ThemeContext.js` - light/dark theme + persistence
- `src/hooks/useTodos.js` - todo CRUD + offline queue + cache + replay + realtime sync
- `src/lib/supabase.js` - Supabase client configured to use proxy URL
- `src/components/` - UI and behavior components (form, item card, filter, date picker, notifications)
- `android/` - generated native Android project (for local release builds)

## 4. High-Level Architecture

### 4.1 Runtime flow

1. App boots in `index.js` and mounts `App.js`.
2. `ThemeProvider` and `AuthProvider` wrap the app.
3. `AuthProvider` resolves Supabase session.
4. If no session -> `AuthScreen`; if session -> `MainApp`.
5. `MainApp` uses `useTodos()` hook for task state + sync behavior.

### 4.2 Data path

App -> Cloudflare Worker Proxy -> Supabase REST/Auth endpoints -> Postgres table `todos`

Proxy purpose: avoids direct Supabase DNS/network issues in some regions and standardizes CORS behavior.

## 5. Authentication Design

## 5.1 Email/password

`AuthContext` calls:
- `supabase.auth.signInWithPassword()`
- `supabase.auth.signUp()`
- `supabase.auth.signOut()`

Session persistence uses AsyncStorage through Supabase client config.

## 5.2 Google Sign-In

1. Native sign-in via `GoogleSignin.signIn()`.
2. Obtain ID token.
3. Exchange token with `supabase.auth.signInWithIdToken({ provider: 'google', token })`.
4. Supabase returns user session.

Critical requirement: Google Cloud OAuth Android clients must match package + signing SHA certificates for each signing context.

## 6. Todo Domain Model

`todos` table fields used by app:

- `id` (uuid/text)
- `user_id`
- `text`
- `priority`: `high | medium | low`
- `status`: `not-started | active | completed`
- `completed` (boolean style)
- `due_date` (ISO string or null)
- `created_at`

Completion logic intentionally supports either field:
- A task is treated as done if `completed === true` OR `status === 'completed'`.

## 7. Offline-First Behavior

Implemented in `src/hooks/useTodos.js`.

### 7.1 Local persistence keys

- `@taskastic/todos_v1` - cached task list
- `@taskastic/queue_v1` - queued operations while offline

### 7.2 Optimistic writes

On add/update/delete/toggle/clear:
- UI updates immediately
- cache updates immediately
- network request attempted
- on network failure, operation is queued

### 7.3 Queue replay

Replay triggers:
- app startup
- app returns to foreground
- periodic retry every 30 seconds when queue non-empty

When replay succeeds, hook refetches from server for reconciliation.

## 8. Notifications

Local reminders are managed by `src/components/NotificationService.js`.

Behavior:
- Notification scheduled at due time (exact date trigger)
- Existing notification for a task is cancelled before reschedule
- Completed tasks cancel reminders
- Past due dates are not scheduled
- Android channel: `task-reminders`

## 9. UI and UX Structure

- Auth screen: Google + email/password entry
- Main screen:
  - Banner with stats and greeting
  - Search bar
  - Filter chips (`all`, `not-started`, `active`, `completed`)
  - Task list cards with priority/status badges
  - Add/Edit bottom sheet form
- Date/time picker modal for due date
- Settings modal with theme toggle + sign out

## 10. Configuration and Environments

`src/lib/supabase.js` contains:
- proxy URL (`SUPABASE_URL`)
- public anon key (`SUPABASE_ANON_KEY`)

`app.json` contains app metadata and bundle/package IDs.

`eas.json` contains EAS build profiles for development/preview/production.

## 11. Running Locally

Prerequisites:
- Node.js + npm
- Android Studio + Android SDK
- Java/JDK for Android builds

Install dependencies:

```bash
cd mobile
npm install
```

Start Expo dev server:

```bash
npm start
```

Run on Android device/emulator:

```bash
npm run android
```

Note: if Play/release build is installed on device, debug APK install may fail with signature mismatch (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`). Uninstall app first.

## 12. Android Local Release Build (AAB)

Taskastic is configured for local Gradle release signing.

Build AAB:

```bash
cd mobile/android
./gradlew clean bundleRelease
```

Output:
- `mobile/android/app/build/outputs/bundle/release/app-release.aab`

Current version source:
- `mobile/android/app/build.gradle` -> `versionCode`
- `mobile/app.json` -> `expo.android.versionCode`

Before every Play upload, increment version code.

## 13. Play Store Upload Checklist

1. Build AAB with release key.
2. Upload to Internal testing first.
3. Ensure only latest version code artifact is in draft release.
4. Complete app content declarations and store listing.

Common Play errors:
- Wrong signing key -> use correct upload keystore or reset upload key
- Version code already used -> increment version code
- Shadowed APK/AAB in draft -> remove older artifact from same release draft

## 14. Google Sign-In Setup Checklist (Android)

Google Cloud project must include:
- 1 Web OAuth client (used as `webClientId` in app)
- Android OAuth clients for `com.taskastic.app` with each SHA-1:
  - Debug keystore SHA-1 (local debug installs)
  - Upload key SHA-1 (local release signing uploads)
  - Play App Signing key SHA-1 (Play-delivered app installs)

If OAuth consent is in testing mode, add tester Gmail to test users.

### Typical `DEVELOPER_ERROR` causes

- Package mismatch
- Wrong/missing SHA-1 in Android OAuth client
- Missing Play signing SHA client when app installed from Play
- Wrong `webClientId` project pairing

## 15. Cloudflare Worker Proxy

File: `/cloudflare-worker.js`

Purpose:
- Forward all auth/rest calls to real Supabase project
- Add permissive CORS headers
- Keep mobile client pointed at proxy endpoint

Deploy target name in `wrangler.toml`:
- `taskastic-proxy`

## 16. Known Security Improvements (Recommended)

Current project has sensitive values in tracked files (for example, signing credentials in `android/gradle.properties`).

Recommended hardening:
- Move keystore passwords to local-only `~/.gradle/gradle.properties` or CI secrets
- Remove hardcoded secrets from repository history if public
- Keep only public Supabase anon key in client; never include service role keys

## 17. Main Troubleshooting Guide

### 17.1 Google login fails with `DEVELOPER_ERROR`

- Verify `com.taskastic.app`
- Verify Android OAuth SHA-1 entries (debug + upload + play signing)
- Verify same Google project is used for Web client and Android clients
- Uninstall/reinstall app after OAuth changes
- Wait 5-15 minutes for propagation

### 17.2 Gradle build fails with `OutOfMemoryError: Metaspace`

Project already includes tuned values in `android/gradle.properties`:
- increased `org.gradle.jvmargs`
- `org.gradle.parallel=false`
- `org.gradle.workers.max=2`

If needed, run with fresh daemon:

```bash
cd mobile/android
./gradlew --stop
./gradlew clean bundleRelease --no-daemon
```

### 17.3 Debug install fails with signature mismatch

Error: `INSTALL_FAILED_UPDATE_INCOMPATIBLE`

Fix:
- uninstall existing `com.taskastic.app` from device
- reinstall debug build

## 18. Maintenance Notes

When changing data/auth behavior, update these files first:
- this documentation (`mobile/README.md`)
- OAuth setup records (Google Cloud + Play App Integrity)
- release version code in both `app.json` and `android/app/build.gradle`

