import { apiService, ApiError, NetworkError, ValidationError } from './api';

export enum IssueSeverity {
  LOW = "low",
  MODERATE = "moderate",
  CRITICAL = "critical"
}

export interface Issue {
  id: string;
  user_id: string;
  issue_type?: string;
  description?: string;
  severity?: IssueSeverity;
  detected_at?: string;
  resolved?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface IssueCreate {
  issue_type?: string;
  description?: string;
  severity?: IssueSeverity;
  detected_at?: string;
}

export interface IssueUpdate {
  issue_type?: string;
  description?: string;
  severity?: IssueSeverity;
  detected_at?: string;
  resolved?: boolean;
}

export interface IssueQueryParams {
  severity?: IssueSeverity;
  resolved?: boolean;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export class IssueService {
  private issuesCache: Map<string, Issue[]> = new Map();

  /**
   * Get user issues (placeholder - endpoint may not exist)
   */
  async getUserIssues(userId: string, params: IssueQueryParams = {}): Promise<Issue[]> {
    const cacheKey = this.generateCacheKey(userId, params);
    
    // Check cache first
    if (this.issuesCache.has(cacheKey)) {
      return this.issuesCache.get(cacheKey)!;
    }

    try {
      // This endpoint might not exist in the current API
      // For now, we'll return mock data or throw not implemented
      const mockIssues: Issue[] = [
        {
          id: '1',
          user_id: userId,
          issue_type: 'high_heart_rate',
          description: 'Heart rate above normal range detected',
          severity: IssueSeverity.MODERATE,
          detected_at: new Date().toISOString(),
          resolved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: userId,
          issue_type: 'low_oxygen',
          description: 'Oxygen saturation below normal range',
          severity: IssueSeverity.CRITICAL,
          detected_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          resolved: true,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];

      // Filter based on params
      let filteredIssues = mockIssues;
      
      if (params.severity) {
        filteredIssues = filteredIssues.filter(issue => issue.severity === params.severity);
      }
      
      if (params.resolved !== undefined) {
        filteredIssues = filteredIssues.filter(issue => issue.resolved === params.resolved);
      }

      // Cache the results
      this.cacheIssues(cacheKey, filteredIssues);
      
      return filteredIssues;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new issue (placeholder - endpoint may not exist)
   */
  async createIssue(issueData: IssueCreate): Promise<Issue> {
    try {
      // This endpoint might not exist in the current API
      // For now, we'll throw not implemented
      throw new ApiError('Create issue not implemented', 501, 'NOT_IMPLEMENTED');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an issue (placeholder - endpoint may not exist)
   */
  async updateIssue(issueId: string, updates: IssueUpdate): Promise<Issue> {
    try {
      // This endpoint might not exist in the current API
      // For now, we'll throw not implemented
      throw new ApiError('Update issue not implemented', 501, 'NOT_IMPLEMENTED');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Resolve an issue
   */
  async resolveIssue(issueId: string): Promise<Issue> {
    try {
      return await this.updateIssue(issueId, { resolved: true });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get issue by ID (placeholder - endpoint may not exist)
   */
  async getIssueById(issueId: string): Promise<Issue> {
    try {
      // This endpoint might not exist in the current API
      // For now, we'll throw not implemented
      throw new ApiError('Get issue by ID not implemented', 501, 'NOT_IMPLEMENTED');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get unresolved issues
   */
  async getUnresolvedIssues(userId: string, params: Omit<IssueQueryParams, 'resolved'> = {}): Promise<Issue[]> {
    return this.getUserIssues(userId, { ...params, resolved: false });
  }

  /**
   * Get critical issues
   */
  async getCriticalIssues(userId: string, params: Omit<IssueQueryParams, 'severity'> = {}): Promise<Issue[]> {
    return this.getUserIssues(userId, { ...params, severity: IssueSeverity.CRITICAL });
  }

  /**
   * Get issues by severity
   */
  async getIssuesBySeverity(userId: string, severity: IssueSeverity, params: Omit<IssueQueryParams, 'severity'> = {}): Promise<Issue[]> {
    return this.getUserIssues(userId, { ...params, severity });
  }

  /**
   * Check if user has unresolved critical issues
   */
  async hasCriticalIssues(userId: string): Promise<boolean> {
    try {
      const criticalIssues = await this.getCriticalIssues(userId, { resolved: false });
      return criticalIssues.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate cache key for query parameters
   */
  private generateCacheKey(userId: string, params: IssueQueryParams): string {
    return `${userId}:${JSON.stringify(params)}`;
  }

  /**
   * Clear issues cache
   */
  clearCache(): void {
    this.issuesCache.clear();
  }

  /**
   * Cache issues for a specific query
   */
  private cacheIssues(key: string, issues: Issue[]): void {
    this.issuesCache.set(key, issues);
  }

  /**
   * Create health issue from metric data
   */
  createHealthIssueFromMetrics(metrics: {
    heartRate?: number;
    oxygenLevel?: number;
    temperature?: number;
    sleepHours?: number;
    timestamp: string;
  }): IssueCreate | null {
    const issues: string[] = [];
    let severity = IssueSeverity.LOW;

    // Check for abnormal heart rate
    if (metrics.heartRate && (metrics.heartRate < 60 || metrics.heartRate > 100)) {
      issues.push(`Heart rate ${metrics.heartRate} BPM`);
      if (metrics.heartRate < 50 || metrics.heartRate > 120) {
        severity = IssueSeverity.CRITICAL;
      } else {
        severity = IssueSeverity.MODERATE;
      }
    }

    // Check for low oxygen
    if (metrics.oxygenLevel && metrics.oxygenLevel < 95) {
      issues.push(`Oxygen level ${metrics.oxygenLevel}%`);
      if (metrics.oxygenLevel < 90) {
        severity = IssueSeverity.CRITICAL;
      } else {
        severity = IssueSeverity.MODERATE;
      }
    }

    // Check for abnormal temperature
    if (metrics.temperature && (metrics.temperature < 36.0 || metrics.temperature > 37.5)) {
      issues.push(`Temperature ${metrics.temperature}°C`);
      if (metrics.temperature < 35.0 || metrics.temperature > 38.5) {
        severity = IssueSeverity.CRITICAL;
      } else {
        severity = IssueSeverity.MODERATE;
      }
    }

    // Check for insufficient sleep
    if (metrics.sleepHours && metrics.sleepHours < 6) {
      issues.push(`Sleep ${metrics.sleepHours} hours`);
      if (metrics.sleepHours < 4) {
        severity = IssueSeverity.MODERATE;
      } else {
        severity = IssueSeverity.LOW;
      }
    }

    if (issues.length > 0) {
      return {
        issue_type: 'health_anomaly',
        description: `Health anomalies detected: ${issues.join(', ')}`,
        severity,
        detected_at: metrics.timestamp,
      };
    }

    return null;
  }

  /**
   * Validate issue data
   */
  validateIssue(issue: IssueCreate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!issue.issue_type || issue.issue_type.trim() === '') {
      errors.push('Issue type is required');
    }

    if (!issue.description || issue.description.trim() === '') {
      errors.push('Description is required');
    }

    if (!issue.severity) {
      errors.push('Severity is required');
    }

    if (!issue.detected_at) {
      errors.push('Detection timestamp is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance
export const issueService = new IssueService();