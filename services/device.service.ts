import { ApiError, apiService, setApiKey, ValidationError } from './api';

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
   * Get user's devices
   */
  async getUserDevices(): Promise<Device[]> {
    try {
      const response = await apiService.get<Device[]>('/api/v1/devices/');
      return response;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError('Authentication required to access user devices', 401, 'UNAUTHORIZED');
      }
      if (error instanceof ApiError && error.status === 403) {
        throw new ApiError('Insufficient permissions to access devices', 403, 'FORBIDDEN');
      }
      throw error;
    }
  }

  /**
   * Get device by ID
   */
  async getDeviceById(deviceId: string): Promise<Device> {
    try {
      const response = await apiService.get<Device>(`/api/v1/devices/${deviceId}`);
      return response;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError('Authentication required to access device', 401, 'UNAUTHORIZED');
      }
      if (error instanceof ApiError && error.status === 403) {
        throw new ApiError('Insufficient permissions to access device', 403, 'FORBIDDEN');
      }
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('Device not found', 404, 'NOT_FOUND');
      }
      throw error;
    }
  }

  /**
   * Update device information
   */
  async updateDevice(deviceId: string, updates: Partial<Device>): Promise<Device> {
    try {
      const response = await apiService.put<Device>(`/api/v1/devices/${deviceId}`, updates);
      
      // Update current device if it's the one being updated
      if (this.currentDevice && this.currentDevice.id === deviceId) {
        this.currentDevice = { ...this.currentDevice, ...updates };
      }
      
      return response;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError('Authentication required to update device', 401, 'UNAUTHORIZED');
      }
      if (error instanceof ApiError && error.status === 403) {
        throw new ApiError('Insufficient permissions to update device', 403, 'FORBIDDEN');
      }
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('Device not found', 404, 'NOT_FOUND');
      }
      if (error instanceof ApiError && error.status === 422) {
        throw new ValidationError('Device update validation failed', error.details?.detail);
      }
      throw error;
    }
  }

  /**
   * Delete device
   */
  async deleteDevice(deviceId: string): Promise<void> {
    try {
      await apiService.delete(`/api/v1/devices/${deviceId}`);
      
      // Clear current device if it's the one being deleted
      if (this.currentDevice && this.currentDevice.id === deviceId) {
        this.clearCurrentDevice();
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError('Authentication required to delete device', 401, 'UNAUTHORIZED');
      }
      if (error instanceof ApiError && error.status === 403) {
        throw new ApiError('Insufficient permissions to delete device', 403, 'FORBIDDEN');
      }
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('Device not found', 404, 'NOT_FOUND');
      }
      throw error;
    }
  }

  /**
   * Deactivate device (alias for delete with soft delete)
   */
  async deactivateDevice(deviceId: string): Promise<Device> {
    try {
      const response = await apiService.put<Device>(`/api/v1/devices/${deviceId}`, { is_active: false });
      
      // Update current device if it's the one being deactivated
      if (this.currentDevice && this.currentDevice.id === deviceId) {
        this.currentDevice = { ...this.currentDevice, is_active: false };
      }
      
      return response;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError('Authentication required to deactivate device', 401, 'UNAUTHORIZED');
      }
      if (error instanceof ApiError && error.status === 403) {
        throw new ApiError('Insufficient permissions to deactivate device', 403, 'FORBIDDEN');
      }
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('Device not found', 404, 'NOT_FOUND');
      }
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
   * Get device metrics
   */
  async getDeviceMetrics(deviceId: string): Promise<any[]> {
    try {
      const response = await apiService.get<any[]>(`/api/v1/devices/${deviceId}/metrics`);
      return response;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError('Authentication required to access device metrics', 401, 'UNAUTHORIZED');
      }
      if (error instanceof ApiError && error.status === 403) {
        throw new ApiError('Insufficient permissions to access device metrics', 403, 'FORBIDDEN');
      }
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('Device not found', 404, 'NOT_FOUND');
      }
      throw error;
    }
  }
}

// Singleton instance
export const deviceService = new DeviceService();