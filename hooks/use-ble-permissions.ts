import { PermissionsAndroid, Platform, Alert } from 'react-native';

export interface PermissionResult {
  granted: boolean;
  error?: string;
  details?: {
    bluetoothScan?: boolean;
    bluetoothConnect?: boolean;
    location?: boolean;
  };
}

export const requestBlePermissions = async (): Promise<PermissionResult> => {
  try {
    // 1. Handle iOS (Permissions are requested when you call BleManager.start())
    if (Platform.OS === 'ios') {
      // iOS permissions are handled by the system on first use
      // We can check if Bluetooth is available and enabled
      return { granted: true, details: { bluetoothScan: true, bluetoothConnect: true } };
    }

    // 2. Handle Android
    const androidApiLevel = Platform.Version;
    const details: PermissionResult['details'] = {};

    if (Number(androidApiLevel) < 31) {
      // Android 11 (API 30) and older
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission Required',
          message: 'This app needs location permission to scan for Bluetooth devices.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      
      details.location = granted === PermissionsAndroid.RESULTS.GRANTED;
      return {
        granted: details.location,
        details,
        error: details.location ? undefined : 'Location permission denied'
      };
    } else {
      // Android 12 (API 31) and newer
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, // Still needed for some devices
      ]);

      details.bluetoothScan =
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
        PermissionsAndroid.RESULTS.GRANTED;
      details.bluetoothConnect =
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED;
      details.location =
        result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;

      const granted = details.bluetoothScan && details.bluetoothConnect;
      
      return {
        granted,
        details,
        error: granted ? undefined : 'Bluetooth permissions denied'
      };
    }
  } catch (error) {
    console.error('Error requesting BLE permissions:', error);
    return {
      granted: false,
      error: `Permission request failed: ${error}`
    };
  }
};

export const checkBlePermissions = async (): Promise<PermissionResult> => {
  try {
    if (Platform.OS === 'ios') {
      // iOS permissions are handled differently
      return { granted: true, details: { bluetoothScan: true, bluetoothConnect: true } };
    }

    const androidApiLevel = Platform.Version;
    const details: PermissionResult['details'] = {};

    if (Number(androidApiLevel) < 31) {
      // Android 11 (API 30) and older
      const hasLocation = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      details.location = hasLocation;
      return { granted: hasLocation, details };
    } else {
      // Android 12 (API 31) and newer
      const hasScan = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
      );
      const hasConnect = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      );
      const hasLocation = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      details.bluetoothScan = hasScan;
      details.bluetoothConnect = hasConnect;
      details.location = hasLocation;

      return { granted: hasScan && hasConnect, details };
    }
  } catch (error) {
    console.error('Error checking BLE permissions:', error);
    return { granted: false, error: `Permission check failed: ${error}` };
  }
};

export const showPermissionAlert = (result: PermissionResult) => {
  if (!result.granted) {
    Alert.alert(
      'Bluetooth Permissions Required',
      'This app needs Bluetooth permissions to connect to health monitoring devices. Please grant the required permissions in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => {
          // This would typically open app settings
          console.log('Should open app settings');
        }},
      ]
    );
  }
};