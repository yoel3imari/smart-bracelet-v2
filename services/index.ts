// Service exports
export * from './api';
export * from './auth.service';
export * from './user.service';
export * from './device.service';
export * from './metric.service';
export * from './issue.service';

// Re-export singleton instances for convenience
export { apiService } from './api';
export { authService } from './auth.service';
export { userService } from './user.service';
export { deviceService } from './device.service';
export { metricService } from './metric.service';
export { issueService } from './issue.service';

// Export types for external use
export type {
  ApiConfig,
  ApiErrorResponse,
} from './api';

export type {
  LoginCredentials,
  Token,
} from './auth.service';

export type {
  User,
  UserCreate,
  UserUpdate,
  UserVerifyEmail,
  ForgotPasswordRequest,
  ResetPasswordWithCodeRequest,
} from './user.service';

export type {
  Device,
  DeviceRegister,
  DeviceRegistrationResponse,
} from './device.service';

export type {
  Metric,
  MetricBase,
  MetricBatch,
  MetricType,
  MetricQueryParams,
} from './metric.service';

export type {
  Issue,
  IssueCreate,
  IssueUpdate,
  IssueSeverity,
  IssueQueryParams,
} from './issue.service';