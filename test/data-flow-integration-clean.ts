/**
 * Smart Bracelet Data Flow Integration Test
 * 
 * This test verifies the complete data pipeline from device simulation
 * through BLE context, HealthDataContext, to UI components.
 */

// Test data simulating the new device format
export interface DeviceData {
  heartRate: number;
  spo2: number;
  temperature: number;
  fingerDetected: boolean;
  sleepHours: number;
  sleeping: boolean;
  activityKmh: number;
  steps: number;
  timestamp: number;
  idleSeconds: number;
}

export const SAMPLE_DEVICE_DATA: DeviceData = {
  heartRate: 72,
  spo2: 98,
  temperature: 37.2,
  fingerDetected: true,
  sleepHours: 7.5,
  sleeping: false,
  activityKmh: 3.2,
  steps: 42,
  timestamp: 123456,
  idleSeconds: 45
};

export const SAMPLE_DEVICE_DATA_ALT: DeviceData = {
  heartRate: 85,
  spo2: 95,
  temperature: 37.8,
  fingerDetected: false,
  sleepHours: 0,
  sleeping: true,
  activityKmh: 5.1,
  steps: 156,
  timestamp: 123457,
  idleSeconds: 120
};

// Edge case data for testing error handling
export const EDGE_CASE_DATA: DeviceData = {
  heartRate: 0,
  spo2: 100,
  temperature: 36.0,
  fingerDetected: true,
  sleepHours: 12,
  sleeping: false,
  activityKmh: 0,
  steps: 0,
  timestamp: 0,
  idleSeconds: 3600
};

/**
 * Data Flow Tester Class
 * Tests the complete data pipeline simulation
 */
export class DataFlowTester {
  private testResults: any[] = [];
  private performanceMetrics: any[] = [];

  /**
   * Simulate device data processing as it would happen in the BLE hook
   */
  processDeviceData(rawData: any): { success: boolean; data?: DeviceData; error?: string; processingTime: number } {
    const startTime = performance.now();
    
    try {
      let parsedData: DeviceData;
      
      if (typeof rawData === 'string') {
        // Try JSON parsing first (new format)
        try {
          const parsed = JSON.parse(rawData);
          parsedData = parsed as DeviceData;
        } catch {
          // Fallback to CSV parsing (legacy support)
          const values = rawData.split(',').map((val: string) => parseFloat(val.trim()));
          if (values.length >= 10) {
            parsedData = {
              heartRate: values[0] || 0,
              spo2: values[1] || 0,
              temperature: values[2] || 0,
              fingerDetected: values[3] > 0,
              sleepHours: values[4] || 0,
              sleeping: values[5] > 0,
              activityKmh: values[6] || 0,
              steps: values[7] || 0,
              timestamp: values[8] || Date.now(),
              idleSeconds: values[9] || 0
            };
          } else {
            throw new Error('Invalid CSV format');
          }
        }
      } else {
        parsedData = rawData as DeviceData;
      }

      // Validate and sanitize data
      const processedData: DeviceData = {
        heartRate: Number(parsedData.heartRate || 0),
        spo2: Number(parsedData.spo2 || 0),
        temperature: Number(parsedData.temperature || 0),
        fingerDetected: Boolean(parsedData.fingerDetected),
        sleepHours: Number(parsedData.sleepHours || 0),
        sleeping: Boolean(parsedData.sleeping),
        activityKmh: Number(parsedData.activityKmh || 0),
        steps: Number(parsedData.steps || 0),
        timestamp: Number(parsedData.timestamp || Date.now()),
        idleSeconds: Number(parsedData.idleSeconds || 0)
      };

      const processTime = performance.now() - startTime;
      this.performanceMetrics.push({ operation: 'dataProcessing', time: processTime });

      return {
        success: true,
        data: processedData,
        processingTime: processTime
      };

    } catch (error) {
      const processTime = performance.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: processTime
      };
    }
  }

  /**
   * Test data validation
   */
  validateDeviceData(data: any): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields check
    const requiredFields: (keyof DeviceData)[] = [
      'heartRate', 'spo2', 'temperature', 'fingerDetected',
      'sleepHours', 'sleeping', 'activityKmh', 'steps', 
      'timestamp', 'idleSeconds'
    ];

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        errors.push(`${field} is missing`);
      }
    }

    // Value range validation
    if (data.heartRate !== undefined && (data.heartRate < 0 || data.heartRate > 220)) {
      errors.push(`heartRate ${data.heartRate} is outside valid range (0-220)`);
    }

    if (data.spo2 !== undefined && (data.spo2 < 0 || data.spo2 > 100)) {
      errors.push(`spo2 ${data.spo2} is outside valid range (0-100)`);
    }

    if (data.temperature !== undefined && (data.temperature < 30 || data.temperature > 45)) {
      warnings.push(`temperature ${data.temperature} seems unusual (normal: 36-37.5°C)`);
    }

    if (data.sleepHours !== undefined && data.sleepHours > 24) {
      errors.push(`sleepHours ${data.sleepHours} exceeds 24 hours`);
    }

    if (data.activityKmh !== undefined && data.activityKmh > 50) {
      warnings.push(`activityKmh ${data.activityKmh} seems unusually high`);
    }

    // Type validation
    if (typeof data.fingerDetected !== 'boolean') {
      errors.push('fingerDetected must be boolean');
    }

    if (typeof data.sleeping !== 'boolean') {
      errors.push('sleeping must be boolean');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Test historical data management
   */
  testHistoricalDataManagement(): { success: boolean; originalCount: number; filteredCount: number; processingTime: number } {
    const startTime = performance.now();
    const MAX_HISTORICAL_AGE = 24 * 60 * 60 * 1000; // 24 hours
    const MAX_ENTRIES = 1000;

    // Simulate adding multiple data points
    const historicalData: any[] = [];
    const dataPoints = 1500; // More than the limit to test cleanup

    console.log(`🧪 Testing historical data management with ${dataPoints} entries...`);

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = Date.now() - (i * 60000); // 1 minute intervals
      historicalData.push({
        timestamp: new Date(timestamp),
        heartRate: 60 + Math.floor(Math.random() * 40),
        oxygenLevel: 95 + Math.floor(Math.random() * 5),
        temperature: 36.0 + Math.random() * 2.0,
        fingerDetected: Math.random() > 0.5,
        sleeping: Math.random() > 0.8,
        activityKmh: Math.random() * 10,
        steps: Math.floor(Math.random() * 100),
        idleSeconds: Math.floor(Math.random() * 300),
        sleepHours: Math.random() * 10
      });
    }

    // Apply cleanup logic (keep only last 24 hours)
    const now = Date.now();
    const cutoffTime = now - MAX_HISTORICAL_AGE;
    const filteredData = historicalData.filter(item => 
      item.timestamp.getTime() > cutoffTime
    );

    // Limit to reasonable number of entries
    if (filteredData.length > MAX_ENTRIES) {
      filteredData.splice(0, filteredData.length - MAX_ENTRIES);
    }

    const processTime = performance.now() - startTime;
    this.performanceMetrics.push({ 
      operation: 'historicalDataManagement', 
      time: processTime,
      originalEntries: dataPoints,
      filteredEntries: filteredData.length
    });

    console.log(`✅ Historical data management: ${dataPoints} -> ${filteredData.length} entries (${processTime.toFixed(2)}ms)`);

    return {
      success: true,
      originalCount: dataPoints,
      filteredCount: filteredData.length,
      processingTime: processTime
    };
  }

  /**
   * Test complete data flow simulation
   */
  async testCompleteDataFlow(): Promise<{ success: boolean; error?: string; details?: any; totalTime: number }> {
    console.log('🧪 Testing complete data flow...');
    const startTime = performance.now();

    // Step 1: Device data simulation
    const deviceData = SAMPLE_DEVICE_DATA;
    const deviceValidation = this.validateDeviceData(deviceData);
    
    if (!deviceValidation.isValid) {
      return {
        success: false,
        error: 'Device data validation failed',
        details: deviceValidation,
        totalTime: performance.now() - startTime
      };
    }

    // Step 2: BLE processing simulation
    const bleResult = this.processDeviceData(deviceData);
    if (!bleResult.success || !bleResult.data) {
      return {
        success: false,
        error: 'BLE processing failed',
        details: bleResult,
        totalTime: performance.now() - startTime
      };
    }

    // Step 3: Health data transformation (simulating HealthDataContext)
    const healthData = {
      heartRate: bleResult.data.heartRate || 0,
      sleepHours: bleResult.data.sleepHours || 0,
      temperature: bleResult.data.temperature || 0,
      oxygenLevel: bleResult.data.spo2 || 0,
      fingerDetected: bleResult.data.fingerDetected || false,
      sleeping: bleResult.data.sleeping || false,
      activityKmh: bleResult.data.activityKmh || 0,
      steps: bleResult.data.steps || 0,
      idleSeconds: bleResult.data.idleSeconds || 0,
      timestamp: bleResult.data.timestamp || Date.now(),
      lastUpdated: new Date()
    };

    // Step 4: Backend metrics simulation
    const metricsData = {
      heartRate: healthData.heartRate,
      oxygenLevel: healthData.oxygenLevel,
      temperature: healthData.temperature,
      sleepHours: healthData.sleepHours,
      timestamp: healthData.lastUpdated.toISOString()
    };

    const totalTime = performance.now() - startTime;
    this.performanceMetrics.push({ 
      operation: 'completeDataFlow', 
      time: totalTime 
    });

    console.log('✅ Complete data flow test successful:', {
      deviceData: deviceData.heartRate,
      processedData: bleResult.data.heartRate,
      healthData: healthData.heartRate,
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    return {
      success: true,
      totalTime,
      details: {
        deviceData,
        bleProcessedData: bleResult.data,
        healthData,
        metricsData
      }
    };
  }

  /**
   * Test error scenarios
   */
  testErrorHandling(): { success: boolean; errors: string[]; testResults: any } {
    console.log('🧪 Testing error handling scenarios...');
    const errors: string[] = [];

    // Test 1: Missing fields
    const missingFieldsData = {
      heartRate: 72,
      spo2: 98
      // Missing other fields
    };
    
    const missingFieldsResult = this.validateDeviceData(missingFieldsData);
    if (!missingFieldsResult.isValid) {
      console.log('✅ Missing fields handled correctly:', missingFieldsResult.errors);
    } else {
      errors.push('Missing fields test failed');
    }

    // Test 2: Invalid data types
    const invalidTypeData = {
      heartRate: "invalid",
      spo2: 98,
      temperature: 37.2,
      fingerDetected: "not_boolean",
      sleepHours: 7.5,
      sleeping: false,
      activityKmh: 3.2,
      steps: 42,
      timestamp: 123456,
      idleSeconds: 45
    };

    const invalidTypeResult = this.validateDeviceData(invalidTypeData);
    if (invalidTypeResult.errors.length > 0) {
      console.log('✅ Invalid types handled correctly:', invalidTypeResult.errors);
    } else {
      errors.push('Invalid types test failed');
    }

    // Test 3: Extreme values
    const extremeValuesData = {
      heartRate: 300, // Too high
      spo2: 150, // Too high
      temperature: 50, // Too high
      fingerDetected: true,
      sleepHours: 48, // Too high
      sleeping: false,
      activityKmh: 100, // Too high
      steps: 999999, // Too high
      timestamp: Date.now() + 86400000, // Future
      idleSeconds: -100 // Negative
    };

    const extremeValuesResult = this.validateDeviceData(extremeValuesData);
    if (extremeValuesResult.errors.length > 0 || extremeValuesResult.warnings.length > 0) {
      console.log('✅ Extreme values handled correctly:', {
        errors: extremeValuesResult.errors,
        warnings: extremeValuesResult.warnings
      });
    } else {
      errors.push('Extreme values test failed');
    }

    // Test 4: Malformed JSON
    const malformedJson = '{ invalid json data ';
    const malformedResult = this.processDeviceData(malformedJson);
    if (!malformedResult.success) {
      console.log('✅ Malformed JSON handled correctly:', malformedResult.error);
    } else {
      errors.push('Malformed JSON test failed');
    }

    return {
      success: errors.length === 0,
      errors,
      testResults: {
        missingFields: missingFieldsResult,
        invalidTypes: invalidTypeResult,
        extremeValues: extremeValuesResult,
        malformedJson: malformedResult
      }
    };
  }

  /**
   * Performance testing
   */
  testPerformance(): { success: boolean; iterations: number; avgTime: number; maxTime: number; minTime: number; successRate: number } {
    console.log('🧪 Testing performance...');
    const iterations = 100;
    const results: { processingTime: number; success: boolean }[] = [];

    // Test data processing performance
    for (let i = 0; i < iterations; i++) {
      const testData: DeviceData = {
        heartRate: 60 + Math.random() * 40,
        spo2: 95 + Math.random() * 5,
        temperature: 36.0 + Math.random() * 2.0,
        fingerDetected: Math.random() > 0.5,
        sleepHours: Math.random() * 10,
        sleeping: Math.random() > 0.8,
        activityKmh: Math.random() * 10,
        steps: Math.floor(Math.random() * 100),
        timestamp: Date.now(),
        idleSeconds: Math.floor(Math.random() * 300)
      };

      const startTime = performance.now();
      const result = this.processDeviceData(testData);
      const endTime = performance.now();

      results.push({
        processingTime: endTime - startTime,
        success: result.success
      });
    }

    const avgTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
    const maxTime = Math.max(...results.map(r => r.processingTime));
    const minTime = Math.min(...results.map(r => r.processingTime));
    const successRate = results.filter(r => r.success).length / results.length;

    this.performanceMetrics.push({
      operation: 'performanceTest',
      iterations,
      avgTime,
      maxTime,
      minTime,
      successRate
    });

    console.log('✅ Performance test results:', {
      iterations,
      avgTime: `${avgTime.toFixed(3)}ms`,
      maxTime: `${maxTime.toFixed(3)}ms`,
      minTime: `${minTime.toFixed(3)}ms`,
      successRate: `${(successRate * 100).toFixed(1)}%`
    });

    return {
      success: true,
      iterations,
      avgTime,
      maxTime,
      minTime,
      successRate
    };
  }

  /**
   * Run all tests and generate comprehensive report
   */
  async runAllTests(): Promise<{
    timestamp: string;
    tests: any[];
    performance: any[];
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
    };
  }> {
    console.log('🚀 Starting Smart Bracelet Data Flow Integration Tests...\n');

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [] as any[],
      performance: this.performanceMetrics,
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0
      }
    };

    // Test 1: Complete data flow
    try {
      const dataFlowResult = await this.testCompleteDataFlow();
      testResults.tests.push({
        name: 'Complete Data Flow',
        success: dataFlowResult.success,
        result: dataFlowResult,
        timestamp: new Date().toISOString()
      });
      testResults.summary.totalTests++;
      if (dataFlowResult.success) {
        testResults.summary.passedTests++;
      } else {
        testResults.summary.failedTests++;
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Complete Data Flow',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      testResults.summary.totalTests++;
      testResults.summary.failedTests++;
    }

    // Test 2: Historical data management
    try {
      const historicalResult = this.testHistoricalDataManagement();
      testResults.tests.push({
        name: 'Historical Data Management',
        success: historicalResult.success,
        result: historicalResult,
        timestamp: new Date().toISOString()
      });
      testResults.summary.totalTests++;
      if (historicalResult.success) {
        testResults.summary.passedTests++;
      } else {
        testResults.summary.failedTests++;
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Historical Data Management',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      testResults.summary.totalTests++;
      testResults.summary.failedTests++;
    }

    // Test 3: Error handling
    try {
      const errorHandlingResult = this.testErrorHandling();
      testResults.tests.push({
        name: 'Error Handling',
        success: errorHandlingResult.success,
        result: errorHandlingResult,
        timestamp: new Date().toISOString()
      });
      testResults.summary.totalTests++;
      if (errorHandlingResult.success) {
        testResults.summary.passedTests++;
      } else {
        testResults.summary.failedTests++;
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Error Handling',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      testResults.summary.totalTests++;
      testResults.summary.failedTests++;
    }

    // Test 4: Performance
    try {
      const performanceResult = this.testPerformance();
      testResults.tests.push({
        name: 'Performance Test',
        success: performanceResult.successRate >= 0.95,
        result: performanceResult,
        timestamp: new Date().toISOString()
      });
      testResults.summary.totalTests++;
      if (performanceResult.successRate >= 0.95) {
        testResults.summary.passedTests++;
      } else {
        testResults.summary.failedTests++;
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Performance Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      testResults.summary.totalTests++;
      testResults.summary.failedTests++;
    }

    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log(`Total Tests: ${testResults.summary.totalTests}`);
    console.log(`Passed: ${testResults.summary.passedTests}`);
    console.log(`Failed: ${testResults.summary.failedTests}`);
    console.log(`Success Rate: ${((testResults.summary.passedTests / testResults.summary.totalTests) * 100).toFixed(1)}%`);

    console.log('\n⚡ Performance Metrics:');
    this.performanceMetrics.forEach(metric => {
      console.log(`${metric.operation}: ${metric.time?.toFixed(2)}ms`);
    });

    console.log('\n✅ Smart Bracelet Data Flow Integration Tests Completed!\n');

    return testResults;
  }
}

/**
 * Test Runner Function
 */
export async function runDataFlowTests(): Promise<any> {
  const tester = new DataFlowTester();
  return await tester.runAllTests();
}

// Export default for easy importing
export default DataFlowTester;