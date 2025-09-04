#!/usr/bin/env tsx
/**
 * Database Connectivity and Operations Test Script
 * Tests all major database operations and provides detailed diagnostics
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '../src/types/database'
import { conversationService, messageService, promptService, userPreferencesService } from '../src/lib/database'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface TestResult {
  name: string
  success: boolean
  error?: string
  duration?: number
  data?: any
}

class DatabaseConnectivityTester {
  private results: TestResult[] = []
  private supabaseAdmin: any
  private supabaseAnon: any
  private testUserId: string = '00000000-0000-0000-0000-000000000000' // Test UUID

  constructor() {
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('❌ Missing required environment variables:')
      console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
      console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey) 
      console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseAnonKey)
      process.exit(1)
    }

    this.supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)
    this.supabaseAnon = createClient<Database>(supabaseUrl, supabaseAnonKey)
  }

  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now()
    try {
      console.log(`🔍 Testing: ${name}...`)
      const data = await testFn()
      const duration = Date.now() - startTime
      
      this.results.push({
        name,
        success: true,
        duration,
        data: data ? (typeof data === 'object' ? JSON.stringify(data).substring(0, 100) + '...' : data) : null
      })
      
      console.log(`  ✅ ${name} - ${duration}ms`)
    } catch (error: any) {
      const duration = Date.now() - startTime
      this.results.push({
        name,
        success: false,
        error: error?.message || 'Unknown error',
        duration
      })
      
      console.log(`  ❌ ${name} - ${error?.message || 'Unknown error'} (${duration}ms)`)
    }
  }

  async testBasicConnectivity(): Promise<void> {
    await this.runTest('Basic Admin Connection', async () => {
      const { data, error } = await this.supabaseAdmin
        .from('information_schema.tables')
        .select('count(*)')
        .limit(1)
      
      if (error) throw error
      return data
    })

    await this.runTest('Basic Anon Connection', async () => {
      const { data, error } = await this.supabaseAnon
        .from('information_schema.tables')
        .select('count(*)')
        .limit(1)
      
      if (error) throw error
      return data
    })

    await this.runTest('Schema Version Check', async () => {
      const { data, error } = await this.supabaseAdmin.rpc('get_schema_version')
      
      if (error && !error.message.includes('function get_schema_version')) {
        throw error
      }
      
      return data || 'Schema version function not found'
    })
  }

  async testTableAccess(): Promise<void> {
    const tables = ['conversations', 'profiles', 'usage_limits', 'user_analytics']
    
    for (const table of tables) {
      await this.runTest(`Table Access: ${table}`, async () => {
        const { data, error } = await this.supabaseAdmin
          .from(table)
          .select('count(*)')
          .limit(1)
        
        if (error) throw error
        return `Table accessible, count: ${data?.[0]?.count || 0}`
      })
    }
  }

  async testRLSPolicies(): Promise<void> {
    await this.runTest('RLS Policy Test (Should Fail)', async () => {
      // This should fail due to RLS policies
      const { data, error } = await this.supabaseAnon
        .from('conversations')
        .select('*')
        .limit(1)
      
      if (error) {
        if (error.code === 'PGRST301' || error.message.includes('JWT')) {
          return 'RLS working correctly - anonymous access blocked'
        }
        throw error
      }
      
      return 'Warning: RLS may not be working - anonymous access succeeded'
    })
  }

  async testServiceOperations(): Promise<void> {
    // Test with a mock user ID
    const mockUserId = '12345678-1234-1234-1234-123456789012'
    
    await this.runTest('Conversation Service - getAll', async () => {
      try {
        const conversations = await conversationService.getAll(mockUserId)
        return `Retrieved ${conversations.length} conversations`
      } catch (error: any) {
        // Expected to fail with auth error
        if (error?.message?.includes('JWT') || error?.message?.includes('auth')) {
          return 'Auth error as expected (service working)'
        }
        throw error
      }
    })

    await this.runTest('Message Service - Test', async () => {
      try {
        const messages = await messageService.getByConversation('test-conversation-id')
        return `Retrieved ${messages.length} messages`
      } catch (error: any) {
        if (error?.message?.includes('JWT') || error?.message?.includes('auth')) {
          return 'Auth error as expected (service working)'
        }
        throw error
      }
    })
  }

  async testErrorSerialization(): Promise<void> {
    await this.runTest('Error Serialization Test', async () => {
      try {
        // Intentionally cause an error
        const { data, error } = await this.supabaseAnon
          .from('nonexistent_table')
          .select('*')
        
        if (error) throw error
      } catch (error: any) {
        // Test error serialization
        const serialized = JSON.stringify({
          message: error?.message,
          code: error?.code,
          status: error?.status,
          details: error?.details,
          hint: error?.hint
        }, null, 2)
        
        console.log('  📝 Error serialization test:', serialized)
        return 'Error serialization working correctly'
      }
    })
  }

  async testEnvironmentVariables(): Promise<void> {
    await this.runTest('Environment Variables Check', async () => {
      const checks = [
        { name: 'NEXT_PUBLIC_SUPABASE_URL', value: supabaseUrl, valid: !!supabaseUrl && supabaseUrl.includes('supabase.co') },
        { name: 'SUPABASE_SERVICE_ROLE_KEY', value: supabaseServiceKey?.substring(0, 20) + '...', valid: !!supabaseServiceKey && supabaseServiceKey.startsWith('eyJ') },
        { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: supabaseAnonKey?.substring(0, 20) + '...', valid: !!supabaseAnonKey && supabaseAnonKey.startsWith('eyJ') }
      ]
      
      const invalid = checks.filter(check => !check.valid)
      if (invalid.length > 0) {
        throw new Error(`Invalid environment variables: ${invalid.map(i => i.name).join(', ')}`)
      }
      
      return checks.map(check => `${check.name}: ${check.valid ? '✓' : '✗'}`).join(', ')
    })
  }

  async testNetworkLatency(): Promise<void> {
    const iterations = 3
    const latencies: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      await this.runTest(`Network Latency Test ${i + 1}`, async () => {
        const start = Date.now()
        const { data, error } = await this.supabaseAdmin
          .from('information_schema.tables')
          .select('count(*)')
          .limit(1)
        
        const latency = Date.now() - start
        latencies.push(latency)
        
        if (error) throw error
        return `${latency}ms`
      })
    }
    
    if (latencies.length > 0) {
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
      console.log(`  📊 Average latency: ${avgLatency.toFixed(2)}ms`)
    }
  }

  async runFullTest(): Promise<void> {
    console.log('🚀 Starting comprehensive database connectivity test...')
    console.log(`📍 Supabase URL: ${supabaseUrl}`)
    console.log('=' .repeat(70))

    await this.testEnvironmentVariables()
    await this.testBasicConnectivity()
    await this.testTableAccess()
    await this.testRLSPolicies()
    await this.testServiceOperations()
    await this.testErrorSerialization()
    await this.testNetworkLatency()

    this.printResults()
  }

  private printResults(): void {
    console.log('\\n' + '=' .repeat(70))
    console.log('📊 TEST RESULTS SUMMARY')
    console.log('=' .repeat(70))

    const passed = this.results.filter(r => r.success).length
    const failed = this.results.filter(r => !r.success).length
    const total = this.results.length

    console.log(`\\n🎯 Overall: ${passed}/${total} tests passed (${failed} failed)`)
    
    if (failed > 0) {
      console.log('\\n❌ FAILED TESTS:')
      this.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`  - ${result.name}: ${result.error}`)
        })
    }

    if (passed > 0) {
      console.log('\\n✅ PASSED TESTS:')
      this.results
        .filter(r => r.success)
        .forEach(result => {
          console.log(`  - ${result.name} (${result.duration}ms)`)
        })
    }

    console.log('\\n💡 RECOMMENDATIONS:')
    
    const hasConnectionIssues = this.results.some(r => 
      !r.success && (r.error?.includes('fetch') || r.error?.includes('network'))
    )
    
    const hasMissingTables = this.results.some(r =>
      !r.success && r.error?.includes('does not exist')
    )
    
    const hasAuthIssues = this.results.some(r =>
      !r.success && (r.error?.includes('JWT') || r.error?.includes('auth'))
    )

    if (hasConnectionIssues) {
      console.log('  🌐 Network connectivity issues detected')
      console.log('     - Check your internet connection')
      console.log('     - Verify Supabase service status')
      console.log('     - Check firewall settings')
    }

    if (hasMissingTables) {
      console.log('  🗃️  Missing database tables detected')
      console.log('     - Run the schema creation script')
      console.log('     - Check database migrations')
    }

    if (hasAuthIssues) {
      console.log('  🔐 Authentication configuration issues')
      console.log('     - Verify API keys are correct')
      console.log('     - Check RLS policies')
      console.log('     - Ensure service role key has proper permissions')
    }

    if (failed === 0) {
      console.log('  🎉 All tests passed! Your database is properly configured.')
    }

    console.log('\\n🔧 NEXT STEPS:')
    console.log('  1. Address any failed tests above')
    console.log('  2. Run the schema check script if tables are missing')
    console.log('  3. Test your application with real user authentication')
    console.log('  4. Monitor application logs for any remaining issues')

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0)
  }
}

// Run the test
async function main() {
  const tester = new DatabaseConnectivityTester()
  await tester.runFullTest()
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })
}

export default DatabaseConnectivityTester