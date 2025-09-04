import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { performance } from 'perf_hooks';
import autocannon from 'autocannon';

describe('Authentication Performance Tests', () => {
  const baseUrl = 'http://localhost:3000';
  let testUsers: any[] = [];

  beforeAll(async () => {
    // Create test users for performance testing
    testUsers = await Promise.all(
      Array(10).fill(null).map(async (_, i) => {
        const userData = {
          email: `perf-user-${i}@example.com`,
          password: 'PerfTest123!',
          name: `Performance User ${i}`,
        };

        await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });

        return userData;
      })
    );
  });

  describe('Response Time Requirements', () => {
    it('should handle login requests under 200ms (95th percentile)', async () => {
      const responseTimes: number[] = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const testUser = testUsers[i % testUsers.length];
        const startTime = performance.now();

        await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password,
          }),
        });

        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }

      // Calculate 95th percentile
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(iterations * 0.95);
      const p95ResponseTime = responseTimes[p95Index];

      expect(p95ResponseTime).toBeLessThan(200);

      // Also check average response time
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / iterations;
      expect(avgResponseTime).toBeLessThan(100);

      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`95th percentile response time: ${p95ResponseTime.toFixed(2)}ms`);
    });

    it('should handle registration requests under 500ms', async () => {
      const responseTimes: number[] = [];
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const userData = {
          email: `perf-reg-${i}-${Date.now()}@example.com`,
          password: 'PerfTest123!',
          name: `Performance Registration User ${i}`,
        };

        const startTime = performance.now();

        await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });

        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }

      // Calculate 95th percentile
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(iterations * 0.95);
      const p95ResponseTime = responseTimes[p95Index];

      expect(p95ResponseTime).toBeLessThan(500);

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / iterations;
      console.log(`Registration average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Registration 95th percentile: ${p95ResponseTime.toFixed(2)}ms`);
    });

    it('should handle token verification under 50ms', async () => {
      // First get a valid token
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUsers[0].email,
          password: testUsers[0].password,
        }),
      });

      const { token } = await loginResponse.json();
      const responseTimes: number[] = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        await fetch(`${baseUrl}/api/auth/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const maxResponseTime = Math.max(...responseTimes);

      expect(avgResponseTime).toBeLessThan(50);
      expect(maxResponseTime).toBeLessThan(100);

      console.log(`Token verification average: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Token verification max: ${maxResponseTime.toFixed(2)}ms`);
    });
  });

  describe('Throughput Requirements', () => {
    it('should handle 100 concurrent login requests', async () => {
      const concurrentRequests = 100;
      const promises: Promise<any>[] = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentRequests; i++) {
        const testUser = testUsers[i % testUsers.length];
        const promise = fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password,
          }),
        });
        promises.push(promise);
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const requestsPerSecond = (concurrentRequests / totalTime) * 1000;

      // Check that all requests were successful
      const successfulRequests = responses.filter(r => r.ok).length;
      expect(successfulRequests).toBe(concurrentRequests);

      // Should handle at least 50 requests per second
      expect(requestsPerSecond).toBeGreaterThan(50);

      console.log(`Concurrent login throughput: ${requestsPerSecond.toFixed(2)} requests/second`);
      console.log(`Total time for ${concurrentRequests} requests: ${totalTime.toFixed(2)}ms`);
    });

    it('should maintain performance under sustained load', async () => {
      const duration = 10000; // 10 seconds
      const requestInterval = 100; // Request every 100ms
      const startTime = Date.now();
      const responseTimes: number[] = [];
      let requestCount = 0;

      while (Date.now() - startTime < duration) {
        const testUser = testUsers[requestCount % testUsers.length];
        const requestStart = performance.now();

        try {
          await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: testUser.email,
              password: testUser.password,
            }),
          });

          const requestEnd = performance.now();
          responseTimes.push(requestEnd - requestStart);
          requestCount++;

        } catch (error) {
          console.error('Request failed:', error);
        }

        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const requestsPerSecond = requestCount / (duration / 1000);

      // Performance should not degrade significantly over time
      expect(avgResponseTime).toBeLessThan(300);
      expect(requestsPerSecond).toBeGreaterThan(5);

      console.log(`Sustained load average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Sustained load throughput: ${requestsPerSecond.toFixed(2)} requests/second`);
    });
  });

  describe('Memory Usage', () => {
    it('should not have significant memory leaks during authentication', async () => {
      // Mock memory usage monitoring
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const testUser = testUsers[i % testUsers.length];
        
        await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password,
          }),
        });

        // Force garbage collection every 100 requests
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      // Force final garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be less than 50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      console.log(`Memory increase after ${iterations} auth requests: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle large payloads efficiently', async () => {
      const largeUserData = {
        email: 'large-payload@example.com',
        password: 'LargePayload123!',
        name: 'Large Payload User',
        bio: 'A'.repeat(10000), // 10KB bio
        metadata: {
          preferences: 'B'.repeat(5000),
          settings: 'C'.repeat(5000),
        },
      };

      const initialMemory = process.memoryUsage().heapUsed;
      const startTime = performance.now();

      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(largeUserData),
      });

      const endTime = performance.now();
      const finalMemory = process.memoryUsage().heapUsed;

      const processingTime = endTime - startTime;
      const memoryIncrease = finalMemory - initialMemory;

      // Should process large payloads within reasonable time and memory
      expect(processingTime).toBeLessThan(1000); // 1 second
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB

      console.log(`Large payload processing time: ${processingTime.toFixed(2)}ms`);
      console.log(`Large payload memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Database Performance', () => {
    it('should handle database queries efficiently', async () => {
      // Test multiple concurrent database operations
      const concurrentQueries = 50;
      const promises: Promise<any>[] = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentQueries; i++) {
        const promise = fetch(`${baseUrl}/api/user/profile`, {
          headers: {
            'Authorization': 'Bearer valid-token',
          },
        });
        promises.push(promise);
      }

      await Promise.all(promises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const queriesPerSecond = (concurrentQueries / totalTime) * 1000;

      // Should handle at least 20 database queries per second
      expect(queriesPerSecond).toBeGreaterThan(20);

      console.log(`Database query throughput: ${queriesPerSecond.toFixed(2)} queries/second`);
    });

    it('should optimize password hashing performance', async () => {
      const passwords = [
        'TestPassword1!',
        'AnotherPassword2@',
        'ThirdPassword3#',
        'FourthPassword4$',
        'FifthPassword5%',
      ];

      const hashingTimes: number[] = [];

      for (const password of passwords) {
        const userData = {
          email: `hash-test-${Date.now()}-${Math.random()}@example.com`,
          password,
          name: 'Hash Test User',
        };

        const startTime = performance.now();

        await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });

        const endTime = performance.now();
        hashingTimes.push(endTime - startTime);
      }

      const avgHashingTime = hashingTimes.reduce((sum, time) => sum + time, 0) / hashingTimes.length;
      const maxHashingTime = Math.max(...hashingTimes);

      // Password hashing should be reasonable but not too fast (security vs performance)
      expect(avgHashingTime).toBeGreaterThan(100); // Should take some time for security
      expect(avgHashingTime).toBeLessThan(2000); // But not too long for UX
      expect(maxHashingTime).toBeLessThan(3000);

      console.log(`Average password hashing time: ${avgHashingTime.toFixed(2)}ms`);
      console.log(`Maximum password hashing time: ${maxHashingTime.toFixed(2)}ms`);
    });
  });

  describe('Load Testing with Autocannon', () => {
    it('should handle sustained load with autocannon', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/auth/login`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUsers[0].email,
          password: testUsers[0].password,
        }),
        connections: 10,
        duration: 10, // 10 seconds
        pipelining: 1,
      });

      // Check load test results
      expect(result.errors).toBe(0);
      expect(result.non2xx).toBe(0);
      expect(result.requests.average).toBeGreaterThan(50); // At least 50 requests per second

      console.log('Load test results:');
      console.log(`Average requests/sec: ${result.requests.average}`);
      console.log(`Average latency: ${result.latency.average}ms`);
      console.log(`95th percentile latency: ${result.latency.p95}ms`);
      console.log(`99th percentile latency: ${result.latency.p99}ms`);
      console.log(`Total requests: ${result.requests.total}`);
      console.log(`Errors: ${result.errors}`);
    }, 15000); // Increase timeout for load test

    it('should handle peak load scenarios', async () => {
      // Simulate peak load with bursts
      const burstResult = await autocannon({
        url: `${baseUrl}/api/auth/login`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUsers[0].email,
          password: testUsers[0].password,
        }),
        connections: 50,
        duration: 5, // Short burst
        pipelining: 1,
      });

      // Even under peak load, error rate should be low
      const errorRate = (burstResult.errors / burstResult.requests.total) * 100;
      expect(errorRate).toBeLessThan(5); // Less than 5% error rate

      console.log('Peak load test results:');
      console.log(`Error rate: ${errorRate.toFixed(2)}%`);
      console.log(`Peak requests/sec: ${burstResult.requests.average}`);
      console.log(`Peak 99th percentile latency: ${burstResult.latency.p99}ms`);
    }, 10000);
  });

  describe('Caching Performance', () => {
    it('should benefit from token caching', async () => {
      // Get a token first
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUsers[0].email,
          password: testUsers[0].password,
        }),
      });

      const { token } = await loginResponse.json();

      // First verification (should hit database)
      const startTime1 = performance.now();
      await fetch(`${baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const firstVerificationTime = performance.now() - startTime1;

      // Second verification (should hit cache)
      const startTime2 = performance.now();
      await fetch(`${baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const secondVerificationTime = performance.now() - startTime2;

      // Cached verification should be faster
      expect(secondVerificationTime).toBeLessThan(firstVerificationTime);
      expect(secondVerificationTime).toBeLessThan(20); // Very fast for cached response

      console.log(`First token verification: ${firstVerificationTime.toFixed(2)}ms`);
      console.log(`Cached token verification: ${secondVerificationTime.toFixed(2)}ms`);
    });

    it('should handle cache invalidation properly', async () => {
      // Login to get token
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUsers[1].email,
          password: testUsers[1].password,
        }),
      });

      const { token } = await loginResponse.json();

      // Verify token (should cache)
      await fetch(`${baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // Logout (should invalidate cache)
      await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // Try to verify again (should fail and not use cache)
      const verifyResponse = await fetch(`${baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      expect(verifyResponse.status).toBe(401);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should maintain performance under rate limiting', async () => {
      const requests = 20; // Within rate limit
      const responseTimes: number[] = [];

      for (let i = 0; i < requests; i++) {
        const startTime = performance.now();
        
        await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testUsers[i % testUsers.length].email,
            password: testUsers[i % testUsers.length].password,
          }),
        });

        const endTime = performance.now();
        responseTimes.push(endTime - startTime);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

      // Even with rate limiting checks, performance should be good
      expect(avgResponseTime).toBeLessThan(150);

      console.log(`Rate-limited requests average response time: ${avgResponseTime.toFixed(2)}ms`);
    });
  });
});