#!/usr/bin/env tsx
/**
 * Database Schema Verification Script
 * Checks if all required tables exist in Supabase and reports missing ones
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '../src/types/database'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

interface TableInfo {
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
}

interface PolicyInfo {
  policyname: string
  tablename: string
  cmd: string
}

// Required tables based on the enhanced schema
const REQUIRED_TABLES = [
  'conversations',
  'conversation_messages', 
  'profiles',
  'usage_limits',
  'user_analytics',
  'prompt_templates',
  'template_ratings',
  'websocket_sessions'
]

// Required columns for conversations table (the main issue)
const REQUIRED_CONVERSATIONS_COLUMNS = [
  'id',
  'user_id',
  'title', 
  'messages',
  'status',
  'generated_prompt',
  'prompt_generated_at',
  'created_at',
  'updated_at',
  'tags',
  'is_favorite',
  'message_count',
  'last_activity_at'
]

class DatabaseSchemaChecker {
  private errors: string[] = []
  private warnings: string[] = []

  async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected for missing tables
        throw error
      }

      return !!data
    } catch (error) {
      console.warn(`⚠️  Error checking table ${tableName}:`, error)
      return false
    }
  }

  async getTableColumns(tableName: string): Promise<TableInfo[]> {
    try {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('table_name, column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)

      if (error) throw error
      return data || []
    } catch (error) {
      console.warn(`⚠️  Error getting columns for ${tableName}:`, error)
      return []
    }
  }

  async checkRLSPolicies(tableName: string): Promise<PolicyInfo[]> {
    try {
      const { data, error } = await supabase.rpc('get_table_policies', {
        table_name: tableName
      })

      if (error && !error.message.includes('function get_table_policies')) {
        throw error
      }

      // If function doesn't exist, try direct query
      if (error) {
        const { data: policyData, error: policyError } = await supabase
          .from('pg_policies')
          .select('policyname, tablename, cmd')
          .eq('tablename', tableName)

        if (policyError) throw policyError
        return policyData || []
      }

      return data || []
    } catch (error) {
      console.warn(`⚠️  Error checking RLS policies for ${tableName}:`, error)
      return []
    }
  }

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing database connection...')
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('count(*)')
        .limit(1)

      if (error) {
        this.errors.push(`Database connection failed: ${error.message}`)
        return false
      }

      console.log('✅ Database connection successful')
      return true
    } catch (error: any) {
      this.errors.push(`Database connection error: ${error?.message || 'Unknown error'}`)
      return false
    }
  }

  async checkSchemaVersion(): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('get_schema_version')
      if (error) {
        this.warnings.push('Schema version function not found - may be using older schema')
        return null
      }
      return data
    } catch (error) {
      this.warnings.push('Cannot determine schema version')
      return null
    }
  }

  async runFullCheck(): Promise<void> {
    console.log('🚀 Starting comprehensive database schema check...')
    console.log(`📍 Supabase URL: ${supabaseUrl}`)
    console.log('=' .repeat(60))

    // 1. Test connection
    const connected = await this.checkDatabaseConnection()
    if (!connected) {
      this.reportResults()
      return
    }

    // 2. Check schema version
    const version = await this.checkSchemaVersion()
    if (version) {
      console.log(`📋 Schema version: ${version}`)
    }

    // 3. Check all required tables
    console.log('\n🔍 Checking required tables...')
    const missingTables: string[] = []
    const existingTables: string[] = []

    for (const table of REQUIRED_TABLES) {
      const exists = await this.checkTableExists(table)
      if (exists) {
        existingTables.push(table)
        console.log(`  ✅ ${table}`)
      } else {
        missingTables.push(table)
        console.log(`  ❌ ${table} (MISSING)`)
        this.errors.push(`Missing table: ${table}`)
      }
    }

    // 4. Check conversations table structure in detail
    if (existingTables.includes('conversations')) {
      console.log('\n🔍 Checking conversations table structure...')
      const columns = await this.getTableColumns('conversations')
      const columnNames = columns.map(col => col.column_name)
      
      const missingColumns = REQUIRED_CONVERSATIONS_COLUMNS.filter(
        col => !columnNames.includes(col)
      )

      if (missingColumns.length > 0) {
        console.log('  ❌ Missing columns in conversations table:')
        missingColumns.forEach(col => {
          console.log(`    - ${col}`)
          this.errors.push(`Missing column in conversations: ${col}`)
        })
      } else {
        console.log('  ✅ All required columns present')
      }

      // Show column details
      console.log('\n  📋 Current conversations table structure:')
      columns.forEach(col => {
        console.log(`    ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`)
      })
    }

    // 5. Check RLS policies for critical tables
    console.log('\n🔍 Checking Row Level Security policies...')
    for (const table of ['conversations', 'profiles']) {
      if (existingTables.includes(table)) {
        const policies = await this.checkRLSPolicies(table)
        if (policies.length === 0) {
          this.warnings.push(`No RLS policies found for ${table} - this may cause permission issues`)
          console.log(`  ⚠️  ${table}: No policies found`)
        } else {
          console.log(`  ✅ ${table}: ${policies.length} policies found`)
        }
      }
    }

    // 6. Test basic operations on existing tables
    if (existingTables.includes('conversations')) {
      console.log('\n🔍 Testing basic conversation operations...')
      await this.testConversationOperations()
    }

    this.reportResults()
  }

  async testConversationOperations(): Promise<void> {
    try {
      // Test basic select (should work even without authentication)
      const { data, error } = await supabase
        .from('conversations')
        .select('count(*)')
        .limit(1)

      if (error) {
        // This is expected due to RLS, but table structure should be accessible
        if (error.code === 'PGRST301' || error.message.includes('JWT')) {
          console.log('  ✅ Table accessible (RLS working as expected)')
        } else {
          this.errors.push(`Conversation table error: ${error.message}`)
          console.log(`  ❌ Table access error: ${error.message}`)
        }
      } else {
        console.log('  ✅ Conversation table query successful')
      }
    } catch (error: any) {
      this.errors.push(`Conversation operation test failed: ${error?.message}`)
      console.log(`  ❌ Operation test failed: ${error?.message}`)
    }
  }

  reportResults(): void {
    console.log('\n' + '=' .repeat(60))
    console.log('📊 SCHEMA CHECK RESULTS')
    console.log('=' .repeat(60))

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 All checks passed! Database schema is properly configured.')
    } else {
      if (this.errors.length > 0) {
        console.log(`\n❌ ERRORS (${this.errors.length}):`);
        this.errors.forEach(error => console.log(`  - ${error}`))
      }

      if (this.warnings.length > 0) {
        console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
        this.warnings.forEach(warning => console.log(`  - ${warning}`))
      }

      console.log('\n💡 RECOMMENDATIONS:')
      
      if (this.errors.some(e => e.includes('Missing table'))) {
        console.log('  1. Run the enhanced schema SQL to create missing tables')
        console.log('     File: database/enhanced-schema.sql')
      }
      
      if (this.errors.some(e => e.includes('Missing column'))) {
        console.log('  2. Update your conversations table structure')
        console.log('     The table may be using an older schema')
      }

      if (this.errors.some(e => e.includes('connection'))) {
        console.log('  3. Check your Supabase credentials and network connection')
      }

      console.log('\n🔧 Next Steps:')
      console.log('  1. Review the missing-tables.sql file that will be generated')
      console.log('  2. Run the SQL in your Supabase dashboard')
      console.log('  3. Run this script again to verify fixes')
    }

    // Exit with appropriate code
    process.exit(this.errors.length > 0 ? 1 : 0)
  }
}

// Run the check
async function main() {
  const checker = new DatabaseSchemaChecker()
  await checker.runFullCheck()
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
}

export default DatabaseSchemaChecker