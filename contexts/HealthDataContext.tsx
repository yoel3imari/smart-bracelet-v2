import { issueService, metricService, offlineStorageService } from '@/services';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBle } from './BleContext';

export interface HealthData {
  heartRate: number;
  sleepHours: number;
  temperature: number;
  oxygenLevel: number;
  fingerDetected: boolean;
  sleeping: boolean;
  activityKmh: number;
  steps: number;
  idleSeconds: number;
  timestamp: number;
  lastUpdated: Date;
}

export interface HistoricalData {
  timestamp: Date;
  heartRate: number;
  oxygenLevel: number;
  temperature: number;
  fingerDetected: boolean;
  sleeping: boolean;
  activityKmh: number;
  steps: number;
  idleSeconds: number;
  sleepHours: number;
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
    fingerDetected: false,
    sleeping: false,
    activityKmh: 0,
    steps: 0,
    idleSeconds: 0,
    timestamp: 0,
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
    sensorData: bleSensorData,
    connectToDevice,
    disconnectFromDevice,
  } = useBle();

  // Update health data when Bluetooth data changes
  useEffect(() => {
    if (bleSensorData && isConnected) {
      const newData: HealthData = {
        heartRate: bleSensorData.heartRate || 0,
        sleepHours: bleSensorData.sleepHours || 0, // Now dynamic from device data
        temperature: bleSensorData.temperature || 0,
        oxygenLevel: bleSensorData.spo2 || 0,
        fingerDetected: bleSensorData.fingerDetected || false,
        sleeping: bleSensorData.sleeping || false,
        activityKmh: bleSensorData.activityKmh || 0,
        steps: bleSensorData.steps || 0,
        idleSeconds: bleSensorData.idleSeconds || 0,
        timestamp: bleSensorData.timestamp || Date.now(),
        lastUpdated: new Date(),
      };

      setCurrentData(newData);

      // Add to historical data
      setHistoricalData(prev => {
        const newHistoricalData = [...prev];
        newHistoricalData.push({
          timestamp: new Date(),
          heartRate: bleSensorData.heartRate || 0,
          oxygenLevel: bleSensorData.spo2 || 0,
          temperature: bleSensorData.temperature || 0,
          fingerDetected: bleSensorData.fingerDetected || false,
          sleeping: bleSensorData.sleeping || false,
          activityKmh: bleSensorData.activityKmh || 0,
          steps: bleSensorData.steps || 0,
          idleSeconds: bleSensorData.idleSeconds || 0,
          sleepHours: bleSensorData.sleepHours || 0,
        });
        
        // Keep only last 24 hours of data
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return newHistoricalData.filter(item => item.timestamp > twentyFourHoursAgo);
      });

      // Send metrics to backend if device is registered
      sendMetricsToBackend(newData, new Date());

      // Check for alerts based on health data
      // checkForAlerts(newData);
    }
  }, [bleSensorData, isConnected]);

  // Send health metrics to backend or offline storage
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
        // Check connectivity and use appropriate storage
        if (offlineStorageService.isOnline()) {
          await metricService.createMetricsBatch({ metrics });
          console.log('Metrics sent to backend successfully');
        } else {
          await offlineStorageService.storeMetrics(metrics);
          console.log('Metrics stored offline for later sync');
        }
      }
    } catch (error) {
      console.error('Failed to send/store metrics:', error);
      // Fallback to offline storage on any error
      try {
        const metrics = metricService.createHealthMetrics({
          heartRate: data.heartRate,
          oxygenLevel: data.oxygenLevel,
          temperature: data.temperature,
          sleepHours: data.sleepHours,
          timestamp: timestamp.toISOString(),
        });
        await offlineStorageService.storeMetrics(metrics);
        console.log('Metrics stored offline as fallback');
      } catch (fallbackError) {
        console.error('Failed to store metrics offline:', fallbackError);
      }
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
      toggleConnection,
      isConnected,
      connectedDevice,
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
      toggleConnection,
      isConnected,
      connectedDevice,
      connectToDevice,
      disconnectFromDevice,
      refreshData,
      updateUserProfile,
    ]
  );
});
