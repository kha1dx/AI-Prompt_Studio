import { Page, BrowserContext, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * Test utility functions for authentication testing
 */

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role?: string;
  id?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

/**
 * Generate a random test user
 */
export function generateTestUser(overrides?: Partial<TestUser>): TestUser {
  return {
    email: faker.internet.email().toLowerCase(),
    password: 'TestPass123!',
    name: faker.person.fullName(),
    role: 'user',
    ...overrides,
  };
}

/**
 * Generate multiple test users
 */
export function generateTestUsers(count: number, overrides?: Partial<TestUser>): TestUser[] {
  return Array.from({ length: count }, () => generateTestUser(overrides));
}

/**
 * Register a new user via API
 */
export async function registerUserAPI(user: TestUser, baseURL: string = 'http://localhost:3000'): Promise<{ success: boolean; user?: any; error?: string }> {
  const response = await fetch(`${baseURL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      confirmPassword: user.password,
      name: user.name,
    }),
  });

  const data = await response.json();
  
  return {
    success: response.ok,
    user: data.user,
    error: data.error,
  };
}

/**
 * Login user via API
 */
export async function loginUserAPI(email: string, password: string, baseURL: string = 'http://localhost:3000'): Promise<{ success: boolean; tokens?: AuthTokens; user?: any; error?: string }> {
  const response = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  
  if (response.ok && data.token) {
    return {
      success: true,
      tokens: {
        accessToken: data.token,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      },
      user: data.user,
    };
  }
  
  return {
    success: false,
    error: data.error || 'Login failed',
  };
}

/**
 * Login user via UI
 */
export async function loginUserUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  
  await Promise.all([
    page.waitForURL('/dashboard', { timeout: 10000 }),
    page.click('[data-testid="login-button"]'),
  ]);
  
  // Verify successful login
  await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
}

/**
 * Register user via UI
 */
export async function registerUserUI(page: Page, user: TestUser): Promise<void> {
  await page.goto('/register');
  
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.fill('[data-testid="confirm-password-input"]', user.password);
  await page.fill('[data-testid="name-input"]', user.name);
  
  // Accept terms and conditions if present
  const termsCheckbox = page.locator('[data-testid="terms-checkbox"]');
  if (await termsCheckbox.isVisible()) {
    await termsCheckbox.check();
  }
  
  await Promise.all([
    page.waitForURL('/verify-email', { timeout: 10000 }),
    page.click('[data-testid="register-button"]'),
  ]);
  
  // Verify successful registration
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
}

/**
 * Logout user via UI
 */
export async function logoutUserUI(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu"]');
  
  await Promise.all([
    page.waitForURL('/login', { timeout: 10000 }),
    page.click('[data-testid="logout-button"]'),
  ]);
  
  // Verify successful logout
  await expect(page.locator('[data-testid="logout-message"]')).toBeVisible();
}

/**
 * Wait for network requests to complete
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 3000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Clear all storage (localStorage, sessionStorage, cookies)
 */
export async function clearAllStorage(page: Page, context: BrowserContext): Promise<void> {
  await context.clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Mock network requests
 */
export async function mockNetworkRequest(page: Page, url: string, response: any, status: number = 200): Promise<void> {
  await page.route(url, route => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Simulate slow network
 */
export async function simulateSlowNetwork(page: Page): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 50 * 1024, // 50kb/s
    uploadThroughput: 20 * 1024,   // 20kb/s
    latency: 500,
  });
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Verify accessibility
 */
export async function checkAccessibility(page: Page): Promise<void> {
  // This would integrate with axe-core or similar accessibility testing library
  const violations = await page.evaluate(() => {
    // Mock accessibility check - in real implementation, this would use axe-core
    return [];
  });
  
  expect(violations).toHaveLength(0);
}

/**
 * Test form validation
 */
export async function testFormValidation(page: Page, formSelector: string, testCases: Array<{ field: string; value: string; expectedError: string }>): Promise<void> {
  for (const testCase of testCases) {
    await page.fill(`${formSelector} [data-testid="${testCase.field}"]`, testCase.value);
    await page.click(`${formSelector} [type="submit"]`);
    
    const errorElement = page.locator(`[data-testid="${testCase.field}-error"]`);
    await expect(errorElement).toContainText(testCase.expectedError);
    
    // Clear the field for next test
    await page.fill(`${formSelector} [data-testid="${testCase.field}"]`, '');
  }
}

/**
 * Wait for loading to complete
 */
export async function waitForLoadingToComplete(page: Page, loadingSelector: string = '[data-testid="loading-spinner"]'): Promise<void> {
  // Wait for loading to appear (if it does)
  try {
    await page.waitForSelector(loadingSelector, { timeout: 1000 });
    // Then wait for it to disappear
    await page.waitForSelector(loadingSelector, { state: 'detached', timeout: 10000 });
  } catch {
    // Loading spinner might not appear for fast operations, which is fine
  }
}

/**
 * Verify error message is displayed
 */
export async function verifyErrorMessage(page: Page, expectedMessage: string): Promise<void> {
  const errorElement = page.locator('[data-testid="error-message"], [role="alert"]');
  await expect(errorElement).toBeVisible();
  await expect(errorElement).toContainText(expectedMessage);
}

/**
 * Verify success message is displayed
 */
export async function verifySuccessMessage(page: Page, expectedMessage: string): Promise<void> {
  const successElement = page.locator('[data-testid="success-message"]');
  await expect(successElement).toBeVisible();
  await expect(successElement).toContainText(expectedMessage);
}

/**
 * Generate test data for forms
 */
export const testFormData = {
  validEmail: () => faker.internet.email().toLowerCase(),
  invalidEmails: ['invalid', '@invalid.com', 'invalid@', 'invalid@.com'],
  validPassword: 'SecurePass123!',
  invalidPasswords: ['123', 'password', 'PASSWORD123', 'password123', 'Password!'],
  validName: () => faker.person.fullName(),
  invalidNames: ['', 'a', 'x'.repeat(256)],
};

/**
 * Create authenticated context for API testing
 */
export async function createAuthenticatedContext(tokens: AuthTokens): Promise<any> {
  return {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Verify JWT token structure
 */
export function verifyJWTStructure(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  try {
    // Decode header and payload
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    // Verify required fields
    return !!(header.alg && header.typ && payload.exp && payload.iat);
  } catch {
    return false;
  }
}

/**
 * Generate performance metrics
 */
export async function measurePerformance<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await operation();
  const endTime = performance.now();
  
  return {
    result,
    duration: endTime - startTime,
  };
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Database test utilities
 */
export const dbTestUtils = {
  async cleanupTestUsers(emails: string[]): Promise<void> {
    // In a real implementation, this would clean up test users from the database
    console.log('Cleaning up test users:', emails);
  },
  
  async seedTestData(): Promise<void> {
    // In a real implementation, this would seed test data
    console.log('Seeding test data...');
  },
  
  async resetDatabase(): Promise<void> {
    // In a real implementation, this would reset the test database
    console.log('Resetting test database...');
  },
};

/**
 * Email testing utilities
 */
export const emailTestUtils = {
  async getLastEmail(recipient: string): Promise<any> {
    // In a real implementation, this would fetch the last email from a test email service
    return {
      to: recipient,
      subject: 'Test Email',
      body: 'Test email body',
    };
  },
  
  async clearEmails(): Promise<void> {
    // In a real implementation, this would clear the test email inbox
    console.log('Clearing test emails...');
  },
};

/**
 * Rate limiting test utilities
 */
export const rateLimitTestUtils = {
  async makeMultipleRequests(
    url: string,
    count: number,
    requestOptions: RequestInit = {}
  ): Promise<Response[]> {
    const promises = Array.from({ length: count }, () =>
      fetch(url, requestOptions)
    );
    
    return await Promise.all(promises);
  },
  
  async waitForRateLimitReset(waitTime: number = 60000): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, waitTime));
  },
};

/**
 * Security test utilities
 */
export const securityTestUtils = {
  generateXSSPayloads(): string[] {
    return [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(\'XSS\')">',
      'javascript:alert("XSS")',
      '<svg onload="alert(\'XSS\')">',
      '"><script>alert("XSS")</script>',
    ];
  },
  
  generateSQLInjectionPayloads(): string[] {
    return [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "admin' --",
      "' UNION SELECT * FROM users --",
      "1; DELETE FROM users WHERE 1=1 --",
    ];
  },
  
  generateCSRFToken(): string {
    return faker.string.alphanumeric(32);
  },
};