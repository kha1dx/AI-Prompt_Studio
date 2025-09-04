#!/usr/bin/env node

/**
 * Performance Stress Test - API Load Testing
 * Tests API performance under various load conditions
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:3000';
const results = { tests: [], metrics: {} };

const logTest = (name, status, duration, details = {}) => {
  const statusIcon = status === 'PASS' ? '✅' : '❌';
  console.log(`${statusIcon} ${name} (${duration}ms)${status === 'FAIL' ? ' - ' + (details.error || 'Failed') : ''}`);
  results.tests.push({ name, status, duration, details });
};

class PerformanceStressTester {
  async loadTest(name, requestFn, concurrency = 10, duration = 5000) {
    console.log(`\n🚀 ${name} (${concurrency} concurrent, ${duration}ms)`);
    
    const start = performance.now();
    const endTime = start + duration;
    
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let responseTimes = [];
    let errors = [];
    
    const workers = Array(concurrency).fill(null).map(async () => {
      while (performance.now() < endTime) {
        const requestStart = performance.now();
        try {
          await requestFn();
          const requestTime = performance.now() - requestStart;
          responseTimes.push(requestTime);
          successfulRequests++;
        } catch (error) {
          failedRequests++;
          errors.push(error.message);
        }
        totalRequests++;
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });
    
    await Promise.all(workers);
    
    const totalDuration = performance.now() - start;
    const rps = Math.round((totalRequests / totalDuration) * 1000);
    const avgResponseTime = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
    const p95ResponseTime = responseTimes.length > 0 ? Math.round(responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]) : 0;
    const errorRate = Math.round((failedRequests / totalRequests) * 100);
    
    const metrics = {
      totalRequests,
      successfulRequests,
      failedRequests,
      errorRate,
      rps,
      avgResponseTime,
      p95ResponseTime,
      duration: Math.round(totalDuration)
    };
    
    results.metrics[name] = metrics;
    
    console.log(`  📊 Results:`);
    console.log(`     Total Requests: ${totalRequests}`);
    console.log(`     Success Rate: ${Math.round((successfulRequests / totalRequests) * 100)}%`);
    console.log(`     Requests/sec: ${rps}`);
    console.log(`     Avg Response: ${avgResponseTime}ms`);
    console.log(`     P95 Response: ${p95ResponseTime}ms`);
    
    // Test passes if error rate < 10% and RPS > 5
    const passed = errorRate < 10 && rps > 5;
    logTest(name, passed ? 'PASS' : 'FAIL', Math.round(totalDuration), metrics);
    
    return metrics;
  }

  async runStressTests() {
    console.log('🔥 Starting API Performance Stress Tests...\n');
    
    // Test 1: GET conversations endpoint
    await this.loadTest(
      'GET /api/conversations Load Test',
      async () => {
        const response = await axios.get(`${BASE_URL}/api/conversations`, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        return response.data;
      },
      15, // 15 concurrent requests
      5000 // for 5 seconds
    );
    
    // Test 2: POST conversations endpoint
    await this.loadTest(
      'POST /api/conversations Load Test',
      async () => {
        const response = await axios.post(`${BASE_URL}/api/conversations`, {
          title: `Test Conversation ${Date.now()}`
        }, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        return response.data;
      },
      10, // 10 concurrent requests  
      3000 // for 3 seconds
    );
    
    // Test 3: Generate prompt endpoint
    await this.loadTest(
      'POST /api/ai/generate-prompt Load Test',
      async () => {
        const response = await axios.post(`${BASE_URL}/api/ai/generate-prompt`, {
          conversationId: `test-conversation-${Math.random()}`
        }, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        return response.data;
      },
      8, // 8 concurrent requests
      3000 // for 3 seconds
    );
    
    // Test 4: Mixed endpoint load
    await this.loadTest(
      'Mixed Endpoints Load Test',
      async () => {
        const endpoints = [
          () => axios.get(`${BASE_URL}/api/conversations`),
          () => axios.post(`${BASE_URL}/api/conversations`, { title: 'Mixed Test' }),
          () => axios.get(`${BASE_URL}/api/conversations/test-id`)
        ];
        
        const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const response = await randomEndpoint();
        
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        return response.data;
      },
      12, // 12 concurrent requests
      4000 // for 4 seconds
    );
  }

  async runSpikeTest() {
    console.log('\n⚡ Spike Test - Sudden Traffic Increase...\n');
    
    // Sudden burst of requests
    const spikeRequests = 50;
    const promises = Array(spikeRequests).fill(null).map(() =>
      axios.get(`${BASE_URL}/api/conversations`, {
        timeout: 10000,
        validateStatus: () => true
      })
    );
    
    const start = performance.now();
    const responses = await Promise.all(promises);
    const duration = performance.now() - start;
    
    const successful = responses.filter(r => r.status < 500).length;
    const successRate = Math.round((successful / spikeRequests) * 100);
    
    console.log(`  📊 Spike Test Results:`);
    console.log(`     ${successful}/${spikeRequests} requests successful (${successRate}%)`);
    console.log(`     Total time: ${Math.round(duration)}ms`);
    console.log(`     Avg time per request: ${Math.round(duration / spikeRequests)}ms`);
    
    const passed = successRate >= 80; // 80% success rate required
    logTest('Spike Test', passed ? 'PASS' : 'FAIL', Math.round(duration), {
      successRate,
      successful,
      total: spikeRequests
    });
  }

  generateReport() {
    console.log('\n📊 Performance Test Report');
    console.log('='.repeat(70));
    
    const passedTests = results.tests.filter(t => t.status === 'PASS').length;
    const totalTests = results.tests.length;
    
    console.log(`✅ Passed: ${passedTests}/${totalTests} (${Math.round((passedTests / totalTests) * 100)}%)`);
    
    console.log('\n📈 Performance Metrics:');
    Object.entries(results.metrics).forEach(([name, metrics]) => {
      console.log(`\n  ${name}:`);
      console.log(`    RPS: ${metrics.rps} req/sec`);
      console.log(`    Avg Response: ${metrics.avgResponseTime}ms`);
      console.log(`    P95 Response: ${metrics.p95ResponseTime}ms`);
      console.log(`    Error Rate: ${metrics.errorRate}%`);
    });
    
    // Overall assessment
    const avgRPS = Object.values(results.metrics).reduce((sum, m) => sum + m.rps, 0) / Object.values(results.metrics).length;
    const avgResponseTime = Object.values(results.metrics).reduce((sum, m) => sum + m.avgResponseTime, 0) / Object.values(results.metrics).length;
    const maxErrorRate = Math.max(...Object.values(results.metrics).map(m => m.errorRate));
    
    console.log('\n🎯 Overall Performance Assessment:');
    console.log(`   Average RPS: ${Math.round(avgRPS)} req/sec`);
    console.log(`   Average Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`   Max Error Rate: ${maxErrorRate}%`);
    
    let performanceGrade = 'A';
    if (avgRPS < 10 || avgResponseTime > 1000 || maxErrorRate > 10) performanceGrade = 'B';
    if (avgRPS < 5 || avgResponseTime > 2000 || maxErrorRate > 25) performanceGrade = 'C';
    if (avgRPS < 2 || avgResponseTime > 5000 || maxErrorRate > 50) performanceGrade = 'D';
    
    console.log(`   Performance Grade: ${performanceGrade}`);
    
    console.log('\n' + '='.repeat(70));
    
    if (passedTests === totalTests && performanceGrade !== 'D') {
      console.log('\n🎉 EXCELLENT - API performs well under load and is ready for production!');
      return true;
    } else if (passedTests >= totalTests * 0.8) {
      console.log('\n✅ GOOD - API handles load reasonably well with minor performance issues');
      return true;
    } else {
      console.log('\n⚠️ NEEDS IMPROVEMENT - API has performance issues under load');
      return false;
    }
  }
}

async function main() {
  const tester = new PerformanceStressTester();
  
  try {
    await tester.runStressTests();
    await tester.runSpikeTest();
    const passed = tester.generateReport();
    
    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('💥 Fatal error during performance testing:', error);
    process.exit(1);
  }
}

main().catch(console.error);