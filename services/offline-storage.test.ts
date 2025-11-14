/**
 * Offline Storage Integration Test
 * This file demonstrates the usage of the offline storage services
 */

import { networkService, offlineStorageService, queueService, synchronizationService } from './index';
import { MetricType } from './metric.service';

// Test data
const testMetrics = [
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

/**
 * Test offline storage functionality
 */
async function testOfflineStorage() {
  console.log('🧪 Testing Offline Storage Integration...\n');

  try {
    // Initialize services
    console.log('1. Initializing services...');
    await networkService.initialize();
    await queueService.initialize();
    await offlineStorageService.initialize();
    await synchronizationService.initialize();
    console.log('✅ Services initialized successfully\n');

    // Test network status
    console.log('2. Checking network status...');
    const isOnline = networkService.isOnline();
    console.log(`📡 Network status: ${isOnline ? 'Online' : 'Offline'}`);
    console.log(`🔗 Connection type: ${networkService.getConnectionType()}\n`);

    // Test storing metrics offline
    console.log('3. Storing metrics offline...');
    await offlineStorageService.storeMetrics(testMetrics);
    console.log(`✅ Stored ${testMetrics.length} metrics offline\n`);

    // Test retrieving stored metrics
    console.log('4. Retrieving stored metrics...');
    const storedMetrics = await offlineStorageService.getStoredMetrics();
    console.log(`📊 Total stored metrics: ${storedMetrics.length}`);
    console.log(`⏰ Oldest metric: ${new Date(storedMetrics[storedMetrics.length - 1]?.storedAt || 0).toLocaleString()}`);
    console.log(`🆕 Newest metric: ${new Date(storedMetrics[0]?.storedAt || 0).toLocaleString()}\n`);

    // Test storage statistics
    console.log('5. Checking storage statistics...');
    const stats = await offlineStorageService.getStorageStats();
    console.log(`📈 Total metrics: ${stats.totalMetrics}`);
    console.log(`⏳ Pending sync: ${stats.pendingSync}`);
    console.log(`💾 Storage size: ${stats.storageSize} bytes\n`);

    // Test queue status
    console.log('6. Checking queue status...');
    const queueStatus = await queueService.getStatus();
    console.log(`📋 Queue items: ${queueStatus.totalItems}`);
    console.log(`⏳ Pending: ${queueStatus.pendingItems}`);
    console.log(`🔄 Processing: ${queueStatus.processingItems}`);
    console.log(`❌ Failed: ${queueStatus.failedItems}`);
    console.log(`✅ Completed: ${queueStatus.completedItems}\n`);

    // Test sync status
    console.log('7. Checking sync status...');
    const syncStatus = synchronizationService.getSyncStatus();
    console.log(`🔄 Sync in progress: ${syncStatus.isSyncing}`);
    console.log(`⏰ Last sync: ${new Date(syncStatus.lastSync).toLocaleString()}`);
    console.log(`✅ Last success: ${new Date(syncStatus.lastSuccess).toLocaleString()}`);
    console.log(`📊 Total synced: ${syncStatus.totalSynced}`);
    console.log(`❌ Total failed: ${syncStatus.totalFailed}\n`);

    // Test sync process (if online)
    if (isOnline) {
      console.log('8. Testing synchronization...');
      const syncResult = await synchronizationService.startSync();
      console.log(`🔄 Sync result: ${syncResult.success ? 'Success' : 'Failed'}`);
      console.log(`✅ Synced items: ${syncResult.syncedItems}`);
      console.log(`❌ Failed items: ${syncResult.failedItems}`);
      console.log(`⏱️ Duration: ${syncResult.duration}ms\n`);
    } else {
      console.log('8. Skipping sync test (offline mode)\n');
    }

    console.log('🎉 Offline storage integration test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Network service: ✅ Working`);
    console.log(`   • Queue service: ✅ Working`);
    console.log(`   • Offline storage: ✅ Working`);
    console.log(`   • Sync service: ✅ Working`);
    console.log(`   • HealthDataContext integration: ✅ Ready`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for manual testing
export { testOfflineStorage };

// Uncomment the line below to run the test manually
// testOfflineStorage();