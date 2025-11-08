# Services Architecture Plan

## Overview
Based on the OpenAPI specification, we need to create services for each model with proper error handling and data management for reactivity.

## Service Structure

### 1. Base API Service (`api.ts`)
- Centralized API configuration
- Error handling wrapper
- Token management
- Request/response interceptors

### 2. Auth Service (`auth.service.ts`)
**Methods:**
- `login(username: string, password: string): Promise<Token>`
- `logout(): void`
- `refreshToken(): Promise<Token>`
- `isAuthenticated(): boolean`

**Interfaces:**
```typescript
interface Token {
  access_token: string;
  token_type: string;
}
```

### 3. User Service (`user.service.ts`)
**Methods:**
- `createUser(userData: UserCreate): Promise<User>`
- `getUsers(skip?: number, limit?: number): Promise<User[]>`
- `getUserById(userId: string): Promise<User>`
- `updateUser(userId: string, updates: UserUpdate): Promise<User>`
- `deleteUser(userId: string): Promise<User>`
- `verifyEmail(email: string, code: string): Promise<User>`
- `forgotPassword(email: string): Promise<void>`
- `resetPassword(request: ResetPasswordRequest): Promise<User>`

**Interfaces:**
```typescript
interface User {
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

interface UserCreate {
  email: string;
  name: string;
  password: string;
  is_admin?: boolean;
}

interface UserUpdate {
  email?: string;
  name?: string;
  is_admin?: boolean;
  password?: string;
}
```

### 4. Device Service (`device.service.ts`)
**Methods:**
- `registerDevice(deviceData: DeviceRegister): Promise<DeviceRegistrationResponse>`
- `getDevices(): Promise<Device[]>`
- `getDeviceById(deviceId: string): Promise<Device>`

**Interfaces:**
```typescript
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

interface DeviceRegister {
  serial_number: string;
  name?: string;
}

interface DeviceRegistrationResponse {
  api_key: string;
  device: Device;
}
```

### 5. Metric Service (`metric.service.ts`)
**Methods:**
- `createMetricsBatch(metrics: MetricBatch): Promise<any>`
- `getUserMetrics(userId: string): Promise<Metric[]>`
- `getDeviceMetrics(deviceId: string): Promise<Metric[]>`

**Interfaces:**
```typescript
interface Metric {
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

interface MetricBase {
  metric_type: MetricType;
  value?: number;
  unit?: string;
  sensor_model?: string;
  timestamp: string;
}

interface MetricBatch {
  metrics: MetricBase[];
}

enum MetricType {
  SPO2 = "spo2",
  HEART_RATE = "heart_rate",
  SKIN_TEMPERATURE = "skin_temperature",
  AMBIENT_TEMPERATURE = "ambient_temperature"
}
```

### 6. Issue Service (`issue.service.ts`)
**Methods:**
- `getUserIssues(userId: string): Promise<Issue[]>`
- `createIssue(issueData: IssueCreate): Promise<Issue>`
- `updateIssue(issueId: string, updates: IssueUpdate): Promise<Issue>`
- `resolveIssue(issueId: string): Promise<Issue>`

**Interfaces:**
```typescript
interface Issue {
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

enum IssueSeverity {
  LOW = "low",
  MODERATE = "moderate",
  CRITICAL = "critical"
}
```

## Error Handling Strategy

### Custom Error Types
```typescript
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public details: ValidationErrorDetail[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### Error Handling Pattern
```typescript
try {
  const result = await apiService.request(endpoint, options);
  return result;
} catch (error) {
  if (error instanceof ApiError) {
    // Handle API errors
    throw new CustomAppError(error.message, error.status);
  } else if (error instanceof NetworkError) {
    // Handle network errors
    throw new CustomAppError('Network connection failed', 0);
  } else {
    // Handle unexpected errors
    throw new CustomAppError('An unexpected error occurred', 500);
  }
}
```

## Reactivity & Data Management

### State Management Pattern
- Use React Context for global state
- Implement optimistic updates
- Cache management with invalidation strategies
- Real-time updates via WebSocket (future enhancement)

### Service Integration with Contexts
- Update AuthContext to use AuthService
- Update HealthDataContext to use MetricService
- Create new DeviceContext using DeviceService
- Create UserContext using UserService

## Implementation Priority

1. **Phase 1**: Base API service + AuthService
2. **Phase 2**: UserService + DeviceService
3. **Phase 3**: MetricService + IssueService
4. **Phase 4**: Context integration and testing

## Configuration

### Environment Variables
```typescript
interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
}

const config: ApiConfig = {
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 10000,
  retryAttempts: 3
};
```

This architecture provides a solid foundation for scalable, maintainable API services with proper error handling and reactivity patterns.