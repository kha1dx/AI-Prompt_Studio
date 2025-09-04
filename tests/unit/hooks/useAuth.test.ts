import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import * as authService from '@/lib/auth/authService';

// Mock the auth service
jest.mock('@/lib/auth/authService');
jest.mock('next/navigation');

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should restore user from localStorage on mount', () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'mock-token');

      mockAuthService.verifyToken.mockResolvedValue({ success: true, user: mockUser });

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Login', () => {
    it('should login successfully', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      const credentials = { email: 'test@example.com', password: 'password123' };

      mockAuthService.login.mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'mock-token',
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.login(credentials);
        expect(response.success).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
      expect(localStorage.getItem('token')).toBe('mock-token');
    });

    it('should handle login failure', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong-password' };

      mockAuthService.login.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.login(credentials);
        expect(response.success).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should set loading state during login', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      let resolveLogin;

      mockAuthService.login.mockImplementation(
        () => new Promise(resolve => { resolveLogin = resolve; })
      );

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.login(credentials);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveLogin({ success: true, user: {}, token: 'token' });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle network errors during login', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };

      mockAuthService.login.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.login(credentials);
        expect(response.success).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Register', () => {
    it('should register successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockAuthService.register.mockResolvedValue({
        success: true,
        message: 'Registration successful',
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.register(userData);
        expect(response.success).toBe(true);
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle registration failure', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockAuthService.register.mockResolvedValue({
        success: false,
        error: 'Email already exists',
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.register(userData);
        expect(response.success).toBe(false);
      });

      expect(result.current.error).toBe('Email already exists');
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'mock-token');

      const { result } = renderHook(() => useAuth());

      // Set initial authenticated state
      act(() => {
        result.current.user = mockUser;
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should clear session storage on logout', async () => {
      sessionStorage.setItem('temp-data', 'some-data');

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(sessionStorage.getItem('temp-data')).toBeNull();
    });
  });

  describe('Token Management', () => {
    it('should refresh token when expired', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      const newToken = 'new-mock-token';

      localStorage.setItem('token', 'expired-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      mockAuthService.refreshToken.mockResolvedValue({
        success: true,
        token: newToken,
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.refreshToken();
        expect(response.success).toBe(true);
      });

      expect(localStorage.getItem('token')).toBe(newToken);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should logout when token refresh fails', async () => {
      localStorage.setItem('token', 'expired-token');
      localStorage.setItem('user', JSON.stringify({ id: '1' }));

      mockAuthService.refreshToken.mockResolvedValue({
        success: false,
        error: 'Token expired',
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('Password Reset', () => {
    it('should request password reset successfully', async () => {
      mockAuthService.requestPasswordReset.mockResolvedValue({
        success: true,
        message: 'Password reset email sent',
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.requestPasswordReset('test@example.com');
        expect(response.success).toBe(true);
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle password reset failure', async () => {
      mockAuthService.requestPasswordReset.mockResolvedValue({
        success: false,
        error: 'Email not found',
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.requestPasswordReset('notfound@example.com');
        expect(response.success).toBe(false);
      });

      expect(result.current.error).toBe('Email not found');
    });
  });

  describe('OAuth Authentication', () => {
    it('should handle OAuth login successfully', async () => {
      const mockUser = { id: '1', email: 'oauth@example.com', name: 'OAuth User' };

      mockAuthService.oauthLogin.mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'oauth-token',
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.oauthLogin('google', 'oauth-code');
        expect(response.success).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorage.getItem('token')).toBe('oauth-token');
    });
  });

  describe('Error Handling', () => {
    it('should clear error on successful operation', async () => {
      const { result } = renderHook(() => useAuth());

      // Set initial error state
      act(() => {
        result.current.error = 'Some error';
      });

      mockAuthService.login.mockResolvedValue({
        success: true,
        user: { id: '1', email: 'test@example.com' },
        token: 'token',
      });

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'password' });
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle multiple concurrent operations', async () => {
      const { result } = renderHook(() => useAuth());

      mockAuthService.login.mockResolvedValue({
        success: true,
        user: { id: '1', email: 'test@example.com' },
        token: 'token',
      });

      // Start multiple login operations
      const promises = Array(3).fill(null).map(() =>
        result.current.login({ email: 'test@example.com', password: 'password' })
      );

      await act(async () => {
        await Promise.all(promises);
      });

      // Should only call login service once due to loading state protection
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderHook(() => useAuth());

      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should cancel pending requests on unmount', () => {
      const { unmount } = renderHook(() => useAuth());

      let resolveLogin;
      mockAuthService.login.mockImplementation(
        () => new Promise(resolve => { resolveLogin = resolve; })
      );

      act(() => {
        result.current.login({ email: 'test@example.com', password: 'password' });
      });

      unmount();

      // Resolving after unmount should not update state
      act(() => {
        resolveLogin({ success: true, user: {}, token: 'token' });
      });

      // State should not be updated after unmount
      expect(localStorage.getItem('user')).toBeNull();
    });
  });
});