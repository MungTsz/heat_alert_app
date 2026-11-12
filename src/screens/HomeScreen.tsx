// src/screens/HomeScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  useWindowDimensions,
  LayoutChangeEvent,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { MapPin, User, Wind } from 'lucide-react-native';
import TextTicker from 'react-native-text-ticker';
import CurrentWeatherInfo, { HomeAdvice } from '../components/CurrentWeatherInfo';
import HeatHourlyForecastChart from '../components/HeatHourlyForecastChart';
import AqhiHourlyForecastChart from '../components/AqhiHourlyForecastChart';
import HazardCard from '../components/HazardCard';
import ForecastSheet from '../components/ForecastSheet';
import HeatIndexExplainerSheet from '../components/HeatIndexExplainerSheet';
import FullscreenMapModal from '../components/FullscreenMapModal';
import MapScreen from './MapScreen';
import { useLocation } from '../utils/useLocation';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';
import { estimateAqhiAt, getAqhiInfo } from '../utils/aqhiUtils';
import { FALLBACK_CENTER, resolveDataCenter } from '../config/locationConfig';
import HeatScene from '../components/scene/HeatScene';
import { computeSceneLayout } from '../utils/sceneLayout';
import { useForecastData } from '../hooks/useForecastData';
import { useAqhiForecastData } from '../hooks/useAqhiForecastData';
import { useAqhiData } from '../hooks/useAqhiData';
import { useHeatConditions } from '../hooks/useHeatData';
import { useActiveAlerts } from '../hooks/useActiveAlerts';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useDefaultMapLayer } from '../hooks/useDefaultMapLayer';
import { useMapPlacePins } from '../hooks/useMapPlacePins';
import AlertBadge from '../components/alerts/AlertBadge';
import HomeAlertBanner from '../components/alerts/HomeAlertBanner';
import { CURRENT_LOCATION_PLACE_ID } from '../config/alertConfig';
import { HOME_LAYOUT_CONFIG } from '../config/homeLayoutConfig';
import { HazardKind } from '../types/alerts';
import { MapLayer } from '../types/mapSettings';
import { adviceFor, adviceProfileFor } from '../utils/alertMessages';
import { openAlertDetail } from '../services/alertCheckBus';
import { openPlace } from '../services/navigationBus';

const LOCATION_BOX_WIDTH = 160;
const MIN_GAP_BELOW_CHARACTER = 24;
// Plain white like the cards' labels, so a "--" never reads as a level color.
const UNAVAILABLE_VALUE_COLOR = '#FFFFFF';

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
  // Alerts the user has been told about for their own location — the same
  // badge on both hazard cards, as peers.
  const locationAlerts = useActiveAlerts()[CURRENT_LOCATION_PLACE_ID] ?? [];
  const alertBadgeFor = (hazard: HazardKind) => {
    const badge = locationAlerts.find(b => b.hazard === hazard);
    return badge ? <AlertBadge badge={badge} /> : undefined;
  };

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

  const heatInfo = heatIndexTemp === null ? null : getHeatIndexInfo(heatIndexTemp);
  const aqhiInfo = currentAqhi === null ? null : getAqhiInfo(currentAqhi);
  const layout = computeSceneLayout(width, height);

  // On alert days the footer under Temp · Humidity says what to do, so the
  // user doesn't have to wait for a push. Only for alerts measured NOW (a
  // heads-up is about later, and has its banner), voiced for the owner's
  // About you answer — built by the same adviceFor the notification and the
  // detail sheet use, so the three can never word it differently.
  const aboutYou = useNotificationSettings().settings.currentLocationProfile;
  const liveAlerts = locationAlerts.filter(b => b.kind === 'now');
  const liveMessageId = liveAlerts.find(b => b.messageId)?.messageId ?? null;
  const advice: HomeAdvice | null =
    liveAlerts.length > 0
      ? {
          text: adviceFor(
            liveAlerts.map(b => b.hazard),
            adviceProfileFor([aboutYou]),
            liveAlerts.some(b => b.urgent),
          ),
          onPress: () => {
            if (liveMessageId) openAlertDetail(liveMessageId);
          },
        }
      : null;

  // One layer for the preview and the full-screen map (lifted here so
  // closing full screen keeps the user's pick). Until the user picks one it
  // follows the data: whichever hazard has reached their alert level.
  const [chosenMapLayer, setChosenMapLayer] = useState<MapLayer | null>(null);
  const defaultMapLayer = useDefaultMapLayer({ heat: heatIndexTemp, aqhi: currentAqhi });
  const mapLayer = chosenMapLayer ?? defaultMapLayer;
  // Saved places on the map — fetched once here for both maps.
  const placePins = useMapPlacePins();

  const [contentAboveHeight, setContentAboveHeight] = useState(0);
  const onContentAboveLayout = useCallback((e: LayoutChangeEvent) => {
    setContentAboveHeight(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
  }, []);

  const characterBottomInScrollSpace = layout.bottomY - insets.top;
  const spacerHeight = Math.max(
    characterBottomInScrollSpace - contentAboveHeight + MIN_GAP_BELOW_CHARACTER,
    MIN_GAP_BELOW_CHARACTER,
  );

  const [heatSheetOpen, setHeatSheetOpen] = useState(false);
  const [aqhiSheetOpen, setAqhiSheetOpen] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [heatExplainerOpen, setHeatExplainerOpen] = useState(false);

  return (
    <View style={styles.mainContainer}>
      <View style={StyleSheet.absoluteFill}>
        <HeatScene
          width={width}
          height={height}
          temperatureCelsius={heatIndexTemp}
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
            {/* Inside the measured block, so the spacer below shrinks by its
                height and the cards stay where they are. */}
            <HomeAlertBanner badges={locationAlerts} />
          </View>

          <View style={{ height: spacerHeight }} />

          {/* Equal-weight Heat Index and AQHI cards, both tappable */}
          <View style={styles.hazardRow}>
            {/* heat card */}
            <HazardCard
              icon={<User size={18} color="#FFFFFF" />}
              label="Feels Like..."
              // "--" while loading or when the API is unreachable — never a
              // value from another source.
              value={heatInfo ? `${heatIndexTemp}°` : '--°'}
              classification={heatInfo?.classification ?? '—'}
              valueColor={heatInfo?.color ?? UNAVAILABLE_VALUE_COLOR}
              onPress={() => setHeatSheetOpen(true)}
              badge={alertBadgeFor('heat')}
            />
            {/* aqhi card — same "--" / "—" placeholders as the heat card */}
            <HazardCard
              icon={<Wind size={18} color="#FFFFFF" />}
              label="AQHI"
              value={aqhiInfo ? `${currentAqhi}` : '--'}
              classification={aqhiInfo?.classification ?? '—'}
              // Same per-value color as the AQHI map layer and legend
              // (aqhiUtils' AQHI_COLOR_BY_VALUE), so the number reads as the
              // band the map shows — like the heat card's heatInfo.color.
              // Deliberately NOT the forecast chart's own background bands.
              valueColor={aqhiInfo?.color ?? UNAVAILABLE_VALUE_COLOR}
              onPress={() => setAqhiSheetOpen(true)}
              badge={alertBadgeFor('aqhi')}
            />
          </View>

          <CurrentWeatherInfo
            temperature={actualTemp}
            humidity={currentHumidity}
            heatIndex={heatIndexTemp}
            onPressInfo={() => setHeatExplainerOpen(true)}
            advice={advice}
          />

          <View style={styles.mapContainer}>
            {/* A preview: any tap opens the full-screen map, so controls
                that couldn't be used here are left off. */}
            <MapScreen
              layer={mapLayer}
              showModeToggle={false}
              showLayerControls={false}
              places={placePins}
            />
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={0.9}
              onPress={() => setMapFullscreen(true)}
            />
          </View>
        </Animated.ScrollView>
      </SafeAreaView>

      <FullscreenMapModal
        visible={mapFullscreen}
        // Camera only (no values are read off it), so the fallback is fine
        // here while locating.
        center={dataCenter ?? FALLBACK_CENTER}
        layer={mapLayer}
        onLayerChange={setChosenMapLayer}
        places={placePins}
        // A place pin leads to that place in Places — the link between
        // "conditions around me" and "the places I care about".
        onPlacePress={placeId => {
          setMapFullscreen(false);
          openPlace(placeId);
        }}
        onClose={() => setMapFullscreen(false)}
      />

      <ForecastSheet
        visible={heatSheetOpen}
        title="Heat Index Forecast"
        onClose={() => setHeatSheetOpen(false)}
      >
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
  scrollContent: { padding: 20, paddingBottom: 140 },
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
    width: LOCATION_BOX_WIDTH,
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
  hazardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  mapContainer: {
    height: HOME_LAYOUT_CONFIG.mapPreviewHeight,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
});

export default HomeScreen;
