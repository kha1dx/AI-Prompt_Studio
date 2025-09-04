import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['junit', { outputFile: 'test-results/playwright-results.xml' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for all tests */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable permissions for notifications, geolocation etc.
        permissions: ['notifications'],
        // Disable web security for testing
        launchOptions: {
          args: ['--disable-web-security', '--disable-dev-shm-usage'],
        },
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': true,
            'dom.push.enabled': true,
          },
        },
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
      },
    },

    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge' 
      },
    },

    /* Mobile browsers */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        // Mobile specific settings
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
      },
    },
    
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        // iOS Safari specific settings
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'webkit',
      },
    },

    {
      name: 'Tablet',
      use: { 
        ...devices['iPad Pro'],
        isMobile: false,
        hasTouch: true,
      },
    },

    /* Accessibility testing */
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Force prefers-reduced-motion for accessibility testing
        reducedMotion: 'reduce',
        // High contrast mode simulation
        forcedColors: 'active',
      },
      testMatch: '**/*accessibility.spec.ts',
    },

    /* Performance testing */
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        // Enable performance monitoring
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--enable-performance-manager-debug-mode',
          ],
        },
      },
      testMatch: '**/*performance.spec.ts',
    },

    /* Security testing */
    {
      name: 'security',
      use: {
        ...devices['Desktop Chrome'],
        // Disable some security features for testing
        launchOptions: {
          args: [
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-site-isolation-trials',
          ],
        },
      },
      testMatch: '**/*security.spec.ts',
    },

    /* Cross-browser compatibility matrix */
    {
      name: 'chrome-latest',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
    
    {
      name: 'chrome-beta',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome-beta',
      },
    },

    /* Responsive design testing */
    {
      name: 'desktop-large',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    {
      name: 'desktop-small',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
      },
    },

    /* Network conditions testing */
    {
      name: 'slow-3g',
      use: {
        ...devices['Desktop Chrome'],
        // Simulate slow 3G network
        launchOptions: {
          args: ['--force-effective-connection-type=3G'],
        },
      },
      testMatch: '**/*network.spec.ts',
    },

    /* Authentication specific testing */
    {
      name: 'auth-flow',
      use: {
        ...devices['Desktop Chrome'],
        // Specific settings for authentication testing
        ignoreHTTPSErrors: true,
        // Store auth state between tests
        storageState: undefined,
      },
      testMatch: '**/*auth*.spec.ts',
    },
  ],

  /* Test environment setup */
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  /* Test result directories */
  outputDir: 'test-results/',
  
  /* Global test timeout */
  timeout: 30000,
  
  /* Maximum time to wait for expect() assertions */
  expect: {
    timeout: 5000,
    // Take screenshot on assertion failure
    toHaveScreenshot: { threshold: 0.2, maxDiffPixels: 1000 },
  },
  
  /* Test metadata */
  metadata: {
    project: 'Authentication Testing Suite',
    version: '1.0.0',
    author: 'QA Team',
  },
});