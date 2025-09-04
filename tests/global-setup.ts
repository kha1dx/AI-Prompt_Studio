import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  console.log(`Starting global setup for ${baseURL}`);

  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the application to be ready
    console.log('Waiting for application to be ready...');
    await page.goto(baseURL || 'http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });

    // Verify the application is running
    await page.waitForSelector('body', { timeout: 10000 });
    console.log('Application is ready');

    // Setup test database if needed
    console.log('Setting up test database...');
    await setupTestDatabase();

    // Create test users for authentication testing
    console.log('Creating test users...');
    await createTestUsers(page);

    // Setup test data
    console.log('Setting up test data...');
    await setupTestData(page);

    // Clear any existing sessions
    console.log('Clearing existing sessions...');
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('Global setup completed successfully');
}

async function setupTestDatabase() {
  // In a real implementation, this would:
  // 1. Connect to test database
  // 2. Run migrations
  // 3. Seed initial data
  // 4. Set up test-specific configurations
  
  // Mock implementation
  console.log('Test database setup completed');
}

async function createTestUsers(page: any) {
  const testUsers = [
    {
      email: 'testuser@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
      role: 'user',
    },
    {
      email: 'admin@example.com',
      password: 'AdminPass123!',
      name: 'Admin User',
      role: 'admin',
    },
    {
      email: 'moderator@example.com',
      password: 'ModeratorPass123!',
      name: 'Moderator User',
      role: 'moderator',
    },
    {
      email: 'oauth@example.com',
      password: 'OAuthPass123!',
      name: 'OAuth User',
      role: 'user',
    },
    {
      email: 'mfa@example.com',
      password: 'MFAPass123!',
      name: 'MFA User',
      role: 'user',
      mfaEnabled: true,
    },
  ];

  for (const user of testUsers) {
    try {
      // Navigate to registration
      await page.goto('/register');
      
      // Fill registration form
      await page.fill('[data-testid="email-input"]', user.email);
      await page.fill('[data-testid="password-input"]', user.password);
      await page.fill('[data-testid="confirm-password-input"]', user.password);
      await page.fill('[data-testid="name-input"]', user.name);
      
      // Accept terms if checkbox exists
      const termsCheckbox = page.locator('[data-testid="terms-checkbox"]');
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }
      
      // Submit registration
      await page.click('[data-testid="register-button"]');
      
      // Wait for success or handle existing user
      try {
        await page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
        console.log(`Created test user: ${user.email}`);
      } catch {
        // User might already exist, which is fine
        console.log(`Test user already exists: ${user.email}`);
      }
      
    } catch (error) {
      console.warn(`Failed to create test user ${user.email}:`, error.message);
    }
  }
}

async function setupTestData(page: any) {
  // Set up any additional test data needed
  // This could include:
  // - Test organizations
  // - Sample content
  // - Configuration settings
  // - Mock external services
  
  try {
    // Example: Set up test configurations
    await page.evaluate(() => {
      // Set test environment flags
      window.testEnvironment = true;
      window.skipAnimations = true;
      
      // Mock external services if needed
      if (window.mockExternalServices) {
        window.mockExternalServices();
      }
    });
    
    console.log('Test data setup completed');
  } catch (error) {
    console.warn('Test data setup failed:', error.message);
  }
}

export default globalSetup;