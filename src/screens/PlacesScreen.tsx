// src/screens/PlacesScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react-native';
import { useLocation } from '../utils/useLocation';
import { usePlacesHeatIndex } from '../hooks/useHeatData';
import { usePlacesAqhi } from '../hooks/useAqhiData';
import { useActiveAlerts } from '../hooks/useActiveAlerts';
import { useBookmarkList } from '../hooks/useBookmarkList';
import { distanceMiles } from '../utils/distance';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { resolvePlaceAlertProfile, summarizeAlertProfile } from '../utils/alertProfile';
import { HAZARD_KINDS } from '../config/alertConfig';
import BookmarkCard from '../components/BookmarkCard';
import AlertProfileSheet from '../components/alerts/AlertProfileSheet';
import { PROFILE_EDITOR_COPY } from '../config/alertCopy';
import PlaceEditRow from '../components/PlaceEditRow';
import DraggableList from '../components/DraggableList';
import AddBookmarkModal from '../components/AddBookmarkModal';
import BookmarkMapModal from '../components/BookmarkMapModal';
import RenamePlaceModal from '../components/RenamePlaceModal';
import ChangePlaceTypeModal from '../components/ChangePlaceTypeModal';
import { BookmarkEntry } from '../types/bookmark';

const SKY_BLUE = '#BEE7FB';

type Props = {
  // A place another tab asked to open (a map pin, an Exposure stay) —
  // opened once the list has loaded, then reported back as handled so it
  // doesn't reopen on the next render.
  focusPlaceId?: string | null;
  onFocusHandled?: () => void;
};

// The places the user watches: the alert watch list, one card per place
// with both hazards and who the place is for.
const PlacesScreen = ({ focusPlaceId = null, onFocusHandled }: Props) => {
  const { coords } = useLocation();
  const {
    bookmarks,
    loading: bookmarksLoading,
    addBookmark,
    removeBookmark,
    renameBookmark,
    changeBookmarkCategory,
    moveBookmark,
    setBookmarkHidden,
    setBookmarkAlertProfile,
  } = useBookmarkList();
  // Places for yourself take their audience from About you.
  const aboutYou = useNotificationSettings().settings.currentLocationProfile;
  const [alertingBookmark, setAlertingBookmark] = useState<BookmarkEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBookmark, setSelectedBookmark] =
    useState<BookmarkEntry | null>(null);
  const [renamingBookmark, setRenamingBookmark] = useState<BookmarkEntry | null>(null);
  const [retypingBookmark, setRetypingBookmark] = useState<BookmarkEntry | null>(null);
  const [editing, setEditing] = useState(false);
  const [hiddenExpanded, setHiddenExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    // Bookmarks load asynchronously: wait for the list rather than giving
    // up on the first (empty) render. A place deleted since the request
    // was made is simply dropped.
    if (!focusPlaceId || bookmarksLoading) return;
    const target = bookmarks.find(b => b.id === focusPlaceId);
    if (target) setSelectedBookmark(target);
    onFocusHandled?.();
  }, [focusPlaceId, bookmarksLoading, bookmarks, onFocusHandled]);

  // Both hazards are looked up at each place's own coordinates — not
  // estimated from samples around the user — so a card matches the map and
  // the alert engine, which uses the same lookups. Hidden places never show
  // badges, so they aren't looked up.
  const visibleBookmarks = bookmarks.filter(bookmark => !bookmark.hidden);
  const { heatIndexById } = usePlacesHeatIndex(visibleBookmarks);
  const { aqhiById } = usePlacesAqhi(visibleBookmarks);
  const alertsByPlace = useActiveAlerts();

  // Kept in the user's own (stored) order rather than ranked by severity —
  // the order is now theirs to set in Edit mode, and a list that re-sorts
  // itself on every data refresh would undo it.
  const bookmarkRows = useMemo(
    () =>
      bookmarks.map(bookmark => ({
        ...bookmark,
        temperature:
          bookmark.id in heatIndexById
            ? Math.round(heatIndexById[bookmark.id])
            : null,
        aqhi: bookmark.id in aqhiById ? Math.round(aqhiById[bookmark.id]) : null,
        alertProfile: resolvePlaceAlertProfile(bookmark.alertProfile, aboutYou),
        // Measured from the real position only — a distance from the
        // fallback spot would be a made-up number, so it shows "--" instead.
        distance: coords
          ? distanceMiles(
              coords.latitude,
              coords.longitude,
              bookmark.latitude,
              bookmark.longitude,
            )
          : null,
      })),
    [bookmarks, heatIndexById, aqhiById, coords, aboutYou],
  );
  const visibleRows = bookmarkRows.filter(row => !row.hidden);
  const hiddenRows = bookmarkRows.filter(row => row.hidden);

  const renameOtherNames = useMemo(
    () => bookmarks.filter(b => b.id !== renamingBookmark?.id).map(b => b.label),
    [bookmarks, renamingBookmark],
  );

  const allHiddenNotice =
    visibleRows.length === 0 ? (
      <Text style={styles.allHiddenText}>
        All your places are hidden — they still count towards your exposure.
      </Text>
    ) : null;

  // Hidden places are usually ones saved only to label exposure stays —
  // collapsed by default so they don't pull focus from the watch list, but
  // always reachable to unhide or open.
  const renderHiddenSection = () =>
    hiddenRows.length === 0 ? null : (
      <View style={styles.hiddenSection}>
        <TouchableOpacity
          style={styles.hiddenHeader}
          onPress={() => setHiddenExpanded(expanded => !expanded)}
        >
          <Text style={styles.hiddenHeaderText}>Hidden places ({hiddenRows.length})</Text>
          {hiddenExpanded ? (
            <ChevronUp size={18} color="#3A3A3A" />
          ) : (
            <ChevronDown size={18} color="#3A3A3A" />
          )}
        </TouchableOpacity>
        {hiddenExpanded &&
          hiddenRows.map(row => (
            <PlaceEditRow
              key={row.id}
              label={row.label}
              category={row.category}
              hidden
              onToggleHidden={() => setBookmarkHidden(row.id, false)}
              onPress={() => setSelectedBookmark(row)}
            />
          ))}
      </View>
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Places</Text>
        <View style={styles.headerActions}>
          {bookmarks.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setEditing(e => !e);
                // Leaving Edit mid-drag unmounts the list before it can
                // report the drop — don't leave the next ScrollView frozen.
                setDragging(false);
              }}
              hitSlop={10}
            >
              <Text style={styles.editText}>{editing ? 'Done' : 'Edit'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {bookmarkRows.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Tap + to add your Home, Office or School — it helps us calculate your exposure
            more accurately.
          </Text>
        </View>
      ) : editing ? (
        // A plain ScrollView rather than the FlatList below: drag-reordering
        // needs every row mounted at a fixed slot, and the list is short.
        // Scrolling stops while a row is lifted so the drag keeps the touch.
        <ScrollView contentContainerStyle={styles.listContent} scrollEnabled={!dragging}>
          {allHiddenNotice}
          <DraggableList
            items={visibleRows}
            keyExtractor={item => item.id}
            onReorder={moveBookmark}
            onDragActiveChange={setDragging}
            renderItem={(item, dragHandle, lifted) => (
              <PlaceEditRow
                label={item.label}
                category={item.category}
                hidden={false}
                onToggleHidden={() => setBookmarkHidden(item.id, true)}
                dragHandle={dragHandle}
                lifted={lifted}
              />
            )}
          />
          {renderHiddenSection()}
        </ScrollView>
      ) : (
        <FlatList
          data={visibleRows}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={allHiddenNotice}
          ListFooterComponent={renderHiddenSection()}
          renderItem={({ item }) => (
            <BookmarkCard
              label={item.label}
              category={item.category}
              radiusMeters={item.radiusMeters}
              temperature={item.temperature}
              aqhi={item.aqhi}
              distance={item.distance}
              alertSummary={summarizeAlertProfile(item.alertProfile)}
              alertsOn={HAZARD_KINDS.some(h => item.alertProfile.hazards[h])}
              alertBadges={HAZARD_KINDS.flatMap(h => (alertsByPlace[item.id] ?? []).filter(b => b.hazard === h))}
              onPress={() => setSelectedBookmark(item)}
              onAlertSettings={() => setAlertingBookmark(item)}
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

      {alertingBookmark && (
        <AlertProfileSheet
          key={alertingBookmark.id}
          title={PROFILE_EDITOR_COPY.sheetTitle}
          subtitle={alertingBookmark.label}
          forPlace={{ aboutYouAudience: aboutYou.audience }}
          initialProfile={resolvePlaceAlertProfile(alertingBookmark.alertProfile, aboutYou)}
          onSave={profile => {
            setBookmarkAlertProfile(alertingBookmark.id, profile);
            setAlertingBookmark(null);
          }}
          onCancel={() => setAlertingBookmark(null)}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  editText: {
    fontSize: 16,
    fontWeight: '600',
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
  allHiddenText: {
    color: '#3A3A3A',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  hiddenSection: {
    marginTop: 8,
  },
  hiddenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  hiddenHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3A3A3A',
  },
});

export default PlacesScreen;
