/* eslint-disable no-bitwise */
import { useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

import * as ExpoDevice from "expo-device";
import base64 from 'react-native-base64';
import {
    BleError,
    BleManager,
    Characteristic,
    Device,
    State,
} from "react-native-ble-plx";

const DATA_SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const CHAR_UUID_TX = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
const CHAR_UUID_RX = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";

const bleManager = new BleManager();

function useBLE() {
    const [allDevices, setAllDevices] = useState<Device[]>([]);
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
    const [sensorData, setSensorData] = useState({
        heartRate: 0,
        spo2: 0,
        temperature: 0,
        acceleration: { x: 0, y: 0, z: 0 },
        gyroscope: { x: 0, y: 0, z: 0 }
    });
    const [isScanning, setIsScanning] = useState(false);
    const [mtuSize, setMtuSize] = useState<number>(512); // Default BLE MTU
    const [bluetoothState, setBluetoothState] = useState<State>(State.Unknown);

    const requestAndroid31Permissions = async () => {
        const bluetoothScanPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            {
                title: "Location Permission",
                message: "Bluetooth Low Energy requires Location",
                buttonPositive: "OK",
            }
        );
        const bluetoothConnectPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            {
                title: "Location Permission",
                message: "Bluetooth Low Energy requires Location",
                buttonPositive: "OK",
            }
        );
        const fineLocationPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: "Location Permission",
                message: "Bluetooth Low Energy requires Location",
                buttonPositive: "OK",
            }
        );

        return (
            bluetoothScanPermission === "granted" &&
            bluetoothConnectPermission === "granted" &&
            fineLocationPermission === "granted"
        );
    };

    const requestPermissions = async () => {
        if (Platform.OS === "android") {
            if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Location Permission",
                        message: "Bluetooth Low Energy requires Location",
                        buttonPositive: "OK",
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } else {
                const isAndroid31PermissionsGranted =
                    await requestAndroid31Permissions();

                return isAndroid31PermissionsGranted;
            }
        } else {
            return true;
        }
    };

    const connectToDevice = async (device: Device) => {
        try {
            console.log(`Connecting to device ${device.name} ${device.id}`);

            // Stop scanning immediately when connecting to a device
            if (isScanning) {
                bleManager.stopDeviceScan();
                setIsScanning(false);
            }

            const deviceConnection = await bleManager.connectToDevice(device.id);
            setConnectedDevice(deviceConnection);
            await deviceConnection.discoverAllServicesAndCharacteristics();

            // Request larger MTU for better data transfer
            try {
                const deviceWithMtu = await deviceConnection.requestMTU(512);
                // The MTU size is available in the device object after request
                // Note: react-native-ble-plx doesn't directly return MTU size,
                // but we can assume the requested size was negotiated
                setMtuSize(512);
                console.log(`MTU requested: 512 bytes`);
            } catch (mtuError) {
                console.log("MTU request failed, using default:", mtuError);
                // Continue with default MTU
            }

            startStreamingData(deviceConnection);
        } catch (e) {
            console.log("FAILED TO CONNECT", e);
        }
    };

    const isDuplicteDevice = (devices: Device[], nextDevice: Device) =>
        devices.findIndex((device) => nextDevice.id === device.id) > -1;

    const checkBluetoothState = async (): Promise<boolean> => {
        try {
            const state = await bleManager.state();
            setBluetoothState(state);
            return state === State.PoweredOn;
        } catch (error) {
            console.log("Error checking Bluetooth state:", error);
            setBluetoothState(State.Unknown);
            return false;
        }
    };

    const scanForPeripherals = async (): Promise<boolean> => {
        if (isScanning) {
            console.log("Scan already in progress");
            return false;
        }

        // Check Bluetooth state before scanning
        const isBluetoothEnabled = await checkBluetoothState();
        if (!isBluetoothEnabled) {
            console.log("Bluetooth is not enabled, cannot scan");
            return false;
        }

        setIsScanning(true);
        setAllDevices([]); // Clear previous devices

        // Start scan with timeout
        bleManager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.log("BLE Scan Error:", error);
                setIsScanning(false);
                return;
            }

            if (device && device.name) {
                console.log(`Found device: ${device.name} ${device.id}`);

                setAllDevices((prevState: Device[]) => {
                    if (!isDuplicteDevice(prevState, device)) {
                        return [...prevState, device];
                    }
                    return prevState;
                });
            } else if (device) {
                console.log(`Found unnamed device (filtered out): ${device.id}`);
            }
        });

        // Stop scan after 30 seconds
        setTimeout(() => {
            console.log("BLE scan timeout reached (30 seconds) - stopping scan");
            stopScan();
        }, 30000);

        return true;
    };

    const stopScan = () => {
        if (isScanning) {
            bleManager.stopDeviceScan();
            setIsScanning(false);
            console.log("BLE scan stopped");
        }
    };

    const disconnectFromDevice = () => {
        if (connectedDevice) {
            bleManager.cancelDeviceConnection(connectedDevice.id);
            setConnectedDevice(null);
            setSensorData({
                heartRate: 0,
                spo2: 0,
                temperature: 0,
                acceleration: { x: 0, y: 0, z: 0 },
                gyroscope: { x: 0, y: 0, z: 0 }
            });
            console.log("Disconnected from device");
        }
    };

    const onDataUpdate = (
        error: BleError | null,
        characteristic: Characteristic | null
    ) => {
        if (error) {
            console.log("Error receiving data from device", error);
            return;
        }
        if (characteristic?.value) {
            const rawData = base64.decode(characteristic.value);
            console.log("Raw data received:", rawData);

            try {
                // Parse JSON data from ESP32
                const parsedData = JSON.parse(rawData);

                // Log sensor data with timestamps
                const timestamp = new Date().toISOString();
                console.log(`[${timestamp}] Sensor Data:`, {
                    heartRate: parsedData.heartRate,
                    spo2: parsedData.spo2,
                    temperature: parsedData.temperature,
                    acceleration: parsedData.acceleration,
                    gyroscope: parsedData.gyroscope
                });

                // Update state with parsed data
                setSensorData({
                    heartRate: parsedData.heartRate || 0,
                    spo2: parsedData.spo2 || 0,
                    temperature: parsedData.temperature || 0,
                    acceleration: parsedData.acceleration || { x: 0, y: 0, z: 0 },
                    gyroscope: parsedData.gyroscope || { x: 0, y: 0, z: 0 }
                });

            } catch (parseError) {
                // If JSON parsing fails, try to parse as CSV format
                console.log("JSON parsing failed, trying CSV format:", parseError);

                const values = rawData.split(',').map(val => parseFloat(val.trim()));
                if (values.length >= 8) {
                    const timestamp = new Date().toISOString();
                    console.log(`[${timestamp}] Sensor Data (CSV):`, {
                        heartRate: values[0],
                        spo2: values[1],
                        temperature: values[2],
                        acceleration: { x: values[3], y: values[4], z: values[5] },
                        gyroscope: { x: values[6], y: values[7], z: values[8] || 0 }
                    });

                    setSensorData({
                        heartRate: values[0],
                        spo2: values[1],
                        temperature: values[2],
                        acceleration: { x: values[3], y: values[4], z: values[5] },
                        gyroscope: { x: values[6], y: values[7], z: values[8] || 0 }
                    });
                } else {
                    console.log("Invalid data format received:", rawData);
                }
            }
        }
    };

    const startStreamingData = async (device: Device) => {
        if (!device) {
            console.log('No device connected');
            return;
        }

        device.monitorCharacteristicForService(
            DATA_SERVICE_UUID,
            CHAR_UUID_TX,
            onDataUpdate
        );

        const dummy = base64.encode('1');   // any single byte is enough
        await device.writeCharacteristicWithResponseForService(
            DATA_SERVICE_UUID,
            CHAR_UUID_RX,               // 6E400002-…
            dummy
        );
    };

    return {
        connectToDevice,
        allDevices,
        connectedDevice,
        sensorData,
        mtuSize,
        isScanning,
        bluetoothState,
        requestPermissions,
        scanForPeripherals,
        stopScan,
        disconnectFromDevice,
        startStreamingData,
        checkBluetoothState,
    };
}

export default useBLE;