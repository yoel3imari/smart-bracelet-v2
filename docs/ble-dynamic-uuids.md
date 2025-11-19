# BLE Dynamic UUID System

## Overview

The BLE Dynamic UUID system allows the smart bracelet application to work with different BLE devices that may have different service and characteristic UUIDs. This system provides three levels of UUID configuration:

1. **Environment Variables** (Highest Priority)
2. **Automatic Device Discovery** 
3. **Default UUIDs** (Fallback)

## Configuration Priority

The system follows this priority order:

1. **Environment Variables**: Set via `.env` file
2. **Device Discovery**: Automatically discovered from connected device
3. **Default UUIDs**: Hardcoded fallback values

## Environment Variables

Add these variables to your `.env` file to override default UUIDs:

```env
EXPO_PUBLIC_BLE_SERVICE_UUID=6E400001-B5A3-F393-E0A9-E50E24DCCA9E
EXPO_PUBLIC_BLE_CHAR_TX_UUID=6E400003-B5A3-F393-E0A9-E50E24DCCA9E
EXPO_PUBLIC_BLE_CHAR_RX_UUID=6E400002-B5A3-F393-E0A9-E50E24DCCA9E
```

## Automatic Device Discovery

When no environment variables are set, the system automatically discovers UUIDs from connected devices:

1. **Service Discovery**: Looks for services with names containing "data", "sensor", or "health"
2. **Characteristic Discovery**: 
   - TX Characteristic: Looks for "tx", "write", or "notify" in UUID/name
   - RX Characteristic: Looks for "rx" or "read" in UUID/name

## Default UUIDs

If neither environment variables nor device discovery work, the system falls back to these default UUIDs:

- **Service UUID**: `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
- **TX Characteristic**: `6E400003-B5A3-F393-E0A9-E50E24DCCA9E` (for data reception)
- **RX Characteristic**: `6E400002-B5A3-F393-E0A9-E50E24DCCA9E` (for data transmission)

## Implementation Details

### Configuration System

Located in `config/ble-uuid-config.ts`:

- `getBleUuidConfig()`: Main function to get UUID configuration
- `discoverUuidsFromDevice()`: Automatically discovers UUIDs from device
- `validateUuidConfig()`: Validates UUID configuration

### Hook Integration

The `useBLE` hook in `hooks/use-ble.ts` has been updated to:

1. Discover services and characteristics during connection
2. Automatically detect appropriate UUIDs
3. Use the dynamic UUID configuration system
4. Provide UUID configuration state for debugging

### API Changes

The `useBLE` hook now returns an additional property:
- `bleUuidConfig`: Contains the current UUID configuration and source

## Usage Examples

### Using Environment Variables

```env
# .env file
EXPO_PUBLIC_BLE_SERVICE_UUID=12345678-1234-1234-1234-123456789ABC
EXPO_PUBLIC_BLE_CHAR_TX_UUID=12345678-1234-1234-1234-123456789ABD
EXPO_PUBLIC_BLE_CHAR_RX_UUID=12345678-1234-1234-1234-123456789ABE
```

### Debugging UUID Configuration

```typescript
const { bleUuidConfig } = useBLE();

console.log('UUID Configuration:', {
  service: bleUuidConfig?.serviceUuid,
  tx: bleUuidConfig?.txCharacteristicUuid,
  rx: bleUuidConfig?.rxCharacteristicUuid,
  source: bleUuidConfig?.source
});
```

## Testing

The system includes comprehensive logging to help debug UUID configuration:

- Service discovery logs
- Characteristic discovery logs  
- UUID configuration source logs
- Validation error logs

## Benefits

1. **Flexibility**: Works with different BLE devices without code changes
2. **Backward Compatibility**: Maintains support for existing ESP32 devices
3. **Easy Configuration**: Simple environment variable setup
4. **Automatic Discovery**: No manual configuration needed for standard devices
5. **Debugging**: Comprehensive logging for troubleshooting

## Troubleshooting

### Common Issues

1. **UUID Discovery Fails**: Check if device services/characteristics follow naming conventions
2. **Environment Variables Not Working**: Ensure variables are prefixed with `EXPO_PUBLIC_`
3. **Connection Fails**: Verify UUIDs match the actual device configuration

### Debug Steps

1. Check console logs for UUID discovery process
2. Verify environment variables are loaded
3. Confirm device services and characteristics are properly discovered
4. Use the `bleUuidConfig` state to inspect current configuration