import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Authentication User Journeys', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto('/');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Complete Registration Journey', () => {
    test('should complete full user registration flow', async () => {
      // Navigate to registration page
      await page.click('text=Sign Up');
      await expect(page).toHaveURL('/register');

      // Fill registration form
      await page.fill('[data-testid="email-input"]', 'newuser@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="name-input"]', 'New User');

      // Accept terms and conditions
      await page.check('[data-testid="terms-checkbox"]');

      // Submit registration
      await page.click('[data-testid="register-button"]');

      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'Registration successful'
      );

      // Should redirect to email verification page
      await expect(page).toHaveURL('/verify-email');
      await expect(page.locator('h1')).toContainText('Verify Your Email');

      // Should show verification instructions
      await expect(page.locator('[data-testid="verification-instructions"]')).toContainText(
        'We sent a verification email to newuser@example.com'
      );
    });

    test('should handle registration form validation errors', async () => {
      await page.click('text=Sign Up');
      await expect(page).toHaveURL('/register');

      // Submit empty form
      await page.click('[data-testid="register-button"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');

      // Fill invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="register-button"]');
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Enter a valid email');

      // Fill weak password
      await page.fill('[data-testid="email-input"]', 'valid@example.com');
      await page.fill('[data-testid="password-input"]', '123');
      await page.fill('[data-testid="confirm-password-input"]', '456');
      await page.click('[data-testid="register-button"]');

      await expect(page.locator('[data-testid="password-error"]')).toContainText(
        'Password must be at least 8 characters'
      );
      await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText(
        'Passwords do not match'
      );
    });

    test('should handle duplicate email registration', async () => {
      // First registration
      await page.click('text=Sign Up');
      await page.fill('[data-testid="email-input"]', 'duplicate@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="name-input"]', 'First User');
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="register-button"]');

      // Wait for success and navigate back to register
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await page.goto('/register');

      // Attempt second registration with same email
      await page.fill('[data-testid="email-input"]', 'duplicate@example.com');
      await page.fill('[data-testid="password-input"]', 'AnotherPass123!');
      await page.fill('[data-testid="confirm-password-input"]', 'AnotherPass123!');
      await page.fill('[data-testid="name-input"]', 'Second User');
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="register-button"]');

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Email already exists'
      );
    });
  });

  test.describe('Complete Login Journey', () => {
    // Setup: Create a test user
    test.beforeEach(async () => {
      // Register test user first
      await page.goto('/register');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="name-input"]', 'Test User');
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="register-button"]');
      await page.waitForURL('/verify-email');
    });

    test('should complete successful login flow', async () => {
      // Navigate to login page
      await page.goto('/login');
      await expect(page).toHaveURL('/login');

      // Fill login form
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');

      // Submit login
      await page.click('[data-testid="login-button"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome, Test User');

      // Should show user menu
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await page.click('[data-testid="user-menu"]');
      await expect(page.locator('[data-testid="user-email"]')).toContainText('testuser@example.com');
    });

    test('should handle invalid login credentials', async () => {
      await page.goto('/login');

      // Try with wrong password
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'WrongPassword');
      await page.click('[data-testid="login-button"]');

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Invalid credentials'
      );
      await expect(page).toHaveURL('/login'); // Should stay on login page

      // Try with non-existent email
      await page.fill('[data-testid="email-input"]', 'nonexistent@example.com');
      await page.fill('[data-testid="password-input"]', 'SomePassword');
      await page.click('[data-testid="login-button"]');

      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Invalid credentials'
      );
    });

    test('should show loading state during login', async () => {
      await page.goto('/login');

      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');

      // Mock slow network response
      await page.route('**/api/auth/login', async route => {
        await page.waitForTimeout(2000); // Simulate slow response
        route.continue();
      });

      await page.click('[data-testid="login-button"]');

      // Should show loading state
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-button"]')).toBeDisabled();
      await expect(page.locator('[data-testid="login-button"]')).toContainText('Signing in...');
    });

    test('should remember login with "Remember me" checkbox', async () => {
      await page.goto('/login');

      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.check('[data-testid="remember-me-checkbox"]');
      await page.click('[data-testid="login-button"]');

      await expect(page).toHaveURL('/dashboard');

      // Close and reopen browser to test persistence
      await context.close();
      context = await browser.newContext();
      page = await context.newPage();
      await page.goto('/');

      // Should be automatically logged in
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome, Test User');
    });
  });

  test.describe('OAuth Authentication Journey', () => {
    test('should complete Google OAuth flow', async () => {
      await page.goto('/login');

      // Mock OAuth popup
      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        page.click('[data-testid="google-oauth-button"]')
      ]);

      // Mock Google OAuth consent screen
      await popup.fill('[data-testid="google-email"]', 'oauth@example.com');
      await popup.fill('[data-testid="google-password"]', 'oauth-password');
      await popup.click('[data-testid="google-allow-button"]');

      // Wait for popup to close and original page to redirect
      await popup.waitForEvent('close');
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    });

    test('should handle OAuth cancellation', async () => {
      await page.goto('/login');

      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        page.click('[data-testid="google-oauth-button"]')
      ]);

      // User cancels OAuth
      await popup.click('[data-testid="google-cancel-button"]');
      await popup.waitForEvent('close');

      // Should remain on login page with message
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="oauth-cancelled-message"]')).toContainText(
        'OAuth authentication was cancelled'
      );
    });

    test('should handle OAuth error', async () => {
      await page.goto('/login');

      // Mock OAuth error
      await page.route('**/api/auth/oauth/callback', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'OAuth authentication failed' })
        });
      });

      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        page.click('[data-testid="google-oauth-button"]')
      ]);

      await popup.fill('[data-testid="google-email"]', 'oauth@example.com');
      await popup.fill('[data-testid="google-password"]', 'oauth-password');
      await popup.click('[data-testid="google-allow-button"]');

      await popup.waitForEvent('close');

      // Should show error message
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'OAuth authentication failed'
      );
    });
  });

  test.describe('Protected Route Navigation', () => {
    test('should redirect unauthenticated users to login', async () => {
      // Try to access protected route directly
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL('/login?redirect=/dashboard');
      await expect(page.locator('[data-testid="redirect-message"]')).toContainText(
        'Please sign in to access this page'
      );
    });

    test('should redirect to original page after login', async () => {
      // Setup test user
      await page.goto('/register');
      await page.fill('[data-testid="email-input"]', 'redirect@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
      await page.fill('[data-testid="name-input"]', 'Redirect User');
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="register-button"]');

      // Try to access protected route
      await page.goto('/profile');
      await expect(page).toHaveURL('/login?redirect=/profile');

      // Login
      await page.fill('[data-testid="email-input"]', 'redirect@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');

      // Should redirect to originally requested page
      await expect(page).toHaveURL('/profile');
      await expect(page.locator('[data-testid="profile-header"]')).toContainText('User Profile');
    });

    test('should maintain navigation state across authenticated routes', async () => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL('/dashboard');

      // Navigate through authenticated routes
      await page.click('[data-testid="profile-link"]');
      await expect(page).toHaveURL('/profile');

      await page.click('[data-testid="settings-link"]');
      await expect(page).toHaveURL('/settings');

      // Browser back button should work
      await page.goBack();
      await expect(page).toHaveURL('/profile');

      await page.goBack();
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Password Reset Journey', () => {
    test('should complete password reset flow', async () => {
      // Setup test user
      await page.goto('/register');
      await page.fill('[data-testid="email-input"]', 'resetuser@example.com');
      await page.fill('[data-testid="password-input"]', 'OldPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'OldPassword123!');
      await page.fill('[data-testid="name-input"]', 'Reset User');
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="register-button"]');

      // Go to login page and click forgot password
      await page.goto('/login');
      await page.click('[data-testid="forgot-password-link"]');
      await expect(page).toHaveURL('/reset-password');

      // Request password reset
      await page.fill('[data-testid="email-input"]', 'resetuser@example.com');
      await page.click('[data-testid="reset-request-button"]');

      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'Password reset email sent'
      );

      // Simulate clicking reset link in email (would normally be from email)
      const resetToken = 'mock-reset-token-123';
      await page.goto(`/reset-password/confirm?token=${resetToken}`);

      // Set new password
      await page.fill('[data-testid="new-password-input"]', 'NewPassword123!');
      await page.fill('[data-testid="confirm-new-password-input"]', 'NewPassword123!');
      await page.click('[data-testid="confirm-reset-button"]');

      // Should redirect to login with success message
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'Password reset successful'
      );

      // Should be able to login with new password
      await page.fill('[data-testid="email-input"]', 'resetuser@example.com');
      await page.fill('[data-testid="password-input"]', 'NewPassword123!');
      await page.click('[data-testid="login-button"]');

      await expect(page).toHaveURL('/dashboard');
    });

    test('should validate reset password form', async () => {
      await page.goto('/reset-password');

      // Submit empty form
      await page.click('[data-testid="reset-request-button"]');
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');

      // Invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="reset-request-button"]');
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Enter a valid email');

      // Non-existent email
      await page.fill('[data-testid="email-input"]', 'nonexistent@example.com');
      await page.click('[data-testid="reset-request-button"]');
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Email not found');
    });
  });

  test.describe('Complete Logout Journey', () => {
    test('should logout and clear session', async () => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL('/dashboard');

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');

      // Should redirect to login page
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="logout-message"]')).toContainText(
        'You have been logged out'
      );

      // Try to access protected route - should redirect to login
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login?redirect=/dashboard');

      // Session should be cleared - browser refresh should not restore login
      await page.reload();
      await expect(page).toHaveURL('/login?redirect=/dashboard');
    });

    test('should logout from all tabs', async () => {
      // Login in first tab
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL('/dashboard');

      // Open second tab and verify logged in
      const secondTab = await context.newPage();
      await secondTab.goto('/dashboard');
      await expect(secondTab).toHaveURL('/dashboard');
      await expect(secondTab.locator('[data-testid="welcome-message"]')).toBeVisible();

      // Logout from first tab
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');

      // Second tab should also logout automatically
      await expect(secondTab).toHaveURL('/login');
    });
  });

  test.describe('Session Management', () => {
    test('should handle session expiry gracefully', async () => {
      // Login
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL('/dashboard');

      // Mock expired token
      await page.route('**/api/**', route => {
        if (route.request().headers()['authorization']) {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'Token expired' })
          });
        } else {
          route.continue();
        }
      });

      // Try to make an authenticated request
      await page.click('[data-testid="profile-link"]');

      // Should redirect to login with session expired message
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="session-expired-message"]')).toContainText(
        'Your session has expired. Please sign in again.'
      );
    });

    test('should auto-refresh token before expiry', async () => {
      // Login
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL('/dashboard');

      // Mock token refresh endpoint
      let refreshCalled = false;
      await page.route('**/api/auth/refresh', route => {
        refreshCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: true, 
            token: 'new-token',
            refreshToken: 'new-refresh-token'
          })
        });
      });

      // Wait for auto-refresh to occur (would be triggered by timer in real app)
      await page.waitForTimeout(3000);

      // Make an authenticated request to verify new token works
      await page.click('[data-testid="profile-link"]');
      await expect(page).toHaveURL('/profile');

      // Verify refresh was called
      expect(refreshCalled).toBe(true);
    });
  });

  test.describe('Accessibility and Keyboard Navigation', () => {
    test('should support keyboard navigation in login form', async () => {
      await page.goto('/login');

      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="remember-me-checkbox"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="login-button"]')).toBeFocused();

      // Submit form with Enter key
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL('/dashboard');
    });

    test('should have proper ARIA attributes', async () => {
      await page.goto('/login');

      // Check form has proper labels and roles
      await expect(page.locator('[data-testid="login-form"]')).toHaveAttribute('role', 'form');
      await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('required');
      await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('required');

      // Check error announcements
      await page.click('[data-testid="login-button"]');
      await expect(page.locator('[data-testid="email-error"]')).toHaveAttribute('role', 'alert');
      await expect(page.locator('[data-testid="password-error"]')).toHaveAttribute('role', 'alert');
    });

    test('should support screen reader announcements', async () => {
      await page.goto('/login');

      // Mock screen reader
      let announcements = [];
      await page.exposeFunction('announceToScreenReader', (message) => {
        announcements.push(message);
      });

      // Trigger error
      await page.click('[data-testid="login-button"]');

      // Success login
      await page.fill('[data-testid="email-input"]', 'testuser@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');

      // Verify announcements were made (would be implemented in real app)
      expect(announcements).toContain('Sign in successful');
    });
  });
});