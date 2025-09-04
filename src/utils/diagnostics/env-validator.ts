/**
 * Environment Variables Validator
 * Comprehensive validation and testing of all environment variables needed for authentication
 */

export interface EnvValidationResult {
  variable: string
  value?: string
  present: boolean
  valid: boolean
  issues: string[]
  suggestions: string[]
}

export interface EnvValidationSuite {
  results: EnvValidationResult[]
  overall: {
    success: boolean
    validCount: number
    totalCount: number
    criticalIssues: string[]
    warnings: string[]
  }
}

class EnvironmentValidator {
  private requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ] as const

  private optionalVars = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET'
  ] as const

  private results: EnvValidationResult[] = []

  constructor() {
    console.log('🔍 Environment Validator initialized')
  }

  private log(level: 'info' | 'warn' | 'error' | 'success', message: string, details?: any) {
    const icons = { info: '📋', warn: '⚠️', error: '❌', success: '✅' }
    console.log(`${icons[level]} [ENV-VALIDATOR] ${message}`)
    if (details) {
      console.log('  Details:', details)
    }
  }

  validateSupabaseUrl(url?: string): EnvValidationResult {
    const result: EnvValidationResult = {
      variable: 'NEXT_PUBLIC_SUPABASE_URL',
      value: url,
      present: !!url,
      valid: false,
      issues: [],
      suggestions: []
    }

    if (!url) {
      result.issues.push('Environment variable not set')
      result.suggestions.push('Add NEXT_PUBLIC_SUPABASE_URL to your .env.local file')
      result.suggestions.push('Format: https://your-project-ref.supabase.co')
      return result
    }

    // Check if it's a placeholder
    if (url.includes('your_supabase') || url.includes('your-project')) {
      result.issues.push('Still using placeholder value')
      result.suggestions.push('Replace with your actual Supabase project URL')
      return result
    }

    // Check URL format
    if (!url.startsWith('https://')) {
      result.issues.push('URL must start with https://')
      result.suggestions.push('Ensure URL starts with https://')
    }

    if (!url.includes('.supabase.co')) {
      result.issues.push('URL should contain .supabase.co domain')
      result.suggestions.push('Use your actual Supabase project URL ending in .supabase.co')
    }

    // Check URL pattern
    const urlPattern = /^https:\/\/[a-z0-9]+\.supabase\.co$/
    if (!urlPattern.test(url)) {
      result.issues.push('URL format appears incorrect')
      result.suggestions.push('Expected format: https://your-project-ref.supabase.co')
    }

    result.valid = result.issues.length === 0
    return result
  }

  validateAnonKey(key?: string): EnvValidationResult {
    const result: EnvValidationResult = {
      variable: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      value: key ? `${key.substring(0, 20)}...` : undefined,
      present: !!key,
      valid: false,
      issues: [],
      suggestions: []
    }

    if (!key) {
      result.issues.push('Environment variable not set')
      result.suggestions.push('Add NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file')
      result.suggestions.push('Get this from your Supabase project settings > API')
      return result
    }

    // Check if it's a placeholder
    if (key.includes('your_supabase') || key.includes('your-anon-key')) {
      result.issues.push('Still using placeholder value')
      result.suggestions.push('Replace with your actual Supabase anon key')
      return result
    }

    // Check JWT format
    if (!key.startsWith('eyJ')) {
      result.issues.push('Does not appear to be a valid JWT token')
      result.suggestions.push('Anon key should be a JWT token starting with "eyJ"')
    }

    // Check length (JWT tokens are typically quite long)
    if (key.length < 100) {
      result.issues.push('Key appears too short for a valid JWT')
      result.suggestions.push('Ensure you copied the complete anon key')
    }

    // Try to parse as JWT
    try {
      const parts = key.split('.')
      if (parts.length !== 3) {
        result.issues.push('Invalid JWT format (should have 3 parts)')
        result.suggestions.push('Ensure you copied the complete JWT token')
      } else {
        // Try to decode header
        const header = JSON.parse(atob(parts[0]))
        if (header.alg !== 'HS256' || header.typ !== 'JWT') {
          result.issues.push('JWT header indicates unexpected format')
        }

        // Try to decode payload
        const payload = JSON.parse(atob(parts[1]))
        if (!payload.iss || !payload.iss.includes('supabase')) {
          result.issues.push('JWT payload does not appear to be from Supabase')
        }
        if (payload.role !== 'anon') {
          result.issues.push(`JWT role is "${payload.role}", expected "anon"`)
        }
        if (payload.exp && payload.exp < Date.now() / 1000) {
          result.issues.push('JWT token has expired')
          result.suggestions.push('Generate a new anon key from Supabase dashboard')
        }
      }
    } catch (e) {
      result.issues.push('Could not parse as valid JWT')
      result.suggestions.push('Ensure you copied the complete and correct anon key')
    }

    result.valid = result.issues.length === 0
    return result
  }

  validateServiceRoleKey(key?: string): EnvValidationResult {
    const result: EnvValidationResult = {
      variable: 'SUPABASE_SERVICE_ROLE_KEY',
      value: key ? `${key.substring(0, 20)}...` : undefined,
      present: !!key,
      valid: false,
      issues: [],
      suggestions: []
    }

    if (!key) {
      result.issues.push('Environment variable not set (optional but recommended)')
      result.suggestions.push('Add SUPABASE_SERVICE_ROLE_KEY for admin operations')
      result.valid = true // It's optional, so missing is valid
      return result
    }

    // Similar validation to anon key
    if (!key.startsWith('eyJ')) {
      result.issues.push('Does not appear to be a valid JWT token')
    }

    if (key.length < 100) {
      result.issues.push('Key appears too short for a valid JWT')
    }

    try {
      const parts = key.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        if (payload.role !== 'service_role') {
          result.issues.push(`JWT role is "${payload.role}", expected "service_role"`)
        }
        if (payload.exp && payload.exp < Date.now() / 1000) {
          result.issues.push('JWT token has expired')
        }
      }
    } catch (e) {
      result.issues.push('Could not parse as valid JWT')
    }

    result.valid = result.issues.length === 0
    return result
  }

  validateNextAuthUrl(url?: string): EnvValidationResult {
    const result: EnvValidationResult = {
      variable: 'NEXTAUTH_URL',
      value: url,
      present: !!url,
      valid: false,
      issues: [],
      suggestions: []
    }

    if (!url) {
      result.issues.push('Environment variable not set (optional)')
      result.suggestions.push('Set NEXTAUTH_URL for production deployments')
      result.valid = true // Optional
      return result
    }

    if (url.includes('your_nextauth')) {
      result.issues.push('Still using placeholder value')
      result.suggestions.push('Replace with your actual deployment URL')
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      result.issues.push('URL must start with http:// or https://')
    }

    if (process.env.NODE_ENV === 'production' && url.startsWith('http://')) {
      result.issues.push('Production should use HTTPS')
      result.suggestions.push('Use https:// URL for production')
    }

    result.valid = result.issues.length === 0
    return result
  }

  validateNextAuthSecret(secret?: string): EnvValidationResult {
    const result: EnvValidationResult = {
      variable: 'NEXTAUTH_SECRET',
      value: secret ? '[HIDDEN]' : undefined,
      present: !!secret,
      valid: false,
      issues: [],
      suggestions: []
    }

    if (!secret) {
      result.issues.push('Environment variable not set (recommended for security)')
      result.suggestions.push('Generate a secure random string for NEXTAUTH_SECRET')
      result.suggestions.push('Use: openssl rand -base64 32')
      result.valid = process.env.NODE_ENV !== 'production' // Optional in dev
      return result
    }

    if (secret.includes('your_nextauth_secret')) {
      result.issues.push('Still using placeholder value')
      result.suggestions.push('Replace with a secure random string')
    }

    if (secret.length < 32) {
      result.issues.push('Secret should be at least 32 characters long')
      result.suggestions.push('Use a longer, more secure secret')
    }

    if (secret === 'secret' || secret === 'password' || secret === '123456') {
      result.issues.push('Using common/weak secret')
      result.suggestions.push('Use a cryptographically secure random string')
    }

    result.valid = result.issues.length === 0
    return result
  }

  async validateEnvironment(): Promise<EnvValidationSuite> {
    this.log('info', 'Starting environment validation...')
    this.results = []

    // Required variables
    this.results.push(this.validateSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL))
    this.results.push(this.validateAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))

    // Optional variables
    this.results.push(this.validateServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY))
    this.results.push(this.validateNextAuthUrl(process.env.NEXTAUTH_URL))
    this.results.push(this.validateNextAuthSecret(process.env.NEXTAUTH_SECRET))

    // Calculate overall results
    const validCount = this.results.filter(r => r.valid).length
    const totalCount = this.results.length
    const criticalIssues = this.results
      .filter(r => this.requiredVars.includes(r.variable as any) && !r.valid)
      .flatMap(r => r.issues)
    const warnings = this.results
      .filter(r => this.optionalVars.includes(r.variable as any) && !r.valid)
      .flatMap(r => r.issues)

    const overall = {
      success: criticalIssues.length === 0,
      validCount,
      totalCount,
      criticalIssues,
      warnings
    }

    this.log(overall.success ? 'success' : 'error', 
      `Environment validation complete: ${validCount}/${totalCount} variables valid`
    )

    return {
      results: this.results,
      overall
    }
  }

  async testSupabaseConnectivity(): Promise<{
    canConnect: boolean
    errorMessage?: string
    responseTime?: number
  }> {
    this.log('info', 'Testing Supabase connectivity...')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        canConnect: false,
        errorMessage: 'Missing Supabase configuration'
      }
    }

    try {
      const startTime = Date.now()
      
      // Test basic connectivity to Supabase
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      })

      const responseTime = Date.now() - startTime

      if (response.ok || response.status === 404) { // 404 is OK for root endpoint
        this.log('success', `Supabase connectivity test passed (${responseTime}ms)`)
        return {
          canConnect: true,
          responseTime
        }
      } else {
        const errorText = await response.text()
        return {
          canConnect: false,
          errorMessage: `HTTP ${response.status}: ${errorText}`,
          responseTime
        }
      }
    } catch (error) {
      return {
        canConnect: false,
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    }
  }

  generateEnvFile(): string {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    return `# Supabase Configuration
# Get these values from your Supabase project dashboard
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl || 'https://your-project-ref.supabase.co'}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey || 'your-anon-key-here'}
SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here'}

# NextAuth Configuration (optional)
NEXTAUTH_URL=${process.env.NEXTAUTH_URL || 'http://localhost:3000'}
NEXTAUTH_SECRET=${process.env.NEXTAUTH_SECRET || 'your-nextauth-secret-here'}

# To generate a secure NEXTAUTH_SECRET, run:
# openssl rand -base64 32
`
  }

  printValidationReport(suite: EnvValidationSuite): void {
    console.log('\n📊 ENVIRONMENT VALIDATION REPORT')
    console.log('=' .repeat(60))
    console.log(`Overall Status: ${suite.overall.success ? '✅ Valid' : '❌ Issues Found'}`)
    console.log(`Valid Variables: ${suite.overall.validCount}/${suite.overall.totalCount}`)

    console.log('\n📋 VARIABLE DETAILS:')
    suite.results.forEach(result => {
      const icon = result.valid ? '✅' : '❌'
      const status = result.present ? 'Present' : 'Missing'
      console.log(`${icon} ${result.variable}: ${status}${result.valid ? '' : ' (Invalid)'}`)
      
      if (result.issues.length > 0) {
        console.log('  Issues:')
        result.issues.forEach(issue => console.log(`    - ${issue}`))
      }
      
      if (result.suggestions.length > 0) {
        console.log('  Suggestions:')
        result.suggestions.forEach(suggestion => console.log(`    💡 ${suggestion}`))
      }
    })

    if (suite.overall.criticalIssues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES (Must Fix):')
      suite.overall.criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`)
      })
    }

    if (suite.overall.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (Recommended to Fix):')
      suite.overall.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`)
      })
    }

    console.log('\n💡 SETUP HELP:')
    console.log('1. Create a Supabase account at https://supabase.com')
    console.log('2. Create a new project')
    console.log('3. Go to Settings > API to get your URL and keys')
    console.log('4. Copy the values to your .env.local file')
    console.log('5. Restart your development server')

    console.log('\n📄 SAMPLE .env.local:')
    console.log(this.generateEnvFile())
    console.log('=' .repeat(60))
  }
}

// Export functions for easy use
export const validateEnvironment = async (): Promise<EnvValidationSuite> => {
  const validator = new EnvironmentValidator()
  return await validator.validateEnvironment()
}

export const testSupabaseConnectivity = async () => {
  const validator = new EnvironmentValidator()
  return await validator.testSupabaseConnectivity()
}

export const printEnvironmentReport = async (): Promise<void> => {
  const validator = new EnvironmentValidator()
  const suite = await validator.validateEnvironment()
  validator.printValidationReport(suite)
  
  // Also test connectivity
  const connectivity = await validator.testSupabaseConnectivity()
  console.log('\n🌐 CONNECTIVITY TEST:')
  if (connectivity.canConnect) {
    console.log(`✅ Can connect to Supabase (${connectivity.responseTime}ms)`)
  } else {
    console.log(`❌ Cannot connect to Supabase: ${connectivity.errorMessage}`)
  }
}

export { EnvironmentValidator }