import { PermissionsAndroid, Platform } from 'react-native';

export const requestBlePermissions = async (): Promise<boolean> => {
  // 1. Handle iOS (Permissions are requested when you call BleManager.start())
  if (Platform.OS === 'ios') {
    // iOS permissions are handled by the system on first use
    return true;
  }

  // 2. Handle Android
  const androidApiLevel = Platform.Version;

  if (Number(androidApiLevel) < 31) {
    // Android 11 (API 30) and older
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'This app needs location permission to scan for BLE devices.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } else {
    // Android 12 (API 31) and newer
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);

    const isScanGranted =
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const isConnectGranted =
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
      PermissionsAndroid.RESULTS.GRANTED;

    return isScanGranted && isConnectGranted;
  }
};