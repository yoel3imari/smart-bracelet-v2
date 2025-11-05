import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from 'react';
import BleManager from 'react-native-ble-manager';
import { requestBlePermissions } from '@/hooks/useBlePermissions';

// 1. Define the Context's shape
export interface BleContextType {
  hasPermissions: boolean;
  // We will add more here later (e.g., scannedDevices)
}

// 2. Create the Context
const BleContext = createContext<BleContextType | null>(null);

// 3. Create the Provider component
export const BleProvider = ({ children }: { children: ReactNode }) => {
  const [hasPermissions, setHasPermissions] = useState(false);

  useEffect(() => {
    // This effect runs once on app load
    const checkPermissions = async () => {
      console.log('Checking BLE permissions...');
      const granted = await requestBlePermissions(); // The function from our last step
      setHasPermissions(granted);
      
      if (granted) {
        console.log('BLE permissions are granted');
        // Initialize BleManager *after* permissions are granted
        BleManager.start({ showAlert: false })
          .then(() => {
            console.log('BleManager initialized');
          })
          .catch((error) => {
            console.error('BleManager initialization error', error);
          });
      } else {
        console.log('BLE permissions were denied');
      }
    };

    checkPermissions();
  }, []);

  return (
    <BleContext.Provider value={{ hasPermissions }}>
      {children}
    </BleContext.Provider>
  );
};

// 4. Create a custom hook for easy access
export const useBle = () => {
  return useContext(BleContext);
};