/**
 * COMPREHENSIVE OAUTH PKCE TEST RUNNER AND REPORTING SYSTEM
 * 
 * Master test runner that orchestrates all OAuth PKCE tests and provides
 * comprehensive reporting to eliminate the "code verifier should be non-empty" error.
 */

import { PKCEFlowTester } from './pkce-flow-tester'
import { codeVerifierTester } from '../src/utils/testing/code-verifier-tester'
import { errorScenarioTester } from './error-scenario-tester'
import { e2eOAuthTester } from './e2e-oauth-tester'
import { pkceValidator } from './pkce-validator'
import { oauthStateManager } from './oauth-state-manager'
import { sessionStorageInspector } from './session-storage-inspector'
import { oauthDebugger } from '../src/utils/testing/oauth-debugger'

interface TestSuiteResult {
  name: string
  success: boolean
  duration: number
  score: number
  errors: string[]
  warnings: string[]
  recommendations: string[]
  details: Record<string, any>
}

interface ComprehensiveTestReport {
  timestamp: string
  overallSuccess: boolean
  overallScore: number
  totalDuration: number
  suiteResults: TestSuiteResult[]
  criticalIssues: string[]
  recommendations: string[]
  summary: {
    totalSuites: number
    passedSuites: number
    failedSuites: number
    criticalFailures: number
    totalErrors: number
    totalWarnings: number
  }
  healthScore: {
    parameterGeneration: number
    storageManagement: number
    errorHandling: number
    stateManagement: number
    endToEndFlow: number
    security: number
  }
  nextSteps: string[]
}

export class MasterTestRunner {
  private report: ComprehensiveTestReport | null = null

  constructor() {
    console.log('🎯 [MASTER-RUNNER] Comprehensive OAuth PKCE Test Runner initialized')
  }

  /**
   * Run all OAuth PKCE tests
   */
  public async runCompleteTestSuite(): Promise<ComprehensiveTestReport> {
    console.log('🚀 [MASTER-RUNNER] Starting COMPREHENSIVE OAuth PKCE Test Suite')
    console.log('='.repeat(80))
    console.log('This test suite will eliminate the "code verifier should be non-empty" error')
    console.log('by testing every aspect of the OAuth PKCE flow.')
    console.log('='.repeat(80))

    const startTime = Date.now()
    const suiteResults: TestSuiteResult[] = []

    // Initialize report
    this.report = {
      timestamp: new Date().toISOString(),
      overallSuccess: false,
      overallScore: 0,
      totalDuration: 0,
      suiteResults: [],
      criticalIssues: [],
      recommendations: [],
      summary: {
        totalSuites: 0,
        passedSuites: 0,
        failedSuites: 0,
        criticalFailures: 0,
        totalErrors: 0,
        totalWarnings: 0
      },
      healthScore: {
        parameterGeneration: 0,
        storageManagement: 0,
        errorHandling: 0,
        stateManagement: 0,
        endToEndFlow: 0,
        security: 0
      },
      nextSteps: []
    }

    // Start comprehensive monitoring
    sessionStorageInspector.startMonitoring()
    oauthDebugger.startSession('master-test-suite')

    try {
      // Test Suite 1: PKCE Flow Testing
      console.log('\n🔬 [MASTER-RUNNER] Suite 1: PKCE Flow Testing')
      console.log('-'.repeat(50))
      
      const pkceFlowResult = await this.runPKCEFlowTests()
      suiteResults.push(pkceFlowResult)

      // Test Suite 2: Code Verifier Testing  
      console.log('\n🔧 [MASTER-RUNNER] Suite 2: Code Verifier Testing')
      console.log('-'.repeat(50))
      
      const codeVerifierResult = await this.runCodeVerifierTests()
      suiteResults.push(codeVerifierResult)

      // Test Suite 3: Error Scenario Testing
      console.log('\n🔥 [MASTER-RUNNER] Suite 3: Error Scenario Testing')
      console.log('-'.repeat(50))
      
      const errorScenarioResult = await this.runErrorScenarioTests()
      suiteResults.push(errorScenarioResult)

      // Test Suite 4: State Management Testing
      console.log('\n⚡ [MASTER-RUNNER] Suite 4: State Management Testing')
      console.log('-'.repeat(50))
      
      const stateManagementResult = await this.runStateManagementTests()
      suiteResults.push(stateManagementResult)

      // Test Suite 5: End-to-End Flow Testing
      console.log('\n🎯 [MASTER-RUNNER] Suite 5: End-to-End Flow Testing')
      console.log('-'.repeat(50))
      
      const e2eResult = await this.runEndToEndTests()
      suiteResults.push(e2eResult)

      // Test Suite 6: Security Validation
      console.log('\n🔒 [MASTER-RUNNER] Suite 6: Security Validation')
      console.log('-'.repeat(50))
      
      const securityResult = await this.runSecurityValidation()
      suiteResults.push(securityResult)

      // Test Suite 7: Storage Inspection
      console.log('\n💾 [MASTER-RUNNER] Suite 7: Storage Inspection')
      console.log('-'.repeat(50))
      
      const storageResult = await this.runStorageInspection()
      suiteResults.push(storageResult)

    } catch (error) {
      console.error('❌ [MASTER-RUNNER] Test suite execution error:', error)
      this.report.criticalIssues.push(`Test execution failed: ${(error as Error).message}`)
    } finally {
      // Stop monitoring
      sessionStorageInspector.stopMonitoring()
    }

    // Finalize report
    this.report.totalDuration = Date.now() - startTime
    this.report.suiteResults = suiteResults
    this.finalizeReport()

    // Print comprehensive report
    this.printComprehensiveReport()

    return this.report
  }

  // Individual test suite runners
  private async runPKCEFlowTests(): Promise<TestSuiteResult> {
    const startTime = Date.now()
    const pkceFlowTester = new PKCEFlowTester()

    try {
      const results = await pkceFlowTester.runCompleteSuite()
      
      return {
        name: 'PKCE Flow Testing',
        success: results.overallSuccess,
        duration: Date.now() - startTime,
        score: Math.round((results.summary.passed / results.summary.total) * 100),
        errors: results.results.filter(r => !r.success).map(r => r.testName),
        warnings: [],
        recommendations: results.overallSuccess 
          ? ['PKCE flow configuration is excellent']
          : ['Fix PKCE parameter generation', 'Verify code challenge creation'],
        details: {
          totalTests: results.summary.total,
          passedTests: results.summary.passed,
          failedTests: results.summary.failed
        }
      }
    } catch (error) {
      return {
        name: 'PKCE Flow Testing',
        success: false,
        duration: Date.now() - startTime,
        score: 0,
        errors: [(error as Error).message],
        warnings: [],
        recommendations: ['Fix PKCE flow tester implementation'],
        details: { testError: true }
      }
    }
  }

  private async runCodeVerifierTests(): Promise<TestSuiteResult> {
    const startTime = Date.now()

    try {
      const results = await codeVerifierTester.runAllTests()
      const passedTests = Array.from(results.values()).filter(r => r.success).length
      const totalTests = results.size
      
      return {
        name: 'Code Verifier Testing',
        success: passedTests === totalTests,
        duration: Date.now() - startTime,
        score: Math.round((passedTests / totalTests) * 100),
        errors: Array.from(results.entries())
          .filter(([_, r]) => !r.success)
          .map(([name, r]) => `${name}: ${r.error || 'Failed'}`),
        warnings: [],
        recommendations: passedTests === totalTests
          ? ['Code verifier generation is working perfectly']
          : ['Fix code verifier generation', 'Check storage mechanisms'],
        details: {
          totalTests,
          passedTests,
          failedTests: totalTests - passedTests,
          testResults: Object.fromEntries(results)
        }
      }
    } catch (error) {
      return {
        name: 'Code Verifier Testing',
        success: false,
        duration: Date.now() - startTime,
        score: 0,
        errors: [(error as Error).message],
        warnings: [],
        recommendations: ['Fix code verifier tester implementation'],
        details: { testError: true }
      }
    }
  }

  private async runErrorScenarioTests(): Promise<TestSuiteResult> {
    const startTime = Date.now()

    try {
      const results = await errorScenarioTester.runErrorScenarioTests()
      
      return {
        name: 'Error Scenario Testing',
        success: results.criticalErrors === 0,
        duration: Date.now() - startTime,
        score: results.overallHealth === 'excellent' ? 100 : 
               results.overallHealth === 'good' ? 80 :
               results.overallHealth === 'needs-improvement' ? 60 : 20,
        errors: results.criticalErrors > 0 ? [`${results.criticalErrors} critical error scenarios failed`] : [],
        warnings: results.highPriorityErrors > 0 ? [`${results.highPriorityErrors} high priority errors`] : [],
        recommendations: results.overallHealth === 'excellent'
          ? ['Error handling is excellent']
          : ['Improve error detection and recovery', 'Add better user error messages'],
        details: {
          totalScenarios: results.totalScenarios,
          executedScenarios: results.executedScenarios,
          criticalErrors: results.criticalErrors,
          overallHealth: results.overallHealth
        }
      }
    } catch (error) {
      return {
        name: 'Error Scenario Testing',
        success: false,
        duration: Date.now() - startTime,
        score: 0,
        errors: [(error as Error).message],
        warnings: [],
        recommendations: ['Fix error scenario tester implementation'],
        details: { testError: true }
      }
    }
  }

  private async runStateManagementTests(): Promise<TestSuiteResult> {
    const startTime = Date.now()

    try {
      const results = await oauthStateManager.runCompleteTestSuite()
      const passedTests = Array.from(results.values()).filter(r => r.success).length
      const totalTests = results.size
      
      return {
        name: 'State Management Testing',
        success: passedTests === totalTests,
        duration: Date.now() - startTime,
        score: Math.round((passedTests / totalTests) * 100),
        errors: Array.from(results.entries())
          .filter(([_, r]) => !r.success)
          .map(([name, r]) => `${name}: ${r.errors.join(', ')}`),
        warnings: [],
        recommendations: passedTests === totalTests
          ? ['State management is working correctly']
          : ['Fix state transitions', 'Improve session handling'],
        details: {
          totalTests,
          passedTests,
          failedTests: totalTests - passedTests,
          testResults: Object.fromEntries(results)
        }
      }
    } catch (error) {
      return {
        name: 'State Management Testing',
        success: false,
        duration: Date.now() - startTime,
        score: 0,
        errors: [(error as Error).message],
        warnings: [],
        recommendations: ['Fix state management tester implementation'],
        details: { testError: true }
      }
    }
  }

  private async runEndToEndTests(): Promise<TestSuiteResult> {
    const startTime = Date.now()

    try {
      const results = await e2eOAuthTester.runCompleteE2ETest()
      
      return {
        name: 'End-to-End Flow Testing',
        success: results.overallSuccess,
        duration: Date.now() - startTime,
        score: results.overallSuccess ? 100 : Math.round((1 - results.criticalFailures / results.steps.size) * 100),
        errors: results.criticalFailures > 0 ? [`${results.criticalFailures} critical step failures`] : [],
        warnings: results.totalWarnings > 0 ? [`${results.totalWarnings} warnings`] : [],
        recommendations: results.overallSuccess
          ? ['Complete OAuth flow is working perfectly']
          : ['Fix critical flow steps', 'Review parameter handling'],
        details: {
          totalSteps: results.steps.size,
          criticalFailures: results.criticalFailures,
          totalWarnings: results.totalWarnings,
          performanceMetrics: results.performanceMetrics
        }
      }
    } catch (error) {
      return {
        name: 'End-to-End Flow Testing',
        success: false,
        duration: Date.now() - startTime,
        score: 0,
        errors: [(error as Error).message],
        warnings: [],
        recommendations: ['Fix end-to-end tester implementation'],
        details: { testError: true }
      }
    }
  }

  private async runSecurityValidation(): Promise<TestSuiteResult> {
    const startTime = Date.now()

    try {
      const params = pkceValidator.generateOptimalPKCEParameters()
      const validation = pkceValidator.validatePKCEParameters(params)
      const security = pkceValidator.analyzeParameterSecurity(params)
      
      return {
        name: 'Security Validation',
        success: validation.valid && security.valid,
        duration: Date.now() - startTime,
        score: Math.round((validation.score + security.score) / 2),
        errors: [...validation.errors, ...security.errors],
        warnings: [...validation.warnings, ...security.warnings],
        recommendations: validation.valid && security.valid
          ? ['Security validation passed']
          : ['Improve parameter security', 'Fix validation issues'],
        details: {
          validationScore: validation.score,
          securityScore: security.score,
          totalErrors: validation.errors.length + security.errors.length,
          totalWarnings: validation.warnings.length + security.warnings.length
        }
      }
    } catch (error) {
      return {
        name: 'Security Validation',
        success: false,
        duration: Date.now() - startTime,
        score: 0,
        errors: [(error as Error).message],
        warnings: [],
        recommendations: ['Fix security validator implementation'],
        details: { testError: true }
      }
    }
  }

  private async runStorageInspection(): Promise<TestSuiteResult> {
    const startTime = Date.now()

    try {
      const health = await sessionStorageInspector.checkStorageHealth()
      const pkceReport = sessionStorageInspector.inspectPKCEStorage()
      
      return {
        name: 'Storage Inspection',
        success: health.available && health.keysWorking && health.persistenceWorking,
        duration: Date.now() - startTime,
        score: health.issues.length === 0 ? 100 : Math.max(0, 100 - (health.issues.length * 20)),
        errors: health.issues,
        warnings: health.quotaExceeded ? ['Storage quota concerns'] : [],
        recommendations: health.recommendations,
        details: {
          storageHealth: health,
          pkceAnalysis: pkceReport.analysis,
          issues: pkceReport.issues
        }
      }
    } catch (error) {
      return {
        name: 'Storage Inspection',
        success: false,
        duration: Date.now() - startTime,
        score: 0,
        errors: [(error as Error).message],
        warnings: [],
        recommendations: ['Fix storage inspector implementation'],
        details: { testError: true }
      }
    }
  }

  // Report finalization and analysis
  private finalizeReport(): void {
    if (!this.report) return

    const { suiteResults } = this.report

    // Calculate summary statistics
    this.report.summary.totalSuites = suiteResults.length
    this.report.summary.passedSuites = suiteResults.filter(r => r.success).length
    this.report.summary.failedSuites = suiteResults.length - this.report.summary.passedSuites
    this.report.summary.criticalFailures = suiteResults.filter(r => !r.success && r.score < 50).length
    this.report.summary.totalErrors = suiteResults.reduce((sum, r) => sum + r.errors.length, 0)
    this.report.summary.totalWarnings = suiteResults.reduce((sum, r) => sum + r.warnings.length, 0)

    // Calculate overall success and score
    this.report.overallSuccess = this.report.summary.failedSuites === 0 && this.report.summary.criticalFailures === 0
    this.report.overallScore = Math.round(suiteResults.reduce((sum, r) => sum + r.score, 0) / suiteResults.length)

    // Calculate health scores
    const suiteMap = new Map(suiteResults.map(r => [r.name, r.score]))
    this.report.healthScore = {
      parameterGeneration: suiteMap.get('PKCE Flow Testing') || 0,
      storageManagement: suiteMap.get('Storage Inspection') || 0,
      errorHandling: suiteMap.get('Error Scenario Testing') || 0,
      stateManagement: suiteMap.get('State Management Testing') || 0,
      endToEndFlow: suiteMap.get('End-to-End Flow Testing') || 0,
      security: suiteMap.get('Security Validation') || 0
    }

    // Identify critical issues
    this.report.criticalIssues = suiteResults
      .filter(r => !r.success)
      .flatMap(r => r.errors)
      .filter(error => error.toLowerCase().includes('critical') || error.toLowerCase().includes('verifier'))

    // Generate recommendations
    this.report.recommendations = this.generateMasterRecommendations()

    // Generate next steps
    this.report.nextSteps = this.generateNextSteps()
  }

  private generateMasterRecommendations(): string[] {
    if (!this.report) return []

    const recommendations: string[] = []
    
    if (this.report.overallSuccess) {
      recommendations.push('🎉 Excellent! Your OAuth PKCE implementation is working correctly.')
      recommendations.push('✅ The "code verifier should be non-empty" error should be eliminated.')
      recommendations.push('🔄 Continue monitoring the OAuth flow in production.')
    } else {
      if (this.report.summary.criticalFailures > 0) {
        recommendations.push('🚨 CRITICAL: Fix critical failures immediately to prevent OAuth errors.')
      }
      
      const failedSuites = this.report.suiteResults.filter(r => !r.success)
      
      if (failedSuites.some(s => s.name.includes('Code Verifier'))) {
        recommendations.push('🔧 Fix code verifier generation and storage - this is likely the root cause of your OAuth error.')
      }
      
      if (failedSuites.some(s => s.name.includes('Storage'))) {
        recommendations.push('💾 Fix session storage issues to ensure PKCE parameters persist correctly.')
      }
      
      if (failedSuites.some(s => s.name.includes('End-to-End'))) {
        recommendations.push('🎯 Fix end-to-end flow issues to ensure complete OAuth functionality.')
      }
    }

    return recommendations
  }

  private generateNextSteps(): string[] {
    if (!this.report) return []

    const steps: string[] = []

    if (this.report.overallSuccess) {
      steps.push('1. Deploy the current OAuth implementation with confidence')
      steps.push('2. Monitor OAuth success rates in production')
      steps.push('3. Set up alerting for OAuth failures')
      steps.push('4. Consider implementing additional OAuth providers')
    } else {
      steps.push('1. Review and fix all failed test suites above')
      steps.push('2. Focus on critical failures first')
      steps.push('3. Re-run the test suite after fixes')
      steps.push('4. Test OAuth flow manually in browser')
      steps.push('5. Monitor browser console for PKCE errors')
      steps.push('6. Check Supabase dashboard for OAuth configuration')
    }

    return steps
  }

  // Comprehensive reporting
  private printComprehensiveReport(): void {
    if (!this.report) return

    console.log('\n' + '='.repeat(80))
    console.log('📊 COMPREHENSIVE OAUTH PKCE TEST REPORT')
    console.log('='.repeat(80))

    console.log(`🕐 Timestamp: ${this.report.timestamp}`)
    console.log(`⏱️  Total Duration: ${Math.round(this.report.totalDuration / 1000)}s`)
    console.log(`📊 Overall Score: ${this.report.overallScore}/100`)
    console.log(`✅ Overall Success: ${this.report.overallSuccess ? 'YES' : 'NO'}`)

    console.log('\n📋 SUITE SUMMARY:')
    console.log(`   Total Suites: ${this.report.summary.totalSuites}`)
    console.log(`   Passed: ${this.report.summary.passedSuites} ✅`)
    console.log(`   Failed: ${this.report.summary.failedSuites} ${this.report.summary.failedSuites > 0 ? '❌' : '✅'}`)
    console.log(`   Critical Failures: ${this.report.summary.criticalFailures} ${this.report.summary.criticalFailures > 0 ? '🚨' : '✅'}`)
    console.log(`   Total Errors: ${this.report.summary.totalErrors}`)
    console.log(`   Total Warnings: ${this.report.summary.totalWarnings}`)

    console.log('\n🎯 HEALTH SCORES:')
    Object.entries(this.report.healthScore).forEach(([area, score]) => {
      const emoji = score >= 90 ? '🟢' : score >= 70 ? '🟡' : '🔴'
      const areaName = area.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
      console.log(`   ${emoji} ${areaName}: ${score}/100`)
    })

    console.log('\n📝 DETAILED RESULTS:')
    this.report.suiteResults.forEach(suite => {
      const status = suite.success ? '✅' : '❌'
      console.log(`   ${status} ${suite.name}: ${suite.score}/100 (${suite.duration}ms)`)
      
      if (suite.errors.length > 0) {
        suite.errors.forEach(error => console.log(`      🚫 ${error}`))
      }
      
      if (suite.warnings.length > 0) {
        suite.warnings.forEach(warning => console.log(`      ⚠️  ${warning}`))
      }
    })

    if (this.report.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:')
      this.report.criticalIssues.forEach(issue => console.log(`   • ${issue}`))
    }

    console.log('\n🎯 RECOMMENDATIONS:')
    this.report.recommendations.forEach(rec => console.log(`   ${rec}`))

    console.log('\n🚀 NEXT STEPS:')
    this.report.nextSteps.forEach(step => console.log(`   ${step}`))

    if (this.report.overallSuccess) {
      console.log('\n🎉 CONGRATULATIONS!')
      console.log('   Your OAuth PKCE implementation passed all tests!')
      console.log('   The "code verifier should be non-empty" error should be eliminated.')
      console.log('   You can deploy with confidence.')
    } else {
      console.log('\n⚠️  ACTION REQUIRED!')
      console.log('   Please fix the failing tests above to ensure OAuth works correctly.')
      console.log('   Focus on critical failures to eliminate the code verifier error.')
    }

    console.log('='.repeat(80))
  }

  /**
   * Export comprehensive report
   */
  public exportReport(): string {
    if (!this.report) {
      return JSON.stringify({ error: 'No test report available' }, null, 2)
    }

    return JSON.stringify(this.report, null, 2)
  }

  /**
   * Get current test report
   */
  public getReport(): ComprehensiveTestReport | null {
    return this.report
  }
}

// Export singleton instance
export const masterTestRunner = new MasterTestRunner()

// CLI execution support
if (require.main === module) {
  masterTestRunner.runCompleteTestSuite()
    .then(report => {
      console.log('\n📄 Test report saved to memory. Call exportReport() to get JSON.')
      process.exit(report.overallSuccess ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Test suite execution failed:', error)
      process.exit(1)
    })
}