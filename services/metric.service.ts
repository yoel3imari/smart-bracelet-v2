import { apiService, ApiError, NetworkError, ValidationError } from './api';

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
    try {
      const response = await apiService.post<any>('/api/v1/metrics/batch/', metricsBatch);
      
      // Clear cache after creating new metrics
      this.clearCache();
      
      return response;
    } catch (error) {
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
      // This endpoint might not exist in the current API
      // For now, we'll throw not implemented as the API only has batch creation
      throw new ApiError('Get metrics endpoint not implemented', 501, 'NOT_IMPLEMENTED');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user metrics (placeholder - endpoint may not exist)
   */
  async getUserMetrics(userId: string, params: MetricQueryParams = {}): Promise<Metric[]> {
    try {
      // This endpoint might not exist in the current API
      // For now, we'll throw not implemented
      throw new ApiError('Get user metrics not implemented', 501, 'NOT_IMPLEMENTED');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get device metrics (placeholder - endpoint may not exist)
   */
  async getDeviceMetrics(deviceId: string, params: MetricQueryParams = {}): Promise<Metric[]> {
    try {
      // This endpoint might not exist in the current API
      // For now, we'll throw not implemented
      throw new ApiError('Get device metrics not implemented', 501, 'NOT_IMPLEMENTED');
    } catch (error) {
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
   */
  createHealthMetrics(healthData: {
    heartRate?: number;
    oxygenLevel?: number;
    temperature?: number;
    sleepHours?: number;
    timestamp: string;
  }): MetricBase[] {
    const metrics: MetricBase[] = [];

    if (healthData.heartRate !== undefined) {
      metrics.push({
        metric_type: MetricType.HEART_RATE,
        value: healthData.heartRate,
        unit: 'bpm',
        timestamp: healthData.timestamp,
      });
    }

    if (healthData.oxygenLevel !== undefined) {
      metrics.push({
        metric_type: MetricType.SPO2,
        value: healthData.oxygenLevel,
        unit: '%',
        timestamp: healthData.timestamp,
      });
    }

    if (healthData.temperature !== undefined) {
      metrics.push({
        metric_type: MetricType.SKIN_TEMPERATURE,
        value: healthData.temperature,
        unit: '°C',
        timestamp: healthData.timestamp,
      });
    }

    // Note: Sleep hours would need a new metric type in the API
    // For now, we'll skip it since it's not in the current MetricType enum

    return metrics;
  }

  /**
   * Validate metric data
   */
  validateMetric(metric: MetricBase): boolean {
    if (!metric.metric_type || !metric.timestamp) {
      return false;
    }

    // Validate value ranges based on metric type
    if (metric.value !== undefined) {
      switch (metric.metric_type) {
        case MetricType.HEART_RATE:
          return metric.value >= 30 && metric.value <= 220; // Reasonable heart rate range
        case MetricType.SPO2:
          return metric.value >= 70 && metric.value <= 100; // Reasonable SpO2 range
        case MetricType.SKIN_TEMPERATURE:
          return metric.value >= 20 && metric.value <= 45; // Reasonable skin temperature range
        case MetricType.AMBIENT_TEMPERATURE:
          return metric.value >= -50 && metric.value <= 60; // Reasonable ambient temperature range
        default:
          return true;
      }
    }

    return true;
  }

  /**
   * Validate metrics batch
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
      if (!this.validateMetric(batch.metrics[i])) {
        errors.push(`Metric at index ${i} is invalid`);
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