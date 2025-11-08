# BLE Permissions Guide

## How to Check Device Permissions

### 1. Check Console Logs
The app now includes comprehensive logging for BLE permissions. Look for these messages in your development console:

```
Initializing Bluetooth...
BLE Permissions granted: true/false
Bluetooth state: on/off
```

### 2. Android Permissions Check

#### For Android 12+ (API 31+):
1. Go to **Settings** > **Apps** > **Your App Name** > **Permissions**
2. Ensure these permissions are granted:
   - **Bluetooth (Nearby devices)**
   - **Location** (required for BLE scanning on some devices)

#### For Android 11 and below:
1. Go to **Settings** > **Apps** > **Your App Name** > **Permissions**
2. Ensure **Location** permission is granted

### 3. iOS Permissions Check
1. Go to **Settings** > **Privacy & Security** > **Bluetooth**
2. Ensure your app is toggled ON

### 4. App-Level Permissions Display
I've enhanced the app to show permission status in the console. You can also add a visual indicator in the UI by checking the `hasPermissions` state from the `useBle` hook.

## Common Permission Issues

### Android Specific:
- **Location Permission Required**: BLE scanning requires location permission on Android
- **Bluetooth Scanning**: Android 12+ requires explicit BLUETOOTH_SCAN permission
- **Background Restrictions**: Some devices restrict BLE in background

### iOS Specific:
- **Bluetooth Permission Popup**: iOS shows permission request on first BLE usage
- **Info.plist Entry**: Ensure `NSBluetoothAlwaysUsageDescription` is set

## Debugging Steps

### 1. Check Console Output
Look for these specific log messages:
- `BLE Permissions granted: true` - Permissions are working
- `Bluetooth state: on` - Bluetooth is enabled
- `BLE scan started successfully` - Scanning is active

### 2. Test Permissions Programmatically
You can add this code snippet to test permissions:

```typescript
import { PermissionsAndroid, Platform } from 'react-native';

const checkPermissions = async () => {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 31) {
      const hasScan = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
      );
      const hasConnect = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      );
      console.log('Android 12+ Permissions - Scan:', hasScan, 'Connect:', hasConnect);
    } else {
      const hasLocation = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      console.log('Android 11- Location Permission:', hasLocation);
    }
  }
};
```

### 3. Manual Permission Request
If permissions are denied, the app should automatically request them when you try to scan for devices. If not, you can manually trigger permission requests through device settings.

## Quick Fixes

1. **Restart the App**: Sometimes permissions need an app restart
2. **Clear App Data**: Go to Settings > Apps > Your App > Storage > Clear Data
3. **Reinstall the App**: Completely remove and reinstall the app
4. **Check Device Bluetooth**: Ensure Bluetooth is actually enabled on the device

## Testing ESP32 Detection

Once permissions are confirmed, test ESP32 detection:

1. Open the app and tap "Connect Device"
2. Look for console logs showing device discovery
3. ESP32 devices should appear in the device list regardless of name
4. If still not appearing, check if ESP32 is advertising and in range

The enhanced logging in the current implementation will help identify exactly where the issue occurs in the BLE scanning process.