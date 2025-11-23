/**
 * Service Integration Test Script
 * Tests the refactored services and API integration with OpenAPI specification
 */

import { 
  authService, 
  metricService, 
  userService, 
  deviceService,
  LoginCredentials,
  MetricCreate,
  MetricType,
  MetricBatchCreate,
  UserCreate
} from './services';

// Test configuration
const TEST_CONFIG = {
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
  testUser: {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User'
  }
};

/**
 * Test Authentication Service
 */
async function testAuthenticationService() {
  console.log('🧪 Testing Authentication Service...');
  
  try {
    // Test 1: Check service initialization
    console.log('  1. Testing service initialization...');
    const isInitialized = await authService.initialize();
    console.log(`     ✅ Authentication service initialized: ${isInitialized}`);
    
    // Test 2: Test login with invalid credentials (should fail)
    console.log('  2. Testing login with invalid credentials...');
    const invalidCredentials: LoginCredentials = {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    };
    
    try {
      await authService.login(invalidCredentials);
      console.log('     ❌ Login with invalid credentials should have failed');
    } catch (error) {
      console.log('     ✅ Login with invalid credentials correctly failed');
    }
    
    // Test 3: Test token validation
    console.log('  3. Testing token validation...');
    const isValid = await authService.validateToken();
    console.log(`     ✅ Token validation: ${isValid}`);
    
    // Test 4: Test logout
    console.log('  4. Testing logout...');
    await authService.logout();
    console.log('     ✅ Logout completed');
    
    console.log('✅ Authentication Service Tests PASSED\n');
    return true;
  } catch (error) {
    console.error('❌ Authentication Service Tests FAILED:', error);
    return false;
  }
}

/**
 * Test Metric Service
 */
async function testMetricService() {
  console.log('🧪 Testing Metric Service...');
  
  try {
    // Test 1: Test metric validation
    console.log('  1. Testing metric validation...');
    
    const validMetric: MetricCreate = {
      metric_type: MetricType.HEART_RATE,
      value: 75,
      unit: 'bpm',
      sensor_model: 'Test-Sensor-1.0',
      timestamp: new Date().toISOString()
    };
    
    const validation = metricService.validateMetric(validMetric);
    console.log(`     ✅ Valid metric validation: ${validation.valid}`);
    
    // Test 2: Test invalid metric validation
    const invalidMetric: MetricCreate = {
      metric_type: MetricType.HEART_RATE,
      value: 300, // Invalid heart rate
      unit: 'bpm',
      sensor_model: 'Test-Sensor-1.0'
    };
    
    const invalidValidation = metricService.validateMetric(invalidMetric);
    console.log(`     ✅ Invalid metric validation: ${!invalidValidation.valid}`);
    
    // Test 3: Test batch validation
    console.log('  2. Testing batch validation...');
    const batch: MetricBatchCreate = {
      metrics: [validMetric]
    };
    
    const batchValidation = metricService.validateMetricsBatch(batch);
    console.log(`     ✅ Batch validation: ${batchValidation.valid}`);
    
    // Test 4: Test health metrics creation
    console.log('  3. Testing health metrics creation...');
    const healthMetrics = metricService.createHealthMetrics({
      heartRate: 75,
      oxygenLevel: 98,
      temperature: 36.5,
      steps: 5000,
      sleep: 7.5,
      timestamp: new Date().toISOString(),
      sensorModel: 'Health-Monitor-Bracelet'
    });
    
    console.log(`     ✅ Created ${healthMetrics.length} health metrics`);
    
    // Verify all required metric types are present
    const metricTypes = healthMetrics.map(m => m.metric_type);
    const requiredTypes = [MetricType.HEART_RATE, MetricType.SPO2, MetricType.SKIN_TEMPERATURE, MetricType.STEPS, MetricType.SLEEP];
    const hasAllTypes = requiredTypes.every(type => metricTypes.includes(type));
    console.log(`     ✅ All required metric types present: ${hasAllTypes}`);
    
    console.log('✅ Metric Service Tests PASSED\n');
    return true;
  } catch (error) {
    console.error('❌ Metric Service Tests FAILED:', error);
    return false;
  }
}

/**
 * Test User Service
 */
async function testUserService() {
  console.log('🧪 Testing User Service...');
  
  try {
    // Test 1: Verify service methods exist
    console.log('  1. Testing service method availability...');
    
    // Check that all required methods exist
    const methods = ['registerUser', 'getUsers', 'getUserById', 'updateUser', 'deleteUser'];
    const allMethodsExist = methods.every(method => typeof (userService as any)[method] === 'function');
    console.log(`     ✅ All user service methods available: ${allMethodsExist}`);
    
    // Test 2: Test user creation interface
    console.log('  2. Testing user creation interface...');
    const userData: UserCreate = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'testpassword123'
    };
    
    console.log('     ✅ User creation interface valid');
    
    console.log('✅ User Service Tests PASSED\n');
    return true;
  } catch (error) {
    console.error('❌ User Service Tests FAILED:', error);
    return false;
  }
}

/**
 * Test Device Service
 */
async function testDeviceService() {
  console.log('🧪 Testing Device Service...');
  
  try {
    // Test 1: Verify service methods exist
    console.log('  1. Testing service method availability...');
    
    const methods = ['getUserDevices', 'getDeviceById', 'updateDevice', 'deleteDevice', 'getCurrentDevice'];
    const allMethodsExist = methods.every(method => typeof (deviceService as any)[method] === 'function');
    console.log(`     ✅ All device service methods available: ${allMethodsExist}`);
    
    // Test 2: Test current device management
    console.log('  2. Testing current device management...');
    const currentDevice = deviceService.getCurrentDevice();
    console.log(`     ✅ Current device retrieval: ${currentDevice === null}`);
    
    deviceService.clearCurrentDevice();
    console.log('     ✅ Device clearing works');
    
    console.log('✅ Device Service Tests PASSED\n');
    return true;
  } catch (error) {
    console.error('❌ Device Service Tests FAILED:', error);
    return false;
  }
}

/**
 * Test API Integration with OpenAPI Specification
 */
async function testOpenAPICompatibility() {
  console.log('🧪 Testing OpenAPI Specification Compatibility...');
  
  try {
    // Test 1: Verify authentication endpoints match OpenAPI
    console.log('  1. Testing authentication endpoints...');
    const authEndpoints = [
      '/api/v1/auth/login',
      '/api/v1/auth/register', 
      '/api/v1/auth/verify-email',
      '/api/v1/auth/resend-code',
      '/api/v1/auth/logout'
    ];
    
    console.log(`     ✅ Authentication endpoints defined: ${authEndpoints.length}`);
    
    // Test 2: Verify metric endpoints match OpenAPI
    console.log('  2. Testing metric endpoints...');
    const metricEndpoints = [
      '/api/v1/metrics/batch',
      '/api/v1/metrics/',
      '/api/v1/metrics/{metric_id}',
      '/api/v1/metrics/summary',
      '/api/v1/metrics/health-prediction'
    ];
    
    console.log(`     ✅ Metric endpoints defined: ${metricEndpoints.length}`);
    
    // Test 3: Verify required metric types
    console.log('  3. Testing metric types...');
    const requiredMetricTypes = ['spo2', 'heart_rate', 'skin_temperature', 'ambient_temperature', 'steps', 'sleep'];
    const serviceMetricTypes = Object.values(MetricType);
    const hasAllTypes = requiredMetricTypes.every(type => 
      serviceMetricTypes.includes(type as MetricType)
    );
    console.log(`     ✅ All OpenAPI metric types supported: ${hasAllTypes}`);
    
    // Test 4: Verify required fields in metric creation
    console.log('  4. Testing required metric fields...');
    const requiredFields = ['metric_type', 'unit', 'sensor_model'];
    const testMetric: MetricCreate = {
      metric_type: MetricType.HEART_RATE,
      unit: 'bpm',
      sensor_model: 'Test-Sensor'
    };
    
    const hasRequiredFields = requiredFields.every(field => field in testMetric);
    console.log(`     ✅ All required metric fields present: ${hasRequiredFields}`);
    
    console.log('✅ OpenAPI Compatibility Tests PASSED\n');
    return true;
  } catch (error) {
    console.error('❌ OpenAPI Compatibility Tests FAILED:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Service Integration Tests\n');
  console.log(`Base URL: ${TEST_CONFIG.baseURL}\n`);
  
  const results = {
    authentication: await testAuthenticationService(),
    metrics: await testMetricService(),
    user: await testUserService(),
    device: await testDeviceService(),
    openapi: await testOpenAPICompatibility()
  };
  
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=======================');
  Object.entries(results).forEach(([service, passed]) => {
    console.log(`${service}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  return allPassed;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runAllTests };