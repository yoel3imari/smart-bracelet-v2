import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';
import { requestBlePermissions } from '@/hooks/use-ble-permissions';
import useBluetooth, { BluetoothDevice, HealthData } from '@/hooks/useBluetooth';

// 1. Define the Context's shape
export interface BleContextType {
  // Permissions
  hasPermissions: boolean;
  
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
}

// 2. Create the Context
const BleContext = createContext<BleContextType | null>(null);

// 3. Create the Provider component
export const BleProvider = ({ children }: { children: ReactNode }) => {
  const [hasPermissions, setHasPermissions] = useState(false);
  
  // Use the Bluetooth hook for device management
  const bluetooth = useBluetooth();

  useEffect(() => {
    // This effect runs once on app load
    const checkPermissions = async () => {
      console.log('Checking BLE permissions...');
      const granted = await requestBlePermissions();
      setHasPermissions(granted);
      
      if (granted) {
        console.log('BLE permissions are granted');
        // BleManager is already initialized in useBluetooth hook
      } else {
        console.log('BLE permissions were denied');
      }
    };

    checkPermissions();
  }, []);

  // Combine context values
  const contextValue: BleContextType = {
    // Permissions
    hasPermissions,
    
    // Device Management
    devices: bluetooth.devices,
    connectedDevice: bluetooth.connectedDevice,
    isConnected: bluetooth.isConnected,
    isConnecting: bluetooth.isConnecting,
    isScanning: bluetooth.isScanning,
    
    // Actions
    startScan: bluetooth.startScan,
    stopScan: bluetooth.stopScan,
    connectToDevice: bluetooth.connectToDevice,
    disconnectFromDevice: bluetooth.disconnectFromDevice,
    
    // Data
    healthData: bluetooth.healthData,
    connectionError: bluetooth.connectionError,
  };

  return (
    <BleContext.Provider value={contextValue}>
      {children}
    </BleContext.Provider>
  );
};

// 4. Create a custom hook for easy access
export const useBle = () => {
  const context = useContext(BleContext);
  if (!context) {
    throw new Error('useBle must be used within a BleProvider');
  }
  return context;
};