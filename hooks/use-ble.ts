/* eslint-disable no-bitwise */
import { useState } from "react";
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

// Default UUIDs for ESP32 BLE devices (fallback if discovery fails)
const DEFAULT_DATA_SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const DEFAULT_CHAR_UUID_TX = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
const DEFAULT_CHAR_UUID_RX = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";

// Standard BLE MTU sizes
const MAX_MTU_SIZE = 512; // Maximum BLE 4.0+ MTU
const DEFAULT_MTU_SIZE = 512; // Minimum BLE MTU

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
    const [mtuSize, setMtuSize] = useState<number>(DEFAULT_MTU_SIZE); // Default BLE MTU
    const [discoveredServices, setDiscoveredServices] = useState<string[]>([]);
    const [discoveredCharacteristics, setDiscoveredCharacteristics] = useState<string[]>([]);
    const [bluetoothState, setBluetoothState] = useState<State>(State.Unknown);
    const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);

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

    const checkLocationPermission = async (): Promise<boolean> => {
        console.log("useBLE: Checking location permission...");
        if (Platform.OS === "android") {
            try {
                console.log("useBLE: Android platform - checking fine location permission");
                const granted = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );
                console.log("useBLE: Android location permission result:", granted);
                setHasLocationPermission(granted);
                return granted;
            } catch (error) {
                console.log("useBLE: Error checking location permission:", error);
                setHasLocationPermission(false);
                return false;
            }
        } else {
            // For iOS, location permission is handled differently
            // We'll assume it's granted for now as iOS handles this differently
            console.log("useBLE: iOS platform - assuming location permission granted");
            setHasLocationPermission(true);
            return true;
        }
    };

    const requestPermissions = async () => {
        if (Platform.OS === "android") {
            if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Location Permission",
                        message: "Bluetooth Low Energy requires Location to scan for nearby devices",
                        buttonPositive: "OK",
                    }
                );
                const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
                setHasLocationPermission(hasPermission);
                return hasPermission;
            } else {
                const isAndroid31PermissionsGranted =
                    await requestAndroid31Permissions();
                setHasLocationPermission(isAndroid31PermissionsGranted);
                return isAndroid31PermissionsGranted;
            }
        } else {
            // For iOS, permissions are handled differently
            // We'll assume they're granted for now
            setHasLocationPermission(true);
            return true;
        }
    };

    const checkAllPermissions = async (): Promise<{
        bluetoothEnabled: boolean;
        locationPermission: boolean;
    }> => {
        console.log("useBLE: Starting checkAllPermissions...");
        const bluetoothEnabled = await checkBluetoothState();
        console.log("useBLE: Bluetooth state check result:", bluetoothEnabled);
        const locationPermission = await checkLocationPermission();
        console.log("useBLE: Location permission check result:", locationPermission);
        
        const result = {
            bluetoothEnabled,
            locationPermission
        };
        console.log("useBLE: checkAllPermissions returning:", result);
        return result;
    };

    const connectToDevice = async (device: Device) => {
        try {
            console.log(`Connecting to device ${device.name} ${device.id}`);

            // Stop scanning immediately when connecting to a device
            if (isScanning) {
                bleManager.stopDeviceScan();
                setIsScanning(false);
            }

            // Add connection timeout
            const connectionTimeout = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("Connection timeout after 10 seconds")), 10000);
            });

            const deviceConnection = await Promise.race([
                bleManager.connectToDevice(device.id),
                connectionTimeout
            ]);
            
            setConnectedDevice(deviceConnection);
            
            // Discover all services and characteristics
            await deviceConnection.discoverAllServicesAndCharacteristics();
            
            // Get discovered services and characteristics
            const services = await deviceConnection.services();
            const serviceIds = services.map(service => service.uuid);
            setDiscoveredServices(serviceIds);
            
            console.log(`Discovered services: ${serviceIds.join(', ')}`);
            
            // Discover characteristics for each service
            const allCharacteristics: string[] = [];
            for (const service of services) {
                const characteristics = await deviceConnection.characteristicsForService(service.uuid);
                const charIds = characteristics.map(char => char.uuid);
                allCharacteristics.push(...charIds);
                console.log(`Service ${service.uuid} characteristics: ${charIds.join(', ')}`);
            }
            setDiscoveredCharacteristics(allCharacteristics);

            // Request optimal MTU with fallback
            try {
                console.log(`Requesting MTU: ${MAX_MTU_SIZE} bytes`);
                await deviceConnection.requestMTU(MAX_MTU_SIZE);
                setMtuSize(MAX_MTU_SIZE);
                console.log(`MTU negotiated: ${MAX_MTU_SIZE} bytes`);
            } catch (mtuError) {
                console.log(`MTU request failed (${MAX_MTU_SIZE} bytes), reason:`, (mtuError as any)?.reason || mtuError);
                try {
                    // Fallback to default MTU
                    console.log(`Falling back to default MTU: ${DEFAULT_MTU_SIZE} bytes`);
                    await deviceConnection.requestMTU(DEFAULT_MTU_SIZE);
                    setMtuSize(DEFAULT_MTU_SIZE);
                    console.log(`MTU negotiated: ${DEFAULT_MTU_SIZE} bytes`);
                } catch (fallbackError) {
                    console.log(`Default MTU request also failed, reason:`, (fallbackError as any)?.reason || fallbackError);
                    console.log("Continuing with platform default MTU");
                }
            }

            startStreamingData(deviceConnection);
        } catch (e) {
            console.log("FAILED TO CONNECT", e);
            console.log("Connection error reason:", (e as any)?.reason || "Unknown reason");
            
            // Attempt recovery by disconnecting
            if (device) {
                try {
                    await bleManager.cancelDeviceConnection(device.id);
                } catch (disconnectError) {
                    console.log("Failed to clean up connection:", disconnectError);
                }
            }
        }
    };

    const isDuplicteDevice = (devices: Device[], nextDevice: Device) =>
        devices.findIndex((device) => nextDevice.id === device.id) > -1;

    const checkBluetoothState = async (): Promise<boolean> => {
        try {
            console.log("useBLE: Checking Bluetooth state...");
            
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("Bluetooth state check timeout")), 3000);
            });
            
            const state = await Promise.race([
                bleManager.state(),
                timeoutPromise
            ]);
            
            console.log("useBLE: Bluetooth state received:", state);
            setBluetoothState(state);
            const isPoweredOn = state === State.PoweredOn;
            console.log("useBLE: Bluetooth is powered on:", isPoweredOn);
            return isPoweredOn;
        } catch (error) {
            console.log("useBLE: Error checking Bluetooth state:", error);
            setBluetoothState(State.Unknown);
            return false;
        }
    };

    const scanForPeripherals = async (): Promise<boolean> => {
        if (isScanning) {
            console.log("Scan already in progress");
            return false;
        }

        // Check all permissions before scanning
        const permissions = await checkAllPermissions();
        
        if (!permissions.bluetoothEnabled) {
            console.log("Bluetooth is not enabled, cannot scan");
            return false;
        }

        if (!permissions.locationPermission) {
            console.log("Location permission not granted, cannot scan");
            return false;
        }

        setIsScanning(true);
        setAllDevices([]); // Clear previous devices

        // Start scan with timeout
        bleManager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.log("BLE Scan Error:", error);
                console.log("BLE Scan error reason:", error.reason || "Unknown reason");
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

    const disconnectFromDevice = async () => {
        if (connectedDevice) {
            try {
                await bleManager.cancelDeviceConnection(connectedDevice.id);
                console.log("Successfully disconnected from device");
            } catch (error) {
                console.log("Error disconnecting from device:", error);
                console.log("Disconnection error reason:", (error as any)?.reason || "Unknown reason");
            } finally {
                setConnectedDevice(null);
                setSensorData({
                    heartRate: 0,
                    spo2: 0,
                    temperature: 0,
                    acceleration: { x: 0, y: 0, z: 0 },
                    gyroscope: { x: 0, y: 0, z: 0 }
                });
                setDiscoveredServices([]);
                setDiscoveredCharacteristics([]);
            }
        }
    };

    const onDataUpdate = (
        error: BleError | null,
        characteristic: Characteristic | null
    ) => {
        if (error) {
            console.log("Error receiving data from device", error);
            console.log("Data update error reason:", error.reason || "Unknown reason");
            
            // Attempt recovery by restarting streaming if device is still connected
            if (connectedDevice) {
                console.log("Attempting to restart data streaming...");
                setTimeout(() => {
                    if (connectedDevice) {
                        startStreamingData(connectedDevice);
                    }
                }, 2000);
            }
            return;
        }
        if (characteristic?.value) {
            console.log("Raw data received:", characteristic.value);
            const rawData = base64.decode(characteristic.value);
            console.log("Raw data decoded:", rawData);

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

        try {
            // Add timeout for monitoring operation
            const monitorTimeout = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("Monitor characteristic timeout after 5 seconds")), 5000);
            });

            await Promise.race([
                new Promise<void>((resolve, reject) => {
                    device.monitorCharacteristicForService(
                        DEFAULT_DATA_SERVICE_UUID,
                        DEFAULT_CHAR_UUID_TX,
                        (error, characteristic) => {
                            if (error) {
                                console.log("Monitor characteristic error:", error);
                                console.log("Monitor error reason:", error.reason || "Unknown reason");
                                const errorMessage = error?.message || error?.reason || "BLE operation failed";
                                const fixedError = new Error(errorMessage);
                                (fixedError as any).code = error?.errorCode || "BLE_ERROR";
                                reject(fixedError);
                            } else {
                                onDataUpdate(error, characteristic);
                                resolve();
                            }
                        }
                    );
                }),
                monitorTimeout
            ]);

            const dummy = base64.encode('1');   // any single byte is enough
            
            // Add timeout for write operation
            const writeTimeout = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("Write characteristic timeout after 5 seconds")), 5000);
            });

            await Promise.race([
                device.writeCharacteristicWithResponseForService(
                    DEFAULT_DATA_SERVICE_UUID,
                    DEFAULT_CHAR_UUID_RX,
                    dummy
                ),
                writeTimeout
            ]);

            console.log("Data streaming started successfully");
        } catch (error) {
            console.log("Failed to start data streaming:", error);
            console.log("Streaming error reason:", (error as any)?.reason || "Unknown reason");
            
            // Attempt recovery after delay
            setTimeout(() => {
                if (connectedDevice) {
                    console.log("Retrying data streaming...");
                    startStreamingData(connectedDevice);
                }
            }, 3000);
        }
    };

    return {
        connectToDevice,
        allDevices,
        connectedDevice,
        sensorData,
        mtuSize,
        isScanning,
        bluetoothState,
        hasLocationPermission,
        requestPermissions,
        scanForPeripherals,
        stopScan,
        disconnectFromDevice,
        startStreamingData,
        checkBluetoothState,
        checkAllPermissions,
        checkLocationPermission,
        discoveredServices,
        discoveredCharacteristics,
    };
}

export default useBLE;