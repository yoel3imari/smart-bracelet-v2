import { useState, useEffect, useCallback, useRef } from 'react';
import BleManager from 'react-native-ble-manager';
import { requestBlePermissions } from './use-ble-permissions';

export interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number;
  advertising: any;
  isConnectable?: boolean;
}

export interface HealthData {
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  temperature: number;
  oxygenLevel: number;
  timestamp: Date;
}

export interface UseBluetoothReturn {
  // Device Management
  devices: BluetoothDevice[];
  connectedDevice: BluetoothDevice | null;
  isConnected: boolean;
  isConnecting: boolean;
  isScanning: boolean;
  
  // Actions
  startScan: () => Promise<void>;
  stopScan: () => void;
  connectToDevice: (deviceId: string) => Promise<void>;
  disconnectFromDevice: () => Promise<void>;
  
  // Data
  healthData: HealthData | null;
  connectionError: string | null;
  
  // State
  hasPermissions: boolean;
}

// Health Service UUIDs (Standard BLE Health Services)
const HEALTH_SERVICE_UUIDS = {
  heartRate: '0000180d-0000-1000-8000-00805f9b34fb',
  bloodPressure: '00001810-0000-1000-8000-00805f9b34fb',
  temperature: '00001809-0000-1000-8000-00805f9b34fb',
  oxygen: '00001822-0000-1000-8000-00805f9b34fb',
  deviceInfo: '0000180a-0000-1000-8000-00805f9b34fb'
};

// Characteristic UUIDs
const CHARACTERISTIC_UUIDS = {
  heartRateMeasurement: '00002a37-0000-1000-8000-00805f9b34fb',
  bloodPressureMeasurement: '00002a35-0000-1000-8000-00805f9b34fb',
  temperatureMeasurement: '00002a1c-0000-1000-8000-00805f9b34fb',
  oxygenSaturation: '00002a5e-0000-1000-8000-00805f9b34fb'
};

const useBluetooth = (): UseBluetoothReturn => {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);

  const discoveredDevicesRef = useRef<Map<string, BluetoothDevice>>(new Map());
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const discoverSubscriptionRef = useRef<any>(null);
  const updateSubscriptionRef = useRef<any>(null);

  // Initialize Bluetooth and request permissions
  useEffect(() => {
    const initializeBluetooth = async () => {
      try {
        console.log('Initializing Bluetooth...');
        
        // Request permissions
        const permissionsGranted = await requestBlePermissions();
        setHasPermissions(permissionsGranted);
        
        if (permissionsGranted) {
          // Start BleManager
          await BleManager.start({ showAlert: false });
          console.log('BleManager initialized successfully');
          
          // Set up event listeners
          BleManager.enableBluetooth()
            .then(() => {
              console.log('Bluetooth is enabled');
            })
            .catch((error) => {
              console.log('User refused to enable Bluetooth');
            });
        } else {
          console.log('Bluetooth permissions denied');
        }
      } catch (error) {
        console.error('Failed to initialize Bluetooth:', error);
        setConnectionError('Failed to initialize Bluetooth');
      }
    };

    initializeBluetooth();

    // Cleanup
    return () => {
      const currentScanTimeout = scanTimeoutRef.current;
      const currentDiscoverSubscription = discoverSubscriptionRef.current;
      const currentUpdateSubscription = updateSubscriptionRef.current;
      const currentDiscoveredDevices = discoveredDevicesRef.current;
      
      if (currentScanTimeout) {
        clearTimeout(currentScanTimeout);
      }
      if (currentDiscoverSubscription) {
        currentDiscoverSubscription.remove();
      }
      if (currentUpdateSubscription) {
        currentUpdateSubscription.remove();
      }
      currentDiscoveredDevices.clear();
    };
  }, []);

  // Handle discovered devices
  const handleDiscoverPeripheral = useCallback((peripheral: BluetoothDevice) => {
    // Filter for health devices (devices with names or specific service UUIDs)
    const isHealthDevice = 
      peripheral.name?.toLowerCase().includes('heart') ||
      peripheral.name?.toLowerCase().includes('blood') ||
      peripheral.name?.toLowerCase().includes('temp') ||
      peripheral.name?.toLowerCase().includes('oxygen') ||
      peripheral.name?.toLowerCase().includes('med') ||
      peripheral.name?.toLowerCase().includes('health') ||
      peripheral.advertising?.serviceUUIDs?.some((uuid: string) => 
        Object.values(HEALTH_SERVICE_UUIDS).includes(uuid.toLowerCase())
      );

    if (isHealthDevice) {
      discoveredDevicesRef.current.set(peripheral.id, peripheral);
      
      setDevices(prevDevices => {
        const newDevices = [...prevDevices];
        const existingIndex = newDevices.findIndex(d => d.id === peripheral.id);
        
        if (existingIndex >= 0) {
          newDevices[existingIndex] = peripheral;
        } else {
          newDevices.push(peripheral);
        }
        
        return newDevices;
      });
    }
  }, []);

  // Stop scanning
  const stopScan = useCallback(() => {
    try {
      BleManager.stopScan().then(() => {
        console.log('Scan stopped');
        // Clean up discovery listener
        if (discoverSubscriptionRef.current) {
          discoverSubscriptionRef.current.remove();
          discoverSubscriptionRef.current = null;
        }
        setIsScanning(false);
      });
    } catch (error) {
      console.error('Failed to stop scan:', error);
      setIsScanning(false);
    }
  }, []);

  // Start scanning for devices
  const startScan = useCallback(async () => {
    if (!hasPermissions) {
      setConnectionError('Bluetooth permissions not granted');
      return;
    }

    try {
      setConnectionError(null);
      setIsScanning(true);
      discoveredDevicesRef.current.clear();
      setDevices([]);

      console.log('Starting BLE scan...');
      
      // Start scanning for health service UUIDs
      await BleManager.scan(
        Object.values(HEALTH_SERVICE_UUIDS),
        30, // Scan for 30 seconds
        true // Allow duplicates to update RSSI
      );

      // Set up discovery listener using the correct API
      discoverSubscriptionRef.current = BleManager.onDiscoverPeripheral(handleDiscoverPeripheral);

      // Auto-stop scan after 30 seconds
      scanTimeoutRef.current = setTimeout(() => {
        stopScan();
      }, 30000) as unknown as NodeJS.Timeout;

    } catch (error) {
      console.error('Failed to start scan:', error);
      setConnectionError('Failed to start device scan');
      setIsScanning(false);
    }
  }, [hasPermissions, handleDiscoverPeripheral, stopScan]);

  // Handle incoming health data
  const handleHealthDataUpdate = useCallback((data: any) => {
    console.log('Health data received:', data);
    
    // Parse health data based on characteristic UUID
    const parsedData = parseHealthData(data);
    if (parsedData) {
      setHealthData(parsedData);
    }
  }, []);

  // Start health data notifications
  const startHealthDataNotifications = useCallback(async (deviceId: string, services: any) => {
    try {
      // Set up characteristic update listener
      updateSubscriptionRef.current = BleManager.onDidUpdateValueForCharacteristic(handleHealthDataUpdate);

      // Subscribe to health characteristics
      for (const service of services.services) {
        for (const characteristic of service.characteristics) {
          if (characteristic.properties?.notify || characteristic.properties?.indicate) {
            try {
              await BleManager.startNotification(deviceId, service.uuid, characteristic.uuid);
              console.log(`Started notification for ${characteristic.uuid}`);
            } catch (error) {
              console.log(`Could not start notification for ${characteristic.uuid}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to start health data notifications:', error);
    }
  }, [handleHealthDataUpdate]);
  
  // Connect to a device
  const connectToDevice = useCallback(async (deviceId: string) => {
    if (!hasPermissions) {
      setConnectionError('Bluetooth permissions not granted');
      return;
    }

    try {
      setConnectionError(null);
      setIsConnecting(true);
      
      console.log(`Connecting to device: ${deviceId}`);
      
      // Connect to the device
      await BleManager.connect(deviceId);
      console.log('Connected to device');
      
      // Discover services
      const services = await BleManager.retrieveServices(deviceId);
      console.log('Services discovered:', services);
      
      // Find the connected device from our list
      const device = devices.find(d => d.id === deviceId) || discoveredDevicesRef.current.get(deviceId);
      if (device) {
        setConnectedDevice(device);
        setIsConnected(true);
        
        // Start notifications for health data
        await startHealthDataNotifications(deviceId, services);
      }
      
    } catch (error) {
      console.error('Failed to connect to device:', error);
      setConnectionError('Failed to connect to device');
    } finally {
      setIsConnecting(false);
    }
  }, [hasPermissions, devices, startHealthDataNotifications]);

  // Disconnect from device
  const disconnectFromDevice = useCallback(async () => {
    if (!connectedDevice) return;

    try {
      console.log(`Disconnecting from device: ${connectedDevice.id}`);
      await BleManager.disconnect(connectedDevice.id);
      
      setConnectedDevice(null);
      setIsConnected(false);
      setHealthData(null);
      console.log('Disconnected from device');
      
    } catch (error) {
      console.error('Failed to disconnect from device:', error);
      setConnectionError('Failed to disconnect from device');
    }
  }, [connectedDevice]);

  


  // Parse health data from BLE characteristic
  const parseHealthData = (data: any): HealthData | null => {
    try {
      const { characteristic, value } = data;
      const dataArray = new Uint8Array(value);
      
      let parsedData: Partial<HealthData> = {
        timestamp: new Date()
      };

      // Heart Rate Measurement (0x2A37)
      if (characteristic.toLowerCase() === CHARACTERISTIC_UUIDS.heartRateMeasurement.toLowerCase()) {
        // First byte: flags (used for determining data format)
        const heartRateValue = (dataArray[0] & 0x01) ?
          (dataArray[1] | (dataArray[2] << 8)) : dataArray[1];
        
        parsedData.heartRate = heartRateValue;
      }
      
      // Blood Pressure Measurement (0x2A35)
      else if (characteristic.toLowerCase() === CHARACTERISTIC_UUIDS.bloodPressureMeasurement.toLowerCase()) {
        if (dataArray.length >= 7) {
          const systolic = dataArray[1] | (dataArray[2] << 8);
          const diastolic = dataArray[3] | (dataArray[4] << 8);
          
          parsedData.bloodPressureSystolic = systolic;
          parsedData.bloodPressureDiastolic = diastolic;
        }
      }
      
      // Temperature Measurement (0x2A1C)
      else if (characteristic.toLowerCase() === CHARACTERISTIC_UUIDS.temperatureMeasurement.toLowerCase()) {
        if (dataArray.length >= 5) {
          const tempInteger = dataArray[1];
          const tempFraction = dataArray[2];
          const temperature = tempInteger + (tempFraction / 100);
          
          parsedData.temperature = temperature;
        }
      }
      
      // Oxygen Saturation (0x2A5E)
      else if (characteristic.toLowerCase() === CHARACTERISTIC_UUIDS.oxygenSaturation.toLowerCase()) {
        if (dataArray.length >= 2) {
          parsedData.oxygenLevel = dataArray[0]; // Percentage
        }
      }

      // Return complete health data object
      if (Object.keys(parsedData).length > 1) {
        return {
          heartRate: parsedData.heartRate || 0,
          bloodPressureSystolic: parsedData.bloodPressureSystolic || 0,
          bloodPressureDiastolic: parsedData.bloodPressureDiastolic || 0,
          temperature: parsedData.temperature || 0,
          oxygenLevel: parsedData.oxygenLevel || 0,
          timestamp: parsedData.timestamp!
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to parse health data:', error);
      return null;
    }
  };

  return {
    // Device Management
    devices,
    connectedDevice,
    isConnected,
    isConnecting,
    isScanning,
    
    // Actions
    startScan,
    stopScan,
    connectToDevice,
    disconnectFromDevice,
    
    // Data
    healthData,
    connectionError,
    
    // State
    hasPermissions
  };
};

export default useBluetooth;