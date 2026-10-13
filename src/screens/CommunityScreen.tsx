// src/screens/CommunityScreen.tsx
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
import { useAqhiData } from '../hooks/useAqhiData';
import { useBookmarkList } from '../hooks/useBookmarkList';
import { idwInterpolate } from '../utils/idw';
import { distanceMiles } from '../utils/distance';
import BookmarkCard from '../components/BookmarkCard';
import AddBookmarkModal from '../components/AddBookmarkModal';
import BookmarkMapModal from '../components/BookmarkMapModal';
import RenamePlaceModal from '../components/RenamePlaceModal';
import ChangePlaceTypeModal from '../components/ChangePlaceTypeModal';
import { BookmarkEntry } from '../types/bookmark';

const FALLBACK_LAT = 22.3375;
const FALLBACK_LNG = 114.263;
const SKY_BLUE = '#BEE7FB';

const CommunityScreen = () => {
  const { coords } = useLocation();
  const { bookmarks, addBookmark, removeBookmark, renameBookmark, changeBookmarkCategory } =
    useBookmarkList();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBookmark, setSelectedBookmark] =
    useState<BookmarkEntry | null>(null);
  const [renamingBookmark, setRenamingBookmark] = useState<BookmarkEntry | null>(null);
  const [retypingBookmark, setRetypingBookmark] = useState<BookmarkEntry | null>(null);

  const center = coords ?? { latitude: FALLBACK_LAT, longitude: FALLBACK_LNG };
  const { points: heatPoints } = useHeatData(center);
  const { points: aqhiPoints } = useAqhiData(center);

  const weightedHeatPoints = heatPoints.map(p => ({
    latitude: p.latitude,
    longitude: p.longitude,
    value: p.temperature,
  }));
  const weightedAqhiPoints = aqhiPoints.map(p => ({
    latitude: p.latitude,
    longitude: p.longitude,
    value: p.aqhi,
  }));

  const rankedBookmarks = useMemo(() => {
    return (
      bookmarks
        .map(bookmark => {
          const temperature = Math.round(
            idwInterpolate(
              bookmark.latitude,
              bookmark.longitude,
              weightedHeatPoints,
            ),
          );
          const aqhi = Math.round(
            idwInterpolate(
              bookmark.latitude,
              bookmark.longitude,
              weightedAqhiPoints,
            ),
          );
          return {
            ...bookmark,
            temperature,
            aqhi,
            distance: distanceMiles(
              center.latitude,
              center.longitude,
              bookmark.latitude,
              bookmark.longitude,
            ),
          };
        })
        // Rank by whichever metric is proportionally more severe on its own scale
        .sort((a, b) => {
          const scoreA = Math.max(a.temperature / 50, a.aqhi / 11);
          const scoreB = Math.max(b.temperature / 50, b.aqhi / 11);
          return scoreB - scoreA;
        })
    );
  }, [
    bookmarks,
    weightedHeatPoints,
    weightedAqhiPoints,
    center.latitude,
    center.longitude,
  ]);

  const renameOtherNames = useMemo(
    () => bookmarks.filter(b => b.id !== renamingBookmark?.id).map(b => b.label),
    [bookmarks, renamingBookmark],
  );

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

      {rankedBookmarks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Tap + to add your Home, Office or School — it helps us calculate your exposure
            more accurately.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rankedBookmarks}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <BookmarkCard
              label={item.label}
              category={item.category}
              radiusMeters={item.radiusMeters}
              temperature={item.temperature}
              aqhi={item.aqhi}
              distance={item.distance}
              onPress={() => setSelectedBookmark(item)}
              onChangeType={() => setRetypingBookmark(item)}
              onRename={() => setRenamingBookmark(item)}
              onRemove={() => removeBookmark(item.id)}
            />
          )}
        />
      )}

      <AddBookmarkModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        existingPlaces={bookmarks}
        currentLocation={coords}
        onAdd={addBookmark}
      />

      <RenamePlaceModal
        visible={renamingBookmark !== null}
        initialName={renamingBookmark?.label ?? ''}
        otherNames={renameOtherNames}
        onSave={name => {
          if (renamingBookmark) renameBookmark(renamingBookmark.id, name);
          setRenamingBookmark(null);
        }}
        onCancel={() => setRenamingBookmark(null)}
      />

      {retypingBookmark && (
        <ChangePlaceTypeModal
          key={retypingBookmark.id}
          place={retypingBookmark}
          otherPlaces={bookmarks.filter(b => b.id !== retypingBookmark.id)}
          onSave={category => {
            changeBookmarkCategory(retypingBookmark.id, category);
            setRetypingBookmark(null);
          }}
          onCancel={() => setRetypingBookmark(null)}
        />
      )}

      <BookmarkMapModal
        visible={selectedBookmark !== null}
        bookmark={selectedBookmark}
        onClose={() => setSelectedBookmark(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SKY_BLUE,
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
    color: '#1A1A1A',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D9534F',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#3A3A3A',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CommunityScreen;
