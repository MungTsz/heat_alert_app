// src/components/MapPickerModal.tsx
import React, { useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Search, X } from 'lucide-react-native';
import { useDebouncedAddressSuggestions } from '../hooks/useDebouncedAddressSuggestions';
import { usePlaceNameLookup } from '../hooks/usePlaceNameLookup';
import { GeocodeResult } from '../utils/geocode';
import { findConflictingPlaces, radiusToRegionDelta } from '../utils/placeOverlap';
import { EXPOSURE_IO_CONFIG } from '../config/exposureIoConfig';
import { PLACE_CATEGORY_CONFIG } from '../config/placeCategoryConfig';
import { PLACE_LABEL_CONFIG } from '../config/placeLabelConfig';
import { BookmarkEntry, PlaceCategory } from '../types/bookmark';
import StepDots from './addPlace/StepDots';
import PlaceRadiusCircles from './addPlace/PlaceRadiusCircles';
import PlaceRadiusSlider from './addPlace/PlaceRadiusSlider';
import PlaceNamePreview from './addPlace/PlaceNamePreview';

type Coordinates = { latitude: number; longitude: number };

export type PickedPlace = Coordinates & {
  label: string;
  address: string;
  radiusMeters: number;
};

type Props = {
  visible: boolean;
  initialCenter: Coordinates;
  category: PlaceCategory;
  // The user's existing places — drawn faintly, checked for overlap, and
  // used so the default name never repeats one of theirs.
  otherPlaces: readonly BookmarkEntry[];
  onBack: () => void;
  onConfirm: (place: PickedPlace) => void;
};

const TOTAL_STEPS = 2;
const PIN_SIZE = 40;
const ANIMATE_MS = 400;

// Step 2 of Add place: one full-screen map where the user places the pin,
// sizes the circle and confirms. The name is filled in from the location —
// typing is optional.
const MapPickerModal: React.FC<Props> = ({
  visible,
  initialCenter,
  category,
  otherPlaces,
  onBack,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const color = EXPOSURE_IO_CONFIG[category].color;
  const { Icon, label: categoryLabel } = PLACE_CATEGORY_CONFIG[category];

  const [radiusMeters, setRadiusMeters] = useState(PLACE_LABEL_CONFIG.radius.defaultM);
  // Live center follows every drag frame so the circle sticks to the pin;
  // settledCenter only updates when the map stops and drives the name lookup.
  const [liveCenter, setLiveCenter] = useState<Coordinates>(initialCenter);
  const [settledCenter, setSettledCenter] = useState<Coordinates>(initialCenter);
  const [customName, setCustomName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions, loading: suggestionsLoading } = useDebouncedAddressSuggestions(query);

  const existingNames = useMemo(() => otherPlaces.map(p => p.label), [otherPlaces]);
  const { result: nameResult, loading: nameLoading, resolve: resolveName } =
    usePlaceNameLookup(settledCenter, category, existingNames);

  const candidate = { ...liveCenter, radiusMeters, category };
  const conflicts = findConflictingPlaces(candidate, otherPlaces);
  const conflictingIds = new Set(conflicts.map(c => c.place.id));

  const initialRegion: Region = {
    ...initialCenter,
    ...radiusToRegionDelta(PLACE_LABEL_CONFIG.radius.defaultM, initialCenter.latitude),
  };

  const fitCircle = (center: Coordinates, radius: number) => {
    mapRef.current?.animateToRegion(
      { ...center, ...radiusToRegionDelta(radius, center.latitude) },
      ANIMATE_MS,
    );
  };

  const handleRadiusComplete = (radius: number) => {
    setRadiusMeters(radius);
    // Re-zoom only when the thumb is released — refitting on every drag
    // step would make the map jump around under the user's finger.
    fitCircle(liveCenter, radius);
  };

  const handleSelectSuggestion = (result: GeocodeResult) => {
    const center = { latitude: result.latitude, longitude: result.longitude };
    fitCircle(center, radiusMeters);
    setQuery(result.displayName);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const handleSave = async () => {
    setSaving(true);
    // The pin may have just stopped (lookup still debouncing/in flight) —
    // resolve it now rather than saving a stale or missing name.
    const resolved = nameResult && !nameLoading ? nameResult : await resolveName();
    setSaving(false);
    onConfirm({
      ...settledCenter,
      radiusMeters,
      label: customName ?? resolved?.name ?? categoryLabel,
      address:
        resolved?.address ??
        `${settledCenter.latitude.toFixed(5)}, ${settledCenter.longitude.toFixed(5)}`,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onBack}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.mapArea}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            mapType="standard"
            userInterfaceStyle="light"
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            onRegionChange={region =>
              setLiveCenter({ latitude: region.latitude, longitude: region.longitude })
            }
            onRegionChangeComplete={region => {
              const center = { latitude: region.latitude, longitude: region.longitude };
              setLiveCenter(center);
              setSettledCenter(center);
            }}
          >
            <PlaceRadiusCircles
              candidate={candidate}
              otherPlaces={otherPlaces}
              conflictingIds={conflictingIds}
            />
          </MapView>
          {/* Fixed-center-pin pattern: the pin never moves, the map moves
              under it — so the region's center IS the selected point. */}
          <View style={styles.centerPinWrapper} pointerEvents="none">
            <MapPin size={PIN_SIZE} color={color} fill={color} />
          </View>

          <View style={[styles.topBar, { top: insets.top + 12 }]}>
            <View style={styles.topRow}>
              <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={8}>
                <ArrowLeft size={20} color="#333" />
              </TouchableOpacity>
              <View style={styles.searchBar}>
                <Search size={18} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for a place"
                  value={query}
                  onChangeText={text => {
                    setQuery(text);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  returnKeyType="search"
                />
                {query.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setQuery('');
                      setShowSuggestions(false);
                    }}
                    hitSlop={8}
                  >
                    <X size={16} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {showSuggestions && query.trim().length >= 3 && (
              <View style={styles.suggestionBox}>
                {suggestionsLoading ? (
                  <View style={styles.suggestionLoading}>
                    <ActivityIndicator size="small" color="#888" />
                  </View>
                ) : suggestions.length > 0 ? (
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item, i) => `${item.latitude}-${item.longitude}-${i}`}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.suggestionItem}
                        onPress={() => handleSelectSuggestion(item)}
                      >
                        <Text style={styles.suggestionText} numberOfLines={2}>
                          {item.displayName}
                        </Text>
                      </TouchableOpacity>
                    )}
                    style={styles.suggestionList}
                  />
                ) : (
                  <Text style={styles.noResultsText}>No matches found</Text>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={[styles.panel, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.panelHeader}>
            <View style={[styles.categoryChip, { backgroundColor: color }]}>
              <Icon size={14} color="#fff" />
              <Text style={styles.categoryChipText}>{categoryLabel}</Text>
            </View>
            <StepDots current={2} total={TOTAL_STEPS} />
          </View>
          <Text style={styles.title}>Where is it?</Text>
          <Text style={styles.subtitle}>Move the map so the pin sits on the place.</Text>

          <View style={styles.section}>
            <PlaceNamePreview
              autoName={nameResult?.name ?? null}
              loading={nameLoading}
              customName={customName}
              existingNames={existingNames}
              onCustomNameChange={setCustomName}
            />
          </View>

          <View style={styles.section}>
            <PlaceRadiusSlider
              radiusMeters={radiusMeters}
              category={category}
              color={color}
              conflict={conflicts[0] ?? null}
              onChange={setRadiusMeters}
              onChangeComplete={handleRadiusComplete}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: color }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveText}>Save {categoryLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapArea: { flex: 1 },
  centerPinWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -PIN_SIZE / 2,
    marginTop: -PIN_SIZE, // tip of the pin sits exactly at the map's center
  },
  topBar: { position: 'absolute', left: 16, right: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#222', padding: 0 },
  suggestionBox: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 220,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  suggestionList: { maxHeight: 220 },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  suggestionText: { fontSize: 13, color: '#333' },
  suggestionLoading: { paddingVertical: 14, alignItems: 'center' },
  noResultsText: { paddingVertical: 14, paddingHorizontal: 14, fontSize: 13, color: '#999' },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20, // overlap the map so the rounded corners show
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  categoryChipText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  title: { fontSize: 19, fontWeight: 'bold', color: '#222', marginTop: 10 },
  subtitle: { fontSize: 13, color: '#777', marginTop: 2 },
  section: { marginTop: 14 },
  saveButton: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default MapPickerModal;
