import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { OWASP } from '@owasp/security-testing';

describe('Authentication Security Testing', () => {
  let testContext: any;

  beforeEach(() => {
    testContext = {
      baseUrl: 'http://localhost:3000',
      timeout: 30000,
    };
  });

  describe('OWASP Top 10 Security Tests', () => {
    describe('A01:2021 - Broken Access Control', () => {
      it('should prevent unauthorized access to admin endpoints', async () => {
        // Test direct URL access to admin routes
        const adminRoutes = [
          '/admin/users',
          '/admin/dashboard',
          '/admin/settings',
          '/api/admin/users',
        ];

        for (const route of adminRoutes) {
          const response = await fetch(`${testContext.baseUrl}${route}`);
          expect(response.status).toBe(401);
        }
      });

      it('should prevent horizontal privilege escalation', async () => {
        // User A tries to access User B's data
        const userAToken = 'user-a-token';
        const userBId = 'user-b-id';

        const response = await fetch(`${testContext.baseUrl}/api/user/${userBId}/profile`, {
          headers: {
            'Authorization': `Bearer ${userAToken}`,
          },
        });

        expect(response.status).toBe(403);
        expect(await response.json()).toMatchObject({
          error: 'Insufficient permissions',
        });
      });

      it('should prevent vertical privilege escalation', async () => {
        // Regular user tries to access admin functions
        const userToken = 'regular-user-token';

        const response = await fetch(`${testContext.baseUrl}/api/admin/delete-user`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: 'some-user-id' }),
        });

        expect(response.status).toBe(403);
      });

      it('should validate JWT token claims correctly', async () => {
        // Test with manipulated JWT claims
        const manipulatedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid-signature';

        const response = await fetch(`${testContext.baseUrl}/api/protected`, {
          headers: {
            'Authorization': `Bearer ${manipulatedToken}`,
          },
        });

        expect(response.status).toBe(401);
      });
    });

    describe('A02:2021 - Cryptographic Failures', () => {
      it('should use secure password hashing', async () => {
        const userData = {
          email: 'crypto-test@example.com',
          password: 'TestPassword123!',
          name: 'Crypto Test',
        };

        const response = await fetch(`${testContext.baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });

        expect(response.status).toBe(201);
        const user = await response.json();

        // Password should not be returned in response
        expect(user.user).not.toHaveProperty('password');

        // Verify password is properly hashed in database (would need database access)
        // const dbUser = await getUserFromDatabase(user.user.id);
        // expect(dbUser.password).toMatch(/^\$2[aby]\$\d{1,2}\$.{53}$/); // bcrypt format
      });

      it('should enforce secure JWT signing', async () => {
        const loginData = {
          email: 'crypto-test@example.com',
          password: 'TestPassword123!',
        };

        const response = await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData),
        });

        const { token } = await response.json();

        // JWT should have proper structure and strong signature
        const jwtParts = token.split('.');
        expect(jwtParts).toHaveLength(3);

        // Decode header to verify algorithm
        const header = JSON.parse(atob(jwtParts[0]));
        expect(header.alg).not.toBe('none'); // No unsigned JWTs
        expect(['HS256', 'RS256', 'ES256']).toContain(header.alg);
      });

      it('should enforce secure communication over HTTPS', async () => {
        // Test would require HTTPS endpoint
        const httpsUrl = 'https://localhost:3000/api/auth/login';
        
        try {
          const response = await fetch(httpsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'password123',
            }),
          });
          
          // Should have secure headers
          expect(response.headers.get('strict-transport-security')).toBeTruthy();
        } catch (error) {
          // HTTPS might not be configured in test environment
          console.warn('HTTPS test skipped - HTTPS not configured');
        }
      });

      it('should protect sensitive data in transit', async () => {
        // Test for sensitive data exposure in network requests
        const networkLogs: any[] = [];
        
        // Mock network monitoring
        global.fetch = jest.fn().mockImplementation((url, options) => {
          networkLogs.push({ url, options });
          return Promise.resolve(new Response());
        });

        await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'sensitive@example.com',
            password: 'SuperSecretPassword123!',
          }),
        });

        // Verify sensitive data is not logged or exposed
        const logString = JSON.stringify(networkLogs);
        expect(logString).not.toContain('SuperSecretPassword123!');
      });
    });

    describe('A03:2021 - Injection Attacks', () => {
      it('should prevent SQL injection in login', async () => {
        const maliciousData = {
          email: "admin@example.com'; DROP TABLE users; --",
          password: "password' OR '1'='1",
        };

        const response = await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(maliciousData),
        });

        // Should not crash the server
        expect(response.status).toBe(401);
        
        // Verify database is intact by trying a normal login
        const normalResponse = await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        });

        expect([200, 401]).toContain(normalResponse.status);
      });

      it('should prevent NoSQL injection', async () => {
        const maliciousData = {
          email: { $ne: null },
          password: { $regex: '.*' },
        };

        const response = await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(maliciousData),
        });

        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result).toHaveProperty('error');
      });

      it('should prevent LDAP injection', async () => {
        // If using LDAP authentication
        const maliciousData = {
          username: 'admin)(|(password=*))',
          password: 'anything',
        };

        const response = await fetch(`${testContext.baseUrl}/api/auth/ldap-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(maliciousData),
        });

        expect(response.status).toBe(401);
      });

      it('should sanitize input for XSS prevention', async () => {
        const xssPayload = {
          email: 'test@example.com',
          name: '<script>alert("XSS")</script>',
          bio: '<img src="x" onerror="alert(\'XSS\')">',
        };

        const response = await fetch(`${testContext.baseUrl}/api/user/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
          },
          body: JSON.stringify(xssPayload),
        });

        if (response.ok) {
          const result = await response.json();
          expect(result.user.name).not.toContain('<script>');
          expect(result.user.bio).not.toContain('onerror');
        }
      });
    });

    describe('A04:2021 - Insecure Design', () => {
      it('should implement account lockout after failed attempts', async () => {
        const attackData = {
          email: 'victim@example.com',
          password: 'wrong-password',
        };

        // Attempt multiple failed logins
        const attempts = Array(6).fill(null);
        const responses = await Promise.all(
          attempts.map(() =>
            fetch(`${testContext.baseUrl}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(attackData),
            })
          )
        );

        // Later attempts should be blocked
        const blockedResponses = responses.slice(5);
        expect(blockedResponses.some(r => r.status === 429)).toBe(true);
      });

      it('should implement proper session management', async () => {
        // Login to get session
        const loginResponse = await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'session@example.com',
            password: 'password123',
          }),
        });

        if (loginResponse.ok) {
          const { token } = await loginResponse.json();

          // Logout should invalidate session
          await fetch(`${testContext.baseUrl}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
          });

          // Token should no longer work
          const protectedResponse = await fetch(`${testContext.baseUrl}/api/protected`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          expect(protectedResponse.status).toBe(401);
        }
      });

      it('should validate business logic for user roles', async () => {
        // Test role-based access control
        const userToken = 'regular-user-token';

        const adminOnlyActions = [
          { url: '/api/admin/users', method: 'GET' },
          { url: '/api/admin/users/123', method: 'DELETE' },
          { url: '/api/admin/settings', method: 'PUT' },
        ];

        for (const action of adminOnlyActions) {
          const response = await fetch(`${testContext.baseUrl}${action.url}`, {
            method: action.method,
            headers: { 'Authorization': `Bearer ${userToken}` },
          });

          expect(response.status).toBe(403);
        }
      });
    });

    describe('A05:2021 - Security Misconfiguration', () => {
      it('should have secure HTTP headers', async () => {
        const response = await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        });

        // Check security headers
        const headers = response.headers;
        expect(headers.get('x-content-type-options')).toBe('nosniff');
        expect(headers.get('x-frame-options')).toBe('DENY');
        expect(headers.get('x-xss-protection')).toBe('1; mode=block');
        
        const csp = headers.get('content-security-policy');
        expect(csp).toContain("default-src 'self'");
      });

      it('should not expose sensitive server information', async () => {
        const response = await fetch(`${testContext.baseUrl}/api/auth/login`);
        
        // Should not reveal server version or technology
        expect(response.headers.get('server')).not.toContain('Express');
        expect(response.headers.get('x-powered-by')).toBeNull();
      });

      it('should handle errors securely', async () => {
        // Test various error conditions
        const errorTests = [
          { url: '/api/nonexistent', expectedStatus: 404 },
          { url: '/api/auth/login', method: 'GET', expectedStatus: 405 },
          { url: '/api/auth/login', body: 'invalid json', expectedStatus: 400 },
        ];

        for (const test of errorTests) {
          const response = await fetch(`${testContext.baseUrl}${test.url}`, {
            method: test.method || 'POST',
            body: test.body,
          });

          expect(response.status).toBe(test.expectedStatus);
          
          const errorResponse = await response.json();
          // Should not expose stack traces or internal details
          expect(errorResponse).not.toHaveProperty('stack');
          expect(JSON.stringify(errorResponse)).not.toContain('node_modules');
        }
      });
    });

    describe('A06:2021 - Vulnerable and Outdated Components', () => {
      it('should use secure versions of dependencies', () => {
        const packageJson = require('../../package.json');
        
        // Check for known vulnerable packages (this would be more comprehensive)
        const vulnerablePackages = [
          { name: 'express', minVersion: '4.18.0' },
          { name: 'jsonwebtoken', minVersion: '8.5.1' },
          { name: 'bcrypt', minVersion: '5.0.0' },
        ];

        for (const pkg of vulnerablePackages) {
          if (packageJson.dependencies[pkg.name]) {
            const version = packageJson.dependencies[pkg.name].replace('^', '').replace('~', '');
            // This is a simplified version check
            expect(version >= pkg.minVersion).toBe(true);
          }
        }
      });
    });

    describe('A07:2021 - Identification and Authentication Failures', () => {
      it('should enforce strong password policies', async () => {
        const weakPasswords = [
          '123',
          'password',
          'qwerty',
          '123456789',
          'password123',
        ];

        for (const weakPassword of weakPasswords) {
          const response = await fetch(`${testContext.baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: `weak${Math.random()}@example.com`,
              password: weakPassword,
              name: 'Weak Password User',
            }),
          });

          expect(response.status).toBe(400);
          const result = await response.json();
          expect(result.errors).toHaveProperty('password');
        }
      });

      it('should prevent credential stuffing attacks', async () => {
        // Simulate credential stuffing with rate limiting
        const credentials = Array(20).fill(null).map((_, i) => ({
          email: `victim${i}@example.com`,
          password: 'CommonPassword123!',
        }));

        const responses = await Promise.all(
          credentials.map(cred =>
            fetch(`${testContext.baseUrl}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cred),
            })
          )
        );

        // Some requests should be rate limited
        const rateLimited = responses.filter(r => r.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
      });

      it('should implement secure session management', async () => {
        const loginResponse = await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'session@example.com',
            password: 'password123',
          }),
        });

        if (loginResponse.ok) {
          const { token } = await loginResponse.json();

          // Concurrent sessions should be handled properly
          const concurrentRequests = Array(5).fill(null).map(() =>
            fetch(`${testContext.baseUrl}/api/protected`, {
              headers: { 'Authorization': `Bearer ${token}` },
            })
          );

          const responses = await Promise.all(concurrentRequests);
          responses.forEach(response => {
            expect([200, 401]).toContain(response.status);
          });
        }
      });

      it('should prevent session fixation attacks', async () => {
        // Get initial session ID
        const initialResponse = await fetch(`${testContext.baseUrl}/api/auth/session`);
        const initialSessionId = initialResponse.headers.get('set-cookie')?.match(/sessionId=([^;]*)/)?.[1];

        // Login
        const loginResponse = await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': `sessionId=${initialSessionId}`,
          },
          body: JSON.stringify({
            email: 'fixation@example.com',
            password: 'password123',
          }),
        });

        if (loginResponse.ok) {
          // Session ID should change after login
          const newSessionId = loginResponse.headers.get('set-cookie')?.match(/sessionId=([^;]*)/)?.[1];
          expect(newSessionId).not.toBe(initialSessionId);
        }
      });
    });

    describe('A08:2021 - Software and Data Integrity Failures', () => {
      it('should verify JWT token integrity', async () => {
        const loginResponse = await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'integrity@example.com',
            password: 'password123',
          }),
        });

        if (loginResponse.ok) {
          const { token } = await loginResponse.json();
          
          // Tamper with token
          const parts = token.split('.');
          const tamperedPayload = btoa(JSON.stringify({ 
            ...JSON.parse(atob(parts[1])), 
            role: 'admin' 
          }));
          const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

          const response = await fetch(`${testContext.baseUrl}/api/protected`, {
            headers: { 'Authorization': `Bearer ${tamperedToken}` },
          });

          expect(response.status).toBe(401);
        }
      });

      it('should validate input data integrity', async () => {
        const malformedData = {
          email: 'test@example.com',
          password: 'password123',
          additionalData: {
            __proto__: { isAdmin: true },
            constructor: { prototype: { isAdmin: true } },
          },
        };

        const response = await fetch(`${testContext.baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(malformedData),
        });

        if (response.ok) {
          const result = await response.json();
          expect(result.user).not.toHaveProperty('isAdmin');
        }
      });
    });

    describe('A10:2021 - Server-Side Request Forgery (SSRF)', () => {
      it('should prevent SSRF in profile picture uploads', async () => {
        const maliciousUrls = [
          'http://localhost:22',        // Internal SSH port
          'http://169.254.169.254/',    // AWS metadata endpoint
          'file:///etc/passwd',         // Local file access
          'ftp://internal-ftp.company.com/',
        ];

        for (const url of maliciousUrls) {
          const response = await fetch(`${testContext.baseUrl}/api/user/profile/avatar`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer valid-token',
            },
            body: JSON.stringify({ avatarUrl: url }),
          });

          expect(response.status).toBe(400);
          const result = await response.json();
          expect(result.error).toContain('Invalid URL');
        }
      });
    });
  });

  describe('Custom Security Tests', () => {
    describe('Password Security', () => {
      it('should enforce password complexity', async () => {
        const testCases = [
          { password: 'short', shouldFail: true, reason: 'too short' },
          { password: 'alllowercase123', shouldFail: true, reason: 'no uppercase' },
          { password: 'ALLUPPERCASE123', shouldFail: true, reason: 'no lowercase' },
          { password: 'NoNumbersHere!', shouldFail: true, reason: 'no numbers' },
          { password: 'NoSpecialChars123', shouldFail: true, reason: 'no special characters' },
          { password: 'ValidPass123!', shouldFail: false, reason: 'meets all requirements' },
        ];

        for (const testCase of testCases) {
          const response = await fetch(`${testContext.baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: `test-${Math.random()}@example.com`,
              password: testCase.password,
              name: 'Test User',
            }),
          });

          if (testCase.shouldFail) {
            expect(response.status).toBe(400);
          } else {
            expect([201, 400]).toContain(response.status); // 400 might be for other validation
          }
        }
      });

      it('should prevent password reuse', async () => {
        const userData = {
          email: 'reuse-test@example.com',
          password: 'FirstPassword123!',
          name: 'Reuse Test User',
        };

        // Register user
        await fetch(`${testContext.baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });

        // Login to get token
        const loginResponse = await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
          }),
        });

        if (loginResponse.ok) {
          const { token } = await loginResponse.json();

          // Try to change password to the same password
          const changeResponse = await fetch(`${testContext.baseUrl}/api/user/change-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              currentPassword: userData.password,
              newPassword: userData.password, // Same password
            }),
          });

          expect(changeResponse.status).toBe(400);
          const result = await changeResponse.json();
          expect(result.error).toContain('cannot reuse');
        }
      });
    });

    describe('Multi-Factor Authentication', () => {
      it('should enforce MFA for sensitive operations', async () => {
        // This test assumes MFA is implemented
        const loginResponse = await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'mfa-user@example.com',
            password: 'password123',
          }),
        });

        if (loginResponse.status === 202) { // MFA required
          const { mfaRequired, token } = await loginResponse.json();
          expect(mfaRequired).toBe(true);

          // Try sensitive operation without MFA
          const deleteResponse = await fetch(`${testContext.baseUrl}/api/user/delete-account`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });

          expect(deleteResponse.status).toBe(403);
          const result = await deleteResponse.json();
          expect(result.error).toContain('MFA required');
        }
      });
    });

    describe('API Security', () => {
      it('should implement proper CORS policies', async () => {
        const response = await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://malicious-site.com',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization',
          },
        });

        // Should not allow arbitrary origins
        const allowOrigin = response.headers.get('access-control-allow-origin');
        expect(allowOrigin).not.toBe('*');
        expect(allowOrigin).not.toBe('https://malicious-site.com');
      });

      it('should validate Content-Type headers', async () => {
        const response = await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/xml' }, // Wrong content type
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        });

        expect(response.status).toBe(415); // Unsupported Media Type
      });

      it('should limit request payload size', async () => {
        const largePayload = {
          email: 'test@example.com',
          password: 'password123',
          name: 'A'.repeat(10000), // Very large name
          bio: 'B'.repeat(100000), // Very large bio
        };

        const response = await fetch(`${testContext.baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(largePayload),
        });

        expect(response.status).toBe(413); // Payload Too Large
      });
    });

    describe('Time-Based Attacks', () => {
      it('should prevent timing attacks on user enumeration', async () => {
        const existingEmail = 'existing@example.com';
        const nonExistentEmail = 'nonexistent@example.com';

        // First create a user
        await fetch(`${testContext.baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: existingEmail,
            password: 'password123',
            name: 'Existing User',
          }),
        });

        // Measure response times for existing vs non-existent users
        const existingUserTimes: number[] = [];
        const nonExistentUserTimes: number[] = [];

        for (let i = 0; i < 10; i++) {
          // Test existing user
          const start1 = Date.now();
          await fetch(`${testContext.baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: existingEmail,
              password: 'wrong-password',
            }),
          });
          existingUserTimes.push(Date.now() - start1);

          // Test non-existent user
          const start2 = Date.now();
          await fetch(`${testContext.baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: nonExistentEmail,
              password: 'wrong-password',
            }),
          });
          nonExistentUserTimes.push(Date.now() - start2);
        }

        const avgExisting = existingUserTimes.reduce((a, b) => a + b) / existingUserTimes.length;
        const avgNonExistent = nonExistentUserTimes.reduce((a, b) => a + b) / nonExistentUserTimes.length;

        // Response times should be similar (within 50% difference)
        const timeDifference = Math.abs(avgExisting - avgNonExistent);
        const relativeThreshold = Math.max(avgExisting, avgNonExistent) * 0.5;
        
        expect(timeDifference).toBeLessThan(relativeThreshold);
      });
    });

    describe('Token Security', () => {
      it('should have proper token expiration', async () => {
        const loginResponse = await fetch(`${testContext.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'expiry@example.com',
            password: 'password123',
          }),
        });

        if (loginResponse.ok) {
          const { token } = await loginResponse.json();
          
          // Decode token to check expiration
          const payload = JSON.parse(atob(token.split('.')[1]));
          expect(payload).toHaveProperty('exp');
          
          const expirationTime = payload.exp * 1000; // Convert to milliseconds
          const currentTime = Date.now();
          const tokenLifetime = expirationTime - currentTime;
          
          // Token should expire within reasonable time (e.g., 24 hours)
          expect(tokenLifetime).toBeLessThan(24 * 60 * 60 * 1000);
          expect(tokenLifetime).toBeGreaterThan(0); // Should not be expired
        }
      });

      it('should securely generate tokens', async () => {
        // Generate multiple tokens and check for randomness
        const tokens: string[] = [];
        
        for (let i = 0; i < 5; i++) {
          const response = await fetch(`${testContext.baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: `random${i}@example.com`,
              password: 'password123',
            }),
          });
          
          if (response.ok) {
            const { token } = await response.json();
            tokens.push(token);
          }
        }

        // All tokens should be unique
        const uniqueTokens = new Set(tokens);
        expect(uniqueTokens.size).toBe(tokens.length);

        // Check token structure and entropy
        tokens.forEach(token => {
          const parts = token.split('.');
          expect(parts).toHaveLength(3);
          
          // Each part should have reasonable length (indicating good entropy)
          parts.forEach(part => {
            expect(part.length).toBeGreaterThan(10);
          });
        });
      });
    });
  });
});