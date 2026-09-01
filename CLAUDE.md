# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

React Native (0.86) app for Hong Kong heat and air-quality alerts. It shows a live heat index / AQHI map, an animated "scene" (Skia canvas) reacting to current conditions, forecast cards, community bookmarks, and background threshold-based push notifications.

## Commands

```sh
npm start              # start Metro bundler
npm run android        # build & run on Android
npm run ios            # build & run on iOS (run `bundle install` then `bundle exec pod install` first time / after native dep changes)
npm run lint           # eslint .
npm test               # jest
npx jest path/to/File.test.tsx   # run a single test file
```

No native rebuild is needed for JS/TS-only changes — Metro + Fast Refresh picks them up.

## Architecture

### Data providers: mock/api pairs behind a single switch file

Every data domain lives under `src/data/<domain>/` with the same shape:

- `types.ts` — the provider interface and domain types
- `mockHeatProvider.ts` / `apiHeatProvider.ts` (etc.) — two implementations of that interface
- `index.ts` — picks which implementation is live and re-exports the types

Domains: `heat`, `forecast`, `aqhi`, `aqhiForecast`.

Two different switching strategies are in use:
- `heat` and `forecast` currently hardcode the mock provider, with the api provider import commented out (flip the `export const ...DataProvider =` line to go live — see the comment in each `index.ts`).
- `aqhi` and `aqhiForecast` switch automatically based on `isPraiseConfigured()` (from `src/config/praiseConfig.ts`), which checks whether `PRAISE_API_KEY` is set.

When adding a feature that needs new backend data, follow this same pattern rather than fetching directly from a component/hook.

### PRAISE API (real environmental data source)

`src/config/praiseConfig.ts` reads `PRAISE_API_KEY`, `PRAISE_MYID`, `PRAISE_BASE_URL` via `react-native-config` from the `.env` file. `src/services/praiseApi.ts` talks to this API directly (used by `MapScreen` for tapped-point lookups). When PRAISE isn't configured, AQHI features transparently fall back to mock data — don't assume the API key is always present.

Google Maps requires `GOOGLE_ANDROID_MAP_KEY` in `.env` (wired into the native Android config).

### Hooks wrap providers for components

`src/hooks/use*.ts` (e.g. `useHeatData`, `useAqhiData`, `useForecastData`, `useAqhiForecastData`) are thin `useEffect`/`useState` wrappers around the domain data providers, keyed on location. Components consume these hooks rather than the providers directly.

### IDW spatial interpolation

Heat/AQHI providers return discrete sample points (`{ latitude, longitude, value }`). `src/utils/idw.ts` (`idwInterpolate`, `valueToColor`) does inverse-distance-weighted interpolation to estimate a value at an arbitrary coordinate (e.g. the user's exact location, or a tapped map point) and to render a color scale. `src/utils/renderIdwBitmap.ts` + `src/hooks/useIdwOverlayImage.ts` rasterize this into an image overlay for `react-native-maps`.

### Alert engine

`HeatAlertEngine` (`src/components/HeatAlertEngine.tsx`) is mounted once at the root in `App.tsx` and runs headless (`return null`). On a 5-minute interval it:
1. Pulls current location, heat points, forecast, bookmarks, and notification settings.
2. Runs threshold/trend rules from `src/utils/alertRules.ts` (`evaluateCurrentThreshold`, `evaluateUpcomingTrend`, `evaluateSustainedTrend`, `evaluateCommunityThresholds`).
3. Delivers any resulting `HeatAlert`s via `src/services/notificationService.ts`, which uses Notifee and de-dupes/cools down repeat alerts per-alert-id in AsyncStorage (3h cooldown, 48h history retention).

`src/services/heatAlertBus.ts` is a tiny module-level registry (not React context) that lets other screens (e.g. Settings' "run check now" / "send test notification" buttons) trigger the engine's check function without prop drilling.

### Scene rendering (Skia)

`src/components/scene/*` renders an animated illustration (sky, horizon, character, thermometer, haze/sparkle layers) on a `@shopify/react-native-skia` `Canvas`, composed in `HeatScene.tsx`. Layout math lives in `src/utils/sceneLayout.ts`; colors in `src/utils/sceneColors.ts`; heat index classification in `src/utils/heatIndexUtils.ts`. Layer choice (haze vs. sparkle) is driven by the current AQHI value. `react-native-reanimated`/`react-native-worklets` drive scroll-linked blur.

### Screens & navigation

There is no navigation library — `App.tsx` holds `activeTab` state (`'HeatIndex' | 'Community' | 'Settings'`) and switches between `HomeScreen`, `CommunityScreen`, `SettingsScreen` directly, with `FloatingNavBar` as the tab switcher. `MapScreen` is embedded inside other screens (e.g. via modals) rather than being a top-level tab.

### Types

Shared domain types live in `src/types/` (`alerts.ts`, `bookmark.ts`, `settings.ts`, `mapSettings.ts`) separately from the per-provider `types.ts` files under `src/data/`.

## Path conventions

No `@/` alias is configured — all imports use relative paths (`../../data/heat`, etc.).

## Developer Principles & Code Guidelines

1. **No Hardcoding & Highly Configurable**:
   * Avoid hardcoding magically magic numbers, timing intervals, or UI constants.
   * Store configurations in dedicated config/constants files or environment variables (`.env`) to ensure the codebase remains flexible for future features.

2. **Single Source of Truth (SSOT)**:
   * Maintain SSOT for all data models, states, and business logic. Do not duplicate domain types or state management logic across components.

3. **Code Quality & Documentation**:
   * Strictly follow React Native / TypeScript best practices.
   * Write clear, expressive inline comments explaining **why** a non-obvious piece of logic exists (not just *what* it does).

4. **Response Structure Requirement**:
   * For **every response** involving code changes, you MUST explicitly state:
     - **Where** to add/change (exact file paths and code details).
     - **Why** to add/change (the rationale and how it aligns with the project architecture).