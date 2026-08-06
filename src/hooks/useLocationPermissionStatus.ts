import { useCallback, useEffect, useState } from 'react';
import { PermissionsAndroid, Linking, AppState } from 'react-native';

export const useLocationPermissionStatus = () => {
  const [granted, setGranted] = useState<boolean | null>(null); // null = still checking

  const checkPermission = useCallback(async () => {
    try {
      const result = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      setGranted(result);
    } catch (error) {
      console.log('Permission check error:', error);
      setGranted(false);
    }
  }, []);

  useEffect(() => {
    checkPermission();

    // Re-check whenever the user returns to the app — catches the case where
    // they granted/revoked permission from the system Settings screen.
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        checkPermission();
      }
    });

    return () => subscription.remove();
  }, [checkPermission]);

  const requestPermission = async () => {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message:
            'This app needs access to your location to show local heat index data.',
          buttonPositive: 'OK',
        },
      );
      const isGranted = result === PermissionsAndroid.RESULTS.GRANTED;
      setGranted(isGranted);
      return isGranted;
    } catch (error) {
      console.log('Permission request error:', error);
      return false;
    }
  };

  const openAppSettings = () => {
    Linking.openSettings();
  };

  return {
    granted,
    requestPermission,
    openAppSettings,
    refresh: checkPermission,
  };
};
