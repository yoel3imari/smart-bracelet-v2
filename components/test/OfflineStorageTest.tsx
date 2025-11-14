import { runAllTests } from '@/services/test-runner';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  error?: string;
}

export default function OfflineStorageTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Mock console.log to capture test output
    const originalLog = console.log;
    const originalError = console.error;
    
    const logs: string[] = [];
    
    console.log = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      logs.push(message);
      originalLog(...args);
    };
    
    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      logs.push(`❌ ${message}`);
      originalError(...args);
    };

    try {
      await runAllTests();
      
      setTestResults(prev => [...prev, {
        name: 'All Tests',
        status: 'passed',
        message: 'All offline storage tests completed successfully'
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, {
        name: 'All Tests',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }]);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return '#10B981';
      case 'failed': return '#EF4444';
      case 'running': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusEmoji = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '🔄';
      default: return '⏳';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧪 Offline Storage Test Suite</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.status}>
          Status: {isRunning ? 'Running Tests...' : 'Tests Completed'}
        </Text>
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        
        {testResults.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <Text style={[styles.resultStatus, { color: getStatusColor(result.status) }]}>
              {getStatusEmoji(result.status)} {result.name}
            </Text>
            {result.message && (
              <Text style={styles.resultMessage}>{result.message}</Text>
            )}
            {result.error && (
              <Text style={styles.resultError}>{result.error}</Text>
            )}
          </View>
        ))}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Test Coverage:</Text>
        <Text style={styles.infoItem}>• Offline Storage Functionality</Text>
        <Text style={styles.infoItem}>• Queue Management</Text>
        <Text style={styles.infoItem}>• Network Detection</Text>
        <Text style={styles.infoItem}>• Error Handling</Text>
        <Text style={styles.infoItem}>• Synchronization</Text>
        <Text style={styles.infoItem}>• HealthDataContext Integration</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1F2937',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  resultsContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
  },
  resultItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  resultStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 14,
    color: '#10B981',
    marginTop: 4,
  },
  resultError: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
  },
  infoItem: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
});