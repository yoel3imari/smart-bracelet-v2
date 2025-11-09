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
  const { devices, visible, connectToPeripheral, closeModal, isScanning, stopScan } = props;

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

  return (
    <Modal
      style={modalStyle.modalContainer}
      animationType="slide"
      transparent={false}
      visible={visible}
    >
      <SafeAreaView style={modalStyle.modalContainer}>
        <Text style={modalStyle.modalTitleText}>
          {isScanning ? "Scanning for devices..." : "Tap on a device to connect"}
        </Text>
        <FlatList
          style={modalStyle.flatList}
          contentContainerStyle={modalStyle.modalFlatlistContainer}
          data={devices}
          renderItem={renderDeviceModalListItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={true}
        />
        <View style={modalStyle.buttonContainer}>
          <TouchableOpacity
            onPress={handleStopScanAndClose}
            style={[modalStyle.ctaButton, modalStyle.stopButton]}
          >
            <Text style={modalStyle.ctaButtonText}>
              {isScanning ? "Stop Scan & Close" : "Close"}
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
    backgroundColor: "#FF6060",
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
});

export default DeviceModal;