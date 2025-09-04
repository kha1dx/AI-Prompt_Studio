# 🔐 Supabase Authentication Diagnostic Suite

A comprehensive testing suite designed to validate and diagnose Supabase authentication systems. This tool identifies configuration issues, tests authentication flows, validates security settings, and provides actionable recommendations.

## 🎯 Purpose

This diagnostic suite helps developers:
- **Identify Configuration Issues**: Find missing or incorrect environment variables
- **Test Authentication Flows**: Validate sign-up, sign-in, and session management
- **Verify Security Settings**: Check RLS policies and database permissions
- **Test Error Handling**: Ensure proper resilience against failures and attacks
- **Validate Integrations**: Test OAuth providers and email services

## 📋 Test Modules

### 1. **Connection Health** (Critical)
- Tests basic connectivity to Supabase
- Validates environment variable format
- Checks network accessibility
- Verifies API endpoints

### 2. **Environment Validation** (Critical)
- Comprehensive validation of all environment variables
- JWT token validation and expiration checks
- Configuration format verification
- Generates sample configuration files

### 3. **Authentication Flow** (Critical)
- Interactive testing of sign-up and sign-in flows
- Session management and refresh testing
- User metadata operations
- Password reset functionality

### 4. **Email Service** (Optional)
- SMTP configuration testing
- Email deliverability checks (SPF, DKIM, DMARC)
- Supabase email service validation
- Template availability testing

### 5. **OAuth Flow** (Optional)
- OAuth provider configuration validation
- Endpoint accessibility testing
- Redirect URL validation
- Scope configuration testing

### 6. **Database Policy & RLS** (Critical)
- Row Level Security policy testing
- Database role validation
- User context access testing
- Security definer function checks

### 7. **Error Scenarios** (Optional)
- Invalid credential handling
- Rate limiting tests
- Malformed request handling (SQL injection, XSS)
- Network failure resilience

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- A Supabase project with configured environment variables
- `.env.local` file with your Supabase credentials

### Installation

1. **Navigate to the diagnostics directory:**
   ```bash
   cd tests/diagnostics
   ```

2. **Install dependencies:**
   ```bash
   npm run install-deps
   ```

3. **Ensure your `.env.local` file is configured:**
   ```bash
   # Required
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   
   # Optional (for OAuth testing)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

### Running Tests

#### **Run All Diagnostics:**
```bash
npm test
# or
npm run test:all
```

#### **Run Individual Tests:**
```bash
# Critical tests only
npm run test:critical

# Individual modules
npm run test:connection      # Connection health
npm run test:environment     # Environment validation
npm run test:auth-flow      # Authentication flow
npm run test:email          # Email service
npm run test:oauth          # OAuth providers
npm run test:database       # Database policies
npm run test:errors         # Error scenarios
```

#### **Direct Execution:**
```bash
# Run specific diagnostic directly
node 01-connection-health.js
node 02-environment-validation.js
# etc.
```

## 📊 Output & Reports

### Console Output
- **Real-time progress** with color-coded status indicators
- **Detailed results** for each test with timing information
- **Immediate recommendations** for failed tests

### Generated Files
- **JSON Reports**: Detailed machine-readable results
  - `diagnostic-report-YYYY-MM-DD.json` (comprehensive)
  - `supabase-connection-diagnostic.json`
  - `environment-validation-report.json`
  - Individual module reports

- **HTML Report**: Beautiful, shareable HTML dashboard
  - `diagnostic-report-YYYY-MM-DD.html`

### Sample Output
```
✅ [2024-01-15T10:30:45.123Z] Connection Health: SUCCESS (245ms)
❌ [2024-01-15T10:30:46.456Z] OAuth Configuration: FAILED - Missing Google credentials
⚠️  [2024-01-15T10:30:47.789Z] Email Service: WARNING - Using Supabase default

📊 Overall Score: 85/100 (Grade: A - Very Good)
🚀 Production Ready: YES
```

## 🎯 Scoring System

### Overall Score Calculation
- **Critical tests**: Weight = 2-3x
- **Optional tests**: Weight = 1x
- **Grade Scale**: A+ (90+), A (80+), B (70+), C (60+), D (50+), F (<50)

### Production Readiness
✅ **Production Ready** requires:
- No critical test failures
- Overall score ≥ 70%
- All security tests passing

## 🔧 Configuration Guide

### Required Environment Variables
```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...  # From Supabase Dashboard
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...      # From Supabase Dashboard
```

### Optional Environment Variables
```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# OAuth Providers
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-secret

# Custom Email (if not using Supabase default)
EMAIL_FROM=noreply@yourdomain.com
EMAIL_SERVER_HOST=smtp.yourdomain.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-smtp-user
EMAIL_SERVER_PASSWORD=your-smtp-password
```

## 🛡️ Security Features

### Authentication Testing
- **Credential validation**: Tests proper rejection of invalid credentials
- **Session management**: Validates token refresh and expiry handling
- **Rate limiting**: Checks for brute force protection

### Database Security
- **Row Level Security**: Verifies RLS policies are active
- **Access control**: Tests unauthorized access prevention
- **SQL injection protection**: Validates input sanitization

### Error Handling
- **Graceful failures**: Ensures errors don't leak sensitive information
- **Input validation**: Tests against XSS and injection attacks
- **Network resilience**: Validates proper handling of connection failures

## 📋 Common Issues & Solutions

### ❌ Connection Failures
**Problem**: Can't connect to Supabase
**Solutions**:
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check if project is active in Supabase dashboard
- Confirm network access to *.supabase.co

### ❌ Authentication Errors
**Problem**: Sign-in/sign-up not working
**Solutions**:
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is valid
- Verify user confirmation settings in Supabase Auth
- Test with a known valid user account

### ❌ Database Access Issues
**Problem**: Database queries failing
**Solutions**:
- Enable Row Level Security on tables
- Create proper RLS policies
- Verify `SUPABASE_SERVICE_ROLE_KEY` permissions

### ❌ OAuth Configuration
**Problem**: OAuth providers not working
**Solutions**:
- Enable providers in Supabase Dashboard → Auth → Providers
- Configure redirect URLs in OAuth provider console
- Verify client ID/secret format and validity

## 🔄 Regular Maintenance

### Recommended Schedule
- **Before deployment**: Run full diagnostic suite
- **Weekly**: Run critical tests (`npm run test:critical`)
- **After configuration changes**: Run relevant test modules
- **Monthly**: Full security audit with all tests

### Monitoring Integration
The diagnostic suite can be integrated into CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run Authentication Diagnostics
  run: |
    cd tests/diagnostics
    npm run test:critical
```

## 🛠️ Customization

### Adding Custom Tests
1. Create a new test file following the existing pattern
2. Extend the base diagnostic class structure
3. Add the test to `run-all-diagnostics.js`

### Modifying Test Criteria
- Adjust weights in the diagnostic runner
- Modify scoring thresholds
- Customize recommendation logic

## 📞 Support

### Troubleshooting Steps
1. **Check Prerequisites**: Verify Node.js version and Supabase setup
2. **Review Environment**: Ensure all required variables are set
3. **Check Logs**: Review detailed JSON reports for specific errors
4. **Test Incrementally**: Run individual modules to isolate issues

### Getting Help
- Review individual test output for specific guidance
- Check Supabase documentation for configuration details  
- Verify OAuth provider documentation for setup requirements

## 📜 License

MIT License - See LICENSE file for details.

---

**🔐 Secure by Design | 🚀 Production Ready | 📊 Comprehensive Testing**