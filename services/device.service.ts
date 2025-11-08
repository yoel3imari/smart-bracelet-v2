import { apiService, setApiKey, ApiError, NetworkError, ValidationError } from './api';

export interface Device {
  id: string;
  user_id: string;
  api_key: string;
  name?: string;
  serial_number?: string;
  model?: string;
  firmware_version?: string;
  is_active?: boolean;
  registered_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface DeviceRegister {
  serial_number: string;
  name?: string;
}

export interface DeviceRegistrationResponse {
  api_key: string;
  device: Device;
}

export class DeviceService {
  private currentDevice: Device | null = null;

  /**
   * Register a new device
   */
  async registerDevice(deviceData: DeviceRegister): Promise<DeviceRegistrationResponse> {
    try {
      const response = await apiService.post<DeviceRegistrationResponse>(
        '/api/v1/devices/register',
        deviceData
      );

      // Store the API key for future requests
      setApiKey(response.api_key);
      this.currentDevice = response.device;

      return response;
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        throw new ValidationError('Device registration validation failed', error.details?.detail);
      }
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError('Authentication required for device registration', 401, 'UNAUTHORIZED');
      }
      throw error;
    }
  }

  /**
   * Get current device information
   */
  getCurrentDevice(): Device | null {
    return this.currentDevice;
  }

  /**
   * Set current device
   */
  setCurrentDevice(device: Device): void {
    this.currentDevice = device;
  }

  /**
   * Clear current device
   */
  clearCurrentDevice(): void {
    this.currentDevice = null;
    setApiKey(null);
  }

  /**
   * Check if device is registered and active
   */
  isDeviceRegistered(): boolean {
    return !!this.currentDevice && this.currentDevice.is_active !== false;
  }

  /**
   * Get device by ID (placeholder - endpoint may not exist)
   */
  async getDeviceById(deviceId: string): Promise<Device> {
    try {
      // This endpoint might not exist in the current API
      // For now, we'll throw not implemented
      throw new ApiError('Get device by ID not implemented', 501, 'NOT_IMPLEMENTED');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's devices (placeholder - endpoint may not exist)
   */
  async getUserDevices(): Promise<Device[]> {
    try {
      // This endpoint might not exist in the current API
      // For now, we'll throw not implemented
      throw new ApiError('Get user devices not implemented', 501, 'NOT_IMPLEMENTED');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update device information (placeholder - endpoint may not exist)
   */
  async updateDevice(deviceId: string, updates: Partial<Device>): Promise<Device> {
    try {
      // This endpoint might not exist in the current API
      // For now, we'll throw not implemented
      throw new ApiError('Update device not implemented', 501, 'NOT_IMPLEMENTED');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deactivate device (placeholder - endpoint may not exist)
   */
  async deactivateDevice(deviceId: string): Promise<Device> {
    try {
      // This endpoint might not exist in the current API
      // For now, we'll throw not implemented
      throw new ApiError('Deactivate device not implemented', 501, 'NOT_IMPLEMENTED');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate device registration
   */
  async validateDeviceRegistration(): Promise<boolean> {
    if (!this.currentDevice) {
      return false;
    }

    try {
      // We could implement a validation endpoint here
      // For now, we'll assume the device is valid if we have it stored
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get device metrics (placeholder - would use MetricService)
   */
  async getDeviceMetrics(deviceId: string): Promise<any[]> {
    try {
      // This would be implemented in MetricService
      throw new ApiError('Get device metrics not implemented', 501, 'NOT_IMPLEMENTED');
    } catch (error) {
      throw error;
    }
  }
}

// Singleton instance
export const deviceService = new DeviceService();