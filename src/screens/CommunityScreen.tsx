import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { useLocation } from '../utils/useLocation';
import { useHeatData } from '../hooks/useHeatData';
import { useHouseList } from '../hooks/useHouseList';
import { idwInterpolate } from '../utils/idw';
import { distanceMiles } from '../utils/distance';
import HouseCard from '../components/HouseCard';
import AddHouseModal from '../components/AddHouseModal';

const FALLBACK_LAT = 22.3375;
const FALLBACK_LNG = 114.263;

const CommunityScreen = () => {
  const { coords } = useLocation();
  const { houses, addHouse, removeHouse } = useHouseList();
  const [modalVisible, setModalVisible] = useState(false);

  const center = coords ?? { latitude: FALLBACK_LAT, longitude: FALLBACK_LNG };
  const { points } = useHeatData(center);

  const weightedPoints = points.map(p => ({
    latitude: p.latitude,
    longitude: p.longitude,
    value: p.temperature,
  }));

  // Compute each house's heat index + distance, then sort hottest-first (matches your reference)
  const rankedHouses = useMemo(() => {
    return houses
      .map(house => ({
        ...house,
        temperature: Math.round(
          idwInterpolate(house.latitude, house.longitude, weightedPoints),
        ),
        distance: distanceMiles(
          center.latitude,
          center.longitude,
          house.latitude,
          house.longitude,
        ),
      }))
      .sort((a, b) => b.temperature - a.temperature);
  }, [houses, weightedPoints, center.latitude, center.longitude]);

  const handleAdd = (
    label: string,
    address: string,
    latitude: number,
    longitude: number,
  ) => {
    addHouse({ label, address, latitude, longitude });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {rankedHouses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No houses added yet. Tap + to start monitoring family or neighbors.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rankedHouses}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <HouseCard
              label={item.label}
              temperature={item.temperature}
              distance={item.distance}
              onRemove={() => removeHouse(item.id)}
            />
          )}
        />
      )}

      <AddHouseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAdd}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D9534F',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CommunityScreen;
