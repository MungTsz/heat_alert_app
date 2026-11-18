# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

React Native (0.86) app for Hong Kong heat and air-quality alerts. It shows ENVI (one overall level for heat and air quality), a live heat index / AQHI map, an animated "scene" (Skia canvas) reacting to current conditions, forecast cards, community bookmarks, and background threshold-based push notifications.

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

### Data providers: API only, behind one index file per domain

Every data domain lives under `src/data/<domain>/` with the same shape:

- `types.ts` — the provider interface and domain types
- `apiAqhiProvider.ts` (etc.) — the one implementation of that interface
- `index.ts` — exports the provider and re-exports the types

Domains: `heat`, `forecast`, `aqhi`, `aqhiForecast`, `exposure`, `placeLabels`.

**No domain has a mock provider.** Don't add one back: the user wants it impossible for fake data to reach the screen or a notification. When a value can't be fetched the UI shows "--" (or the screen's empty / "not available right now" state) — never a placeholder number.
- `heat` and `forecast` use the Spatial Temperature API below.
- `aqhi` and `aqhiForecast` use PRAISE. Without `PRAISE_API_KEY` (`isPraiseConfigured()` in `src/config/praiseConfig.ts`) `praiseApi` refuses every call before it is sent.
- `exposure` and `placeLabels` use the exposure ETL backend. Without `EXPOSURE_API_BASE_URL` (`isExposureApiConfigured()`) `exposureApi` refuses every call, and `placeLabelSyncService` skips syncing (labels upload once a backend is set).

When adding a feature that needs new backend data, follow this same pattern rather than fetching directly from a component/hook.

### PRAISE API (real environmental data source)

`src/config/praiseConfig.ts` reads `PRAISE_API_KEY`, `PRAISE_MYID`, `PRAISE_BASE_URL` via `react-native-config` from the `.env` file. `src/services/praiseApi.ts` talks to this API directly (used by `MapScreen` for tapped-point lookups). When PRAISE isn't configured there is no AQHI at all: cards and pins show "--", the forecast sheet shows its not-available state, the map never opens on the AQHI layer and the alert engine skips AQHI — don't assume the API key is always present.

### ENVI (one overall level for heat and air quality)

Heat index and AQHI each have five levels; ENVI is the **higher of the two**, 1 to 5 (Low, Moderate, High, Very High, Serious). With one reading missing it is the other hazard's level; with both missing it is `null` and the screen shows "--".
- `src/config/enviConfig.ts`: `ENVI_LEVELS` (name, colour, text colour per level — the AQHI forecast chart's five flat bands, which reads its colours from this table), `ENVI_CONFIG` (advice thresholds), `ENVI_BAND_CONFIG` (the band's sizes).
- `src/utils/enviUtils.ts`: `hazardLevelOf` (always `rankOf() + 1`, so the level tables stay only in `heatIndexUtils.ts` / `aqhiUtils.ts`), `getEnviLevel`, `dominantHazard` (the higher hazard; `null` on a tie or with no readings) and `seasonalHazard` (the tie-break: AQHI December to May, heat June to November, from `DEFAULT_MAP_LAYER_CONFIG.aqhiSeasonMonths`).
- `src/utils/enviAdvice.ts`: `enviAdviceFor` — nothing at level 1; `DUAL_ADVICE` when both hazards reach `dualAdviceMinLevel`; otherwise the higher hazard's sentence from `HEAT_LEVEL_SUGGESTION` / `AQHI_LEVEL_SUGGESTION` (`alertCopy.ts`; on a tie, the season's hazard). `src/utils/homeAdvice.ts` (`homeAdviceFor`) puts a live alert's own `adviceFor()` ahead of it.
- **How ENVI is worked out is never shown to the user.** The band carries no heat index / AQHI markers, neither small card is marked as the one that set the level, and `ENVI_COPY.explainer` says what ENVI is, not how it is calculated. Don't add UI that reveals it.
- The level suggestions are health advice and need a public-health review before release.

### Spatial Temperature API (heat data source — single source of truth)

`src/config/spatialTempConfig.ts` (base URL defaults to the public deployment; override with `SPATIAL_TEMP_API_BASE_URL`) + `src/services/spatialTempApi.ts`. Families: `temperature`, `humidity`, `heat-index`. Every heat value in the app — current temp/RH/heat index, bookmark and tapped-point heat index, the map layer and its forecast animation (server-rendered PNGs via `useHeatIndexTile` / `useHeatIndexForecastTiles`), the forecast chart, and the alert engine — comes from this API. Never compute heat index on-device, IDW-estimate heat, or fall back to another source; show "--" when it's unavailable. Key gotchas:
- Endpoints return HTTP 200 with `status: 1` on errors — check `status`, not `response.ok` alone.
- Anchor queries on `/{family}/latest`, not the phone's clock (data lands 1–2 h late).
- `/area` paints any part of the box outside the data footprint as opaque white — always trim map boxes with `clipToDataFootprint` first (the heat tile hooks do).
- Heat levels follow the API's map PNG colours: NWS bands for Caution and above, and "No Caution" (`#009933`, sampled from the API's PNG) below 27°C — never "Safe". `HEAT_INDEX_ZONES` in `heatIndexUtils.ts` is the single table every legend, chart band and card reads.
- Product decision: the map and headline numbers are heat-index-only (no temperature/RH map layer). Temperature and humidity appear only as context at a single place — the home card's "Humidity makes it feel N° hotter" line, the map pin's "Temp · Humidity" sub-line, and the forecast chart's dashed "Temperature" line. Always write "Temp"/"Temperature" and "Heat index" in full words — never "Air" or "RH" in UI copy. `HeatIndexExplainerSheet` opens only from the home card's gap line (shown only when there is a gap) — no standing "what is heat index?" link, since AQHI has none. Advice is not on that card: Home gives it in one place, the ENVI card. Tunables in `src/config/heatDisplayConfig.ts`.
- Heat and AQHI are **peer hazard layers and must stay consistent** everywhere: map layer (per-region tile, shared opacity slider, matching vertical legend, Play Forecast with the same frame count/speed from `src/config/mapLayerConfig.ts`, shared `MapForecastFrame` type), home cards, and forecast charts (both are thin wrappers over the shared `HourlyForecastChart`: day tabs + swipeable day pages + readout row + one-row `ChartBandLegend`; the sheet carries the title, so the chart has none). Any feature added to one layer must be added to the other.
- The API has no forecast yet: while `forecastFromHistory` is true, future hours repeat the reading from 48 h earlier (demo), and the alert engine ignores the heat forecast (heat events start at "active", no heat heads-ups). For the same reason Home has no inline forecast chart — add one (for heat and AQHI together) only once the API has a real forecast.
- Maps always show a hazard layer (`MapLayer = HazardKind`, no plain "Default" layer). `MapScreen` is controlled (`layer` / `onLayerChange`); the screen owning the map picks the starting layer with `useDefaultMapLayer` from the readings it already has (rules in `DEFAULT_MAP_LAYER_CONFIG`: the hazard with the higher level — `dominantHazard`, the one setting ENVI — else, on a tie or with no readings, the HK season; heat whenever PRAISE isn't configured). Alert profiles play no part. Home lifts the layer so its preview and `FullscreenMapModal` share it; the preview keeps its layer picker usable (`onPreviewPress` puts the tap-to-expand area under the map's own controls). Saved places on the map (`useMapPlacePins` → `DualStatPin`'s `category`) are a white badge with the place's category icon in the category's own colour (`PLACE_CATEGORY_CONFIG` / `EXPOSURE_IO_CONFIG`, sizes in `MAP_PLACE_PIN_CONFIG`), plus a small copy of the icon before the name — the same icon and colour as in Places and Exposure, never a grey pin; only the tapped point keeps the blue pin. The base map style (Default / Satellite, `MAP_TYPE_OPTIONS`) is offered both in `MapLayerPicker` and in App settings — one stored value via the shared `useMapSettings`.

Google Maps requires `GOOGLE_ANDROID_MAP_KEY` in `.env` (wired into the native Android config).

### Hooks wrap providers for components

`src/hooks/use*.ts` (e.g. `useHeatData`'s `useHeatConditions`/`usePlacesHeatIndex`, `useAqhiData`, `useForecastData`, `useAqhiForecastData`) are thin `useEffect`/`useState` wrappers around the domain data providers, keyed on location. Components consume these hooks rather than the providers directly.

### IDW spatial interpolation

AQHI only (heat values come straight from the Spatial Temperature API). AQHI providers return discrete sample points (`{ latitude, longitude, value }`) for the map overlay. `src/utils/idw.ts` (`idwInterpolate`) does inverse-distance-weighted interpolation to estimate a value at an arbitrary coordinate (e.g. a tapped map point). `src/utils/renderIdwBitmap.ts` + `src/hooks/useIdwOverlayImage.ts` rasterize this into an image overlay for `react-native-maps`. Lists of places (Places cards, map place pins, alert checks) don't use IDW: they call `aqhiDataProvider.getAqhiAt` via `usePlacesAqhi`, the peer of heat's `getHeatIndexAt` / `usePlacesHeatIndex` (both wrap the shared `usePlaceValues`).

### Alerts (event-based, heat and AQHI as peers)

Alerts are per **event** (one hazard at one place, first sign to all clear), not per reading, so an episode produces a handful of messages. Levels come from **who is at each place**, not global level toggles:
- `PlaceAlertProfile` (`src/types/alerts.ts`): audience (`general` / `sensitive` / `chronic` / `outdoor`), `caringFor` (`self` / `family` → "call to remind them" wording), per-hazard on/off, optional Advanced level override. Stored on `BookmarkEntry.alertProfile` (phone-only: never in the place-label upload, never bumps `updatedAt`) and as `NotificationSettings.currentLocationProfile` ("About you"). Always read through `resolveAlertProfile()`.
- Audience → level table, urgent levels, event timing and delivery limits: `src/config/alertConfig.ts`. Every word of UI and notification copy: `src/config/alertCopy.ts`.
- "About you" is asked once on first launch (`AboutYouOnboarding`, gated by `NotificationSettings.aboutYouConfirmed`); the Alerts tab then shows a one-line summary row that opens `AlertProfileSheet` (the same sheet saved places use). Advanced level chips select the level in effect — no separate "Default" chip; `withAlertLevel()` clears the override when the audience's own level is picked.
- Places ask "Who is this place for?" first. A place for yourself follows the About you audience (`followsAboutYou`, looked up on every read) and only shows that answer with a "Change" link; only a family place opens the full audience list. Always read bookmark profiles through `resolvePlaceAlertProfile(stored, aboutYou)`, and change them via `withCaringFor` / `withPlaceAudience`.
- Message bodies are facts + one action (`adviceFor`), voiced by `adviceProfileFor()` across every place in the message (family voice only if all places are family; the more careful advice when audiences differ). The same `adviceFor` feeds the detail sheet and, while an alert is live, the ENVI card's advice sentence (`homeAdviceFor`), so the three never word it differently. `ALERT_MESSAGE_CONFIG.pushBodyMaxChars` and `HOME_LAYOUT_CONFIG.adviceMaxChars` are enforced by tests. `src/utils/__tests__/__snapshots__/alertSamples.test.ts.snap` is the readable catalogue of every message's wording (built by `buildSampleGallery`, also sent on-device by the dev-only "Send Every Message Type" button in App settings).

Pipeline (`runAlertCheck` in `src/services/alertCheckService.ts`, a plain async function that reads settings/places from storage, so it can run outside React later):
1. `alertReadings.ts` fetches current value + hourly forecast per place. Heat forecast is skipped while `forecastFromHistory`; AQHI is skipped entirely when PRAISE isn't configured (there is no AQHI to read).
2. `utils/alertSignals.ts` reduces each place × hazard to ranks and the first forecast window at/above the place's level.
3. `utils/alertEvents.ts` is the state machine (`forecast` → `active` → `easing` → `cleared`, or `cancelled`) deciding what the user is owed (`preview` / `breaking` / `escalation` / `cancelled` / `cleared`). Events persist in AsyncStorage (`alertStateStorage.ts`).
4. `utils/alertDelivery.ts` applies quiet hours, the 10-min batching wait, per-event cooldown, and the daily cap (urgent levels bypass all of them).
5. `utils/alertMessages.ts` merges due notices into one message per group (multi-place, and heat + AQHI → "double risk" with the combined advice).
6. `notificationService.ts` displays via Notifee (normal + urgent Android channels).

All steps 2–5 are pure and unit-tested.

Scheduled digests (`utils/alertDigest.ts`, times in `DIGEST_CONFIG`): heads-ups and cancellations wait for the next evening heads-up (19:30) or morning reminder (07:30) unless the event starts before it; with Breaking updates off, live alerts wait too (urgent never waits). The morning digest adds a "today" reminder for told events ("day N" for multi-day episodes), or an optional no-alerts summary. Each slot is logged per HK day so it sends once.

Running it:
- `AlertEngine` (`src/components/AlertEngine.tsx`, mounted in `App.tsx`) is the 5-minute foreground timer; it also records the last GPS fix for background runs and starts background checks.
- `src/services/backgroundAlertService.ts` uses `react-native-background-fetch`: a periodic check plus a one-shot task timed for the next digest (rescheduled after every check and when digest settings change). Headless handlers (background fetch, Notifee background taps) are registered in `index.js`. iOS needs the `BGTaskSchedulerPermittedIdentifiers` / `UIBackgroundModes` entries in `Info.plist`; iOS timing is best effort.
- Every delivered message is stored as an `AlertMessageRecord` (snapshot per place × hazard) in `alertStateStorage.ts`. Tapping a notification (any app state, via `useAlertDetailOpen`), a card badge (`AlertBadge`, fed by `useActiveAlerts`), Home's `HomeAlertBanner`, or a row in the Alerts tab's "Active now" / "Recent alerts" sheets (`AlertListSheet`; recent from `useAlertMessageLog`) opens `AlertDetailSheet` at the root — there is only ever that one sheet. The Alerts tab itself shows only one summary row per list, so an unbounded list never pushes the settings down.
- `src/services/alertCheckBus.ts` carries the dev "run check now" trigger, "check finished" (badges, the Alerts lists and the nav dot refresh) and "open alert detail".

Not built yet: official HKO/Labour Department warnings, heat heads-ups (needs a real API forecast), server push.

### Scene rendering (Skia)

`src/components/scene/*` renders an animated illustration (sky, horizon, character, thermometer, haze/sparkle layers) on a `@shopify/react-native-skia` `Canvas`, composed in `HeatScene.tsx`. Layout math lives in `src/utils/sceneLayout.ts`; colors in `src/utils/sceneColors.ts`; heat index classification in `src/utils/heatIndexUtils.ts`. Layer choice (haze vs. sparkle) is driven by the current AQHI value. `react-native-reanimated`/`react-native-worklets` drive scroll-linked blur.

### Screens & navigation

There is no navigation library — `App.tsx` holds `activeTab` state and switches between four screens directly, with `FloatingNavBar` as the tab switcher. Tabs (key, label, icon, order) and the default tab come from `src/config/navConfig.ts`; each answers one part of "how dangerous are heat and air for me and the people I care about?" and is named for the user's question, not the system:
- `Environment` → `HomeScreen`: alert banner (only while an alert is active), scene, the ENVI card (`EnviCard`: level number and name, the five-level `EnviBand` with one pointer, one sentence of advice; a tap opens `EnviDetailSheet` with each hazard's level, Warning and Suggestion), compact Heat index + AQHI cards under it, Temp · Humidity with the gap footer, map preview with saved-place pins. Advice appears only on the ENVI card (none at level 1). Sizes in `src/config/homeLayoutConfig.ts`.
- `Places` → `PlacesScreen`: saved places, their values, badges and alert profiles (the alert watch list).
- `Exposure` → `ExposureScreen`: "My day" (with today's top saved places by exposure, from the report itself — `usePlaceStays`) and imported tracks.
- `Alerts` → `AlertsScreen`: "Active now" and "Recent alerts" summary rows (each opens a sheet), About you, notification settings. App-wide settings (map style, location, exposure tracking, dev tools) are `AppSettingsScreen`, opened only from the Alerts header's gear.

Cross-tab links go through `src/services/navigationBus.ts` (`openTab`, `openPlace` → Places opens that place). `App.tsx` handles Android's back button with `BackHandler` (other tab → default tab → exit); every sheet must be a `Modal` with `onRequestClose` so back closes it first. `MapScreen` is embedded inside other screens (e.g. via modals) rather than being a top-level tab.

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