// src/hooks/useExposureDevices.ts
import { useCallback, useEffect, useState } from 'react';
import { ExposureDevice } from '../types/exposure';
import { getDevices, createDevice as createDeviceService, deleteDevice } from '../services/exposureDeviceService';

export const useExposureDevices = () => {
  const [devices, setDevices] = useState<ExposureDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setDevices(await getDevices());
    } catch (error) {
      console.log('Failed to load exposure devices:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createDevice = async (name: string): Promise<ExposureDevice> => {
    const device = await createDeviceService(name);
    setDevices(prev => [device, ...prev]);
    return device;
  };

  const removeDevice = async (id: string) => {
    await deleteDevice(id);
    setDevices(prev => prev.filter(d => d.id !== id));
  };

  return { devices, loading, createDevice, removeDevice, refresh };
};
