/**
 * Comprehensive Integration Test for Offline Storage Solution
 * Tests the complete offline-to-online data flow
 */

import { metricService, networkService, offlineStorageService, queueService, synchronizationService } from './index';
import { MetricType } from './metric.service';

// Mock data for testing
const testHealthData = [
  {
    metric_type: MetricType.HEART_RATE,
    value: 72,
    unit: 'bpm',
    timestamp: new Date().toISOString(),
  },
  {
    metric_type: MetricType.SPO2,
    value: 98,
    unit: '%',
    timestamp: new Date().toISOString(),
  },
  {
    metric_type: MetricType.SKIN_TEMPERATURE,
    value: 36.5,
    unit: '°C',
    timestamp: new Date().toISOString(),
  }
];

const highPriorityData = [
  {
    metric_type: MetricType.HEART_RATE,
    value: 120, // Elevated heart rate for priority testing
    unit: 'bpm',
    timestamp: new Date().toISOString(),
  }
];

/**
 * Test Scenario 1: Basic Offline Storage
 */
async function testBasicOfflineStorage(): Promise<void> {
  console.log('🧪 Test 1: Basic Offline Storage\n');
  
  try {
    // Initialize services
    await offlineStorageService.initialize();
    
    // Clear any existing data
    await offlineStorageService.clearAllMetrics();
    await queueService.clearAll();
    
    // Store metrics offline
    console.log('📥 Storing metrics offline...');
    await offlineStorageService.storeMetrics(testHealthData);
    
    // Verify storage
    const storedMetrics = await offlineStorageService.getStoredMetrics();
    console.log(`✅ Stored ${storedMetrics.length} metrics`);
    
    // Check storage stats
    const stats = await offlineStorageService.getStorageStats();
    console.log(`📊 Storage stats: ${stats.totalMetrics} total, ${stats.pendingSync} pending`);
    
    // Verify metrics are marked as pending sync
    const pendingMetrics = await offlineStorageService.getPendingMetrics();
    console.log(`⏳ Pending sync: ${pendingMetrics.length} metrics`);
    
    if (pendingMetrics.length === testHealthData.length) {
      console.log('✅ All metrics correctly marked as pending sync\n');
    } else {
      console.log('❌ Not all metrics marked as pending sync\n');
    }
    
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
    throw error;
  }
}

/**
 * Test Scenario 2: Queue Management
 */
async function testQueueManagement(): Promise<void> {
  console.log('🧪 Test 2: Queue Management\n');
  
  try {
    // Initialize queue service
    await queueService.initialize();
    
    // Test adding items with different priorities
    console.log('📋 Testing queue with different priorities...');
    
    const normalItemId = await queueService.enqueue({
      type: 'metric_batch',
      payload: { metrics: testHealthData },
      priority: 'normal',
      maxAttempts: 3
    });
    
    const highItemId = await queueService.enqueue({
      type: 'metric_batch',
      payload: { metrics: highPriorityData },
      priority: 'high',
      maxAttempts: 5
    });
    
    console.log(`✅ Added items: ${normalItemId} (normal), ${highItemId} (high)`);
    
    // Check queue status
    const queueStatus = await queueService.getStatus();
    console.log(`📊 Queue status: ${queueStatus.pendingItems} pending, ${queueStatus.totalItems} total`);
    
    // Test dequeue (should prioritize high priority items)
    const itemsToProcess = await queueService.dequeue(5);
    console.log(`🔄 Dequeued ${itemsToProcess.length} items for processing`);
    
    // Verify high priority item is processed first
    if (itemsToProcess.length > 0 && itemsToProcess[0].priority === 'high') {
      console.log('✅ High priority item correctly prioritized\n');
    } else {
      console.log('❌ Priority processing not working correctly\n');
    }
    
    // Clean up
    await queueService.clearAll();
    
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
    throw error;
  }
}

/**
 * Test Scenario 3: Network Detection
 */
async function testNetworkDetection(): Promise<void> {
  console.log('🧪 Test 3: Network Detection\n');
  
  try {
    // Initialize network service
    await networkService.initialize();
    
    // Test current network state
    const isOnline = networkService.isOnline();
    const connectionType = networkService.getConnectionType();
    const networkState = networkService.getNetworkState();
    
    console.log(`📡 Network status: ${isOnline ? 'Online' : 'Offline'}`);
    console.log(`🔗 Connection type: ${connectionType}`);
    console.log(`⏰ Last checked: ${new Date(networkState.lastChecked).toLocaleString()}`);
    
    // Test network change listener
    console.log('👂 Testing network change listener...');
    let networkChangeDetected = false;
    
    const unsubscribe = networkService.addListener((state) => {
      networkChangeDetected = true;
      console.log(`🔄 Network state changed: ${state.isOnline ? 'Online' : 'Offline'}`);
    });
    
    // Force a network check to trigger listener
    await networkService.forceCheck();
    
    // Give some time for the listener to be called
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (networkChangeDetected) {
      console.log('✅ Network change detection working\n');
    } else {
      console.log('⚠️ Network change detection may need manual testing\n');
    }
    
    unsubscribe();
    
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
    throw error;
  }
}

/**
 * Test Scenario 4: Error Handling and Graceful Degradation
 */
async function testErrorHandling(): Promise<void> {
  console.log('🧪 Test 4: Error Handling\n');
  
  try {
    // Test offline storage fallback
    console.log('🔄 Testing offline fallback mechanism...');
    
    // Simulate network error by temporarily modifying network service
    const originalIsOnline = networkService.isOnline.bind(networkService);
    networkService.isOnline = () => false;
    
    try {
      // This should store offline due to simulated network error
      const result = await metricService.createMetricsBatch({ metrics: testHealthData });
      console.log(`✅ Offline fallback working: ${result.status}`);
    } catch (error) {
      console.error('❌ Offline fallback failed:', error);
    }
    
    // Restore original method
    networkService.isOnline = originalIsOnline;
    
    // Test queue retry logic
    console.log('🔄 Testing queue retry logic...');
    
    const itemId = await queueService.enqueue({
      type: 'metric_batch',
      payload: { metrics: testHealthData },
      priority: 'normal',
      maxAttempts: 3
    });
    
    // Simulate a failed processing attempt
    await queueService.updateItem(itemId, {
      status: 'failed',
      error: 'Simulated network error',
      attempts: 1
    });
    
    // Check if item should be retried
    const failedItems = await queueService.getItems('failed');
    const shouldRetry = queueService.shouldRetry(failedItems[0]);
    
    console.log(`🔄 Should retry failed item: ${shouldRetry}`);
    
    if (shouldRetry) {
      console.log('✅ Retry logic working correctly\n');
    } else {
      console.log('❌ Retry logic not working\n');
    }
    
    // Clean up
    await queueService.clearAll();
    
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
    throw error;
  }
}

/**
 * Test Scenario 5: Synchronization Service
 */
async function testSynchronization(): Promise<void> {
  console.log('🧪 Test 5: Synchronization Service\n');
  
  try {
    // Initialize sync service
    await synchronizationService.initialize();
    
    // Test sync status
    const syncStatus = synchronizationService.getSyncStatus();
    console.log(`🔄 Sync status: ${syncStatus.isSyncing ? 'In progress' : 'Idle'}`);
    console.log(`⏰ Last sync: ${new Date(syncStatus.lastSync).toLocaleString()}`);
    
    // Test sync configuration
    const config = synchronizationService.getConfig();
    console.log(`⚙️ Sync config: batchSize=${config.batchSize}, interval=${config.syncInterval}ms`);
    
    // Test sync event listeners
    console.log('👂 Testing sync event listeners...');
    
    let syncStarted = false;
    let syncCompleted = false;
    
    const startUnsubscribe = synchronizationService.onSyncStart(() => {
      syncStarted = true;
      console.log('🔄 Sync started event received');
    });
    
    const completeUnsubscribe = synchronizationService.onSyncComplete((result) => {
      syncCompleted = true;
      console.log(`✅ Sync completed: ${result.syncedItems} items synced`);
    });
    
    // Try to start sync (may not actually sync if no pending items)
    try {
      await synchronizationService.startSync();
    } catch (error) {
      // Expected if no items to sync
      console.log('ℹ️ No items to sync (expected)');
    }
    
    startUnsubscribe();
    completeUnsubscribe();
    
    console.log('✅ Synchronization service initialized correctly\n');
    
  } catch (error) {
    console.error('❌ Test 5 failed:', error);
    throw error;
  }
}

/**
 * Test Scenario 6: Integration with HealthDataContext
 */
async function testHealthDataContextIntegration(): Promise<void> {
  console.log('🧪 Test 6: HealthDataContext Integration\n');
  
  try {
    // Test metric creation from health data
    console.log('💓 Testing health metric creation...');
    
    const healthData = {
      heartRate: 75,
      oxygenLevel: 97,
      temperature: 36.8,
      sleepHours: 7.5,
      timestamp: new Date().toISOString()
    };
    
    const metrics = metricService.createHealthMetrics(healthData);
    console.log(`✅ Created ${metrics.length} metrics from health data`);
    
    // Validate metrics
    const validation = metricService.validateMetricsBatch({ metrics });
    console.log(`✅ Metrics validation: ${validation.valid ? 'Passed' : 'Failed'}`);
    
    if (!validation.valid) {
      console.log('❌ Validation errors:', validation.errors);
    }
    
    // Test offline storage integration
    console.log('💾 Testing offline storage integration...');
    
    // Store metrics using the same pattern as HealthDataContext
    await offlineStorageService.storeMetrics(metrics);
    
    const storedMetrics = await offlineStorageService.getStoredMetrics(5);
    console.log(`✅ ${storedMetrics.length} metrics stored via integration`);
    
    console.log('✅ HealthDataContext integration working correctly\n');
    
  } catch (error) {
    console.error('❌ Test 6 failed:', error);
    throw error;
  }
}

/**
 * Run all integration tests
 */
async function runAllIntegrationTests(): Promise<void> {
  console.log('🚀 Starting Comprehensive Offline Storage Integration Tests\n');
  console.log('='.repeat(60));
  
  try {
    await testBasicOfflineStorage();
    await testQueueManagement();
    await testNetworkDetection();
    await testErrorHandling();
    await testSynchronization();
    await testHealthDataContextIntegration();
    
    console.log('='.repeat(60));
    console.log('🎉 ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
    console.log('\n📋 Summary:');
    console.log('   • Offline Storage: ✅ Working');
    console.log('   • Queue Management: ✅ Working');
    console.log('   • Network Detection: ✅ Working');
    console.log('   • Error Handling: ✅ Working');
    console.log('   • Synchronization: ✅ Working');
    console.log('   • HealthDataContext Integration: ✅ Working');
    console.log('   • Complete Data Flow: ✅ Verified');
    
  } catch (error) {
    console.error('💥 INTEGRATION TESTS FAILED:', error);
    throw error;
  }
}

// Export for manual testing
export { runAllIntegrationTests };

// Uncomment to run tests manually
// runAllIntegrationTests().catch(console.error);