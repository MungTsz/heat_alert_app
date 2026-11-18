// src/screens/ScenePreviewScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Pause, Play } from 'lucide-react-native';
import HeatScene from '../components/scene/HeatScene';
import { computeSceneLayout } from '../utils/sceneLayout';
import { sceneMoodFor, SceneMood } from '../utils/sceneMood';
import {
  SCENE_SAMPLE_HOURS,
  SCENE_SAMPLE_LEVEL_NAMES,
  SCENE_SAMPLE_READINGS,
} from '../utils/sceneSamples';
import { HOME_LAYOUT_CONFIG } from '../config/homeLayoutConfig';
import { SCENE_PREVIEW_CONFIG } from '../config/sceneConfig';
import { HazardKind } from '../types/alerts';

type Props = { visible: boolean; onClose: () => void };

// Level index 0-4 into SCENE_SAMPLE_READINGS, or null = no reading.
type Situation = { title: string; heat: number | null; aqhi: number | null; night: boolean };

// The guided tour "Play" steps through: heat rising with clean air, air
// worsening on a mild day, then the combinations worth a look.
const TOUR: Situation[] = [
  ...[0, 1, 2, 3, 4].map(i => ({
    title: `Heat: ${SCENE_SAMPLE_LEVEL_NAMES.heat[i]}`,
    heat: i,
    aqhi: 0,
    night: false,
  })),
  ...[1, 2, 3, 4].map(i => ({
    title: `Air: ${SCENE_SAMPLE_LEVEL_NAMES.aqhi[i]}`,
    heat: 0,
    aqhi: i,
    night: false,
  })),
  { title: 'Hot and polluted', heat: 3, aqhi: 3, night: false },
  { title: 'Hot night', heat: 3, aqhi: 0, night: true },
  { title: 'No readings yet', heat: null, aqhi: null, night: false },
];

const PREVIEW_BACKGROUND = '#5D7A96';

// What the scene is doing, in words — so a reviewer can check the picture
// against SCENE_HEAT_LEVELS / SCENE_AIR_LEVELS without reading code.
const describe = (mood: SceneMood): string[] => {
  const p = mood.person;
  const d = mood.dog;
  const e = mood.environment;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return [
    `Person: ${[
      `mouth ${p.mouth}`,
      `eyes ${p.eyes}`,
      p.sadBrows && 'worried brows',
      p.sweatDrops > 0 && `${p.sweatDrops} sweat drop${p.sweatDrops > 1 ? 's' : ''}`,
      p.flush > 0 && 'flushed',
      p.fanning && 'fanning',
      p.cough && 'coughing',
      p.mask && 'mask',
    ]
      .filter(Boolean)
      .join(' · ')}`,
    `Dog: ${[
      d.pose === 'lie' ? 'lying flat' : 'sitting',
      d.mouth === 'pant' ? (d.heavyBreath ? 'panting hard (huffs)' : 'panting') : `mouth ${d.mouth}`,
      d.tongue !== 'none' && `${d.tongue} tongue`,
      d.eyes !== 'open' && `eyes ${d.eyes}`,
      d.redEyes && 'red eyes',
      d.teary && 'watery eyes',
      d.runnyNose && 'runny nose',
      d.droolDrops > 0 && `${d.droolDrops} drool drop${d.droolDrops > 1 ? 's' : ''}`,
      d.puddle > 0 && 'drool puddle',
      d.tailWagMs ? 'tail wagging' : 'tail still',
    ]
      .filter(Boolean)
      .join(' · ')}`,
    `Scene: ${[
      e.isNight ? 'night' : 'day',
      `sun ${pct(e.sunGlow)}`,
      e.shimmer > 0 && `shimmer ${pct(e.shimmer)}`,
      e.haze > 0 && `haze ${pct(e.haze)}`,
      e.sparkles && 'fresh-air sparkles',
    ]
      .filter(Boolean)
      .join(' · ')}`,
  ];
};

const Chip: React.FC<{ label: string; selected: boolean; onPress: () => void }> = ({
  label,
  selected,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
    hitSlop={4}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

// DEVELOPMENT BUILDS ONLY (opened from App settings' testing section).
// Home's real cartoon scene, driven by SAMPLE readings (utils/sceneSamples)
// — pick a level for each hazard and day / night, or press Play for a tour
// of every reaction. Never shown on Home.
const ScenePreviewScreen: React.FC<Props> = ({ visible, onClose }) => {
  const { width, height } = useWindowDimensions();
  const [situation, setSituation] = useState<Situation>(TOUR[0]);
  const [tourIndex, setTourIndex] = useState<number | null>(null);

  // Play: step through TOUR, looping, until a chip is tapped or it's paused.
  useEffect(() => {
    if (tourIndex === null || !visible) return;
    setSituation(TOUR[tourIndex]);
    const timer = setTimeout(
      () => setTourIndex((tourIndex + 1) % TOUR.length),
      SCENE_PREVIEW_CONFIG.cycleMs,
    );
    return () => clearTimeout(timer);
  }, [tourIndex, visible]);

  const pick = (change: Partial<Situation>) => {
    setTourIndex(null);
    setSituation(s => ({ ...s, ...change, title: 'Custom' }));
  };

  const valueOf = (hazard: HazardKind, index: number | null) =>
    index === null ? null : SCENE_SAMPLE_READINGS[hazard][index];
  const heatIndexC = valueOf('heat', situation.heat);
  const aqhi = valueOf('aqhi', situation.aqhi);
  const hour = situation.night ? SCENE_SAMPLE_HOURS.night : SCENE_SAMPLE_HOURS.day;
  const mood = sceneMoodFor({ heatIndexC, aqhi, hour });

  // The scene is laid out for the full screen (as on Home); the box shows
  // it down to just under the characters.
  const sceneBoxHeight =
    computeSceneLayout(width, height).bottomY + SCENE_PREVIEW_CONFIG.sceneBottomPadding;

  const levelChips = (hazard: HazardKind, key: 'heat' | 'aqhi') => (
    <View style={styles.chipRow}>
      <Chip label="--" selected={situation[key] === null} onPress={() => pick({ [key]: null })} />
      {SCENE_SAMPLE_LEVEL_NAMES[hazard].map((name, i) => (
        <Chip
          key={name}
          label={name}
          selected={situation[key] === i}
          onPress={() => pick({ [key]: i })}
        />
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.roundButton}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scene preview</Text>
          <TouchableOpacity
            style={[styles.roundButton, styles.playButton]}
            onPress={() => setTourIndex(i => (i === null ? 0 : null))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={tourIndex === null ? 'Play tour' : 'Pause tour'}
          >
            {tourIndex === null ? <Play size={22} color="#333" /> : <Pause size={22} color="#333" />}
          </TouchableOpacity>
        </View>
        <Text style={styles.banner}>Sample readings — development preview only.</Text>

        <View style={[styles.sceneBox, { height: sceneBoxHeight }]}>
          <View style={{ width, height }}>
            <HeatScene width={width} height={height} heatIndexC={heatIndexC} aqhi={aqhi} hour={hour} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.controls}>
          <Text style={styles.title}>
            {tourIndex === null ? situation.title : `${tourIndex + 1}/${TOUR.length} · ${situation.title}`}
          </Text>
          <Text style={styles.note}>
            Heat index {heatIndexC ?? '--'}°C · AQHI {aqhi ?? '--'}
          </Text>
          {describe(mood).map(line => (
            <Text key={line} style={styles.note}>
              {line}
            </Text>
          ))}

          <Text style={styles.label}>Heat index</Text>
          {levelChips('heat', 'heat')}
          <Text style={styles.label}>AQHI</Text>
          {levelChips('aqhi', 'aqhi')}
          <Text style={styles.label}>Time</Text>
          <View style={styles.chipRow}>
            <Chip label="Day" selected={!situation.night} onPress={() => pick({ night: false })} />
            <Chip label="Night" selected={situation.night} onPress={() => pick({ night: true })} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PREVIEW_BACKGROUND },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: HOME_LAYOUT_CONFIG.screenPadding,
    paddingTop: 10,
    paddingBottom: 8,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: { marginLeft: 'auto' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' },
  banner: {
    marginHorizontal: HOME_LAYOUT_CONFIG.screenPadding,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFF4E5',
    color: '#7C2D12',
    fontSize: 12,
    fontWeight: '700',
  },
  sceneBox: { overflow: 'hidden' },
  controls: { padding: HOME_LAYOUT_CONFIG.screenPadding, paddingBottom: 60, gap: 6 },
  title: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  note: { fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.85)' },
  label: { marginTop: 12, fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chipSelected: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  chipTextSelected: { color: '#1C1C1E' },
});

export default ScenePreviewScreen;
