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
- `mockAqhiProvider.ts` / `apiAqhiProvider.ts` (etc.) — two implementations of that interface (heat and forecast are api-only, see below)
- `index.ts` — picks which implementation is live and re-exports the types

Domains: `heat`, `forecast`, `aqhi`, `aqhiForecast`.

Two different switching strategies are in use:
- `heat` and `forecast` have **no mock provider at all** — only the Spatial Temperature API provider below. Don't add one back: the user wants it impossible for fake heat data to reach the screen.
- `aqhi` and `aqhiForecast` switch automatically based on `isPraiseConfigured()` (from `src/config/praiseConfig.ts`), which checks whether `PRAISE_API_KEY` is set.

When adding a feature that needs new backend data, follow this same pattern rather than fetching directly from a component/hook.

### PRAISE API (real environmental data source)

`src/config/praiseConfig.ts` reads `PRAISE_API_KEY`, `PRAISE_MYID`, `PRAISE_BASE_URL` via `react-native-config` from the `.env` file. `src/services/praiseApi.ts` talks to this API directly (used by `MapScreen` for tapped-point lookups). When PRAISE isn't configured, AQHI features transparently fall back to mock data — don't assume the API key is always present.

### Spatial Temperature API (heat data source — single source of truth)

`src/config/spatialTempConfig.ts` (base URL defaults to the public deployment; override with `SPATIAL_TEMP_API_BASE_URL`) + `src/services/spatialTempApi.ts`. Families: `temperature`, `humidity`, `heat-index`. Every heat value in the app — current temp/RH/heat index, bookmark and tapped-point heat index, the map layer and its forecast animation (server-rendered PNGs via `useHeatIndexTile` / `useHeatIndexForecastTiles`), the forecast chart, and the alert engine — comes from this API. Never compute heat index on-device, IDW-estimate heat, or fall back to another source; show "--" when it's unavailable. Key gotchas:
- Endpoints return HTTP 200 with `status: 1` on errors — check `status`, not `response.ok` alone.
- Anchor queries on `/{family}/latest`, not the phone's clock (data lands 1–2 h late).
- `/area` paints any part of the box outside the data footprint as opaque white — always trim map boxes with `clipToDataFootprint` first (the heat tile hooks do).
- Product decision: the map and headline numbers are heat-index-only (no temperature/RH map layer). Temperature and humidity appear only as context at a single place — the home card's "Humidity makes it feel N° hotter" line, the map pin's "Temp · Humidity" sub-line, and the forecast chart's dashed "Temperature" line. Always write "Temp"/"Temperature" and "Heat index" in full words — never "Air" or "RH" in UI copy. `HeatIndexExplainerSheet` opens only from the home card's gap line (shown only when there is a gap) — no standing "what is heat index?" link, since AQHI has none. Tunables in `src/config/heatDisplayConfig.ts`.
- Heat and AQHI are **peer hazard layers and must stay consistent** everywhere: map layer (per-region tile, shared opacity slider, matching vertical legend, Play Forecast with the same frame count/speed from `src/config/mapLayerConfig.ts`, shared `MapForecastFrame` type), home cards, and forecast charts (both are thin wrappers over the shared `HourlyForecastChart`: day tabs + swipeable day pages + readout row + one-row `ChartBandLegend`; the sheet carries the title, so the chart has none). Any feature added to one layer must be added to the other.
- The API has no forecast yet: while `forecastFromHistory` is true, future hours repeat the reading from 48 h earlier (demo), and the alert engine skips its forecast-based trend rules.

Google Maps requires `GOOGLE_ANDROID_MAP_KEY` in `.env` (wired into the native Android config).

### Hooks wrap providers for components

`src/hooks/use*.ts` (e.g. `useHeatData`'s `useHeatConditions`/`usePlacesHeatIndex`, `useAqhiData`, `useForecastData`, `useAqhiForecastData`) are thin `useEffect`/`useState` wrappers around the domain data providers, keyed on location. Components consume these hooks rather than the providers directly.

### IDW spatial interpolation

AQHI only (heat values come straight from the Spatial Temperature API). AQHI providers return discrete sample points (`{ latitude, longitude, value }`). `src/utils/idw.ts` (`idwInterpolate`) does inverse-distance-weighted interpolation to estimate a value at an arbitrary coordinate (e.g. the user's exact location, or a tapped map point). `src/utils/renderIdwBitmap.ts` + `src/hooks/useIdwOverlayImage.ts` rasterize this into an image overlay for `react-native-maps`.

### Alert engine

`HeatAlertEngine` (`src/components/HeatAlertEngine.tsx`) is mounted once at the root in `App.tsx` and runs headless (`return null`). On a 5-minute interval it:
1. Pulls current location, forecast, bookmarks, and notification settings, and fetches fresh heat index for the location and each bookmark from the heat provider on every tick.
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