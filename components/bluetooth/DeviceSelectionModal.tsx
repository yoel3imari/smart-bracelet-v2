import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Bluetooth, Signal, X, RefreshCw } from 'lucide-react-native';
import { BluetoothDevice } from '@/hooks/useBluetooth';
import colors from '@/constants/colors';

interface DeviceSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onDeviceSelected: (device: BluetoothDevice) => void;
  devices: BluetoothDevice[];
  isScanning: boolean;
  startScan: () => void;
  stopScan: () => void;
  connectionError: string | null;
}

const DeviceSelectionModal: React.FC<DeviceSelectionModalProps> = ({
  visible,
  onClose,
  onDeviceSelected,
  devices,
  isScanning,
  startScan,
  stopScan,
  connectionError,
}) => {
  const [, setRefreshing] = useState(false);

  useEffect(() => {
    const startScanning = async () => {
      setRefreshing(true);
      try {
        await startScan();
      } catch (error) {
        console.error('Failed to start scanning:', error);
        Alert.alert('Scan Error', 'Failed to start device scanning');
      } finally {
        setRefreshing(false);
      }
    };

    const stopScanning = () => {
      stopScan();
      setRefreshing(false);
    };

    if (visible) {
      startScanning();
    } else {
      stopScanning();
    }
  }, [visible, startScan, stopScan]);

  const handleRefresh = () => {
    startScan();
  };

  const handleDeviceSelect = (device: BluetoothDevice) => {
    onDeviceSelected(device);
    onClose();
  };

  const getSignalStrength = (rssi: number) => {
    if (rssi >= -50) return { strength: 'Excellent', color: colors.success };
    if (rssi >= -70) return { strength: 'Good', color: colors.warning };
    if (rssi >= -85) return { strength: 'Fair', color: colors.warning };
    return { strength: 'Poor', color: colors.danger };
  };

  const renderDeviceItem = ({ item }: { item: BluetoothDevice }) => {
    const signal = getSignalStrength(item.rssi);
    const deviceName = item.name || 'Unknown Device';
    const deviceId = item.id.substring(0, 8) + '...';

    return (
      <TouchableOpacity
        style={styles.deviceItem}
        onPress={() => handleDeviceSelect(item)}
        disabled={!item.isConnectable}
      >
        <View style={styles.deviceIcon}>
          <Bluetooth size={24} color={colors.primary} />
        </View>
        
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{deviceName}</Text>
          <Text style={styles.deviceId}>{deviceId}</Text>
          <View style={styles.signalInfo}>
            <Signal size={12} color={signal.color} />
            <Text style={[styles.signalText, { color: signal.color }]}>
              {signal.strength} ({item.rssi} dBm)
            </Text>
          </View>
        </View>
        
        <View style={styles.deviceStatus}>
          {item.isConnectable === false && (
            <Text style={styles.notConnectableText}>Not Connectable</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Bluetooth size={64} color={colors.textMuted} />
      <Text style={styles.emptyStateTitle}>No Devices Found</Text>
      <Text style={styles.emptyStateText}>
        {isScanning 
          ? 'Scanning for health monitoring devices...' 
          : 'Make sure your device is turned on and in range'
        }
      </Text>
      {!isScanning && (
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <RefreshCw size={20} color={colors.white} />
          <Text style={styles.retryButtonText}>Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Connect Device</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Scan Controls */}
        <View style={styles.controls}>
          <View style={styles.scanStatus}>
            {isScanning ? (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.scanningText}>Scanning for devices...</Text>
              </View>
            ) : (
              <Text style={styles.scanStatusText}>
                {devices.length > 0 ? 'Scan complete' : 'Ready to scan'}
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={isScanning}
          >
            <RefreshCw 
              size={20} 
              color={isScanning ? colors.textMuted : colors.primary} 
            />
          </TouchableOpacity>
        </View>

        {/* Error Display */}
        {connectionError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{connectionError}</Text>
          </View>
        )}

        {/* Device List */}
        <FlatList
          data={devices}
          renderItem={renderDeviceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Looking for health monitoring devices like heart rate monitors, blood pressure cuffs, and pulse oximeters.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scanStatus: {
    flex: 1,
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanningText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  scanStatusText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  refreshButton: {
    padding: 8,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    marginHorizontal: 20,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: '500',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  deviceId: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  signalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signalText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deviceStatus: {
    alignItems: 'flex-end',
  },
  notConnectableText: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default DeviceSelectionModal;