/**
 * PKCE PARAMETER VALIDATION TOOLS
 * 
 * Comprehensive validation utilities for PKCE parameters to ensure
 * they meet OAuth 2.1 specifications and prevent common issues.
 */

import crypto from 'crypto'

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  details: Record<string, any>
  score: number // 0-100, where 100 is perfect
}

interface PKCEParameters {
  codeVerifier: string
  codeChallenge: string
  codeChallengeMethod: 'S256' | 'plain'
  state: string
}

interface ValidationRule {
  name: string
  description: string
  category: 'format' | 'length' | 'security' | 'compatibility'
  severity: 'error' | 'warning' | 'info'
  validate: (value: any, context?: any) => boolean
  message: (value: any) => string
}

export class PKCEValidator {
  private validationRules: Map<string, ValidationRule[]> = new Map()

  constructor() {
    this.initializeValidationRules()
    console.log('✅ [PKCE-VALIDATOR] PKCE Parameter Validator initialized')
  }

  private initializeValidationRules(): void {
    // Code Verifier Rules
    this.validationRules.set('codeVerifier', [
      {
        name: 'minimum-length',
        description: 'Code verifier must be at least 43 characters',
        category: 'length',
        severity: 'error',
        validate: (value: string) => value.length >= 43,
        message: (value: string) => `Code verifier too short: ${value.length} chars (minimum 43)`
      },
      {
        name: 'maximum-length',
        description: 'Code verifier must not exceed 128 characters',
        category: 'length',
        severity: 'error',
        validate: (value: string) => value.length <= 128,
        message: (value: string) => `Code verifier too long: ${value.length} chars (maximum 128)`
      },
      {
        name: 'valid-characters',
        description: 'Code verifier must contain only unreserved characters',
        category: 'format',
        severity: 'error',
        validate: (value: string) => /^[A-Za-z0-9\-._~]+$/.test(value),
        message: (value: string) => `Code verifier contains invalid characters: ${value.replace(/[A-Za-z0-9\-._~]/g, '').substring(0, 10)}`
      },
      {
        name: 'sufficient-entropy',
        description: 'Code verifier should have sufficient randomness',
        category: 'security',
        severity: 'warning',
        validate: (value: string) => this.calculateEntropy(value) >= 128,
        message: (value: string) => `Code verifier has low entropy: ${this.calculateEntropy(value).toFixed(1)} bits (recommended: ≥128)`
      },
      {
        name: 'no-predictable-patterns',
        description: 'Code verifier should not contain predictable patterns',
        category: 'security',
        severity: 'warning',
        validate: (value: string) => !this.hasPredictablePatterns(value),
        message: () => 'Code verifier contains predictable patterns'
      },
      {
        name: 'base64url-compatible',
        description: 'Code verifier should be base64url compatible',
        category: 'compatibility',
        severity: 'info',
        validate: (value: string) => this.isBase64UrlCompatible(value),
        message: () => 'Code verifier is not base64url encoded (might be intentional)'
      }
    ])

    // Code Challenge Rules
    this.validationRules.set('codeChallenge', [
      {
        name: 'exact-length',
        description: 'Code challenge must be exactly 43 characters for S256',
        category: 'length',
        severity: 'error',
        validate: (value: string, context: any) => {
          if (context?.codeChallengeMethod === 'S256') {
            return value.length === 43
          }
          return true
        },
        message: (value: string) => `Code challenge wrong length: ${value.length} chars (expected 43 for S256)`
      },
      {
        name: 'valid-base64url',
        description: 'Code challenge must be valid base64url',
        category: 'format',
        severity: 'error',
        validate: (value: string) => /^[A-Za-z0-9\-_]+$/.test(value),
        message: () => 'Code challenge contains invalid base64url characters'
      },
      {
        name: 'no-padding',
        description: 'Code challenge should not have base64 padding',
        category: 'format',
        severity: 'warning',
        validate: (value: string) => !value.includes('='),
        message: () => 'Code challenge contains padding (=) - should use base64url'
      },
      {
        name: 'matches-verifier',
        description: 'Code challenge should match the verifier',
        category: 'security',
        severity: 'error',
        validate: (value: string, context: any) => {
          if (context?.codeVerifier && context?.codeChallengeMethod === 'S256') {
            const expectedChallenge = crypto
              .createHash('sha256')
              .update(context.codeVerifier)
              .digest('base64url')
            return value === expectedChallenge
          }
          return true
        },
        message: () => 'Code challenge does not match code verifier'
      }
    ])

    // State Parameter Rules
    this.validationRules.set('state', [
      {
        name: 'minimum-length',
        description: 'State parameter should be at least 16 characters',
        category: 'length',
        severity: 'warning',
        validate: (value: string) => value.length >= 16,
        message: (value: string) => `State parameter too short: ${value.length} chars (recommended: ≥16)`
      },
      {
        name: 'maximum-length',
        description: 'State parameter should not exceed 255 characters',
        category: 'length',
        severity: 'warning',
        validate: (value: string) => value.length <= 255,
        message: (value: string) => `State parameter too long: ${value.length} chars (recommended: ≤255)`
      },
      {
        name: 'valid-characters',
        description: 'State parameter should contain only safe characters',
        category: 'format',
        severity: 'error',
        validate: (value: string) => /^[A-Za-z0-9\-._~]+$/.test(value),
        message: () => 'State parameter contains unsafe characters'
      },
      {
        name: 'sufficient-randomness',
        description: 'State parameter should be sufficiently random',
        category: 'security',
        severity: 'warning',
        validate: (value: string) => this.calculateEntropy(value) >= 64,
        message: (value: string) => `State parameter has low entropy: ${this.calculateEntropy(value).toFixed(1)} bits (recommended: ≥64)`
      },
      {
        name: 'no-sensitive-data',
        description: 'State parameter should not contain sensitive information',
        category: 'security',
        severity: 'warning',
        validate: (value: string) => !this.containsSensitivePatterns(value),
        message: () => 'State parameter might contain sensitive information'
      }
    ])

    // Code Challenge Method Rules
    this.validationRules.set('codeChallengeMethod', [
      {
        name: 'supported-method',
        description: 'Code challenge method must be S256 or plain',
        category: 'format',
        severity: 'error',
        validate: (value: string) => ['S256', 'plain'].includes(value),
        message: (value: string) => `Unsupported code challenge method: ${value}`
      },
      {
        name: 'recommended-s256',
        description: 'S256 is recommended over plain method',
        category: 'security',
        severity: 'warning',
        validate: (value: string) => value === 'S256',
        message: () => 'Plain method is less secure than S256'
      }
    ])
  }

  /**
   * Validate a single parameter
   */
  public validateParameter(parameterName: string, value: any, context?: any): ValidationResult {
    const rules = this.validationRules.get(parameterName)
    
    if (!rules) {
      return {
        valid: false,
        errors: [`Unknown parameter: ${parameterName}`],
        warnings: [],
        details: { parameterName, value },
        score: 0
      }
    }

    const errors: string[] = []
    const warnings: string[] = []
    const details: Record<string, any> = {
      parameterName,
      valueLength: typeof value === 'string' ? value.length : 0,
      valueType: typeof value
    }

    let totalRules = rules.length
    let passedRules = 0

    for (const rule of rules) {
      try {
        const isValid = rule.validate(value, context)
        
        details[rule.name] = {
          valid: isValid,
          category: rule.category,
          severity: rule.severity
        }

        if (isValid) {
          passedRules++
        } else {
          const message = rule.message(value)
          
          if (rule.severity === 'error') {
            errors.push(message)
          } else if (rule.severity === 'warning') {
            warnings.push(message)
          }
          // Info level issues don't count as failures
          if (rule.severity === 'info') {
            passedRules++
          }
        }
      } catch (error) {
        errors.push(`Validation rule '${rule.name}' failed: ${(error as Error).message}`)
      }
    }

    const score = Math.round((passedRules / totalRules) * 100)
    const valid = errors.length === 0

    return {
      valid,
      errors,
      warnings,
      details,
      score
    }
  }

  /**
   * Validate complete PKCE parameters
   */
  public validatePKCEParameters(params: PKCEParameters): ValidationResult {
    console.log('🔍 [PKCE-VALIDATOR] Validating complete PKCE parameters...')

    const results = {
      codeVerifier: this.validateParameter('codeVerifier', params.codeVerifier, params),
      codeChallenge: this.validateParameter('codeChallenge', params.codeChallenge, params),
      codeChallengeMethod: this.validateParameter('codeChallengeMethod', params.codeChallengeMethod, params),
      state: this.validateParameter('state', params.state, params)
    }

    const allErrors = Object.values(results).flatMap(r => r.errors)
    const allWarnings = Object.values(results).flatMap(r => r.warnings)
    const averageScore = Object.values(results).reduce((sum, r) => sum + r.score, 0) / 4

    const overallResult: ValidationResult = {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      details: {
        individual: results,
        summary: {
          totalParameters: 4,
          validParameters: Object.values(results).filter(r => r.valid).length,
          totalErrors: allErrors.length,
          totalWarnings: allWarnings.length
        }
      },
      score: Math.round(averageScore)
    }

    // Log results
    console.log(`✅ [PKCE-VALIDATOR] Validation complete - Score: ${overallResult.score}/100`)
    
    if (overallResult.valid) {
      console.log('   🎉 All parameters are valid!')
    } else {
      console.log(`   ❌ ${allErrors.length} error(s) found`)
      allErrors.forEach(error => console.log(`      • ${error}`))
    }

    if (allWarnings.length > 0) {
      console.log(`   ⚠️  ${allWarnings.length} warning(s)`)
      allWarnings.forEach(warning => console.log(`      • ${warning}`))
    }

    return overallResult
  }

  /**
   * Generate optimal PKCE parameters
   */
  public generateOptimalPKCEParameters(): PKCEParameters {
    console.log('🔧 [PKCE-VALIDATOR] Generating optimal PKCE parameters...')

    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    const state = crypto.randomBytes(24).toString('base64url')

    const params: PKCEParameters = {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
      state
    }

    // Validate the generated parameters
    const validation = this.validatePKCEParameters(params)
    
    if (validation.valid) {
      console.log(`✅ [PKCE-VALIDATOR] Generated optimal parameters (Score: ${validation.score}/100)`)
    } else {
      console.log(`⚠️ [PKCE-VALIDATOR] Generated parameters have issues (Score: ${validation.score}/100)`)
    }

    return params
  }

  /**
   * Test parameter compatibility with different OAuth providers
   */
  public testProviderCompatibility(params: PKCEParameters): Record<string, ValidationResult> {
    console.log('🌐 [PKCE-VALIDATOR] Testing provider compatibility...')

    const providers = {
      google: {
        maxCodeVerifierLength: 128,
        requiresS256: true,
        maxStateLength: 255
      },
      github: {
        maxCodeVerifierLength: 128,
        requiresS256: true,
        maxStateLength: 200
      },
      microsoft: {
        maxCodeVerifierLength: 128,
        requiresS256: true,
        maxStateLength: 500
      },
      auth0: {
        maxCodeVerifierLength: 128,
        requiresS256: false,
        maxStateLength: 1000
      }
    }

    const compatibility: Record<string, ValidationResult> = {}

    for (const [providerName, requirements] of Object.entries(providers)) {
      const errors: string[] = []
      const warnings: string[] = []

      // Check code verifier length
      if (params.codeVerifier.length > requirements.maxCodeVerifierLength) {
        errors.push(`Code verifier too long for ${providerName}: ${params.codeVerifier.length} > ${requirements.maxCodeVerifierLength}`)
      }

      // Check challenge method requirement
      if (requirements.requiresS256 && params.codeChallengeMethod !== 'S256') {
        errors.push(`${providerName} requires S256 challenge method`)
      }

      // Check state length
      if (params.state.length > requirements.maxStateLength) {
        warnings.push(`State parameter might be too long for ${providerName}: ${params.state.length} > ${requirements.maxStateLength}`)
      }

      compatibility[providerName] = {
        valid: errors.length === 0,
        errors,
        warnings,
        details: {
          provider: providerName,
          requirements,
          actualLengths: {
            codeVerifier: params.codeVerifier.length,
            state: params.state.length
          }
        },
        score: errors.length === 0 ? (warnings.length === 0 ? 100 : 80) : 0
      }
    }

    // Log compatibility results
    for (const [provider, result] of Object.entries(compatibility)) {
      const status = result.valid ? '✅' : '❌'
      console.log(`   ${status} ${provider}: ${result.score}/100`)
    }

    return compatibility
  }

  /**
   * Analyze parameter security
   */
  public analyzeParameterSecurity(params: PKCEParameters): ValidationResult {
    console.log('🔒 [PKCE-VALIDATOR] Analyzing parameter security...')

    const securityChecks = {
      codeVerifierEntropy: this.calculateEntropy(params.codeVerifier),
      stateEntropy: this.calculateEntropy(params.state),
      usesS256: params.codeChallengeMethod === 'S256',
      challengeMatchesVerifier: this.verifyChallengeMatchesVerifier(params.codeVerifier, params.codeChallenge),
      noPredictablePatterns: !this.hasPredictablePatterns(params.codeVerifier) && !this.hasPredictablePatterns(params.state),
      sufficientLength: params.codeVerifier.length >= 43 && params.state.length >= 16
    }

    const errors: string[] = []
    const warnings: string[] = []

    if (securityChecks.codeVerifierEntropy < 128) {
      warnings.push(`Code verifier entropy is low: ${securityChecks.codeVerifierEntropy.toFixed(1)} bits`)
    }

    if (securityChecks.stateEntropy < 64) {
      warnings.push(`State entropy is low: ${securityChecks.stateEntropy.toFixed(1)} bits`)
    }

    if (!securityChecks.usesS256) {
      errors.push('Using plain challenge method instead of S256 (security risk)')
    }

    if (!securityChecks.challengeMatchesVerifier) {
      errors.push('Code challenge does not match code verifier')
    }

    if (!securityChecks.noPredictablePatterns) {
      warnings.push('Parameters contain predictable patterns')
    }

    if (!securityChecks.sufficientLength) {
      errors.push('Parameters do not meet minimum length requirements')
    }

    const securityScore = Object.values(securityChecks).filter(Boolean).length / Object.keys(securityChecks).length * 100

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      details: {
        securityChecks,
        recommendations: this.getSecurityRecommendations(securityChecks)
      },
      score: Math.round(securityScore)
    }

    console.log(`🔒 [PKCE-VALIDATOR] Security analysis complete - Score: ${result.score}/100`)

    return result
  }

  // Helper methods
  private calculateEntropy(str: string): number {
    const chars = str.split('')
    const charCounts = chars.reduce((acc, char) => {
      acc[char] = (acc[char] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return -Object.values(charCounts).reduce((entropy, count) => {
      const probability = count / str.length
      return entropy + probability * Math.log2(probability)
    }, 0) * str.length
  }

  private hasPredictablePatterns(str: string): boolean {
    const patterns = [
      /(.)\1{2,}/, // Repeated characters
      /123|abc|xyz/i, // Sequential patterns
      /password|test|demo/i, // Common words
      /^[01]*$/, // Only binary digits
      /^[0-9]*$/ // Only numbers
    ]

    return patterns.some(pattern => pattern.test(str))
  }

  private isBase64UrlCompatible(str: string): boolean {
    try {
      // Check if it's valid base64url
      const decoded = Buffer.from(str, 'base64url')
      const reencoded = decoded.toString('base64url')
      return reencoded === str
    } catch {
      return false
    }
  }

  private containsSensitivePatterns(str: string): boolean {
    const sensitivePatterns = [
      /user|admin|pass|token|secret|key/i,
      /\d{4}-\d{4}-\d{4}-\d{4}/, // Credit card pattern
      /\w+@\w+\.\w+/, // Email pattern
      /\d{3}-\d{2}-\d{4}/ // SSN pattern
    ]

    return sensitivePatterns.some(pattern => pattern.test(str))
  }

  private verifyChallengeMatchesVerifier(verifier: string, challenge: string): boolean {
    try {
      const expectedChallenge = crypto.createHash('sha256').update(verifier).digest('base64url')
      return expectedChallenge === challenge
    } catch {
      return false
    }
  }

  private getSecurityRecommendations(checks: any): string[] {
    const recommendations: string[] = []

    if (checks.codeVerifierEntropy < 128) {
      recommendations.push('Use crypto.randomBytes(32) for code verifier generation')
    }

    if (checks.stateEntropy < 64) {
      recommendations.push('Use crypto.randomBytes(16) or larger for state generation')
    }

    if (!checks.usesS256) {
      recommendations.push('Always use S256 challenge method instead of plain')
    }

    if (!checks.noPredictablePatterns) {
      recommendations.push('Ensure parameters are generated with cryptographic randomness')
    }

    return recommendations
  }

  /**
   * Export validation report
   */
  public generateValidationReport(params: PKCEParameters): string {
    const validation = this.validatePKCEParameters(params)
    const security = this.analyzeParameterSecurity(params)
    const compatibility = this.testProviderCompatibility(params)

    const report = {
      timestamp: new Date().toISOString(),
      parameters: {
        codeVerifier: params.codeVerifier.substring(0, 10) + '...',
        codeChallenge: params.codeChallenge.substring(0, 10) + '...',
        codeChallengeMethod: params.codeChallengeMethod,
        state: params.state.substring(0, 10) + '...'
      },
      validation,
      security,
      compatibility,
      summary: {
        overallValid: validation.valid && security.valid,
        validationScore: validation.score,
        securityScore: security.score,
        compatibilityScore: Math.round(Object.values(compatibility).reduce((sum, c) => sum + c.score, 0) / Object.keys(compatibility).length)
      },
      recommendations: [
        ...validation.errors,
        ...security.errors,
        ...Object.values(compatibility).flatMap(c => c.errors)
      ]
    }

    return JSON.stringify(report, null, 2)
  }
}

// Export singleton instance
export const pkceValidator = new PKCEValidator()