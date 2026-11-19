# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

React Native (0.86) app for Hong Kong heat and air-quality alerts. It shows the Environmental Index (one overall level for heat and air quality), a live heat index / AQHI map, an animated "scene" (Skia canvas) reacting to current conditions, forecast cards, community bookmarks, and background threshold-based push notifications.

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

`src/config/praiseConfig.ts` reads `PRAISE_API_KEY`, `PRAISE_MYID`, `PRAISE_BASE_URL` via `react-native-config` from the `.env` file. `src/services/praiseApi.ts` talks to this API directly (used by `MapScreen` for tapped-point lookups). When PRAISE isn't configured there is no AQHI at all: cards and pins show "--", the forecast sheet shows its not-available state, the picker's AQHI option says "Not available right now", the Environmental Index map layer has no overlay (its demo borrows AQHI) and its pins are judged from heat alone, and the alert engine skips AQHI — don't assume the API key is always present.

### Environmental Index (code name ENVI: one overall level for heat and air quality)

Users only ever see "Environmental Index" (`ENVI_COPY.title`), never "ENVI". Heat index and AQHI each have five levels; the index is the **higher of the two**, 1 to 5 (Low, Moderate, High, Very High, Serious). With one reading missing it is the other hazard's level; with both missing it is `null` and the screen shows "--".
- `src/config/enviConfig.ts`: `ENVI_LEVELS` (name, colour, number colour, level-5 outline — the AQHI forecast chart's five flat bands, which reads its colours from this table; level 1's number is dark because white on that green fails 3:1), `ENVI_CONFIG` (`dualAdviceMinLevel`, `minNumberContrast`), `ENVI_TONES` (marker / "--" colours on the dark card vs the white sheet), `ENVI_BAND_CONFIG`. Index colours appear only where the overall level is shown (square, band); heat index and AQHI values keep their own NWS / EPD colours.
- `src/utils/enviUtils.ts`: `hazardLevelOf` (always `rankOf() + 1`, so the level tables stay only in `heatIndexUtils.ts` / `aqhiUtils.ts`), `getEnviLevel`, `dominantHazard` (the higher hazard; `null` on a tie or with no readings), `seasonalHazard` (the tie-break: AQHI December to May, heat June to November, from `DEFAULT_MAP_LAYER_CONFIG.aqhiSeasonMonths`) and `leadHazard` (dominant, else season) — one rule for the card's keywords and summary and the forecast sheet's opening tab (`pickForecastHazard` in `src/utils/forecastHazard.ts`, heat without PRAISE). Maps no longer use it: they always open on the index.
- The card's plain-language line, `src/utils/enviSummary.ts` (`enviSummaryFor`, words in `ENVI_SUMMARY_COPY`): how heat and air are right now in everyday words — "Air quality is good, but it's very hot." (the concern after "but"), "It's very hot and air quality is poor." (higher first; season on a tie). Heat's lowest phrase is "not too hot", never "comfortable" (a heat index under 27°C can be cold).
- Keywords on the card, sentences in the recommendations sheet. `src/utils/enviKeywords.ts` (`enviKeywordsFor(current, nowMs, advice)`, `advice: EnviAdviceFor` = the owner's About you answers + where they are now; `GENERAL_ADVICE_FOR` when left out): nothing without readings; level 1 → the calm tile only, for everyone; both hazards ≥ `dualAdviceMinLevel` → both health-risk warnings + the fixed `ENVI_DUAL_ACTIONS[context]` (never the two lists merged); otherwise `leadHazard`'s warning and `ENVI_HAZARD_ACTIONS[hazard][level][context]`; then the person rules (see Personalised advice). Returns the card's `actions` (≤ 3), the sheet's `sheetActions` (the tiles, refined where a tip says one more precisely, then the other tips — never one thing twice) and `medicineNote`. Warnings show only in the recommendations sheet ("Health risk"); the card shows the summary line instead. Tables in `src/config/enviKeywords.ts`, icons in `src/config/enviKeywordIcons.ts` (kept apart so pure code and tests don't load lucide; icons are shared only by keywords that ask the same thing, never in one set), words in `alertCopy.ts` (`ENVI_WARNING_COPY`, `ENVI_ACTION_COPY` label + sentence). Tests hold every hazard × level × context combination, label length, table coverage, every keyword used, an icon per keyword and the square's number contrast.
- `src/utils/enviPeak.ts` (`todaysPeakLevel`): the dashed "Today's peak" arrow, only when the rest of today's forecast (heat from the API, AQHI from PRAISE) goes above now. Arrow label placement (card edges, next-door levels): `src/utils/enviBandMarkers.ts`.
- Every situation the card can be in: `src/utils/enviSamples.ts` (`ENVI_SAMPLES`, sample readings for development only — never used by Home or the alert engine; each with the person and place it is for, covering every context, identity, medicine, "Go indoors soon" and the owner at Mum's home — a test holds that). `src/utils/__tests__/__snapshots__/enviSamples.test.ts.snap` is the readable catalogue of what the card and its recommendations sheet say per situation; the dev-only "Preview Environmental Index" button in App settings (`EnviPreviewScreen`) renders the real card for each, tappable as on Home. Add a sample when adding a new card state.
- `src/utils/homeAdvice.ts` (`homeAdviceFor`): a live alert's own `adviceFor()` sentence, which leads the recommendations sheet's actions; the card itself doesn't change during an alert.
- **The combining rule is never shown to the user.** The summary line says in words how heat and air are (a product decision), but nothing says the index is "the higher of the two": the band carries no heat index / AQHI markers, and `ENVI_COPY.explainer` says what the index is, not how it is calculated. Don't add UI that reveals the rule.
- Every chip, tile and sentence is health advice and needs a public-health review before release.

### Personalised advice

The same environment calls for different actions from different people in different places, so the Environmental Index card's advice adapts to three layers: **who you are** and **what your days are like** (the About you answers — `AlertPerson`, see Alerts; asked once at first launch, each question skippable) and **where you are now** (`LocationContext` in `src/types/envi.ts`: `indoors` / `outdoors` / `transit` / `unknown`). Rules for all of it:
- **The card always advises the phone's owner** — their About you answers and where they are now. A saved place only tells where they are: at Mum's home (a family place) the owner is indoors and gets their own advice, never Mum's, never the "remind them" voice. Family places' answers and voice belong to that place's push alerts only.
- **The Environmental Index number and colour are never personalised** — they describe the environment, and there is no validated physiological model to adjust them with. Only advice and alert levels differ per person.
- Never ask every day: the first two layers are asked once, the third is automatic; a wrong guess is corrected with one tap and lasts only for that stay.
- Advice must fit where the person is (never "use air-con" to someone in the street; tested), and when unsure, give the general advice (`unknown`) rather than a specific one that might be wrong.
- All health answers (conditions, pregnancy, medicine) and positions stay on the phone, like the rest of `PlaceAlertProfile`. The app never asks for a medicine's name, never judges one, and never suggests stopping or changing one.
- Every sentence needs a public-health review before release (asthma advice ideally by someone who knows respiratory disease).

Where you are now — `src/utils/locationContext.ts` (pure, tested; when the backend can one day tell indoors / outdoors sooner, only `judgeLocationContext` changes). Tunables in `LOCATION_CONTEXT_CONFIG` (`src/config/exposureTrackingConfig.ts`); speeds, GPS jitter and the place drift margin are the exposure backend's own values, so Home and the Exposure tab read positions the same way:
- `transit`: vehicle speed (net displacement over a 2-min window, less 30 m jitter, > 3 m/s) in the last 3 min — a bus at a stop is still on the move.
- `indoors`: the newest position inside a saved place's circle + the 30 m indoor drift margin (every saved place is an indoor kind).
- `outdoors`: the whole last 15 min accounted for — outside every saved place, no hole in the track (> 10 min, e.g. the MTR), no vehicle, and walking at some point. A phone sitting still outside saved places stays `unknown` (a café looks the same, and the backend calls a long still stay indoors).
- `unknown`: everything else — no fix, newest older than 15 min, too blurry (> 100 m), just left a place, tracking only just started. MTR stations and underground get no GPS and land here: correct, don't guess.
- `resolveLocationContext` order: the user's correction for this stay → tracking off: "Often outdoors" means `outdoors` (source `dailyActivity`), anyone else `unknown` → the judgement. A correction (`LocationContextOverride`, `locationContextStorage.ts`) lapses on moving `overrideRadiusMeters` away or at HK midnight.
- `useLocationContext` (Home only) reads the last ~25 min of tracked fixes via `getRecentFixes` every `refreshSeconds` (one fresh fix on mount), keeps the correction, and returns `{ context, source, trackingOn, position, setOverride, clearOverride }`. Components never read tracking data themselves.

Who you are — applied by `enviKeywordsFor` after the hazard × level × context set:
1. Someone more at risk (any identity but General adult, or regular medicine) who is `outdoors` at index ≥ 4 → first tile becomes "Go indoors soon" (`ENVI_ESCALATION`; never softens "Go indoors now", drops the weaker "Head indoors sooner").
2. `ENVI_PERSON_TIPS` (priority order; each at its own hazard levels; no Child tip — the owner is never a child): the top one goes on the card — in place of the general tile it refines ("Drink before thirsty" for "Drink water"), else in a free slot, else in place of the last tile; the rest go to the sheet.
3. Regular medicine: the sheet adds "Ask your doctor or pharmacist whether your medicine affects you in hot weather." from heat level 2.

On screen: the card's "For you: Pregnant +1 · Outdoors now ✎" line (`forYouLineFor` in `src/utils/enviForYou.ts`: the identity whose tip leads + how many more + where; "Often outdoors" for a guess from the daily answer; nothing for `unknown`; hidden at level 1 and without readings) opens `LocationContextSheet`: "Change your details" (About you's `AlertProfileSheet`), "Where are you now?" (Indoors / Outdoors / On the move, Exposure's icons, with where the current answer came from and "Back to automatic" while corrected), "Save this place as indoors" (the Add place flow at the current position). The recommendations sheet starts its actions with "Based on: …" (`basedOnFor`), lists `sheetActions`, the medicine line, and with tracking off one quiet line at the bottom suggesting it — never a pop-up. Push notifications don't use the location context yet (still per identity).

### Spatial Temperature API (heat data source — single source of truth)

`src/config/spatialTempConfig.ts` (base URL defaults to the public deployment; override with `SPATIAL_TEMP_API_BASE_URL`) + `src/services/spatialTempApi.ts`. Families: `temperature`, `humidity`, `heat-index`. Every heat value in the app — current temp/RH/heat index, bookmark and tapped-point heat index, the map layer and its forecast animation (server-rendered PNGs via `useHeatIndexTile` / `useHeatIndexForecastTiles`), the forecast chart, and the alert engine — comes from this API. Never compute heat index on-device, IDW-estimate heat, or fall back to another source; show "--" when it's unavailable. Key gotchas:
- Endpoints return HTTP 200 with `status: 1` on errors — check `status`, not `response.ok` alone.
- "Now" is the phone's HK clock rounded down to the hour (`currentDataHour()`: 12:15 → the 12:00 data); every later hour is forecast. The API is one continuous hourly timeline (past + about 8 days of forecast), so `/{family}/latest` is the **end of the forecast** — never use it as "now". A missing current hour fails the lookup and shows "--", never a neighbouring hour.
- `/area` paints any part of the box outside the data footprint as opaque white — always trim map boxes with `clipToDataFootprint` first (the heat tile hooks do).
- Heat levels follow the API's map PNG colours: NWS bands for Caution and above, and "No Caution" (`#009933`, sampled from the API's PNG) below 27°C — never "Safe". `HEAT_INDEX_ZONES` in `heatIndexUtils.ts` is the single table every legend, chart band and card reads.
- Product decision: the map and headline numbers are heat-index-only (no temperature/RH map layer). Temperature and humidity appear only as context — Home's side bar "Temp" / "Humidity" blocks (neutral stripe), the heat forecast sheet's "Humidity makes it feel N° hotter" line (`FeelsLikeGapLine`), the map pin's "Temp · Humidity" sub-line, and the forecast chart's dashed "Temperature" line. Always write "Temp"/"Temperature" and "Heat index" in full words — never "Air" or "RH" in UI copy. `HeatIndexExplainerSheet` opens only from that gap line (shown only when there is a gap) — no standing "what is heat index?" link, since AQHI has none. Tunables in `src/config/heatDisplayConfig.ts`.
- Heat and AQHI are **peer hazard layers and must stay consistent** everywhere: map layer, Home's side bar blocks, and forecast charts (both are thin wrappers over the shared `HourlyForecastChart`: day tabs + swipeable day pages + readout row + one-row `ChartBandLegend`; the sheet carries the title, so the chart has none). Any feature added to one layer must be added to the other.
- Forecast: the chart, the map's Play Forecast (`/area/timeseries` from now to now + `MAP_LAYER_CONFIG.forecastHours`) and the alert engine (heat heads-ups) all read the API's own forecast, `SPATIAL_TEMP_CONFIG.forecastHorizonHours` ahead. Near the end of a forecast run the API returns fewer hours (status 0 + a "Partial data" `msg`) — the chart / animation just end earlier. Home has no inline forecast chart yet; if one is added, add it for heat and AQHI together.
- **Maps have three layers** (`MapLayer = HazardKind | 'envi'`, no plain "Default" layer). `'envi'` (the Environmental Index) is the default and starting layer of every map (`DEFAULT_MAP_LAYER_CONFIG.startLayer`); heat index and AQHI are detail layers under the picker's "View details" (`MapLayerPicker`, order from `MAP_LAYER_ORDER`). On a detail layer `MapLayerReturnChip` ("Heat index · ← Environmental Index", ≥ 44 pt) sits under the top controls and goes back to the index. `MapScreen` is controlled (`layer` / `onLayerChange`; no `onLayerChange` = no picker); `useDefaultMapLayer(open)` is the layer state of a map that opens and closes (`FullscreenMapModal`, `BookmarkMapModal`) and resets to the index on close, so every opening starts on the index. Home's preview is fixed on `'envi'`: no picker, the one-row `EnviMapLegend` (`compact`) along its bottom; full-size maps use the vertical one.
- The index layer's picture comes from `ENVI_MAP_SOURCE`: `'aqhi-demo'` borrows the AQHI tile (and its IDW fallback while that loads; nothing without PRAISE) until a real index tile exists — then set it to `'tile'` and implement the fetch in `useEnviTile` / `useEnviForecastTiles` only (no component changes). `useEnviForecastTiles` returns no frames in the demo (`enviForecastSupported`), so the index layer has no Play button until then. Rules in `src/utils/enviMapLayer.ts` (tested). In the demo the overlay is AQHI's picture under the index legend — a known demo limitation.
- All three layers share one set of map behaviour (per-region tile hooks with the same `{ tile, loading }` / `{ frames, loading, error }` shape, the shared opacity slider, legend styling — `EnviMapLegend` swatches also take the layer opacity — and Play Forecast with the same frame count/speed from `MAP_LAYER_CONFIG`, shared `MapForecastFrame` type). Any feature added to one layer must be added to the others.
- Pins: on the index layer, saved places show their category icon, name and a small `EnviLevelSquare` (`pinEnviLevel` = `getEnviLevel` of the place's two values; "--" with neither), and the tapped point shows the square and level name. On a detail layer, places show only that hazard's value and the tapped point keeps both values and "Temp · Humidity". Marker keys include the layer and index level so Android re-measures the bitmap. The tapped point's details on the index layer are `MapPointCard` — **outside `MapView`**, at the bottom above the controls: Android draws a custom Marker as one bitmap, so a button inside a pin can't be tapped. Its "Details" opens the four readings as `HomeInfoBlock`s (`tone="sheet"`; blocks built by `readingBlocks()`, shared with Home's side bar). Android back closes it first: the hosting Modal's `onRequestClose` calls `MapScreenHandle.handleBack()`. Saved places on the map (`useMapPlacePins` → `DualStatPin`'s `category`) are a white badge with the place's category icon in the category's own colour (`PLACE_CATEGORY_CONFIG` / `EXPOSURE_IO_CONFIG`, sizes in `MAP_PLACE_PIN_CONFIG`), plus a small copy of the icon before the name — the same icon and colour as in Places and Exposure, never a grey pin; only the tapped point keeps the blue pin. The base map style (Default / Satellite, `MAP_TYPE_OPTIONS`) is offered only in App settings — one stored value via the shared `useMapSettings`; the map's picker is only about data layers. Every map word and button label is in `MAP_LAYER_COPY` (`alertCopy.ts`).

Google Maps requires `GOOGLE_ANDROID_MAP_KEY` in `.env` (wired into the native Android config).

### Hooks wrap providers for components

`src/hooks/use*.ts` (e.g. `useHeatData`'s `useHeatConditions`/`usePlacesHeatIndex`, `useAqhiData`, `useForecastData`, `useAqhiForecastData`) are thin `useEffect`/`useState` wrappers around the domain data providers, keyed on location. Components consume these hooks rather than the providers directly.

### IDW spatial interpolation

AQHI only (heat values come straight from the Spatial Temperature API). AQHI providers return discrete sample points (`{ latitude, longitude, value }`) for the map overlay. `src/utils/idw.ts` (`idwInterpolate`) does inverse-distance-weighted interpolation to estimate a value at an arbitrary coordinate (e.g. a tapped map point). `src/utils/renderIdwBitmap.ts` + `src/hooks/useIdwOverlayImage.ts` rasterize this into an image overlay for `react-native-maps`. Lists of places (Places cards, map place pins, alert checks) don't use IDW: they call `aqhiDataProvider.getAqhiAt` via `usePlacesAqhi`, the peer of heat's `getHeatIndexAt` / `usePlacesHeatIndex` (both wrap the shared `usePlaceValues`).

### Alerts (event-based, heat and AQHI as peers)

Alerts are per **event** (one hazard at one place, first sign to all clear), not per reading, so an episode produces a handful of messages. Levels come from **who is at each place**, not global level toggles:
- `PlaceAlertProfile` (`src/types/alerts.ts`) = the three `AlertPerson` answers (below) + `caringFor` (`self` / `family` → "call to remind them" wording), per-hazard on/off, optional Advanced level override, optional `needsReview`. Stored on `BookmarkEntry.alertProfile` (phone-only: never in the place-label upload, never bumps `updatedAt`) and as `NotificationSettings.currentLocationProfile` ("About you"). Always read through `resolveAlertProfile()` (it also converts the old shape, see below).
- `AlertPerson`: `identities` (multi-select `IdentityGroup[]`: `general` / `older` / `pregnant` / `asthma` / `heartLung` / `otherChronic`, plus `child` at places only — never empty, `general` only on its own; write it through `toggleIdentity` / `normalizeIdentities`), `takesRegularMedicine` (no medicine name is ever asked), `dailyActivity` (`indoors` / `outdoors`). Skipped questions = `DEFAULT_ALERT_PERSON` (general, no, indoors). The alert level is the **most careful** level any answer asks for (`personAlertLevelFor`: `IDENTITY_ALERT_LEVELS`, `MEDICINE_ALERT_LEVELS` — heat only, same as a long-term condition — and `DAILY_ACTIVITY_ALERT_LEVELS`), so ticking more can only make alerts earlier. Push advice stays coarse: `adviceGroupFor` picks an `AdviceGroup` (`general` / `sensitive` / `outdoor`) per hazard via `ADVICE_GROUP_PRECEDENCE`.
- Old installs stored a one-choice `audience`. `src/utils/profileMigration.ts` converts it on every read (no storage rewrite): general → general; sensitive → older; chronic → heartLung; outdoor → general + often outdoors — every row keeps exactly the old alert levels (tested). sensitive / chronic were guesses, so they set `needsReview`: About you re-opens `AboutYouOnboarding` once as "Please check your details", a place's card line says "Please check who is here"; saving the profile (`withoutReview`, done by `AlertProfileSheet`) clears it. Message-log items written before the change are converted on read (`migrateStoredDetailItem`).
- Level tables, urgent levels, event timing and delivery limits: `src/config/alertConfig.ts`. Every word of UI and notification copy: `src/config/alertCopy.ts`.
- "About you" (the three questions in `AlertPersonQuestions`, shared by onboarding, the About you sheet and place sheets) is asked once on first launch (`AboutYouOnboarding`, gated by `NotificationSettings.aboutYouConfirmed` or a `needsReview`); the Alerts tab then shows a summary row (identities, daily life, levels) that opens `AlertProfileSheet` (the same sheet saved places use). Advanced level chips select the level in effect — no separate "Default" chip; `withAlertLevel()` clears the override when the answers' own level is picked.
- Places ask "Who is this place for?" first. A place for yourself follows all three About you answers (`followsAboutYou`, looked up on every read) and only shows them with a "Change" link; only a family place opens the full questions (in the third person, with Child). Always read bookmark profiles through `resolvePlaceAlertProfile(stored, aboutYou)`, and change them via `withCaringFor` / `withPlacePerson`.
- Message bodies are facts + one action (`adviceFor`), voiced by `adviceProfileFor()` across every place in the message (family voice only if all places are family; per hazard, the more careful advice when places differ — outdoor-work advice never stands in for an office). The same `adviceFor` feeds the detail sheet and, while an alert is live, the first line of the Environmental Index detail sheet's advice (`homeAdviceFor`), so the three never word it differently. `ALERT_MESSAGE_CONFIG.pushBodyMaxChars` is enforced by tests. `src/utils/__tests__/__snapshots__/alertSamples.test.ts.snap` is the readable catalogue of every message's wording (built by `buildSampleGallery`, also sent on-device by the dev-only "Send Every Message Type" button in App settings).

Pipeline (`runAlertCheck` in `src/services/alertCheckService.ts`, a plain async function that reads settings/places from storage, so it can run outside React later):
1. `alertReadings.ts` fetches current value + hourly forecast per place (heat and AQHI alike); AQHI is skipped entirely when PRAISE isn't configured (there is no AQHI to read).
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

Not built yet: official HKO/Labour Department warnings, server push.

### Scene rendering (Skia)

`src/components/scene/*` renders Home's animated mood picture on a `@shopify/react-native-skia` `Canvas`, composed in `HeatScene.tsx`, back to front: `SceneBackdrop` (sky, sun / moon by phone hour, hills, two rows of towers, harbour, lawn), `AqhiHazeLayer` or `CleanAirSparkleLayer`, `HeatShimmerLayer`, then `DogCharacter` and `PersonCharacter`.
- **The scene is a mood picture, never an instrument**: no numbers, scales or gauges (there is no thermometer — the numbers are in the side bar and the card). Heat shows through the sun's glow, a warmer low sky, the lawn drying from green to scorched, shimmer over the ground, and the characters; air quality through distance fading into smog (hills first, then far towers, then near ones — a grey-brown veil, never the AQHI legend colours) and the characters.
- Every reaction is decided by one pure function, `sceneMoodFor` (`src/utils/sceneMood.ts`, tested), from the tables in `src/config/sceneConfig.ts` (`SCENE_HEAT_LEVELS` / `SCENE_AIR_LEVELS`, indexed by `hazardLevelOf` 1-5, so the scene classifies exactly like the cards). The face follows the worse hazard; without a reading there is no reaction to that hazard at all (flat mouth, calm dog, no haze or sparkles).
- **Dogs don't sweat**: in heat the dog pants (lower jaw working, the tongue resting on it and hanging over the lip, big huffs from Extreme Caution), drool grows from a drip to a puddle, the tail stops wagging, and from Danger up it lies flat. In dirty air it grows listless — no grin from Moderate up, no wagging and heavy eyelids from High, lying down breathing fast from Very High (no eye or nose symptoms: a product decision). Each part of the dog takes the worse of the two hazards (`mergeDog`). The person (everyday proportions: hair, ears, neck, T-shirt) sweats (drops run down the face), flushes and fans in heat, and coughs / wears a mask in dirty air.
- **Walk-in**: every time the scene mounts (Home opens, or you come back to the tab) the person and the dog stroll in from the left together (`SCENE_ENTRANCE`, timing maths in `src/utils/sceneEntrance.ts`, clock `useSceneEntrance`): an even pace, slowing to a stop. They already show their real reaction while walking — never a stand-in face that changes on arrival; only the dog's pose changes (trot → sit / lie). Skipped under Reduce Motion. Sun on the left by day, moon on the right at night.
- Characters are drawn around their ground point and every foot / paw rests on it — only the upper body moves with breathing, so nothing floats. Layout in `src/utils/sceneLayout.ts` (Home sizes its scene area from `bottomY`), colour mixing in `src/utils/sceneColors.ts`, every loop through `useSceneLoop` (holds still under Reduce Motion). `react-native-reanimated`/`react-native-worklets` drive the loops and the scroll-linked blur.
- The dev-only "Preview Cartoon Scene" button in App settings (`ScenePreviewScreen`) shows the real scene for any heat / AQHI level and day / night, from `SCENE_SAMPLE_READINGS` (`src/utils/sceneSamples.ts`, development only — a test checks each sample sits in its level), with a Play tour and a words readout of `sceneMoodFor`. Check a scene change there before release.

### Screens & navigation

There is no navigation library — `App.tsx` holds `activeTab` state and switches between four screens directly, with `FloatingNavBar` as the tab switcher. Tabs (key, label, icon, order) and the default tab come from `src/config/navConfig.ts`; each answers one part of "how dangerous are heat and air for me and the people I care about?" and is named for the user's question, not the system:
- `Environment` → `HomeScreen`, top to bottom: the scene with a side bar on its right edge (`HomeInfoBar`: a drawer — dragging sideways anywhere on the scene pulls it out from the edge under the finger and it snaps open or closed on release (`snapOpenFraction`, `flingVelocity`), its pull tab — ≥ 44 pt touch area — toggles it; four narrow `HomeInfoBlock`s in one column over the scene, which scrolls on its own when taller than the scene area — the character never moves; Heat index and AQHI with their own level-colour stripe open their forecast sheets, Temp and Humidity are neutral, read-only context with no tap; "--" when unavailable; open/closed remembered by `useHomeInfoBar`), the Environmental Index card (`EnviCard`: the index block — `EnviLevelSquare`, the screen's one focal point, with the leaf-icon "Environmental Index" title, level name and `EnviBand` with "Now" / "Today's peak" arrows — opens `EnviForecastSheet` (Heat index / AQHI tabs over the existing charts, opening on `pickForecastHazard`'s hazard); then the summary line, the "For you" line (opens `LocationContextSheet`, see Personalised advice), up to three action tiles fitted to the person and place, and a "Detailed recommendations" bar, hidden at level 1 and with no readings, that opens `EnviDetailSheet`: square + band, what it means, health risk, recommended actions ("Based on: …", led by any live alert advice), official guidance links, and the tracking hint while tracking is off), `HomeAlertBanner` (only while an alert is live), map preview fixed on the Environmental Index layer with saved-place pins (tap → `FullscreenMapModal`, which has its own layer state). Home holds one `useBookmarkList()` for the map pins (`useMapPlacePins(bookmarks)`), the location context and "Save this place as indoors" (`AddBookmarkModal`), so a place saved there counts at once. Sizes in `src/config/homeLayoutConfig.ts` (`HOME_LAYOUT_CONFIG`, `ENVI_CARD_CONFIG`, `HOME_INFO_BAR_CONFIG`).
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