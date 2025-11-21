import { apiService, ApiError, NetworkError, ValidationError } from './api';

export interface User {
  id: string;
  email?: string;
  name?: string;
  is_admin?: boolean;
  created_at: string;
  updated_at: string;
  email_verified_at?: string;
  deleted_at?: string;
  devices: Device[];
  issues: Issue[];
  metrics: Metric[];
}

export interface UserCreate {
  email: string;
  name: string;
  password: string;
}

export interface UserUpdate {
  email?: string;
  name?: string;
  is_admin?: boolean;
  password?: string;
}

export interface UserVerifyEmail {
  email: string;
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordWithCodeRequest {
  email: string;
  code: string;
  new_password: string;
}

// Import related interfaces (these would be defined in their respective services)
interface Device {
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

interface Issue {
  id: string;
  user_id: string;
  issue_type?: string;
  description?: string;
  severity?: 'low' | 'moderate' | 'critical';
  detected_at?: string;
  resolved?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

interface Metric {
  id: string;
  device_id: string;
  user_id: string;
  metric_type: string;
  value?: number;
  unit?: string;
  sensor_model?: string;
  timestamp: string;
  created_at: string;
}

export class UserService {
  /**
   * Create a new user
   */
  async createUser(userData: UserCreate): Promise<User> {
    try {
      return await apiService.post<User>('/api/v1/users', userData);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        throw new ValidationError('User creation validation failed', error.details?.detail);
      }
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   */
  async getUsers(skip: number = 0, limit: number = 100): Promise<User[]> {
    try {
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
      });
      
      return await apiService.get<User[]>(`/api/v1/users/?${params}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        throw new ApiError('Insufficient permissions to view users', 403, 'FORBIDDEN');
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    try {
      return await apiService.get<User>(`/api/v1/users/${userId}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
      }
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: UserUpdate): Promise<User> {
    try {
      return await apiService.put<User>(`/api/v1/users/${userId}`, updates);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
      }
      if (error instanceof ApiError && error.status === 422) {
        throw new ValidationError('User update validation failed', error.details?.detail);
      }
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string): Promise<User> {
    try {
      return await apiService.delete<User>(`/api/v1/users/${userId}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
      }
      throw error;
    }
  }

  /**
   * Verify user email with 6-digit code
   */
  async verifyEmail(request: UserVerifyEmail): Promise<User> {
    try {
      return await apiService.post<User>('/api/v1/users/verify-email', request);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        throw new ValidationError('Email verification failed', error.details?.detail);
      }
      if (error instanceof ApiError && error.status === 400) {
        throw new ApiError('Invalid verification code', 400, 'INVALID_VERIFICATION_CODE');
      }
      throw error;
    }
  }

  /**
   * Resend email verification code
   */
  async resendVerificationCode(email: string): Promise<void> {
    try {
      await apiService.post('/api/v1/users/resend-verification', { email });
    } catch (error) {
      // Don't reveal if email exists or not for security
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        // Silently succeed for security reasons
        return;
      }
      throw error;
    }
  }

  /**
   * Send password reset code
   */
  async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
    try {
      await apiService.post('/api/v1/users/forgot-password', request);
    } catch (error) {
      // Don't reveal if email exists or not for security
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        // Silently succeed for security reasons
        return;
      }
      throw error;
    }
  }

  /**
   * Reset password with 6-digit code
   */
  async resetPassword(request: ResetPasswordWithCodeRequest): Promise<User> {
    try {
      return await apiService.post<User>('/api/v1/users/reset-password', request);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        throw new ValidationError('Password reset failed', error.details?.detail);
      }
      throw error;
    }
  }

  /**
   * Get current user (requires authentication)
   * Uses the /api/v1/users/me endpoint for backend token validation
   */
  async getCurrentUser(): Promise<User> {
    try {
      return await apiService.get<User>('/api/v1/users/me');
    } catch (error) {
      // If it's a 401 error, just re-throw it as-is - don't create a new error
      if (error instanceof ApiError && error.status === 401) {
        throw error; // Re-throw the original 401 error
      }
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
      }
      throw error;
    }
  }

  /**
   * Update current user profile
   */
  async updateCurrentUser(updates: UserUpdate): Promise<User> {
    try {
      // This would typically use a /me endpoint
      // For now, we'll throw not implemented
      throw new ApiError('Update current user not implemented', 501, 'NOT_IMPLEMENTED');
    } catch (error) {
      throw error;
    }
  }
}

// Singleton instance
export const userService = new UserService();