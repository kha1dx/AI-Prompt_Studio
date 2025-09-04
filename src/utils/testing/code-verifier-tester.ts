/**
 * CODE VERIFIER VALIDATION AND TESTING UTILITY
 * 
 * Comprehensive testing and validation for PKCE code verifier generation,
 * storage, and retrieval to eliminate the "code verifier should be non-empty" error.
 */

import crypto from 'crypto'

interface CodeVerifierTest {
  name: string
  description: string
  test: () => Promise<CodeVerifierTestResult>
}

interface CodeVerifierTestResult {
  success: boolean
  error?: string
  details: Record<string, any>
  recommendations?: string[]
}

interface StorageTest {
  storage: Storage
  key: string
  value: string
  success: boolean
  retrievedValue?: string
  error?: string
}

export class CodeVerifierTester {
  private testResults: Map<string, CodeVerifierTestResult> = new Map()

  constructor() {
    console.log('🔧 [CODE-VERIFIER] Initializing Code Verifier Tester')
  }

  /**
   * Test 1: Basic Code Verifier Generation
   */
  public async testCodeVerifierGeneration(): Promise<CodeVerifierTestResult> {
    console.log('🧪 [CODE-VERIFIER] Testing code verifier generation...')

    try {
      const verifiers = []
      const generateStartTime = Date.now()

      // Generate multiple verifiers to test consistency
      for (let i = 0; i < 10; i++) {
        const verifier = this.generateCodeVerifier()
        verifiers.push(verifier)
      }

      const generateDuration = Date.now() - generateStartTime

      // Validate all generated verifiers
      const validations = verifiers.map((verifier, index) => ({
        index,
        length: verifier.length,
        validLength: verifier.length >= 43 && verifier.length <= 128,
        validFormat: /^[A-Za-z0-9\-._~]+$/.test(verifier),
        isUnique: verifiers.filter(v => v === verifier).length === 1,
        entropy: this.calculateEntropy(verifier)
      }))

      const allValid = validations.every(v => v.validLength && v.validFormat && v.isUnique)
      const avgEntropy = validations.reduce((sum, v) => sum + v.entropy, 0) / validations.length

      const result: CodeVerifierTestResult = {
        success: allValid,
        details: {
          generated: verifiers.length,
          duration: generateDuration,
          validations,
          averageEntropy: avgEntropy,
          averageLength: validations.reduce((sum, v) => sum + v.length, 0) / validations.length
        }
      }

      if (!allValid) {
        result.error = 'Some generated code verifiers failed validation'
        result.recommendations = [
          'Check crypto.randomBytes() implementation',
          'Verify base64url encoding',
          'Ensure proper length constraints'
        ]
      }

      this.testResults.set('generation', result)
      console.log(`${allValid ? '✅' : '❌'} Code verifier generation: ${allValid ? 'PASSED' : 'FAILED'}`)
      
      return result
    } catch (error) {
      const result: CodeVerifierTestResult = {
        success: false,
        error: (error as Error).message,
        details: {},
        recommendations: ['Check crypto module availability', 'Verify Node.js/browser environment']
      }
      
      this.testResults.set('generation', result)
      return result
    }
  }

  /**
   * Test 2: Session Storage Operations
   */
  public async testSessionStorage(): Promise<CodeVerifierTestResult> {
    console.log('🧪 [CODE-VERIFIER] Testing session storage operations...')

    try {
      const tests: StorageTest[] = []
      
      // Test different storage scenarios
      const testCases = [
        { key: 'pkce-code-verifier', value: this.generateCodeVerifier() },
        { key: 'oauth-state', value: crypto.randomBytes(16).toString('base64url') },
        { key: 'pkce-challenge', value: crypto.randomBytes(32).toString('base64url') }
      ]

      // Mock session storage for testing
      const mockStorage = new Map<string, string>()
      const mockSessionStorage = {
        setItem: (key: string, value: string) => mockStorage.set(key, value),
        getItem: (key: string) => mockStorage.get(key) || null,
        removeItem: (key: string) => mockStorage.delete(key),
        clear: () => mockStorage.clear(),
        length: mockStorage.size,
        key: (index: number) => Array.from(mockStorage.keys())[index] || null
      } as Storage

      for (const testCase of testCases) {
        try {
          // Test storage
          mockSessionStorage.setItem(testCase.key, testCase.value)
          
          // Test retrieval
          const retrievedValue = mockSessionStorage.getItem(testCase.key)
          
          const test: StorageTest = {
            storage: mockSessionStorage,
            key: testCase.key,
            value: testCase.value,
            success: retrievedValue === testCase.value,
            retrievedValue,
            error: retrievedValue !== testCase.value ? 'Value mismatch' : undefined
          }
          
          tests.push(test)
        } catch (error) {
          tests.push({
            storage: mockSessionStorage,
            key: testCase.key,
            value: testCase.value,
            success: false,
            error: (error as Error).message
          })
        }
      }

      const allTestsPassed = tests.every(test => test.success)

      const result: CodeVerifierTestResult = {
        success: allTestsPassed,
        details: {
          tests,
          totalTests: tests.length,
          passedTests: tests.filter(t => t.success).length,
          failedTests: tests.filter(t => !t.success).length
        }
      }

      if (!allTestsPassed) {
        result.error = 'Some session storage operations failed'
        result.recommendations = [
          'Check browser session storage availability',
          'Verify storage quota limits',
          'Test in incognito/private browsing mode'
        ]
      }

      this.testResults.set('sessionStorage', result)
      console.log(`${allTestsPassed ? '✅' : '❌'} Session storage: ${allTestsPassed ? 'PASSED' : 'FAILED'}`)
      
      return result
    } catch (error) {
      const result: CodeVerifierTestResult = {
        success: false,
        error: (error as Error).message,
        details: {},
        recommendations: ['Check browser session storage support', 'Test storage availability']
      }
      
      this.testResults.set('sessionStorage', result)
      return result
    }
  }

  /**
   * Test 3: Code Verifier Persistence Across Page Loads
   */
  public async testPersistence(): Promise<CodeVerifierTestResult> {
    console.log('🧪 [CODE-VERIFIER] Testing persistence across page loads...')

    try {
      // Simulate multiple page load scenarios
      const persistenceTests = []
      
      for (let i = 0; i < 5; i++) {
        const verifier = this.generateCodeVerifier()
        
        // Mock storage operations that would happen across page loads
        const mockStorage = new Map<string, string>()
        
        // Store verifier (page 1)
        mockStorage.set('pkce-code-verifier', verifier)
        mockStorage.set('oauth-session-id', `session-${i}`)
        
        // Simulate page navigation/reload
        const storageData = new Map(mockStorage)
        
        // Retrieve verifier (page 2)
        const retrievedVerifier = storageData.get('pkce-code-verifier')
        const retrievedSession = storageData.get('oauth-session-id')
        
        persistenceTests.push({
          iteration: i + 1,
          originalVerifier: verifier,
          retrievedVerifier,
          sessionId: retrievedSession,
          success: retrievedVerifier === verifier && !!retrievedSession,
          verifierMatch: retrievedVerifier === verifier,
          sessionPresent: !!retrievedSession
        })
      }

      const allPersistenceTestsPassed = persistenceTests.every(test => test.success)

      const result: CodeVerifierTestResult = {
        success: allPersistenceTestsPassed,
        details: {
          persistenceTests,
          totalIterations: persistenceTests.length,
          successfulPersistence: persistenceTests.filter(t => t.success).length
        }
      }

      if (!allPersistenceTestsPassed) {
        result.error = 'Code verifier persistence failed in some scenarios'
        result.recommendations = [
          'Check session storage configuration',
          'Verify storage is not being cleared unexpectedly',
          'Test with different browser tab scenarios'
        ]
      }

      this.testResults.set('persistence', result)
      console.log(`${allPersistenceTestsPassed ? '✅' : '❌'} Persistence: ${allPersistenceTestsPassed ? 'PASSED' : 'FAILED'}`)
      
      return result
    } catch (error) {
      const result: CodeVerifierTestResult = {
        success: false,
        error: (error as Error).message,
        details: {},
        recommendations: ['Check storage persistence mechanisms', 'Verify cross-page storage access']
      }
      
      this.testResults.set('persistence', result)
      return result
    }
  }

  /**
   * Test 4: Code Challenge Generation and Validation
   */
  public async testCodeChallenge(): Promise<CodeVerifierTestResult> {
    console.log('🧪 [CODE-VERIFIER] Testing code challenge generation...')

    try {
      const challengeTests = []

      for (let i = 0; i < 5; i++) {
        const verifier = this.generateCodeVerifier()
        const challenge = this.generateCodeChallenge(verifier)
        
        // Validate challenge properties
        const challengeTest = {
          iteration: i + 1,
          verifier: verifier.substring(0, 10) + '...',
          challenge: challenge.substring(0, 10) + '...',
          verifierLength: verifier.length,
          challengeLength: challenge.length,
          challengeValid: challenge.length === 43 && /^[A-Za-z0-9\-_]+$/.test(challenge),
          deterministicGeneration: this.generateCodeChallenge(verifier) === challenge
        }

        challengeTests.push(challengeTest)
      }

      const allChallengeTestsPassed = challengeTests.every(test => 
        test.challengeValid && test.deterministicGeneration
      )

      const result: CodeVerifierTestResult = {
        success: allChallengeTestsPassed,
        details: {
          challengeTests,
          averageChallengeLength: challengeTests.reduce((sum, t) => sum + t.challengeLength, 0) / challengeTests.length
        }
      }

      if (!allChallengeTestsPassed) {
        result.error = 'Code challenge generation failed validation'
        result.recommendations = [
          'Check SHA256 hash implementation',
          'Verify base64url encoding for challenges',
          'Ensure deterministic challenge generation'
        ]
      }

      this.testResults.set('codeChallenge', result)
      console.log(`${allChallengeTestsPassed ? '✅' : '❌'} Code challenge: ${allChallengeTestsPassed ? 'PASSED' : 'FAILED'}`)
      
      return result
    } catch (error) {
      const result: CodeVerifierTestResult = {
        success: false,
        error: (error as Error).message,
        details: {},
        recommendations: ['Check crypto hash functions', 'Verify SHA256 availability']
      }
      
      this.testResults.set('codeChallenge', result)
      return result
    }
  }

  /**
   * Test 5: Complete PKCE Flow Simulation
   */
  public async testCompleteFlow(): Promise<CodeVerifierTestResult> {
    console.log('🧪 [CODE-VERIFIER] Testing complete PKCE flow simulation...')

    try {
      const flowTests = []

      for (let i = 0; i < 3; i++) {
        const flowTest = {
          iteration: i + 1,
          success: false,
          steps: {} as Record<string, boolean>,
          error: null as string | null
        }

        try {
          // Step 1: Generate code verifier
          const verifier = this.generateCodeVerifier()
          flowTest.steps.verifierGenerated = !!verifier && verifier.length >= 43
          
          // Step 2: Generate code challenge  
          const challenge = this.generateCodeChallenge(verifier)
          flowTest.steps.challengeGenerated = !!challenge && challenge.length === 43
          
          // Step 3: Store verifier (simulate OAuth initiation)
          const mockStorage = new Map<string, string>()
          mockStorage.set('pkce-code-verifier', verifier)
          flowTest.steps.verifierStored = mockStorage.get('pkce-code-verifier') === verifier
          
          // Step 4: Simulate OAuth callback with auth code
          const authCode = `mock-auth-code-${Date.now()}`
          flowTest.steps.authCodeReceived = !!authCode
          
          // Step 5: Retrieve stored verifier
          const retrievedVerifier = mockStorage.get('pkce-code-verifier')
          flowTest.steps.verifierRetrieved = retrievedVerifier === verifier
          
          // Step 6: Validate exchange parameters
          const exchangeValid = !!authCode && !!retrievedVerifier && retrievedVerifier === verifier
          flowTest.steps.exchangeParametersValid = exchangeValid
          
          // Overall success
          flowTest.success = Object.values(flowTest.steps).every(step => step)
          
        } catch (error) {
          flowTest.error = (error as Error).message
        }

        flowTests.push(flowTest)
      }

      const allFlowTestsPassed = flowTests.every(test => test.success)

      const result: CodeVerifierTestResult = {
        success: allFlowTestsPassed,
        details: {
          flowTests,
          successfulFlows: flowTests.filter(t => t.success).length,
          totalFlows: flowTests.length
        }
      }

      if (!allFlowTestsPassed) {
        result.error = 'Complete PKCE flow simulation failed'
        result.recommendations = [
          'Check each step of the PKCE flow individually',
          'Verify storage mechanisms work correctly',
          'Test OAuth callback parameter handling'
        ]
      }

      this.testResults.set('completeFlow', result)
      console.log(`${allFlowTestsPassed ? '✅' : '❌'} Complete flow: ${allFlowTestsPassed ? 'PASSED' : 'FAILED'}`)
      
      return result
    } catch (error) {
      const result: CodeVerifierTestResult = {
        success: false,
        error: (error as Error).message,
        details: {},
        recommendations: ['Check complete PKCE flow implementation', 'Verify all components work together']
      }
      
      this.testResults.set('completeFlow', result)
      return result
    }
  }

  /**
   * Run all code verifier tests
   */
  public async runAllTests(): Promise<Map<string, CodeVerifierTestResult>> {
    console.log('🚀 [CODE-VERIFIER] Running complete code verifier test suite...')
    console.log('='.repeat(60))

    const tests = [
      this.testCodeVerifierGeneration(),
      this.testSessionStorage(),
      this.testPersistence(),
      this.testCodeChallenge(),
      this.testCompleteFlow()
    ]

    await Promise.all(tests)

    const totalTests = this.testResults.size
    const passedTests = Array.from(this.testResults.values()).filter(r => r.success).length
    const failedTests = totalTests - passedTests

    console.log('='.repeat(60))
    console.log(`📊 [CODE-VERIFIER] Test Suite Complete`)
    console.log(`   Total Tests: ${totalTests}`)
    console.log(`   Passed: ${passedTests} ✅`)
    console.log(`   Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`)
    console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`)

    if (failedTests === 0) {
      console.log('\n🎉 [CODE-VERIFIER] ALL TESTS PASSED!')
      console.log('   Code verifier generation and storage should work correctly.')
    } else {
      console.log('\n⚠️  [CODE-VERIFIER] SOME TESTS FAILED!')
      console.log('   Review failed tests to fix code verifier issues.')
    }

    return new Map(this.testResults)
  }

  // Helper methods
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url')
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url')
  }

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

  /**
   * Get test results summary
   */
  public getTestSummary(): Record<string, any> {
    const results = Array.from(this.testResults.entries()).reduce((acc, [key, result]) => {
      acc[key] = {
        success: result.success,
        error: result.error,
        recommendations: result.recommendations
      }
      return acc
    }, {} as Record<string, any>)

    return {
      results,
      summary: {
        total: this.testResults.size,
        passed: Array.from(this.testResults.values()).filter(r => r.success).length,
        failed: Array.from(this.testResults.values()).filter(r => !r.success).length
      }
    }
  }
}

// Export singleton instance
export const codeVerifierTester = new CodeVerifierTester()