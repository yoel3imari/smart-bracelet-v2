// Service exports
export * from './api';
export * from './auth.service';
export * from './device.service';
export * from './issue.service';
export * from './metric.service';
export * from './network.service';
export * from './offline-storage.service';
export * from './queue.service';
export * from './sync.service';
export * from './token-manager.service';
export * from './token.service';
export * from './user.service';

// Re-export singleton instances for convenience
export { apiService } from './api';
export { authService } from './auth.service';
export { deviceService } from './device.service';
export { issueService } from './issue.service';
export { metricService } from './metric.service';
export { networkService } from './network.service';
export { offlineStorageService } from './offline-storage.service';
export { queueService } from './queue.service';
export { synchronizationService } from './sync.service';
export { tokenManagerService } from './token-manager.service';
export { tokenService } from './token.service';
export { userService } from './user.service';

// Export types for external use
export type {
  ApiConfig,
  ApiErrorResponse
} from './api';

export type {
  LoginCredentials, RefreshTokenRequest, Token
} from './auth.service';

export type {
  DecodedToken, TokenPair
} from './token.service';

export type {
  ForgotPasswordRequest,
  ResetPasswordWithCodeRequest, User,
  UserCreate,
  UserUpdate,
  UserVerifyEmail
} from './user.service';

export type {
  Device,
  DeviceRegister,
  DeviceRegistrationResponse
} from './device.service';

export type {
  Metric,
  MetricBase,
  MetricBatch, MetricQueryParams, MetricType
} from './metric.service';

export type {
  Issue,
  IssueCreate, IssueQueryParams, IssueSeverity, IssueUpdate
} from './issue.service';

export type {
  ConnectionType,
  NetworkChangeCallback, NetworkState
} from './network.service';

export type {
  QueueItem,
  QueueStatus,
  RetryConfig
} from './queue.service';

export type {
  StorageStats, StoredMetric, SyncResult
} from './offline-storage.service';

export type {
  SyncConfig,
  SyncEvent, SyncStatus
} from './sync.service';

