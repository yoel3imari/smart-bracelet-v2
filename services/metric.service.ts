import { ApiError, apiService, NetworkError, ValidationError } from './api';
import { offlineStorageService } from './offline-storage.service';

export enum MetricType {
  SPO2 = "spo2",
  HEART_RATE = "heart_rate",
  SKIN_TEMPERATURE = "skin_temperature",
  AMBIENT_TEMPERATURE = "ambient_temperature"
}

export interface Metric {
  id: string;
  device_id: string;
  user_id: string;
  metric_type: MetricType;
  value?: number;
  unit?: string;
  sensor_model?: string;
  timestamp: string;
  created_at: string;
}

export interface MetricBase {
  metric_type: MetricType;
  value?: number;
  unit?: string;
  sensor_model?: string;
  timestamp: string;
}

export interface MetricBatch {
  metrics: MetricBase[];
}

export interface MetricQueryParams {
  start_date?: string;
  end_date?: string;
  metric_type?: MetricType;
  device_id?: string;
  limit?: number;
  offset?: number;
}

export class MetricService {
  private metricsCache: Map<string, Metric[]> = new Map();

  /**
   * Create metrics batch for the current device
   */
  async createMetricsBatch(metricsBatch: MetricBatch): Promise<any> {
    // Validate metrics before processing with detailed error reporting
    const validation = this.validateMetricsBatch(metricsBatch);
    if (!validation.valid) {
      console.warn('Metrics batch validation failed:', validation.errors);
      
      // Convert validation errors to the expected format for ValidationError
      const validationDetails = validation.errors.map((error, index) => ({
        loc: ['metrics', index],
        msg: error,
        type: 'value_error'
      }));
      
      throw new ValidationError('Invalid metrics batch', validationDetails);
    }

    try {
      // Check if we should use offline storage
      if (!offlineStorageService.isOnline()) {
        await offlineStorageService.storeMetrics(metricsBatch.metrics);
        return { status: 'queued', count: metricsBatch.metrics.length };
      }

      const response = await apiService.post<any>('/api/v1/metrics/batch/', metricsBatch);
      
      // Clear cache after creating new metrics
      this.clearCache();
      
      return response;
    } catch (error) {
      // On network error, store offline and retry later
      if (error instanceof NetworkError || (error instanceof ApiError && error.status >= 500)) {
        await offlineStorageService.storeMetrics(metricsBatch.metrics);
        return { status: 'queued', count: metricsBatch.metrics.length };
      }
      
      // Re-throw validation and authentication errors
      if (error instanceof ApiError && error.status === 422) {
        throw new ValidationError('Metrics batch validation failed', error.details?.detail);
      }
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError('API key required for metrics submission', 401, 'UNAUTHORIZED');
      }
      throw error;
    }
  }

  /**
   * Create a single metric
   */
  async createMetric(metric: MetricBase): Promise<any> {
    return this.createMetricsBatch({ metrics: [metric] });
  }

  /**
   * Get metrics with filtering options
   */
  async getMetrics(params: MetricQueryParams = {}): Promise<Metric[]> {
    const cacheKey = this.generateCacheKey(params);
    
    // Check cache first
    if (this.metricsCache.has(cacheKey)) {
      return this.metricsCache.get(cacheKey)!;
    }

    try {
      const queryParams = new URLSearchParams();
      
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      if (params.metric_type) queryParams.append('metric_type', params.metric_type);
      if (params.device_id) queryParams.append('device_id', params.device_id);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/v1/metrics/?${queryString}` : '/api/v1/metrics/';
      
      const response = await apiService.get<Metric[]>(endpoint);
      
      // Cache the results
      this.cacheMetrics(cacheKey, response);
      
      return response;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError('Authentication required to access metrics', 401, 'UNAUTHORIZED');
      }
      if (error instanceof ApiError && error.status === 403) {
        throw new ApiError('Admin access required to view all metrics', 403, 'FORBIDDEN');
      }
      throw error;
    }
  }

  /**
   * Get metric by ID
   */
  async getMetricById(metricId: string): Promise<Metric> {
    try {
      const response = await apiService.get<Metric>(`/api/v1/metrics/${metricId}`);
      return response;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError('Authentication required to access metric', 401, 'UNAUTHORIZED');
      }
      if (error instanceof ApiError && error.status === 403) {
        throw new ApiError('Insufficient permissions to access metric', 403, 'FORBIDDEN');
      }
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('Metric not found', 404, 'NOT_FOUND');
      }
      throw error;
    }
  }

  /**
   * Delete metric (admin only)
   */
  async deleteMetric(metricId: string): Promise<void> {
    try {
      await apiService.delete(`/api/v1/metrics/${metricId}`);
      
      // Clear cache after deletion
      this.clearCache();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError('Authentication required to delete metric', 401, 'UNAUTHORIZED');
      }
      if (error instanceof ApiError && error.status === 403) {
        throw new ApiError('Admin access required to delete metrics', 403, 'FORBIDDEN');
      }
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('Metric not found', 404, 'NOT_FOUND');
      }
      throw error;
    }
  }

  /**
   * Get user metrics
   */
  async getUserMetrics(userId: string, params: MetricQueryParams = {}): Promise<Metric[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('user_id', userId);
      
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      if (params.metric_type) queryParams.append('metric_type', params.metric_type);
      if (params.device_id) queryParams.append('device_id', params.device_id);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const queryString = queryParams.toString();
      const endpoint = `/api/v1/metrics/?${queryString}`;
      
      const response = await apiService.get<Metric[]>(endpoint);
      return response;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError('Authentication required to access user metrics', 401, 'UNAUTHORIZED');
      }
      if (error instanceof ApiError && error.status === 403) {
        throw new ApiError('Insufficient permissions to access user metrics', 403, 'FORBIDDEN');
      }
      throw error;
    }
  }

  /**
   * Get device metrics
   */
  async getDeviceMetrics(deviceId: string, params: MetricQueryParams = {}): Promise<Metric[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('device_id', deviceId);
      
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      if (params.metric_type) queryParams.append('metric_type', params.metric_type);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const queryString = queryParams.toString();
      const endpoint = `/api/v1/metrics/?${queryString}`;
      
      const response = await apiService.get<Metric[]>(endpoint);
      return response;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError('Authentication required to access device metrics', 401, 'UNAUTHORIZED');
      }
      if (error instanceof ApiError && error.status === 403) {
        throw new ApiError('Insufficient permissions to access device metrics', 403, 'FORBIDDEN');
      }
      throw error;
    }
  }

  /**
   * Get metrics by type
   */
  async getMetricsByType(metricType: MetricType, params: Omit<MetricQueryParams, 'metric_type'> = {}): Promise<Metric[]> {
    return this.getMetrics({ ...params, metric_type: metricType });
  }

  /**
   * Get latest metrics
   */
  async getLatestMetrics(limit: number = 10): Promise<Metric[]> {
    return this.getMetrics({ limit, offset: 0 });
  }

  /**
   * Generate cache key for query parameters
   */
  private generateCacheKey(params: MetricQueryParams): string {
    return JSON.stringify(params);
  }

  /**
   * Clear metrics cache
   */
  clearCache(): void {
    this.metricsCache.clear();
  }

  /**
   * Cache metrics for a specific query
   */
  private cacheMetrics(key: string, metrics: Metric[]): void {
    this.metricsCache.set(key, metrics);
  }

  /**
   * Create health metrics from device data
   * Filters out invalid data (0 values from unavailable sensors) before creating metrics
   */
  createHealthMetrics(healthData: {
    heartRate?: number;
    oxygenLevel?: number;
    temperature?: number;
    sleepHours?: number;
    timestamp: string;
  }): MetricBase[] {
    const metrics: MetricBase[] = [];

    // Filter out 0 values (sensor unavailable) and validate ranges for non-zero values
    if (healthData.heartRate !== undefined && healthData.heartRate !== 0) {
      const validation = this.validateMetric({
        metric_type: MetricType.HEART_RATE,
        value: healthData.heartRate,
        unit: 'bpm',
        timestamp: healthData.timestamp,
      });
      
      if (validation.valid) {
        metrics.push({
          metric_type: MetricType.HEART_RATE,
          value: healthData.heartRate,
          unit: 'bpm',
          timestamp: healthData.timestamp,
        });
      } else {
        console.warn('Filtered invalid heart rate:', healthData.heartRate, validation.error);
      }
    }

    if (healthData.oxygenLevel !== undefined && healthData.oxygenLevel !== 0) {
      const validation = this.validateMetric({
        metric_type: MetricType.SPO2,
        value: healthData.oxygenLevel,
        unit: '%',
        timestamp: healthData.timestamp,
      });
      
      if (validation.valid) {
        metrics.push({
          metric_type: MetricType.SPO2,
          value: healthData.oxygenLevel,
          unit: '%',
          timestamp: healthData.timestamp,
        });
      } else {
        console.warn('Filtered invalid SpO2:', healthData.oxygenLevel, validation.error);
      }
    }

    if (healthData.temperature !== undefined && healthData.temperature !== 0) {
      const validation = this.validateMetric({
        metric_type: MetricType.SKIN_TEMPERATURE,
        value: healthData.temperature,
        unit: '°C',
        timestamp: healthData.timestamp,
      });
      
      if (validation.valid) {
        metrics.push({
          metric_type: MetricType.SKIN_TEMPERATURE,
          value: healthData.temperature,
          unit: '°C',
          timestamp: healthData.timestamp,
        });
      } else {
        console.warn('Filtered invalid temperature:', healthData.temperature, validation.error);
      }
    }

    // Note: Sleep hours would need a new metric type in the API
    // For now, we'll skip it since it's not in the current MetricType enum

    return metrics;
  }

  /**
   * Validate metric data
   * Allows 0 values (sensor unavailable) while still validating legitimate ranges
   */
  validateMetric(metric: MetricBase): { valid: boolean; error?: string } {
    if (!metric.metric_type || !metric.timestamp) {
      return { valid: false, error: 'Missing required fields: metric_type or timestamp' };
    }

    // Allow undefined values (optional metrics)
    if (metric.value === undefined) {
      return { valid: true };
    }

    // Allow 0 values (sensor unavailable) but validate non-zero values
    if (metric.value === 0) {
      return { valid: true };
    }

    // Validate value ranges based on metric type for non-zero values
    switch (metric.metric_type) {
      case MetricType.HEART_RATE:
        if (metric.value < 30 || metric.value > 220) {
          return { valid: false, error: `Heart rate value ${metric.value} is outside valid range (30-220 bpm)` };
        }
        break;
      case MetricType.SPO2:
        if (metric.value < 70 || metric.value > 100) {
          return { valid: false, error: `SpO2 value ${metric.value} is outside valid range (70-100%)` };
        }
        break;
      case MetricType.SKIN_TEMPERATURE:
        if (metric.value < 20 || metric.value > 45) {
          return { valid: false, error: `Skin temperature value ${metric.value} is outside valid range (20-45°C)` };
        }
        break;
      case MetricType.AMBIENT_TEMPERATURE:
        if (metric.value < -50 || metric.value > 60) {
          return { valid: false, error: `Ambient temperature value ${metric.value} is outside valid range (-50-60°C)` };
        }
        break;
      default:
        // Unknown metric type - allow any value
        break;
    }

    return { valid: true };
  }

  /**
   * Validate metrics batch
   * Provides detailed error messages for validation failures
   */
  validateMetricsBatch(batch: MetricBatch): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!batch.metrics || !Array.isArray(batch.metrics)) {
      errors.push('Metrics must be an array');
      return { valid: false, errors };
    }

    if (batch.metrics.length === 0) {
      errors.push('Metrics array cannot be empty');
      return { valid: false, errors };
    }

    for (let i = 0; i < batch.metrics.length; i++) {
      const metric = batch.metrics[i];
      const validation = this.validateMetric(metric);
      
      if (!validation.valid) {
        const metricInfo = `[${metric.metric_type}] value: ${metric.value}`;
        errors.push(`Metric at index ${i} (${metricInfo}) is invalid: ${validation.error}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance
export const metricService = new MetricService();