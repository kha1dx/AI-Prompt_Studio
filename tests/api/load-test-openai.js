#!/usr/bin/env node

/**
 * OpenAI API Load Testing Suite
 * Tests performance under concurrent load scenarios
 */

require('dotenv').config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ANSI colors
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class LoadTester {
  constructor() {
    this.results = {
      requests: [],
      errors: [],
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitedRequests: 0
    };
  }

  async makeRequest(requestId, model = 'gpt-4o-mini') {
    const startTime = Date.now();
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: `Request ${requestId}: Generate a brief response about API testing.`
            }
          ],
          max_tokens: 50,
          temperature: 0.3
        })
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const data = await response.json();

      this.results.totalRequests++;

      if (response.ok) {
        this.results.successfulRequests++;
        this.results.requests.push({
          id: requestId,
          status: 'success',
          responseTime,
          model,
          timestamp: new Date().toISOString()
        });
        return { success: true, responseTime, data };
      } else {
        if (response.status === 429) {
          this.results.rateLimitedRequests++;
        } else {
          this.results.failedRequests++;
        }
        
        this.results.errors.push({
          id: requestId,
          status: response.status,
          error: data.error?.message || 'Unknown error',
          responseTime,
          timestamp: new Date().toISOString()
        });
        
        return { 
          success: false, 
          status: response.status, 
          error: data.error?.message,
          responseTime 
        };
      }
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      this.results.totalRequests++;
      this.results.failedRequests++;
      this.results.errors.push({
        id: requestId,
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString()
      });
      
      return { 
        success: false, 
        error: error.message, 
        responseTime 
      };
    }
  }

  async runSequentialTest(requestCount = 10) {
    log(`\n🔄 Sequential Load Test - ${requestCount} requests`, 'blue');
    log('=' .repeat(50), 'blue');

    const startTime = Date.now();
    
    for (let i = 1; i <= requestCount; i++) {
      log(`Request ${i}/${requestCount}...`, 'cyan');
      const result = await this.makeRequest(i);
      
      if (result.success) {
        log(`  ✓ Success: ${result.responseTime}ms`, 'green');
      } else {
        log(`  ✗ Failed: ${result.error} (${result.responseTime}ms)`, 'red');
      }
    }
    
    const totalTime = Date.now() - startTime;
    return { totalTime, requestCount };
  }

  async runConcurrentTest(concurrentUsers = 5, requestsPerUser = 3) {
    log(`\n⚡ Concurrent Load Test - ${concurrentUsers} users, ${requestsPerUser} requests each`, 'blue');
    log('=' .repeat(50), 'blue');

    const startTime = Date.now();
    const promises = [];

    for (let user = 1; user <= concurrentUsers; user++) {
      const userPromises = [];
      for (let req = 1; req <= requestsPerUser; req++) {
        const requestId = `U${user}R${req}`;
        userPromises.push(this.makeRequest(requestId));
      }
      promises.push(...userPromises);
    }

    log(`Executing ${promises.length} concurrent requests...`, 'cyan');
    const results = await Promise.allSettled(promises);
    
    const totalTime = Date.now() - startTime;
    const throughput = (results.length / totalTime * 1000).toFixed(2);
    
    log(`Completed in ${totalTime}ms (${throughput} requests/second)`, 'cyan');
    
    return { 
      totalTime, 
      totalRequests: results.length, 
      throughput: parseFloat(throughput),
      results 
    };
  }

  async runSpikeTest(baseUsers = 2, spikeUsers = 10, duration = 5000) {
    log(`\n📈 Spike Load Test - ${baseUsers} → ${spikeUsers} users`, 'blue');
    log('=' .repeat(50), 'blue');

    // Start with base load
    log('Starting base load...', 'cyan');
    const basePromises = [];
    for (let i = 1; i <= baseUsers; i++) {
      basePromises.push(this.makeRequest(`BASE${i}`));
    }

    // Wait a bit, then spike
    setTimeout(async () => {
      log('🚀 SPIKE INITIATED!', 'yellow');
      const spikePromises = [];
      for (let i = 1; i <= spikeUsers; i++) {
        spikePromises.push(this.makeRequest(`SPIKE${i}`));
      }
      await Promise.allSettled(spikePromises);
    }, 1000);

    await Promise.allSettled(basePromises);
    
    // Wait for spike to complete
    await new Promise(resolve => setTimeout(resolve, duration));
    
    return { baseUsers, spikeUsers, duration };
  }

  async runModelComparisonTest() {
    log(`\n🔬 Model Performance Comparison`, 'blue');
    log('=' .repeat(50), 'blue');

    const models = ['gpt-4o-mini', 'gpt-4-turbo'];
    const modelResults = {};

    for (const model of models) {
      log(`Testing ${model}...`, 'cyan');
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 1; i <= 3; i++) {
        promises.push(this.makeRequest(`${model.toUpperCase()}_${i}`, model));
      }
      
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const avgResponseTime = results
        .filter(r => r.status === 'fulfilled')
        .reduce((sum, r) => sum + r.value.responseTime, 0) / results.length;
      
      modelResults[model] = {
        totalRequests: results.length,
        successfulRequests: successful,
        avgResponseTime: Math.round(avgResponseTime),
        totalTime: endTime - startTime
      };
      
      log(`  ${model}: ${successful}/${results.length} success, avg ${Math.round(avgResponseTime)}ms`, 'green');
    }

    return modelResults;
  }

  generateReport() {
    const { 
      totalRequests, 
      successfulRequests, 
      failedRequests, 
      rateLimitedRequests,
      requests,
      errors 
    } = this.results;

    log('\n📊 LOAD TEST RESULTS SUMMARY', 'bold');
    log('=' .repeat(60), 'blue');

    // Basic stats
    log(`Total Requests: ${totalRequests}`, 'white');
    log(`Successful: ${successfulRequests} (${((successfulRequests/totalRequests)*100).toFixed(1)}%)`, 'green');
    log(`Failed: ${failedRequests}`, 'red');
    log(`Rate Limited: ${rateLimitedRequests}`, 'yellow');

    if (requests.length > 0) {
      // Response time analysis
      const responseTimes = requests.map(r => r.responseTime).sort((a, b) => a - b);
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const medianResponseTime = responseTimes[Math.floor(responseTimes.length / 2)];
      const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
      const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];

      log('\n⏱️  Response Time Analysis:', 'cyan');
      log(`  Average: ${Math.round(avgResponseTime)}ms`, 'white');
      log(`  Median: ${Math.round(medianResponseTime)}ms`, 'white');
      log(`  95th percentile: ${Math.round(p95ResponseTime)}ms`, 'white');
      log(`  99th percentile: ${Math.round(p99ResponseTime)}ms`, 'white');
      log(`  Min: ${Math.min(...responseTimes)}ms`, 'green');
      log(`  Max: ${Math.max(...responseTimes)}ms`, 'red');
    }

    // Error analysis
    if (errors.length > 0) {
      log('\n❌ Error Analysis:', 'red');
      const errorTypes = {};
      errors.forEach(error => {
        const type = error.status || 'Network Error';
        errorTypes[type] = (errorTypes[type] || 0) + 1;
      });

      Object.entries(errorTypes).forEach(([type, count]) => {
        log(`  ${type}: ${count} errors`, 'red');
      });
    }

    // Performance assessment
    log('\n🎯 Performance Assessment:', 'bold');
    const successRate = (successfulRequests / totalRequests) * 100;
    
    if (successRate >= 95) {
      log('✅ EXCELLENT: API performance is outstanding', 'green');
    } else if (successRate >= 90) {
      log('✅ GOOD: API performance is acceptable', 'green');
    } else if (successRate >= 80) {
      log('⚠️  ACCEPTABLE: Some performance issues detected', 'yellow');
    } else {
      log('❌ POOR: Significant performance issues detected', 'red');
    }

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      rateLimitedRequests,
      successRate,
      summary: successRate >= 80 ? 'HEALTHY' : 'NEEDS_ATTENTION'
    };
  }
}

async function runLoadTests() {
  if (!OPENAI_API_KEY) {
    log('❌ OPENAI_API_KEY not found in environment', 'red');
    process.exit(1);
  }

  log('🚀 Starting OpenAI API Load Testing Suite', 'bold');
  log(`Timestamp: ${new Date().toISOString()}`, 'cyan');

  const tester = new LoadTester();

  try {
    // Run different types of load tests
    await tester.runSequentialTest(5);
    await tester.runConcurrentTest(3, 2);
    await tester.runSpikeTest(2, 5, 3000);
    await tester.runModelComparisonTest();
    
    // Generate final report
    const report = tester.generateReport();
    
    return report;
  } catch (error) {
    log(`❌ Load testing failed: ${error.message}`, 'red');
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runLoadTests()
    .then(report => {
      process.exit(report.summary === 'HEALTHY' ? 0 : 1);
    })
    .catch(error => {
      console.error('Load testing suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runLoadTests, LoadTester };