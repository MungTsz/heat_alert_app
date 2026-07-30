// src/utils/useLocation.ts
import { useState, useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export const useLocation = () => {
  const [locationText, setLocationText] = useState<string>('Locating...');
  const [loading, setLoading] = useState<boolean>(true);
  const [coords, setCoords] = useState<Coordinates | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Fetch concise area / district name
    const fetchPlaceName = async (latitude: number, longitude: number) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
          {
            headers: {
              'User-Agent': 'HeatAlertApp/1.0',
            },
          },
        );
        const data = await response.json();

        if (isMounted) {
          if (data && data.address) {
            const addr = data.address;

            const area = addr.suburb || addr.road;

            setLocationText(area);
          } else {
            setLocationText('Hong Kong');
          }
          setLoading(false);
        }
      } catch (error) {
        console.log('Reverse Geocode Fetch Error:', error);
        if (isMounted) {
          setLocationText('Hong Kong');
          setLoading(false);
        }
      }
    };

    const getCurrentLocation = () => {
      Geolocation.getCurrentPosition(
        position => {
          if (isMounted) {
            const { latitude, longitude } = position.coords;
            fetchPlaceName(latitude, longitude);
            setCoords({ latitude, longitude });
          }
        },
        error => {
          console.log('GPS Error:', error.code, error.message);
          if (isMounted) {
            setLocationText('Unavailable');
            setLoading(false);
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    };

    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'This app needs access to your location.',
              buttonPositive: 'OK',
            },
          );

          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            getCurrentLocation();
          } else {
            if (isMounted) {
              setLocationText('Permission denied');
              setLoading(false);
            }
          }
        } catch (err) {
          console.warn('Permission Error:', err);
          if (isMounted) {
            setLocationText('Error');
            setLoading(false);
          }
        }
      } else {
        // iOS
        getCurrentLocation();
      }
    };

    requestLocationPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  return { locationText, loading, coords };
};
