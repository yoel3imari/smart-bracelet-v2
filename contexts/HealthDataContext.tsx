import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBle } from './BleContext';

export interface HealthData {
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  temperature: number;
  oxygenLevel: number;
  lastUpdated: Date;
}

export interface HistoricalData {
  timestamp: Date;
  heartRate: number;
  oxygenLevel: number;
  temperature: number;
}

export interface UserProfile {
  name: string;
  age: number;
  gender: string;
  photoUrl: string;
  bloodType: string;
  conditions: string[];
  allergies: string[];
  medications: string[];
}

export const [HealthDataProvider, useHealthData] = createContextHook(() => {
  const [hasAlerts, setHasAlerts] = useState<boolean>(false);
  const [currentData, setCurrentData] = useState<HealthData>({
    heartRate: 0,
    bloodPressureSystolic: 0,
    bloodPressureDiastolic: 0,
    temperature: 0,
    oxygenLevel: 0,
    lastUpdated: new Date(),
  });

  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Sarah Johnson',
    age: 32,
    gender: 'Male',
    photoUrl: 'https://i.pravatar.cc/150?img=47',
    bloodType: 'A+',
    conditions: ['Hypertension', 'Asthma'],
    allergies: ['Penicillin', 'Peanuts'],
    medications: ['Lisinopril 10mg', 'Albuterol inhaler'],
  });

  // Use the Bluetooth context
  const {
    connectedDevice,
    isConnected,
    healthData: bluetoothHealthData,
    connectToDevice,
    disconnectFromDevice,
  } = useBle();

  // Update health data when Bluetooth data changes
  useEffect(() => {
  //   if (bluetoothHealthData) {
  //     const newData: HealthData = {
  //       heartRate: bluetoothHealthData.heartRate || 0,
  //       bloodPressureSystolic: bluetoothHealthData.bloodPressureSystolic || 0,
  //       bloodPressureDiastolic: bluetoothHealthData.bloodPressureDiastolic || 0,
  //       temperature: bluetoothHealthData.temperature || 0,
  //       oxygenLevel: bluetoothHealthData.oxygenLevel || 0,
  //       lastUpdated: bluetoothHealthData.timestamp,
  //     };

  //     setCurrentData(newData);

  //     // Add to historical data
  //     setHistoricalData(prev => {
  //       const newHistoricalData = [...prev];
  //       newHistoricalData.push({
  //         timestamp: bluetoothHealthData.timestamp,
  //         heartRate: bluetoothHealthData.heartRate || 0,
  //         oxygenLevel: bluetoothHealthData.oxygenLevel || 0,
  //         temperature: bluetoothHealthData.temperature || 0,
  //       });
        
  //       // Keep only last 24 hours of data
  //       const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  //       return newHistoricalData.filter(item => item.timestamp > twentyFourHoursAgo);
  //     });

  //     // Check for alerts based on health data
  //     checkForAlerts(newData);
  //   }
  }, [bluetoothHealthData]);

  const checkForAlerts = useCallback((data: HealthData) => {
    const alerts = [];
    
    if (data.heartRate < 60 || data.heartRate > 100) {
      alerts.push('Abnormal heart rate detected');
    }
    
    if (data.bloodPressureSystolic > 140 || data.bloodPressureDiastolic > 90) {
      alerts.push('High blood pressure detected');
    }
    
    if (data.temperature < 36.0 || data.temperature > 37.5) {
      alerts.push('Abnormal body temperature');
    }
    
    if (data.oxygenLevel < 95) {
      alerts.push('Low oxygen saturation');
    }

    if (alerts.length > 0) {
      setHasAlerts(true);
      // Auto-clear alerts after 10 seconds
      setTimeout(() => setHasAlerts(false), 10000);
    }
  }, []);

  const refreshData = useCallback(() => {
    console.log('Refreshing health data...');
    // In a real implementation, this would trigger a manual read from the device
    // For now, we'll just update the timestamp
    setCurrentData(prev => ({
      ...prev,
      lastUpdated: new Date(),
    }));
  }, []);

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleConnection = useCallback(async () => {
    if (isConnected && connectedDevice) {
      // Disconnect from current device
      try {
        await disconnectFromDevice();
      } catch (error) {
        console.error('Error disconnecting device:', error);
      }
    } else {
      // Connection is handled through the device selection modal
      console.log('Use device selection modal to connect');
    }
  }, [isConnected, connectedDevice, disconnectFromDevice]);

  return useMemo(
    () => ({
      hasAlerts,
      currentData,
      historicalData,
      userProfile,
      isConnected,
      connectedDevice,
      toggleConnection,
      connectToDevice,
      disconnectFromDevice,
      refreshData,
      updateUserProfile,
    }),
    [
      hasAlerts,
      currentData,
      historicalData,
      userProfile,
      isConnected,
      connectedDevice,
      toggleConnection,
      connectToDevice,
      disconnectFromDevice,
      refreshData,
      updateUserProfile,
    ]
  );
});
