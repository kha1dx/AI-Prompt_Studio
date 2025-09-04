import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3001;

describe('Authentication Flow Integration Tests', () => {
  let app;
  let server;
  let handle;

  beforeAll(async () => {
    // Initialize Next.js app for integration testing
    app = next({ dev, hostname, port, dir: process.cwd() });
    handle = app.getRequestHandler();
    await app.prepare();

    server = createServer(async (req, res) => {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    });

    await new Promise((resolve) => {
      server.listen(port, resolve);
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
    await app.close();
  });

  describe('User Registration Flow', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
        confirmPassword: 'SecurePass123!',
      };

      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).toHaveProperty('name', userData.name);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject registration with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        name: 'Duplicate User',
        confirmPassword: 'SecurePass123!',
      };

      // First registration
      await request(`http://localhost:${port}`)
        .post('/api/auth/register')
        .send(userData);

      // Second registration with same email
      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Email already exists');
    });

    it('should validate required fields during registration', async () => {
      const incompleteData = {
        email: 'incomplete@example.com',
        // Missing password, name, confirmPassword
      };

      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/register')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('password');
      expect(response.body.errors).toHaveProperty('name');
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        name: 'Test User',
        confirmPassword: 'SecurePass123!',
      };

      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toHaveProperty('email');
    });

    it('should validate password strength', async () => {
      const userData = {
        email: 'weakpass@example.com',
        password: '123',
        name: 'Test User',
        confirmPassword: '123',
      };

      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toHaveProperty('password');
      expect(response.body.errors.password).toContain('at least 8 characters');
    });

    it('should validate password confirmation match', async () => {
      const userData = {
        email: 'mismatch@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        confirmPassword: 'DifferentPass123!',
      };

      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toHaveProperty('confirmPassword');
      expect(response.body.errors.confirmPassword).toContain('Passwords do not match');
    });
  });

  describe('User Login Flow', () => {
    const testUser = {
      email: 'logintest@example.com',
      password: 'SecurePass123!',
      name: 'Login Test User',
      confirmPassword: 'SecurePass123!',
    };

    beforeEach(async () => {
      // Create test user for login tests
      await request(`http://localhost:${port}`)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password,
      };

      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).not.toHaveProperty('password');

      // Verify JWT token format
      expect(response.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    });

    it('should reject login with invalid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'WrongPassword',
      };

      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
      expect(response.body).not.toHaveProperty('token');
    });

    it('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      };

      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should validate required login fields', async () => {
      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('email');
      expect(response.body.errors).toHaveProperty('password');
    });
  });

  describe('Protected Route Access', () => {
    let authToken;
    const testUser = {
      email: 'protectedtest@example.com',
      password: 'SecurePass123!',
      name: 'Protected Test User',
      confirmPassword: 'SecurePass123!',
    };

    beforeEach(async () => {
      // Register and login to get auth token
      await request(`http://localhost:${port}`)
        .post('/api/auth/register')
        .send(testUser);

      const loginResponse = await request(`http://localhost:${port}`)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      authToken = loginResponse.body.token;
    });

    it('should access protected route with valid token', async () => {
      const response = await request(`http://localhost:${port}`)
        .get('/api/protected')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should reject protected route access without token', async () => {
      const response = await request(`http://localhost:${port}`)
        .get('/api/protected');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('should reject protected route access with invalid token', async () => {
      const response = await request(`http://localhost:${port}`)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid token');
    });

    it('should reject expired tokens', async () => {
      // Mock expired token (this would need actual expired token generation)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request(`http://localhost:${port}`)
        .get('/api/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Token Refresh Flow', () => {
    let refreshToken;
    const testUser = {
      email: 'refreshtest@example.com',
      password: 'SecurePass123!',
      name: 'Refresh Test User',
      confirmPassword: 'SecurePass123!',
    };

    beforeEach(async () => {
      await request(`http://localhost:${port}`)
        .post('/api/auth/register')
        .send(testUser);

      const loginResponse = await request(`http://localhost:${port}`)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.token).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid refresh token');
    });
  });

  describe('Password Reset Flow', () => {
    const testUser = {
      email: 'resettest@example.com',
      password: 'SecurePass123!',
      name: 'Reset Test User',
      confirmPassword: 'SecurePass123!',
    };

    beforeEach(async () => {
      await request(`http://localhost:${port}`)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should request password reset for existing email', async () => {
      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/reset-password')
        .send({ email: testUser.email });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Password reset email sent');
    });

    it('should handle password reset for non-existent email', async () => {
      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/reset-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Email not found');
    });

    it('should validate email format for password reset', async () => {
      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/reset-password')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('email');
    });
  });

  describe('User Profile Management', () => {
    let authToken;
    const testUser = {
      email: 'profiletest@example.com',
      password: 'SecurePass123!',
      name: 'Profile Test User',
      confirmPassword: 'SecurePass123!',
    };

    beforeEach(async () => {
      await request(`http://localhost:${port}`)
        .post('/api/auth/register')
        .send(testUser);

      const loginResponse = await request(`http://localhost:${port}`)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      authToken = loginResponse.body.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(`http://localhost:${port}`)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('name', testUser.name);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        bio: 'This is my updated bio',
      };

      const response = await request(`http://localhost:${port}`)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.user).toHaveProperty('name', updateData.name);
      expect(response.body.user).toHaveProperty('bio', updateData.bio);
    });

    it('should reject profile access without authorization', async () => {
      const response = await request(`http://localhost:${port}`)
        .get('/api/user/profile');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('Logout Flow', () => {
    let authToken;
    const testUser = {
      email: 'logouttest@example.com',
      password: 'SecurePass123!',
      name: 'Logout Test User',
      confirmPassword: 'SecurePass123!',
    };

    beforeEach(async () => {
      await request(`http://localhost:${port}`)
        .post('/api/auth/register')
        .send(testUser);

      const loginResponse = await request(`http://localhost:${port}`)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      authToken = loginResponse.body.token;
    });

    it('should logout successfully', async () => {
      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });

    it('should invalidate token after logout', async () => {
      // First logout
      await request(`http://localhost:${port}`)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      // Try to access protected route with the same token
      const response = await request(`http://localhost:${port}`)
        .get('/api/protected')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const loginData = {
        email: 'ratelimit@example.com',
        password: 'WrongPassword',
      };

      // Make multiple failed login attempts
      const promises = Array(6).fill(null).map(() =>
        request(`http://localhost:${port}`)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);

      // Last attempts should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should rate limit registration attempts', async () => {
      const promises = Array(6).fill(null).map((_, index) =>
        request(`http://localhost:${port}`)
          .post('/api/auth/register')
          .send({
            email: `ratelimit${index}@example.com`,
            password: 'SecurePass123!',
            name: `User ${index}`,
            confirmPassword: 'SecurePass123!',
          })
      );

      const responses = await Promise.all(promises);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts in registration', async () => {
      const maliciousData = {
        email: 'xss@example.com',
        password: 'SecurePass123!',
        name: '<script>alert("XSS")</script>',
        confirmPassword: 'SecurePass123!',
      };

      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/register')
        .send(maliciousData);

      expect(response.status).toBe(201);
      expect(response.body.user.name).not.toContain('<script>');
      expect(response.body.user.name).not.toContain('alert');
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousData = {
        email: "test@example.com'; DROP TABLE users; --",
        password: 'SecurePass123!',
      };

      const response = await request(`http://localhost:${port}`)
        .post('/api/auth/login')
        .send(maliciousData);

      // Should not crash the server
      expect([400, 401]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});