import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import useBLE from '@/hooks/use-ble';
import { Device } from 'react-native-ble-plx';

export interface BleState {
  allDevices: Device[];
  connectedDevice: Device | null;
  sensorData: {
    heartRate: number;
    spo2: number;
    temperature: number;
    acceleration: { x: number; y: number; z: number };
    gyroscope: { x: number; y: number; z: number };
  };
  isScanning: boolean;
  isConnected: boolean;
  connectionError: string | null;
  bluetoothState: string;
}

export interface BleActions {
  connectToDevice: (device: Device) => Promise<void>;
  disconnectFromDevice: () => void;
  requestPermissions: () => Promise<boolean>;
  scanForPeripherals: () => Promise<boolean>;
  stopScan: () => void;
  checkBluetoothState: () => Promise<boolean>;
}

export const [BleProvider, useBle] = createContextHook(() => {
  const {
    allDevices,
    connectedDevice,
    sensorData,
    isScanning,
    bluetoothState,
    connectToDevice,
    requestPermissions,
    scanForPeripherals,
    stopScan,
    disconnectFromDevice,
    checkBluetoothState,
  } = useBLE();

  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Clear connection error when connected
  useEffect(() => {
    if (connectedDevice) {
      setConnectionError(null);
    }
  }, [connectedDevice]);

  const handleConnectToDevice = useCallback(async (device: Device) => {
    try {
      setConnectionError(null);
      await connectToDevice(device);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setConnectionError(errorMessage);
      console.error('BLE connection error:', error);
    }
  }, [connectToDevice]);

  const handleDisconnectFromDevice = useCallback(() => {
    setConnectionError(null);
    disconnectFromDevice();
  }, [disconnectFromDevice]);

  const state: BleState = useMemo(() => ({
    allDevices,
    connectedDevice,
    sensorData,
    isScanning,
    isConnected: !!connectedDevice,
    connectionError,
    bluetoothState,
  }), [allDevices, connectedDevice, sensorData, isScanning, connectionError, bluetoothState]);

  const actions: BleActions = useMemo(() => ({
    connectToDevice: handleConnectToDevice,
    disconnectFromDevice: handleDisconnectFromDevice,
    requestPermissions,
    scanForPeripherals,
    stopScan,
    checkBluetoothState,
  }), [handleConnectToDevice, handleDisconnectFromDevice, requestPermissions, scanForPeripherals, stopScan, checkBluetoothState]);

  return useMemo(() => ({
    ...state,
    ...actions,
  }), [state, actions]);
});