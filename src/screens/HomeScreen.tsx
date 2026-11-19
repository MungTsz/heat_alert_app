// src/screens/HomeScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { MapPin } from 'lucide-react-native';
import TextTicker from 'react-native-text-ticker';
import EnviCard from '../components/EnviCard';
import EnviDetailSheet from '../components/EnviDetailSheet';
import EnviForecastSheet from '../components/EnviForecastSheet';
import HomeInfoBar from '../components/HomeInfoBar';
import { readingBlocks } from '../components/readingBlocks';
import HeatHourlyForecastChart from '../components/HeatHourlyForecastChart';
import AqhiHourlyForecastChart from '../components/AqhiHourlyForecastChart';
import ForecastSheet from '../components/ForecastSheet';
import FeelsLikeGapLine from '../components/FeelsLikeGapLine';
import HeatIndexExplainerSheet from '../components/HeatIndexExplainerSheet';
import FullscreenMapModal from '../components/FullscreenMapModal';
import MapScreen from './MapScreen';
import EnviPreviewScreen from './EnviPreviewScreen';
import { useLocation } from '../utils/useLocation';
import { estimateAqhiAt } from '../utils/aqhiUtils';
import { FALLBACK_CENTER, resolveDataCenter } from '../config/locationConfig';
import HeatScene from '../components/scene/HeatScene';
import { computeSceneLayout } from '../utils/sceneLayout';
import { useForecastData } from '../hooks/useForecastData';
import { useAqhiForecastData } from '../hooks/useAqhiForecastData';
import { useAqhiData } from '../hooks/useAqhiData';
import { useHeatConditions } from '../hooks/useHeatData';
import { useActiveAlerts } from '../hooks/useActiveAlerts';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useMapPlacePins } from '../hooks/useMapPlacePins';
import { useBookmarkList } from '../hooks/useBookmarkList';
import { useLocationContext } from '../hooks/useLocationContext';
import { useHomeInfoBar } from '../hooks/useHomeInfoBar';
import HomeAlertBanner from '../components/alerts/HomeAlertBanner';
import AlertProfileSheet from '../components/alerts/AlertProfileSheet';
import LocationContextSheet from '../components/LocationContextSheet';
import AddBookmarkModal from '../components/AddBookmarkModal';
import { ABOUT_YOU_COPY, PERSON_SUMMARY_COPY } from '../config/alertCopy';
import { CURRENT_LOCATION_PLACE_ID } from '../config/alertConfig';
import { HOME_LAYOUT_CONFIG } from '../config/homeLayoutConfig';
import { DEFAULT_MAP_LAYER_CONFIG } from '../config/mapLayerConfig';
import { isPraiseConfigured } from '../config/praiseConfig';
import { pickForecastHazard } from '../utils/forecastHazard';
import { homeAdviceFor } from '../utils/homeAdvice';
import { personOf, summarizeDailyLife, summarizeIdentities } from '../utils/alertProfile';
import { EnviAdviceFor } from '../utils/enviKeywords';
import { HazardReadings, getEnviLevel } from '../utils/enviUtils';
import { todaysPeakLevel } from '../utils/enviPeak';
import { openPlace } from '../services/navigationBus';

// Home, top to bottom: the cartoon scene with the side bar of raw readings
// on its right edge, the Environmental Index card, the alert banner (only
// while an alert is live), and the map preview.
const HomeScreen = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { locationText, loading, coords } = useLocation();

  // null while still locating, so nothing is fetched (and shown) for the
  // fallback spot before the user's own position arrives.
  const dataCenter = resolveDataCenter({ coords, loading });

  const { days: heatForecastDays, loading: heatForecastLoading } =
    useForecastData(dataCenter);
  const { days: aqhiForecastDays, loading: aqhiForecastLoading } =
    useAqhiForecastData(dataCenter);
  const { points: aqhiPoints } = useAqhiData(dataCenter);
  // Alerts the user has been told about for their own location.
  const locationAlerts = useActiveAlerts()[CURRENT_LOCATION_PLACE_ID] ?? [];

  // null until AQHI samples arrive (or if they never do) → "--", same as heat.
  const currentAqhi = dataCenter
    ? estimateAqhiAt(dataCenter.latitude, dataCenter.longitude, aqhiPoints)
    : null;

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  // Temperature, humidity and heat index all at the user's own location, from
  // the same API hour as the map and forecast chart.
  const { conditions } = useHeatConditions(dataCenter);
  const heatIndexTemp = conditions ? Math.round(conditions.heatIndexC) : null;
  const actualTemp = conditions ? Math.round(conditions.temperatureC) : null;
  const currentHumidity = conditions
    ? Math.round(conditions.relativeHumidityPct)
    : null;


  // Both hazards where the user is — what the Environmental Index, its
  // keywords, the detail sheet's chart and the map's starting layer are all
  // judged from, so they always agree.
  const currentReadings: HazardReadings = { heat: heatIndexTemp, aqhi: currentAqhi };
  const enviLevel = getEnviLevel(currentReadings);
  // Hidden (null) while the heat "forecast" is the demo copy of 48 h ago.
  const peakLevel = todaysPeakLevel({
    heatDays: heatForecastDays,
    aqhiDays: aqhiForecastDays,
    nowLevel: enviLevel,
    nowMs: Date.now(),
  });

  // With an alert measured NOW (a heads-up is about later, and has its
  // banner), its own advice — voiced for the owner's About you answer —
  // leads the detail sheet. The card itself doesn't change.
  const { settings: notificationSettings, update: updateNotificationSettings } =
    useNotificationSettings();
  const aboutYou = notificationSettings.currentLocationProfile;
  const liveAdvice = homeAdviceFor({
    liveAlerts: locationAlerts.filter(b => b.kind === 'now'),
    aboutYou,
  });

  // Saved places: map pins, and the indoor circles "where am I now" is
  // judged against. One list, so a place saved from the correction sheet
  // counts at once.
  const { bookmarks, addBookmark } = useBookmarkList();
  const located = useLocationContext({
    places: bookmarks,
    dailyActivity: aboutYou.dailyActivity,
    fallbackPosition: coords,
  });
  // Who the card's words are for (About you) and where they are now. Only
  // the advice changes with it — never the index number or colour.
  const enviAdvice: EnviAdviceFor = {
    person: personOf(aboutYou),
    caringFor: 'self',
    context: located.context,
    source: located.source,
  };

  // The hazard the forecast sheet opens on: the one setting the index (or
  // the season's on a tie; heat without PRAISE).
  const forecastHazard = pickForecastHazard({
    current: currentReadings,
    praiseConfigured: isPraiseConfigured(),
    nowMs: Date.now(),
  });
  // Saved places on the map — fetched once here for both maps.
  const placePins = useMapPlacePins(bookmarks);

  const [contentAboveHeight, setContentAboveHeight] = useState(0);
  const onContentAboveLayout = useCallback((e: LayoutChangeEvent) => {
    setContentAboveHeight(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
  }, []);

  // The scene area: from under the header to just below the character,
  // where the side bar lives and above which the cards never rise.
  const layout = computeSceneLayout(width, height);
  const characterBottomInScrollSpace = layout.bottomY - insets.top;
  const sceneAreaHeight = Math.max(
    characterBottomInScrollSpace - contentAboveHeight + HOME_LAYOUT_CONFIG.minGapBelowCharacter,
    HOME_LAYOUT_CONFIG.minGapBelowCharacter,
  );

  // Side bar open / closed, remembered across launches.
  const infoBar = useHomeInfoBar();

  const [heatSheetOpen, setHeatSheetOpen] = useState(false);
  const [aqhiSheetOpen, setAqhiSheetOpen] = useState(false);
  const [enviForecastOpen, setEnviForecastOpen] = useState(false);
  const [enviSheetOpen, setEnviSheetOpen] = useState(false);
  // Development builds only: the card in every state, from sample readings.
  const [enviPreviewOpen, setEnviPreviewOpen] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [heatExplainerOpen, setHeatExplainerOpen] = useState(false);
  // The "For you" line's correction sheet, and the two things it leads to.
  const [forYouOpen, setForYouOpen] = useState(false);
  const [editingAboutYou, setEditingAboutYou] = useState(false);
  const [savingPlace, setSavingPlace] = useState(false);

  // The side bar's four blocks (the same builder as the map's point card).
  // Only the two hazards open a forecast; Temp and Humidity are read-only.
  const infoBlocks = readingBlocks(
    {
      heatIndex: heatIndexTemp,
      aqhi: currentAqhi,
      temperature: actualTemp,
      humidity: currentHumidity,
    },
    {
      onHeatPress: () => setHeatSheetOpen(true),
      onAqhiPress: () => setAqhiSheetOpen(true),
    },
  );

  return (
    <View style={styles.mainContainer}>
      <View style={StyleSheet.absoluteFill}>
        <HeatScene
          width={width}
          height={height}
          heatIndexC={heatIndexTemp}
          aqhi={currentAqhi}
          scrollY={scrollY}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          <View onLayout={onContentAboveLayout}>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Environment
              </Text>
              <View style={styles.locationContainer}>
                <MapPin size={22} color="#FFFFFF" style={styles.locationIcon} />
                <View style={styles.locationBox}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <TextTicker
                      style={styles.animatingText}
                      duration={8000}
                      loop
                      bounce={false}
                      repeatSpacer={40}
                      marqueeDelay={1500}
                      isInteraction={false}
                    >
                      {locationText}
                    </TextTicker>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* The scene area: the side bar on its right edge, and the
              surface a left / right swipe opens or closes it on. */}
          <HomeInfoBar
            height={sceneAreaHeight}
            expanded={infoBar.expanded}
            onExpandedChange={infoBar.setExpanded}
            blocks={infoBlocks}
          />

          {/* The headline: one level for heat and air together. */}
          <EnviCard
            current={currentReadings}
            peakLevel={peakLevel}
            onOpenForecast={() => setEnviForecastOpen(true)}
            onOpenDetails={() => setEnviSheetOpen(true)}
            advice={enviAdvice}
            onOpenForYou={() => setForYouOpen(true)}
            onLongPressIndex={__DEV__ ? () => setEnviPreviewOpen(true) : undefined}
          />

          {/* Only while an alert is live: what happened. */}
          <HomeAlertBanner badges={locationAlerts} />

          <View style={styles.mapContainer}>
            {/* A preview, fixed on the Environmental Index (no picker:
                no onLayerChange) with a one-row legend; a tap opens the
                full-screen map, where the details, opacity slider and
                locate button are. */}
            <MapScreen
              layer={DEFAULT_MAP_LAYER_CONFIG.startLayer}
              showLayerControls={false}
              places={placePins}
              onPreviewPress={() => setMapFullscreen(true)}
            />
          </View>
        </Animated.ScrollView>
      </SafeAreaView>

      <FullscreenMapModal
        visible={mapFullscreen}
        // Camera only (no values are read off it), so the fallback is fine
        // here while locating.
        center={dataCenter ?? FALLBACK_CENTER}
        places={placePins}
        // A place pin leads to that place in Places — the link between
        // "conditions around me" and "the places I care about".
        onPlacePress={placeId => {
          setMapFullscreen(false);
          openPlace(placeId);
        }}
        onClose={() => setMapFullscreen(false)}
      />

      <EnviDetailSheet
        visible={enviSheetOpen}
        onClose={() => setEnviSheetOpen(false)}
        current={currentReadings}
        peakLevel={peakLevel}
        liveAdvice={liveAdvice}
        advice={enviAdvice}
        trackingOn={located.trackingOn}
      />

      <LocationContextSheet
        visible={forYouOpen}
        onClose={() => setForYouOpen(false)}
        context={located.context}
        source={located.source}
        onPick={context => {
          located.setOverride(context);
          // The advice changes at once — closing shows it on the card.
          setForYouOpen(false);
        }}
        onBackToAutomatic={() => {
          located.clearOverride();
          setForYouOpen(false);
        }}
        detailsSummary={[summarizeIdentities(aboutYou.identities), summarizeDailyLife(aboutYou)].join(
          PERSON_SUMMARY_COPY.partSeparator,
        )}
        onChangeDetails={() => {
          setForYouOpen(false);
          setEditingAboutYou(true);
        }}
        onSavePlace={() => {
          setForYouOpen(false);
          setSavingPlace(true);
        }}
      />

      {/* The same About you sheet as the Alerts tab's row. */}
      {editingAboutYou && (
        <AlertProfileSheet
          title={ABOUT_YOU_COPY.sheetTitle}
          initialProfile={aboutYou}
          onSave={currentLocationProfile => {
            // Saving here answers the first-launch question too.
            updateNotificationSettings({ currentLocationProfile, aboutYouConfirmed: true });
            setEditingAboutYou(false);
          }}
          onCancel={() => setEditingAboutYou(false)}
        />
      )}

      {/* The usual Add place flow, its map starting where the phone is now.
          Every place category is an indoor one, so a saved place makes the
          next "where am I" here say indoors — for Exposure too. */}
      <AddBookmarkModal
        visible={savingPlace}
        onClose={() => setSavingPlace(false)}
        existingPlaces={bookmarks}
        currentLocation={coords}
        initialCenter={located.position ?? undefined}
        onAdd={addBookmark}
      />

      <EnviForecastSheet
        visible={enviForecastOpen}
        onClose={() => setEnviForecastOpen(false)}
        // The hazard that sets the level (or the season's), the same one
        // the card's words lead with.
        defaultHazard={forecastHazard}
        heatForecast={{ days: heatForecastDays, loading: heatForecastLoading }}
        aqhiForecast={{ days: aqhiForecastDays, loading: aqhiForecastLoading }}
      />

      <ForecastSheet
        visible={heatSheetOpen}
        title="Heat Index Forecast"
        onClose={() => setHeatSheetOpen(false)}
      >
        {/* The heat index explainer's one way in: only when humidity makes
            a gap worth explaining. */}
        <FeelsLikeGapLine
          temperature={actualTemp}
          heatIndex={heatIndexTemp}
          onPress={() => setHeatExplainerOpen(true)}
        />
        <HeatHourlyForecastChart
          days={heatForecastDays}
          loading={heatForecastLoading}
        />
      </ForecastSheet>

      <ForecastSheet
        visible={aqhiSheetOpen}
        title="AQHI Forecast"
        onClose={() => setAqhiSheetOpen(false)}
      >
        <AqhiHourlyForecastChart
          days={aqhiForecastDays}
          loading={aqhiForecastLoading}
        />
      </ForecastSheet>

      {__DEV__ && (
        <EnviPreviewScreen
          visible={enviPreviewOpen}
          onClose={() => setEnviPreviewOpen(false)}
        />
      )}

      <HeatIndexExplainerSheet
        visible={heatExplainerOpen}
        onClose={() => setHeatExplainerOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  safeArea: { flex: 1 },
  scrollContent: {
    padding: HOME_LAYOUT_CONFIG.screenPadding,
    paddingBottom: 140,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flexShrink: 0,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  locationContainer: { flexDirection: 'row', alignItems: 'center' },
  locationIcon: { marginRight: 6, flexShrink: 0 },
  locationBox: {
    width: HOME_LAYOUT_CONFIG.locationBoxWidth,
    height: 24,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  animatingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowRadius: 3,
  },
  mapContainer: {
    height: HOME_LAYOUT_CONFIG.mapPreviewHeight,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
  },
});

export default HomeScreen;
