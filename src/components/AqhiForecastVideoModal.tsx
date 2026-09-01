// src/components/AqhiForecastVideoModal.tsx
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Video from 'react-native-video';
import { X } from 'lucide-react-native';
import { fetchPraiseMovie } from '../services/praiseApi';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = {
  visible: boolean;
  onClose: () => void;
};

const AqhiForecastVideoModal: React.FC<Props> = ({ visible, onClose }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    setVideoUrl(null);

    fetchPraiseMovie('AQHI')
      .then(data => {
        if (isMounted) setVideoUrl(data.url);
      })
      .catch(err => {
        console.log('Failed to fetch AQHI forecast video:', err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load forecast video',
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {loading && <ActivityIndicator size="large" color="#FFFFFF" />}

        {error && !loading && <Text style={styles.errorText}>{error}</Text>}

        {videoUrl && !loading && !error && (
          <Video
            source={{ uri: videoUrl }}
            style={styles.video}
            controls
            resizeMode="contain"
            paused={false}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 6,
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});

export default AqhiForecastVideoModal;
