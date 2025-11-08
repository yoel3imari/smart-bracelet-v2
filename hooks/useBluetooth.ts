
import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { 
  requestBlePermissions, 
  checkBlePermissions, 
  showPermissionAlert, 
  type PermissionResult 
} from './use-ble-permissions';

export interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number;
  advertising: any;
  isConnectable?: boolean;
}

export interface HealthData {
  heartRate: number;
  sleepHours: number;
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
  permissionDetails?: PermissionResult['details'];
}

// ESP32 BLE Service UUIDs from demo.ts
const ESP32_SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const ESP32_CHAR_TX_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
const ESP32_CHAR_RX_UUID = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";

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
  const [permissionDetails, setPermissionDetails] = useState<PermissionResult['details']>();

  const discoveredDevicesRef = useRef<Map<string, BluetoothDevice>>(new Map());
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const discoverSubscriptionRef = useRef<any>(null);
  const updateSubscriptionRef = useRef<any>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced Bluetooth initialization with better error handling
  const initializeBluetooth = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🚀 Initializing Bluetooth...');
      
      // Check if running on simulator (BLE doesn't work on simulators)
      // Note: BLE scanning typically doesn't work on iOS simulators
      // For Android emulators, it may work with limited functionality
      console.log('📱 Platform:', Platform.OS);
      
      // We'll continue with the scan but log that BLE might not work on simulators
      console.log('ℹ️ BLE scanning may not work on simulators. Please test on physical devices.');
      
      // First check current permissions
      const currentPermissions = await checkBlePermissions();
      console.log('Current BLE permissions:', currentPermissions);
      
      if (!currentPermissions.granted) {
        // Request permissions if not granted
        const permissionResult = await requestBlePermissions();
        console.log('BLE Permission request result:', permissionResult);
        
        setHasPermissions(permissionResult.granted);
        setPermissionDetails(permissionResult.details);
        
        if (!permissionResult.granted) {
          showPermissionAlert(permissionResult);
          return false;
        }
      } else {
        setHasPermissions(true);
        setPermissionDetails(currentPermissions.details);
      }

      // Start BleManager
      console.log('🎯 Starting BleManager...');
      try {
        await BleManager.start({ showAlert: false });
        console.log('✅ BleManager initialized successfully');
      } catch (startError) {
        console.error('❌ Failed to start BleManager:', startError);
        throw startError;
      }

      // Check Bluetooth state
      const bluetoothState = await BleManager.checkState();
      console.log('📱 Bluetooth state:', bluetoothState);
      
      // Test if BleManager is working by getting connected peripherals
      try {
        const connectedPeripherals = await BleManager.getConnectedPeripherals();
        console.log('🔗 Currently connected peripherals:', connectedPeripherals.length);
        if (connectedPeripherals.length > 0) {
          console.log('📋 Connected devices:', connectedPeripherals);
        }
      } catch (error) {
        console.log('ℹ️ No connected peripherals or error checking:', error);
      }
      
      // Test if we can get discovered devices
      try {
        const discoveredPeripherals = await BleManager.getDiscoveredPeripherals();
        console.log('🔍 Previously discovered peripherals:', discoveredPeripherals.length);
        if (discoveredPeripherals.length > 0) {
          console.log('📋 Discovered devices:', discoveredPeripherals);
        }
      } catch (error) {
        console.log('ℹ️ No discovered peripherals or error checking:', error);
      }
      
      if (bluetoothState === 'on') {
        console.log('✅ Bluetooth is enabled and ready');
        return true;
      } else {
        console.log('⚠️ Bluetooth is not enabled');
        
        if (Platform.OS === 'android') {
          try {
            await BleManager.enableBluetooth();
            console.log('✅ Bluetooth enabled successfully');
            return true;
          } catch (error) {
            console.log('❌ User refused to enable Bluetooth:', error);
            setConnectionError('Bluetooth is required but not enabled');
            return false;
          }
        } else {
          setConnectionError('Please enable Bluetooth in Settings');
          return false;
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize Bluetooth:', error);
      setConnectionError(`Bluetooth initialization failed: ${error}`);
      return false;
    }
  }, []);

  // Initialize Bluetooth and request permissions
  useEffect(() => {
    const initBluetooth = async () => {
      console.log('🚀 Initializing Bluetooth in useEffect...');
      await initializeBluetooth();
      
      // Set up event listeners after initialization (as shown in the article)
      console.log('🎯 Setting up BLE event listeners...');
      
      // Set up discovery listener immediately after initialization
      try {
        discoverSubscriptionRef.current = BleManager.onDiscoverPeripheral(handleDiscoverPeripheral);
        console.log('✅ Discovery listener set up successfully');
      } catch (error) {
        console.error('❌ Failed to set up discovery listener:', error);
      }
      
      // Set up other event listeners as shown in the article
      try {
        BleManager.onStopScan(() => {
          console.log('⏹️ BLE scan stopped');
          setIsScanning(false);
        });
        console.log('✅ Stop scan listener set up successfully');
      } catch (error) {
        console.error('❌ Failed to set up stop scan listener:', error);
      }
      
      try {
        BleManager.onConnectPeripheral((peripheral: any) => {
          console.log(`✅ Connected to peripheral: ${peripheral}`);
        });
        console.log('✅ Connect listener set up successfully');
      } catch (error) {
        console.error('❌ Failed to set up connect listener:', error);
      }
      
      try {
        BleManager.onDisconnectPeripheral((peripheral: any) => {
          console.log(`❌ Disconnected from peripheral: ${peripheral}`);
          setIsConnected(false);
          setConnectedDevice(null);
        });
        console.log('✅ Disconnect listener set up successfully');
      } catch (error) {
        console.error('❌ Failed to set up disconnect listener:', error);
      }
    };

    initBluetooth();

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up Bluetooth listeners...');
      const currentScanTimeout = scanTimeoutRef.current;
      const currentDiscoverSubscription = discoverSubscriptionRef.current;
      const currentUpdateSubscription = updateSubscriptionRef.current;
      const currentConnectionTimeout = connectionTimeoutRef.current;
      const currentDiscoveredDevices = discoveredDevicesRef.current;
      
      if (currentScanTimeout) {
        clearTimeout(currentScanTimeout);
      }
      if (currentConnectionTimeout) {
        clearTimeout(currentConnectionTimeout);
      }
      if (currentDiscoverSubscription) {
        currentDiscoverSubscription.remove();
        discoverSubscriptionRef.current = null;
      }
      if (currentUpdateSubscription) {
        currentUpdateSubscription.remove();
        updateSubscriptionRef.current = null;
      }
      currentDiscoveredDevices.clear();
      
      // Disconnect from any connected device
      if (connectedDevice) {
        BleManager.disconnect(connectedDevice.id).catch(console.error);
      }
    };
  }, [initializeBluetooth, connectedDevice]);

  // Enhanced device discovery - show ALL available Bluetooth devices
  const handleDiscoverPeripheral = useCallback((peripheral: BluetoothDevice) => {
    try {
      const deviceName = peripheral.name || 'Unknown Device';
      const hasESP32Service = peripheral.advertising?.serviceUUIDs?.includes(ESP32_SERVICE_UUID);
      const serviceUUIDs = peripheral.advertising?.serviceUUIDs || [];
      
      console.log('📡 DEVICE DISCOVERED:', {
        id: peripheral.id,
        name: deviceName,
        rssi: peripheral.rssi,
        serviceCount: serviceUUIDs.length,
        services: serviceUUIDs,
        hasESP32Service,
        isESP32: hasESP32Service || deviceName.includes('ESP32'),
        isConnectable: peripheral.isConnectable,
        advertising: peripheral.advertising
      });

      // Log individual device details for debugging
      console.log(`🎯 Device Details:
        ID: ${peripheral.id}
        Name: ${deviceName}
        RSSI: ${peripheral.rssi} dBm
        Services: ${serviceUUIDs.length}
        Connectable: ${peripheral.isConnectable}
        ESP32 Service: ${hasESP32Service}
        ESP32 Named: ${deviceName.includes('ESP32')}
      `);

      // Accept ALL Bluetooth devices - no filtering
      console.log('✅ Accepting device:', deviceName);
      
      discoveredDevicesRef.current.set(peripheral.id, peripheral);
      
      setDevices(prevDevices => {
        const newDevices = [...prevDevices];
        const existingIndex = newDevices.findIndex(d => d.id === peripheral.id);
        
        if (existingIndex >= 0) {
          // Update existing device with latest info
          newDevices[existingIndex] = peripheral;
        } else {
          // Add new device
          newDevices.push(peripheral);
        }
        
        // Sort by RSSI (strongest signal first)
        return newDevices.sort((a, b) => b.rssi - a.rssi);
      });

      // Log current device count
      console.log(`📊 Total devices discovered: ${discoveredDevicesRef.current.size}`);
      console.log(`📋 Current devices list:`, Array.from(discoveredDevicesRef.current.values()).map(d => ({
        id: d.id,
        name: d.name,
        rssi: d.rssi
      })));
    } catch (error) {
      console.error('❌ Error in handleDiscoverPeripheral:', error);
    }
  }, []);

  // Stop scanning
  const stopScan = useCallback(() => {
    try {
      console.log('⏹️ Stopping BLE scan...');
      BleManager.stopScan().then(() => {
        console.log('✅ Scan stopped successfully');
        // Clean up discovery listener
        if (discoverSubscriptionRef.current) {
          discoverSubscriptionRef.current.remove();
          discoverSubscriptionRef.current = null;
        }
        setIsScanning(false);
      }).catch((error) => {
        console.error('❌ Failed to stop scan:', error);
        setIsScanning(false);
      });
    } catch (error) {
      console.error('❌ Error in stopScan:', error);
      setIsScanning(false);
    }
  }, []);

  // Enhanced scanning with better error handling and state management
  const startScan = useCallback(async () => {
    console.log('🔍 Starting BLE scan...');
    
    // Re-initialize Bluetooth if needed
    const initialized = await initializeBluetooth();
    if (!initialized) {
      setConnectionError('Bluetooth not available');
      return;
    }

    if (!hasPermissions) {
      const permissionResult = await requestBlePermissions();
      if (!permissionResult.granted) {
        setConnectionError('Bluetooth permissions required');
        showPermissionAlert(permissionResult);
        return;
      }
      setHasPermissions(true);
    }

    try {
      setConnectionError(null);
      setIsScanning(true);
      discoveredDevicesRef.current.clear();
      setDevices([]);

      console.log('🎯 Starting BLE scan for ALL Bluetooth devices...');
      
      // Enhanced Bluetooth state checking as shown in the article
      const bluetoothState = await BleManager.checkState();
      console.log('📱 Bluetooth state before scan:', bluetoothState);
      
      if (bluetoothState !== 'on') {
        setConnectionError('Bluetooth is not enabled');
        setIsScanning(false);
        console.log('❌ Cannot scan: Bluetooth is not enabled');
        
        // Show user-friendly alert as shown in the article
        if (Platform.OS === 'ios') {
          Alert.alert(
            'Enable Bluetooth',
            'Please enable Bluetooth in Settings to continue.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => {
                // iOS Settings URL for Bluetooth
                Linking.openURL('App-Prefs:Bluetooth').catch(console.error);
              }},
            ]
          );
        } else {
          try {
            await BleManager.enableBluetooth();
            console.log('✅ Bluetooth enabled successfully');
            // Retry scan after enabling Bluetooth
            startScan();
            return;
          } catch (error) {
            console.log('❌ User refused to enable Bluetooth:', error);
          }
        }
        return;
      }

      // Ensure discovery listener is set up before scanning
      if (!discoverSubscriptionRef.current) {
        console.log('🎯 Setting up discovery listener for scan...');
        discoverSubscriptionRef.current = BleManager.onDiscoverPeripheral(handleDiscoverPeripheral);
      }

      // Enhanced scan parameters as shown in the article
      console.log('🎯 Starting BLE scan with parameters...');
      console.log('📡 Scan settings:', {
        serviceUUIDs: [],
        scanSeconds: 30,
        allowDuplicates: true,
        options: {
          matchMode: 1, // BleScanMatchMode.Sticky
          scanMode: 2, // BleScanMode.LowLatency
          callbackType: 1, // BleScanCallbackType.AllMatches
        }
      });
      
      try {
        // Try the enhanced scan with options first
        await BleManager.scan(
          [], // Empty array scans for all devices
          30, // Scan for 30 seconds
          true, // Allow duplicates to update RSSI
          {
            matchMode: 1, // BleScanMatchMode.Sticky
            scanMode: 2, // BleScanMode.LowLatency
            callbackType: 1, // BleScanCallbackType.AllMatches
          }
        );
        console.log('✅ BLE scan with options started successfully');
      } catch (scanError) {
        console.error('❌ BLE scan with options failed:', scanError);
        
        // Try fallback scan without options
        console.log('🔄 Trying fallback scan without options...');
        try {
          await BleManager.scan([], 30, true);
          console.log('✅ Fallback scan started successfully');
        } catch (fallbackError) {
          console.error('❌ Fallback scan also failed:', fallbackError);
          
          // Last resort: try minimal scan
          console.log('🔄 Trying minimal scan...');
          try {
            await BleManager.scan([], 30, false);
            console.log('✅ Minimal scan started successfully');
          } catch (minimalError) {
            console.error('❌ All scan attempts failed:', minimalError);
            throw scanError;
          }
        }
      }

      console.log('✅ BLE scan started successfully');
      console.log('🎯 Scanning for ALL available Bluetooth devices');
      console.log('📡 Discovery listener status:', discoverSubscriptionRef.current ? 'Active' : 'Not set');
      
      // Check for new architecture compatibility issues
      console.log('🔧 App is running with new architecture enabled');
      console.log('💡 If BLE scanning continues to fail, try setting "newArchEnabled": false in app.json');

      // Auto-stop scan after 30 seconds with enhanced logging
      scanTimeoutRef.current = setTimeout(() => {
        const deviceCount = discoveredDevicesRef.current.size;
        console.log(`⏰ Auto-stopping BLE scan after 30 seconds. Found ${deviceCount} devices.`);
        console.log('📊 Device details:', Array.from(discoveredDevicesRef.current.values()).map(d => ({
          id: d.id,
          name: d.name,
          rssi: d.rssi
        })));
        stopScan();
      }, 30000) as unknown as NodeJS.Timeout;

    } catch (error) {
      console.error('❌ Failed to start scan:', error);
      setConnectionError(`Scan failed: ${error}`);
      setIsScanning(false);
    }
  }, [hasPermissions, stopScan, initializeBluetooth]);

  // Handle incoming health data
  const handleHealthDataUpdate = useCallback((data: any) => {
    console.log('Health data received from ESP32:', data);
    
    // Handle ESP32-specific data format
    if (data.characteristic === ESP32_CHAR_TX_UUID) {
      try {
        // Parse ESP32 data (assuming it's sent as string)
        if (data.value && Array.isArray(data.value)) {
          const receivedData = String.fromCharCode(...data.value);
          console.log('Parsed ESP32 data:', receivedData);
          
          // Parse the health data format from ESP32
          // Example: "heart_rate:72,sleep_hours:7.5,steps:8500"
          const parsedData = parseESP32Data(receivedData);
          if (parsedData) {
            setHealthData(parsedData);
          }
        }
      } catch (error) {
        console.error('Error parsing ESP32 data:', error);
      }
    } else {
      // Parse standard health data based on characteristic UUID
      const parsedData = parseHealthData(data);
      if (parsedData) {
        setHealthData(parsedData);
      }
    }
  }, []);

  // Start health data notifications
  const startHealthDataNotifications = useCallback(async (deviceId: string, services: any) => {
    try {
      // Set up characteristic update listener
      updateSubscriptionRef.current = BleManager.onDidUpdateValueForCharacteristic(handleHealthDataUpdate);

      // Start notification for ESP32 TX characteristic (receiving data from ESP32)
      await BleManager.startNotification(deviceId, ESP32_SERVICE_UUID, ESP32_CHAR_TX_UUID);
      console.log(`Started notification for ESP32 TX characteristic: ${ESP32_CHAR_TX_UUID}`);

      // Also subscribe to any other health characteristics found
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
  
  // Enhanced connection with timeout and better error handling
  const connectToDevice = useCallback(async (deviceId: string) => {
    console.log(`🔗 Connecting to device: ${deviceId}`);
    
    if (!hasPermissions) {
      const permissionResult = await requestBlePermissions();
      if (!permissionResult.granted) {
        setConnectionError('Bluetooth permissions required');
        showPermissionAlert(permissionResult);
        return;
      }
      setHasPermissions(true);
    }

    try {
      setConnectionError(null);
      setIsConnecting(true);
      
      // Set connection timeout (15 seconds)
      const connectionPromise = new Promise<void>((resolve, reject) => {
        connectionTimeoutRef.current = setTimeout(() => {
          reject(new Error('Connection timeout - device not responding'));
        }, 15000) as unknown as NodeJS.Timeout;

        BleManager.connect(deviceId)
          .then(() => resolve())
          .catch(reject);
      });

      await connectionPromise;
      
      console.log('✅ Connected to device');
      
      // Discover services
      const services = await BleManager.retrieveServices(deviceId);
      console.log('🔍 Services discovered:', {
        deviceId,
        serviceCount: services.services?.length || 0,
        services: services.services?.map(s => ({
          uuid: s.uuid,
          characteristicCount: 0 // Placeholder - actual characteristics would be available in service object
        }))
      });
      
      // Find the connected device
      const device = devices.find(d => d.id === deviceId) || discoveredDevicesRef.current.get(deviceId);
      if (device) {
        setConnectedDevice(device);
        setIsConnected(true);
        
        // Start notifications for health data
        await startHealthDataNotifications(deviceId, services);
        
        console.log('✅ Device connection and setup complete');
      } else {
        throw new Error('Connected device not found in device list');
      }
      
    } catch (error) {
      console.error('❌ Failed to connect to device:', error);
      setConnectionError(`Connection failed: ${error}`);
      
      // Show user-friendly error
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          Alert.alert('Connection Timeout', 'The device is not responding. Please ensure it is powered on and in range.');
        } else if (error.message.includes('Device not found')) {
          Alert.alert('Device Not Found', 'The selected device is no longer available. Please scan again.');
        } else {
          Alert.alert('Connection Failed', 'Unable to connect to the device. Please try again.');
        }
      }
    } finally {
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
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
      
      // Sleep hours (placeholder - would come from a sleep tracking device)
      // For now, we'll simulate sleep hours based on time of day
      else if (characteristic.toLowerCase() === CHARACTERISTIC_UUIDS.bloodPressureMeasurement.toLowerCase()) {
        // Reusing blood pressure characteristic for sleep hours simulation
        // In a real implementation, this would come from a sleep tracking device
        const currentHour = new Date().getHours();
        const isSleepTime = currentHour >= 22 || currentHour <= 6;
        const sleepHours = isSleepTime ? Math.random() * 2 + 6 : Math.random() * 2 + 4; // 6-8 hours at night, 4-6 hours during day
        
        parsedData.sleepHours = parseFloat(sleepHours.toFixed(1));
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
          sleepHours: parsedData.sleepHours || 0,
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

  // Parse ESP32-specific data format
  const parseESP32Data = (dataString: string): HealthData | null => {
    try {
      console.log('Parsing ESP32 data string:', dataString);
      
      // Example format: "heart_rate:72,sleep_hours:7.5,steps:8500"
      const parts = dataString.split(',');
      const parsedData: Partial<HealthData> = {
        timestamp: new Date()
      };
      
      for (const part of parts) {
        const [key, value] = part.split(':');
        if (key && value) {
          const trimmedKey = key.trim().toLowerCase();
          const numValue = parseFloat(value.trim());
          
          if (trimmedKey === 'heart_rate' || trimmedKey === 'heartrate') {
            parsedData.heartRate = numValue;
          } else if (trimmedKey === 'sleep_hours' || trimmedKey === 'sleep') {
            parsedData.sleepHours = numValue;
          } else if (trimmedKey === 'temperature' || trimmedKey === 'temp') {
            parsedData.temperature = numValue;
          } else if (trimmedKey === 'oxygen' || trimmedKey === 'spo2') {
            parsedData.oxygenLevel = numValue;
          }
        }
      }
      
      // Return complete health data object
      if (Object.keys(parsedData).length > 1) {
        return {
          heartRate: parsedData.heartRate || 0,
          sleepHours: parsedData.sleepHours || 0,
          temperature: parsedData.temperature || 0,
          oxygenLevel: parsedData.oxygenLevel || 0,
          timestamp: parsedData.timestamp!
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to parse ESP32 data:', error);
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
    hasPermissions,
    permissionDetails
  };
};

export default useBluetooth;