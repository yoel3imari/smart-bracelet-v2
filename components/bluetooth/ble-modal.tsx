import React, { FC, useCallback } from "react";
import {
  FlatList,
  ListRenderItemInfo,
  Modal,
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Device } from "react-native-ble-plx";
import { SafeAreaView } from "react-native-safe-area-context";

type DeviceModalListItemProps = {
  item: ListRenderItemInfo<Device>;
  connectToPeripheral: (device: Device) => void;
  closeModal: () => void;
};

type DeviceModalProps = {
  devices: Device[];
  visible: boolean;
  connectToPeripheral: (device: Device) => void;
  closeModal: () => void;
  isScanning: boolean;
  stopScan: () => void;
  bluetoothState?: string;
};

const DeviceModalListItem: FC<DeviceModalListItemProps> = (props) => {
  const { item, connectToPeripheral, closeModal } = props;

  const connectAndCloseModal = useCallback(() => {
    connectToPeripheral(item.item);
    closeModal();
  }, [closeModal, connectToPeripheral, item.item]);

  return (
    <TouchableOpacity
      onPress={connectAndCloseModal}
      style={modalStyle.ctaButton}
    >
      <Text style={modalStyle.ctaButtonText}>
        {item.item.name ?? item.item.localName}
      </Text>
    </TouchableOpacity>
  );
};

export const DeviceModal: FC<DeviceModalProps> = (props) => {
  const { devices, visible, connectToPeripheral, closeModal, isScanning, stopScan, bluetoothState } = props;

  const renderDeviceModalListItem = useCallback(
    (item: ListRenderItemInfo<Device>) => {
      return (
        <DeviceModalListItem
          item={item}
          connectToPeripheral={connectToPeripheral}
          closeModal={closeModal}
        />
      );
    },
    [closeModal, connectToPeripheral]
  );

  const handleStopScanAndClose = () => {
    if (isScanning) {
      stopScan();
    }
    closeModal();
  };

  // Start scanning when modal becomes visible
  React.useEffect(() => {
    if (visible && !isScanning) {
      // We need to trigger scanning from the parent component
      // This will be handled by the parent component via the useEffect
    }
  }, [visible, isScanning]);

  const getModalTitle = () => {
    if (bluetoothState === 'PoweredOff') {
      return "Bluetooth is Disabled";
    } else if (isScanning) {
      return "Scanning for devices...";
    } else {
      return "Tap on a device to connect";
    }
  };

  const getModalContent = () => {
    if (bluetoothState === 'PoweredOff') {
      return (
        <View style={modalStyle.errorContainer}>
          <Text style={modalStyle.errorText}>
            Please enable Bluetooth on your device to scan for and connect to health monitoring devices.
          </Text>
        </View>
      );
    } else {
      return (
        <FlatList
          style={modalStyle.flatList}
          contentContainerStyle={modalStyle.modalFlatlistContainer}
          data={devices}
          renderItem={renderDeviceModalListItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={
            <View style={modalStyle.emptyContainer}>
              <Text style={modalStyle.emptyText}>
                {isScanning ? "Searching for devices..." : "No devices found"}
              </Text>
            </View>
          }
        />
      );
    }
  };

  return (
    <Modal
      style={modalStyle.modalContainer}
      animationType="slide"
      transparent={false}
      visible={visible}
      onShow={() => {
        console.log("BLE Modal shown - Bluetooth state:", bluetoothState);
      }}
    >
      <SafeAreaView style={modalStyle.modalContainer}>
        <Text style={modalStyle.modalTitleText}>
          {getModalTitle()}
        </Text>
        {getModalContent()}
        <View style={modalStyle.buttonContainer}>
          <TouchableOpacity
            onPress={handleStopScanAndClose}
            style={[modalStyle.ctaButton, modalStyle.stopButton]}
          >
            <Text style={modalStyle.ctaButtonText}>
              {bluetoothState === 'PoweredOff' ? 'Close' : (isScanning ? "Stop Scan & Close" : "Close")}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const modalStyle = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  flatList: {
    flex: 1,
  },
  modalFlatlistContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  modalCellOutline: {
    borderWidth: 1,
    borderColor: "black",
    alignItems: "center",
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
  },
  modalTitleText: {
    marginTop: 40,
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  ctaButton: {
    backgroundColor: "#60b5ffff",
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    marginHorizontal: 20,
    marginBottom: 5,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  stopButton: {
    backgroundColor: "#666666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    color: "#666666",
    lineHeight: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    color: "#666666",
    lineHeight: 24,
  },
});

export default DeviceModal;