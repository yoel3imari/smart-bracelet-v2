/**
 * Test Script for Metric Batch Transmission
 * Validates the device data transformation and batch transmission functionality
 */

import { metricService, MetricType } from './services/index.ts';

// Test scenarios
const testScenarios = [
  {
    name: 'Device data with all undefined values',
    deviceData: {
      heartRate: undefined,
      sleepHours: undefined,
      spo2: undefined,
      steps: undefined,
      temperature: undefined,
      timestamp: undefined
    },
    expectedMetrics: 0
  },
  {
    name: 'Device data with some defined values',
    deviceData: {
      heartRate: 75,
      sleepHours: undefined,
      spo2: 98,
      steps: 5000,
      temperature: undefined,
      timestamp: '2023-10-01T12:00:00Z'
    },
    expectedMetrics: 3
  },
  {
    name: 'Device data with all defined values',
    deviceData: {
      heartRate: 75,
      sleepHours: 7.5,
      spo2: 98,
      steps: 5000,
      temperature: 36.5,
      timestamp: '2023-10-01T12:00:00Z'
    },
    expectedMetrics: 5
  },
  {
    name: 'Device data with invalid values',
    deviceData: {
      heartRate: 300, // Invalid
      spo2: 50, // Invalid
      temperature: 50, // Invalid
      steps: -100, // Invalid
      sleepHours: 25, // Invalid
      timestamp: '2023-10-01T12:00:00Z'
    },
    expectedMetrics: 0
  },
  {
    name: 'Device data with mixed valid and invalid values',
    deviceData: {
      heartRate: 300, // Invalid
      spo2: 98, // Valid
      steps: 5000, // Valid
      temperature: 50, // Invalid
      sleepHours: 7.5, // Valid
      timestamp: '2023-10-01T12:00:00Z'
    },
    expectedMetrics: 3
  }
];

console.log('🧪 Testing Metric Batch Transmission\n');

let passedTests = 0;
let failedTests = 0;

testScenarios.forEach((scenario, index) => {
  console.log(`Test ${index + 1}: ${scenario.name}`);
  
  try {
    // Test transformation function
    const metrics = metricService.transformDeviceDataToMetrics(scenario.deviceData);
    
    // Verify metric count
    if (metrics.length !== scenario.expectedMetrics) {
      throw new Error(`Expected ${scenario.expectedMetrics} metrics, got ${metrics.length}`);
    }
    
    // Verify field name mapping
    metrics.forEach(metric => {
      // Verify required fields
      if (!metric.metric_type || !metric.unit || !metric.sensor_model) {
        throw new Error('Missing required fields in metric');
      }
      
      // Verify field name mapping
      switch (metric.metric_type) {
        case MetricType.HEART_RATE:
          if (metric.unit !== 'bpm') throw new Error('Heart rate unit should be bpm');
          break;
        case MetricType.SLEEP:
          if (metric.unit !== 'hours') throw new Error('Sleep unit should be hours');
          break;
        case MetricType.SPO2:
          if (metric.unit !== '%') throw new Error('SpO2 unit should be %');
          break;
        case MetricType.STEPS:
          if (metric.unit !== 'steps') throw new Error('Steps unit should be steps');
          break;
        case MetricType.SKIN_TEMPERATURE:
          if (metric.unit !== '°C') throw new Error('Temperature unit should be °C');
          break;
      }
      
      // Verify timestamp
      if (!metric.timestamp) {
        throw new Error('Metric missing timestamp');
      }
    });
    
    console.log(`  ✅ PASSED - Generated ${metrics.length} metrics`);
    passedTests++;
    
    // Log metric details for verification
    if (metrics.length > 0) {
      console.log('  Generated metrics:');
      metrics.forEach(metric => {
        console.log(`    - ${metric.metric_type}: ${metric.value} ${metric.unit}`);
      });
    }
    
  } catch (error) {
    console.log(`  ❌ FAILED - ${error.message}`);
    failedTests++;
  }
  
  console.log('');
});

// Test batch transmission flow
console.log('Testing Batch Transmission Flow...');
try {
  const deviceData = {
    heartRate: 75,
    spo2: 98,
    steps: 5000,
    timestamp: '2023-10-01T12:00:00Z'
  };

  // Mock the batch creation to avoid actual API calls
  const originalCreateMetricsBatch = metricService.createMetricsBatch;
  metricService.createMetricsBatch = async () => ({
    status: 'success',
    count: 3
  });

  const result = await metricService.createMetricsBatchFromDeviceData(deviceData);
  
  if (result.status === 'success' && result.count === 3) {
    console.log('  ✅ Batch transmission flow PASSED');
    passedTests++;
  } else {
    throw new Error('Batch transmission returned unexpected result');
  }
  
  // Restore original method
  metricService.createMetricsBatch = originalCreateMetricsBatch;
  
} catch (error) {
  console.log(`  ❌ Batch transmission flow FAILED - ${error.message}`);
  failedTests++;
}

console.log('\n📊 TEST RESULTS SUMMARY');
console.log('=======================');
console.log(`Total Tests: ${passedTests + failedTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n🎉 All tests passed! The metric batch transmission implementation is working correctly.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Please review the implementation.');
  process.exit(1);
}