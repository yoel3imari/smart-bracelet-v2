import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBle } from './BleContext';
import { metricService, issueService, MetricType } from '@/services';

export interface HealthData {
  heartRate: number;
  sleepHours: number;
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
    sleepHours: 0,
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
    if (bluetoothHealthData) {
      const newData: HealthData = {
        heartRate: bluetoothHealthData.heartRate || 0,
        sleepHours: bluetoothHealthData.sleepHours || 0,
        temperature: bluetoothHealthData.temperature || 0,
        oxygenLevel: bluetoothHealthData.oxygenLevel || 0,
        lastUpdated: bluetoothHealthData.timestamp,
      };

      setCurrentData(newData);

      // Add to historical data
      setHistoricalData(prev => {
        const newHistoricalData = [...prev];
        newHistoricalData.push({
          timestamp: bluetoothHealthData.timestamp,
          heartRate: bluetoothHealthData.heartRate || 0,
          oxygenLevel: bluetoothHealthData.oxygenLevel || 0,
          temperature: bluetoothHealthData.temperature || 0,
        });
        
        // Keep only last 24 hours of data
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return newHistoricalData.filter(item => item.timestamp > twentyFourHoursAgo);
      });

      // Send metrics to backend if device is registered
      sendMetricsToBackend(newData, bluetoothHealthData.timestamp);

      // Check for alerts based on health data
      checkForAlerts(newData);
    }
  }, [bluetoothHealthData]);

  // Send health metrics to backend
  const sendMetricsToBackend = useCallback(async (data: HealthData, timestamp: Date) => {
    try {
      const metrics = metricService.createHealthMetrics({
        heartRate: data.heartRate,
        oxygenLevel: data.oxygenLevel,
        temperature: data.temperature,
        sleepHours: data.sleepHours,
        timestamp: timestamp.toISOString(),
      });

      if (metrics.length > 0) {
        await metricService.createMetricsBatch({ metrics });
        console.log('Metrics sent to backend successfully');
      }
    } catch (error) {
      console.error('Failed to send metrics to backend:', error);
    }
  }, []);

  const checkForAlerts = useCallback((data: HealthData) => {
    const alerts = [];
    
    if (data.heartRate < 60 || data.heartRate > 100) {
      alerts.push('Abnormal heart rate detected');
    }
    
    if (data.sleepHours < 6) {
      alerts.push('Insufficient sleep detected');
    }
    
    if (data.temperature < 36.0 || data.temperature > 37.5) {
      alerts.push('Abnormal body temperature');
    }
    
    if (data.oxygenLevel < 95) {
      alerts.push('Low oxygen saturation');
    }

    if (alerts.length > 0) {
      setHasAlerts(true);
      
      // Create health issues for critical alerts
      const healthIssue = issueService.createHealthIssueFromMetrics({
        heartRate: data.heartRate,
        oxygenLevel: data.oxygenLevel,
        temperature: data.temperature,
        sleepHours: data.sleepHours,
        timestamp: data.lastUpdated.toISOString(),
      });

      if (healthIssue) {
        // In a real app, you would save this to the backend
        console.log('Health issue detected:', healthIssue);
      }

      // Auto-clear alerts after 10 seconds
      setTimeout(() => setHasAlerts(false), 10000);
    }
  }, []);

  const refreshData = useCallback(async () => {
    console.log('Refreshing health data...');
    
    try {
      // In a real implementation, this would trigger a manual read from the device
      // For now, we'll just update the timestamp and simulate data refresh
      
      // Simulate fetching latest metrics from backend
      // const latestMetrics = await metricService.getLatestMetrics(1);
      
      setCurrentData(prev => ({
        ...prev,
        lastUpdated: new Date(),
      }));

      console.log('Health data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh health data:', error);
    }
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
