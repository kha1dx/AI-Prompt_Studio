# Authentication Diagnostics Suite

A comprehensive set of tools for testing, debugging, and monitoring Supabase authentication in your Next.js application.

## Overview

This diagnostics suite provides:
- **Environment validation** - Check if all required environment variables are properly configured
- **Connection testing** - Verify connectivity to Supabase services
- **Authentication flow testing** - Test signup, login, logout, and OAuth flows
- **Comprehensive logging** - Detailed logging with error tracking and performance metrics
- **Debug mode** - Enhanced debugging with verbose output and network monitoring
- **Interactive UI** - Web-based diagnostic interface
- **CLI tools** - Command-line utilities for automated testing

## Quick Start

### Web Interface

Navigate to `/auth/diagnostics` in your application to access the interactive diagnostic interface.

### CLI Usage

```bash
# Quick health check
node src/scripts/test-auth.js quick

# Full diagnostics suite
node src/scripts/test-auth.js full

# Environment validation only
node src/scripts/test-auth.js env

# Connection testing only
node src/scripts/test-auth.js connection

# Authentication flow tests
node src/scripts/test-auth.js flows --email test@example.com --password TestPass123
```

### Programmatic Usage

```typescript
import { 
  runCompleteDiagnostics, 
  quickHealthCheck,
  runConnectionTest,
  validateEnvironment
} from '@/utils/diagnostics'

// Quick health check
const isHealthy = await quickHealthCheck()

// Complete diagnostics
const results = await runCompleteDiagnostics({
  includeFlowTests: true,
  testEmail: 'test@example.com',
  verbose: true
})

// Environment validation
const envResults = await validateEnvironment()

// Connection testing
const connectionResults = await runConnectionTest()
```

## Components

### 1. Connection Test (`connection-test.ts`)

Tests basic connectivity and configuration:
- Environment variable validation
- Supabase client creation
- Basic connection to Supabase
- Auth service availability
- Database connectivity

```typescript
import { runConnectionTest, printTestResults } from '@/utils/diagnostics'

const results = await runConnectionTest()
printTestResults(results)
```

### 2. Authentication Logger (`auth-logger.ts`)

Comprehensive logging for all authentication operations:
- Sign up/in/out logging
- OAuth flow tracking
- Session management logging
- Performance metrics
- Error tracking with context

```typescript
import { getAuthLogger } from '@/utils/diagnostics'

const logger = getAuthLogger(true) // Enable debug mode
await logger.logSignIn(email, password, response)
logger.printReport()
```

### 3. Flow Tester (`auth-flow-tester.ts`)

End-to-end testing of authentication flows:
- Complete signup flow with email verification
- Login flow with session validation
- Logout flow with session cleanup
- OAuth flows (Google, GitHub)
- Password reset flow
- Email confirmation flow

```typescript
import { runFullAuthTest } from '@/utils/diagnostics'

const results = await runFullAuthTest({
  testEmail: 'test@example.com',
  testPassword: 'SecurePass123!',
  debugMode: true
})
```

### 4. Debug Client (`debug-auth.ts`)

Enhanced authentication client with verbose debugging:
- Detailed request/response logging
- Network request monitoring
- Environment information capture
- Stack trace recording
- Performance timing

```typescript
import { createDebugAuthClient } from '@/utils/diagnostics'

const debugClient = createDebugAuthClient({
  enableVerboseLogging: true,
  logNetworkRequests: true,
  captureStackTraces: true
})

const result = await debugClient.debugSignIn(email, password)
```

### 5. Environment Validator (`env-validator.ts`)

Validates and tests environment configuration:
- Environment variable presence and format
- JWT token validation
- URL format checking
- Connectivity testing
- Configuration suggestions

```typescript
import { validateEnvironment, printEnvironmentReport } from '@/utils/diagnostics'

await printEnvironmentReport()
```

## Environment Variables

The diagnostics suite validates these environment variables:

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Optional
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `NEXTAUTH_URL` - Your application URL (for production)
- `NEXTAUTH_SECRET` - Secret for NextAuth.js (if using)

## Sample .env.local

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# NextAuth Configuration (optional)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here
```

## Integration with Existing Auth

The diagnostics suite integrates seamlessly with your existing authentication:

### Enhanced AuthContext

Your `AuthContext` is automatically enhanced with logging when you import the diagnostics:

```typescript
import { getAuthLogger } from '@/utils/diagnostics/auth-logger'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const logger = getAuthLogger(process.env.NODE_ENV === 'development')
  
  const signIn = async (email: string, password: string) => {
    logger.startTimer('signIn')
    const response = await supabase.auth.signInWithPassword({ email, password })
    await logger.logSignIn(email, password, response)
    return response
  }
}
```

### Live Monitoring

Set up live monitoring to capture all authentication events:

```typescript
import { setupLiveMonitoring } from '@/utils/diagnostics'

// In your app initialization
const monitor = setupLiveMonitoring()

// Later, to see reports
monitor.printReport()

// To stop monitoring
monitor.stop()
```

## Troubleshooting Common Issues

### Environment Configuration

```bash
# Check environment variables
node src/scripts/test-auth.js env
```

Common issues:
- Missing `.env.local` file
- Incorrect Supabase URL format
- Invalid JWT tokens
- Wrong environment variable names

### Connection Issues

```bash
# Test connectivity
node src/scripts/test-auth.js connection
```

Common causes:
- Network connectivity problems
- Incorrect Supabase project URL
- Paused/suspended Supabase project
- Firewall blocking requests

### Authentication Flow Issues

```bash
# Test complete flows
node src/scripts/test-auth.js flows
```

Common problems:
- Email confirmation not configured
- OAuth providers not set up
- Redirect URLs misconfigured
- Auth policies too restrictive

## Advanced Usage

### Custom Test Configuration

```typescript
const config = {
  includeFlowTests: true,
  includeConnectivityTests: true,
  testEmail: 'custom-test@example.com',
  testPassword: 'CustomPassword123!',
  verbose: true,
  timeoutMs: 30000
}

const results = await runCompleteDiagnostics(config)
```

### Automated Testing

```bash
#!/bin/bash
# CI/CD integration
node src/scripts/test-auth.js quick
if [ $? -eq 0 ]; then
    echo "✅ Auth health check passed"
    npm run build
else
    echo "❌ Auth health check failed"
    exit 1
fi
```

### Performance Monitoring

```typescript
import { getAuthLogger } from '@/utils/diagnostics'

const logger = getAuthLogger()

// Monitor authentication performance
setInterval(() => {
  const report = logger.generateReport()
  if (report.metadata.totalDuration > 5000) {
    console.warn('Slow authentication detected:', report.metadata)
  }
}, 60000) // Check every minute
```

## API Reference

### Core Functions

- `runCompleteDiagnostics(config?)` - Run full diagnostic suite
- `quickHealthCheck()` - Quick environment and connectivity check
- `runConnectionTest()` - Test Supabase connectivity
- `validateEnvironment()` - Validate environment variables
- `setupLiveMonitoring()` - Set up live auth monitoring

### Logger Functions

- `getAuthLogger(debug?)` - Get global auth logger instance
- `createAuthLogger(debug?)` - Create new logger instance
- `logAuthAttempt(action, success, details, error?)` - Log auth attempt
- `printAuthReport()` - Print authentication report
- `clearAuthLogs()` - Clear all logged events

### Flow Testing Functions

- `runFullAuthTest(config?)` - Test all authentication flows
- `runSignupTest(email?, password?)` - Test signup flow only
- `runLoginTest(email?, password?)` - Test login flow only
- `createAuthFlowTester(config?)` - Create flow tester instance

## Contributing

To extend the diagnostics suite:

1. Add new test functions to the appropriate module
2. Update the main index export
3. Add CLI commands to `test-auth.js`
4. Update the web interface if needed
5. Add documentation to this README

## Support

For issues with the diagnostics suite:

1. Check the troubleshooting section above
2. Run the full diagnostics to identify issues
3. Check the browser console for detailed logs
4. Review the generated reports for specific errors

The diagnostics suite is designed to be self-documenting - it will guide you toward solutions for most authentication issues you encounter.