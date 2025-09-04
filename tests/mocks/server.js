import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock API responses for authentication
export const handlers = [
  // Login endpoint
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json();
    const { email, password } = body;

    // Mock successful login
    if (email === 'user@example.com' && password === 'correct-password') {
      return HttpResponse.json({
        success: true,
        user: {
          id: '1',
          email: 'user@example.com',
          name: 'Test User',
          role: 'user',
        },
        token: 'mock-jwt-token',
      });
    }

    // Mock failed login
    return HttpResponse.json(
      {
        success: false,
        error: 'Invalid credentials',
      },
      { status: 401 }
    );
  }),

  // Register endpoint
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json();
    const { email, password, name } = body;

    // Mock successful registration
    if (email && password && name) {
      return HttpResponse.json({
        success: true,
        user: {
          id: '2',
          email,
          name,
          role: 'user',
          emailVerified: false,
        },
        message: 'Registration successful. Please verify your email.',
      });
    }

    // Mock validation error
    return HttpResponse.json(
      {
        success: false,
        error: 'Missing required fields',
      },
      { status: 400 }
    );
  }),

  // Verify token endpoint
  http.post('/api/auth/verify', async ({ request }) => {
    const body = await request.json();
    const { token } = body;

    if (token === 'mock-jwt-token') {
      return HttpResponse.json({
        success: true,
        user: {
          id: '1',
          email: 'user@example.com',
          name: 'Test User',
          role: 'user',
        },
      });
    }

    return HttpResponse.json(
      {
        success: false,
        error: 'Invalid token',
      },
      { status: 401 }
    );
  }),

  // OAuth callback
  http.get('/api/auth/oauth/callback', ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (code === 'mock-oauth-code') {
      return HttpResponse.json({
        success: true,
        user: {
          id: '3',
          email: 'oauth-user@example.com',
          name: 'OAuth User',
          role: 'user',
          provider: 'google',
        },
        token: 'mock-oauth-token',
      });
    }

    return HttpResponse.json(
      {
        success: false,
        error: 'OAuth authentication failed',
      },
      { status: 400 }
    );
  }),

  // Password reset endpoint
  http.post('/api/auth/reset-password', async ({ request }) => {
    const body = await request.json();
    const { email } = body;

    if (email === 'user@example.com') {
      return HttpResponse.json({
        success: true,
        message: 'Password reset email sent',
      });
    }

    return HttpResponse.json(
      {
        success: false,
        error: 'Email not found',
      },
      { status: 404 }
    );
  }),

  // Protected route mock
  http.get('/api/protected', ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (authHeader === 'Bearer mock-jwt-token') {
      return HttpResponse.json({
        success: true,
        data: 'Protected data',
      });
    }

    return HttpResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 }
    );
  }),

  // User profile endpoint
  http.get('/api/user/profile', ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (authHeader === 'Bearer mock-jwt-token') {
      return HttpResponse.json({
        success: true,
        user: {
          id: '1',
          email: 'user@example.com',
          name: 'Test User',
          role: 'user',
          createdAt: '2024-01-01T00:00:00Z',
          lastLogin: '2024-01-02T00:00:00Z',
        },
      });
    }

    return HttpResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 }
    );
  }),
];

export const server = setupServer(...handlers);