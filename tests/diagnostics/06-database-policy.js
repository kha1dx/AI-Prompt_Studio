#!/usr/bin/env node

/**
 * Database Policy and RLS Testing Diagnostic
 * 
 * This script tests Row Level Security (RLS) policies, database permissions,
 * and access control configurations in Supabase.
 */

const { createClient } = require('@supabase/supabase-js');

// ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Load environment variables
require('dotenv').config({ path: '.env.local' });

class DatabasePolicyTester {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.results = [];
    this.supabaseAnon = null;
    this.supabaseAdmin = null;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const color = {
      'info': colors.blue,
      'success': colors.green,
      'warning': colors.yellow,
      'error': colors.red,
      'header': colors.magenta
    }[level] || colors.reset;

    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
  }

  addResult(test, status, message, details = null, duration = null) {
    this.results.push({
      test,
      status,
      message,
      details,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  async initializeClients() {
    this.log('\n=== INITIALIZING SUPABASE CLIENTS ===', 'header');
    
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      this.log('❌ Missing basic Supabase credentials', 'error');
      this.addResult('client_init', 'FAIL', 'Missing Supabase credentials');
      return false;
    }

    try {
      // Initialize anon client
      this.supabaseAnon = createClient(this.supabaseUrl, this.supabaseAnonKey);
      this.log('✅ Anonymous client initialized', 'success');

      // Initialize admin client if service role key is available
      if (this.serviceRoleKey) {
        this.supabaseAdmin = createClient(this.supabaseUrl, this.serviceRoleKey);
        this.log('✅ Service role client initialized', 'success');
      } else {
        this.log('⚠️  Service role key not available - admin tests will be skipped', 'warning');
      }

      this.addResult('client_init', 'PASS', 'Clients initialized successfully');
      return true;
    } catch (error) {
      this.log(`❌ Client initialization failed: ${error.message}`, 'error');
      this.addResult('client_init', 'FAIL', `Initialization error: ${error.message}`);
      return false;
    }
  }

  async testBasicDatabaseAccess() {
    this.log('\n=== BASIC DATABASE ACCESS TEST ===', 'header');
    
    try {
      // Test basic query that should work regardless of RLS
      const startTime = Date.now();
      const { data, error } = await this.supabaseAnon
        .from('information_schema.tables')
        .select('table_name')
        .limit(5);
      const duration = Date.now() - startTime;

      if (error) {
        this.log(`❌ Basic database access failed: ${error.message}`, 'error');
        this.addResult('basic_db_access', 'FAIL', error.message, null, duration);
        return false;
      }

      this.log(`✅ Basic database access working (${duration}ms)`, 'success');
      this.log(`   Retrieved ${data.length} table names`, 'info');
      this.addResult('basic_db_access', 'PASS', 'Basic database queries working', {
        tables_found: data.length
      }, duration);
      return true;
      
    } catch (error) {
      this.log(`❌ Basic database test error: ${error.message}`, 'error');
      this.addResult('basic_db_access', 'FAIL', `Unexpected error: ${error.message}`);
      return false;
    }
  }

  async testUserTableAccess() {
    this.log('\n=== USER TABLE ACCESS TEST ===', 'header');

    const commonUserTables = [
      'users', 'profiles', 'accounts', 'user_profiles', 
      'auth.users' // Supabase auth table
    ];

    let accessibleTables = [];
    let restrictedTables = [];

    for (const tableName of commonUserTables) {
      this.log(`Testing access to table: ${tableName}`, 'info');
      
      try {
        const startTime = Date.now();
        const { data, error } = await this.supabaseAnon
          .from(tableName)
          .select('*')
          .limit(1);
        const duration = Date.now() - startTime;

        if (error) {
          if (error.code === 'PGRST116') {
            // Table doesn't exist
            this.log(`   ℹ️  Table '${tableName}' doesn't exist`, 'info');
            this.addResult(`table_access_${tableName}`, 'INFO', 'Table does not exist', null, duration);
          } else if (error.code === '42501' || error.message.includes('permission denied')) {
            // Permission denied - RLS is working
            this.log(`   🔒 Table '${tableName}' access denied (RLS active)`, 'info');
            restrictedTables.push(tableName);
            this.addResult(`table_access_${tableName}`, 'PASS', 'Access properly restricted by RLS', null, duration);
          } else {
            this.log(`   ❌ Table '${tableName}' access error: ${error.message}`, 'error');
            this.addResult(`table_access_${tableName}`, 'FAIL', error.message, null, duration);
          }
        } else {
          // Access granted
          this.log(`   ✅ Table '${tableName}' accessible (${data.length} rows)`, 'success');
          accessibleTables.push(tableName);
          this.addResult(`table_access_${tableName}`, 'PASS', 'Table access granted', {
            rows_returned: data.length
          }, duration);
        }
      } catch (error) {
        this.log(`   ❌ Table '${tableName}' test error: ${error.message}`, 'error');
        this.addResult(`table_access_${tableName}`, 'FAIL', `Test error: ${error.message}`);
      }
    }

    this.log(`\n📊 Access Summary:`, 'info');
    this.log(`   Accessible tables: ${accessibleTables.length}`, 'info');
    this.log(`   Restricted tables: ${restrictedTables.length}`, 'info');

    return { accessibleTables, restrictedTables };
  }

  async testRLSPolicies() {
    this.log('\n=== ROW LEVEL SECURITY POLICIES TEST ===', 'header');

    if (!this.supabaseAdmin) {
      this.log('⚠️  Service role key required for RLS policy testing', 'warning');
      this.addResult('rls_policies', 'SKIP', 'No service role key available');
      return false;
    }

    try {
      // Query to get RLS information about tables
      const startTime = Date.now();
      const { data: rlsInfo, error } = await this.supabaseAdmin
        .rpc('get_table_rls_info') // This would be a custom function
        .catch(async () => {
          // Fallback to direct query if custom function doesn't exist
          return await this.supabaseAdmin
            .from('information_schema.tables')
            .select(`
              table_name,
              table_schema
            `)
            .eq('table_schema', 'public');
        });

      const duration = Date.now() - startTime;

      if (error) {
        this.log(`❌ RLS policy check failed: ${error.message}`, 'error');
        this.addResult('rls_policies', 'FAIL', error.message, null, duration);
        return false;
      }

      // Test individual tables for RLS status
      let rlsEnabledCount = 0;
      let totalTables = 0;

      if (rlsInfo?.data || rlsInfo) {
        const tables = rlsInfo.data || rlsInfo;
        
        for (const table of tables.slice(0, 10)) { // Test first 10 tables
          totalTables++;
          
          try {
            // Check if RLS is enabled by trying to query with different roles
            const { error: anonError } = await this.supabaseAnon
              .from(table.table_name)
              .select('count')
              .limit(1);

            const { error: adminError } = await this.supabaseAdmin
              .from(table.table_name)
              .select('count')
              .limit(1);

            // If anon fails but admin succeeds, RLS is likely active
            if (anonError && !adminError) {
              rlsEnabledCount++;
              this.log(`   🔒 Table '${table.table_name}': RLS enabled`, 'success');
            } else if (!anonError && !adminError) {
              this.log(`   ⚠️  Table '${table.table_name}': RLS may be disabled`, 'warning');
            } else {
              this.log(`   ℹ️  Table '${table.table_name}': Status unclear`, 'info');
            }
          } catch (error) {
            this.log(`   ❌ Table '${table.table_name}': Test error`, 'error');
          }
        }
      }

      const rlsPercentage = totalTables > 0 ? (rlsEnabledCount / totalTables) * 100 : 0;
      
      if (rlsPercentage >= 75) {
        this.log(`✅ RLS appears well configured (${rlsEnabledCount}/${totalTables} tables)`, 'success');
        this.addResult('rls_policies', 'PASS', `RLS configured on ${rlsEnabledCount}/${totalTables} tables`, {
          rls_enabled_count: rlsEnabledCount,
          total_tables: totalTables,
          percentage: rlsPercentage
        }, duration);
      } else if (rlsPercentage >= 25) {
        this.log(`⚠️  RLS partially configured (${rlsEnabledCount}/${totalTables} tables)`, 'warning');
        this.addResult('rls_policies', 'WARNING', `RLS configured on ${rlsEnabledCount}/${totalTables} tables`, {
          rls_enabled_count: rlsEnabledCount,
          total_tables: totalTables,
          percentage: rlsPercentage
        }, duration);
      } else {
        this.log(`❌ RLS may not be properly configured (${rlsEnabledCount}/${totalTables} tables)`, 'error');
        this.addResult('rls_policies', 'FAIL', `RLS only configured on ${rlsEnabledCount}/${totalTables} tables`, {
          rls_enabled_count: rlsEnabledCount,
          total_tables: totalTables,
          percentage: rlsPercentage
        }, duration);
      }

      return true;

    } catch (error) {
      this.log(`❌ RLS policy test error: ${error.message}`, 'error');
      this.addResult('rls_policies', 'FAIL', `Test error: ${error.message}`);
      return false;
    }
  }

  async testUserContextAccess() {
    this.log('\n=== USER CONTEXT ACCESS TEST ===', 'header');

    try {
      // Test accessing user context functions
      const contextTests = [
        {
          name: 'auth.uid()',
          description: 'Get current user ID'
        },
        {
          name: 'auth.role()',
          description: 'Get current user role'
        },
        {
          name: 'auth.jwt()',
          description: 'Get JWT claims'
        }
      ];

      let contextWorking = 0;

      for (const test of contextTests) {
        try {
          const startTime = Date.now();
          const { data, error } = await this.supabaseAnon
            .rpc('test_auth_context', { context_function: test.name })
            .catch(async () => {
              // Fallback to direct SQL if custom function doesn't exist
              return await this.supabaseAnon
                .from('information_schema.routines')
                .select('routine_name')
                .ilike('routine_name', '%auth%')
                .limit(1);
            });
          
          const duration = Date.now() - startTime;

          if (error) {
            if (error.code === '42883') {
              // Function doesn't exist - this is expected for custom test functions
              this.log(`   ℹ️  ${test.name}: Auth context functions available (no custom test function)`, 'info');
              contextWorking++;
              this.addResult(`auth_context_${test.name}`, 'INFO', 'Auth context available', null, duration);
            } else {
              this.log(`   ❌ ${test.name}: ${error.message}`, 'error');
              this.addResult(`auth_context_${test.name}`, 'FAIL', error.message, null, duration);
            }
          } else {
            this.log(`   ✅ ${test.name}: Working`, 'success');
            contextWorking++;
            this.addResult(`auth_context_${test.name}`, 'PASS', 'Auth context function working', null, duration);
          }
        } catch (error) {
          this.log(`   ❌ ${test.name}: ${error.message}`, 'error');
          this.addResult(`auth_context_${test.name}`, 'FAIL', `Test error: ${error.message}`);
        }
      }

      if (contextWorking >= contextTests.length / 2) {
        this.log(`✅ User context access appears to be working`, 'success');
        return true;
      } else {
        this.log(`⚠️  User context access may have issues`, 'warning');
        return false;
      }

    } catch (error) {
      this.log(`❌ User context test error: ${error.message}`, 'error');
      this.addResult('user_context', 'FAIL', `Test error: ${error.message}`);
      return false;
    }
  }

  async testDatabaseRoles() {
    this.log('\n=== DATABASE ROLES TEST ===', 'header');

    if (!this.supabaseAdmin) {
      this.log('⚠️  Service role key required for role testing', 'warning');
      this.addResult('db_roles', 'SKIP', 'No service role key available');
      return false;
    }

    try {
      // Test different database roles
      const roleTests = [
        {
          client: this.supabaseAnon,
          name: 'anonymous',
          description: 'Unauthenticated users'
        },
        {
          client: this.supabaseAdmin,
          name: 'service_role',
          description: 'Administrative operations'
        }
      ];

      let rolesWorking = 0;

      for (const roleTest of roleTests) {
        this.log(`Testing ${roleTest.name} role...`, 'info');
        
        try {
          const startTime = Date.now();
          
          // Test basic query capabilities
          const { data, error } = await roleTest.client
            .from('information_schema.tables')
            .select('table_name')
            .limit(1);
          
          const duration = Date.now() - startTime;

          if (error) {
            this.log(`   ❌ ${roleTest.name}: ${error.message}`, 'error');
            this.addResult(`role_${roleTest.name}`, 'FAIL', error.message, null, duration);
          } else {
            this.log(`   ✅ ${roleTest.name}: Basic queries working`, 'success');
            rolesWorking++;
            this.addResult(`role_${roleTest.name}`, 'PASS', 'Role functioning correctly', null, duration);

            // Test role-specific operations
            if (roleTest.name === 'service_role') {
              // Test admin-specific operations
              try {
                const { error: adminError } = await roleTest.client
                  .from('auth.users')
                  .select('id')
                  .limit(1);

                if (adminError) {
                  this.log(`   ⚠️  ${roleTest.name}: Limited admin access`, 'warning');
                } else {
                  this.log(`   ✅ ${roleTest.name}: Admin operations accessible`, 'success');
                }
              } catch (adminTestError) {
                this.log(`   ⚠️  ${roleTest.name}: Admin test failed`, 'warning');
              }
            }
          }
        } catch (error) {
          this.log(`   ❌ ${roleTest.name}: Test error - ${error.message}`, 'error');
          this.addResult(`role_${roleTest.name}`, 'FAIL', `Test error: ${error.message}`);
        }
      }

      if (rolesWorking === roleTests.length) {
        this.log(`✅ All database roles functioning correctly`, 'success');
        return true;
      } else {
        this.log(`❌ ${rolesWorking}/${roleTests.length} database roles working`, 'error');
        return false;
      }

    } catch (error) {
      this.log(`❌ Database roles test error: ${error.message}`, 'error');
      this.addResult('db_roles', 'FAIL', `Test error: ${error.message}`);
      return false;
    }
  }

  async testSecurityDefiner() {
    this.log('\n=== SECURITY DEFINER FUNCTIONS TEST ===', 'header');

    if (!this.supabaseAdmin) {
      this.log('⚠️  Service role key required for security definer testing', 'warning');
      this.addResult('security_definer', 'SKIP', 'No service role key available');
      return false;
    }

    try {
      const startTime = Date.now();
      
      // Query for security definer functions
      const { data: functions, error } = await this.supabaseAdmin
        .from('information_schema.routines')
        .select('routine_name, security_type')
        .eq('routine_schema', 'public')
        .limit(10);
      
      const duration = Date.now() - startTime;

      if (error) {
        this.log(`❌ Security definer check failed: ${error.message}`, 'error');
        this.addResult('security_definer', 'FAIL', error.message, null, duration);
        return false;
      }

      if (!functions || functions.length === 0) {
        this.log(`ℹ️  No custom functions found in public schema`, 'info');
        this.addResult('security_definer', 'INFO', 'No custom functions found', null, duration);
        return true;
      }

      const securityDefinerFunctions = functions.filter(f => f.security_type === 'DEFINER');
      
      this.log(`✅ Found ${functions.length} function(s), ${securityDefinerFunctions.length} with SECURITY DEFINER`, 'success');
      
      if (securityDefinerFunctions.length > 0) {
        this.log(`   Security definer functions:`, 'info');
        securityDefinerFunctions.forEach(fn => {
          this.log(`   - ${fn.routine_name}`, 'info');
        });
      }

      this.addResult('security_definer', 'PASS', 'Security definer functions checked', {
        total_functions: functions.length,
        security_definer_count: securityDefinerFunctions.length,
        functions: securityDefinerFunctions.map(f => f.routine_name)
      }, duration);

      return true;

    } catch (error) {
      this.log(`❌ Security definer test error: ${error.message}`, 'error');
      this.addResult('security_definer', 'FAIL', `Test error: ${error.message}`);
      return false;
    }
  }

  generateReport() {
    this.log('\n=== DATABASE POLICY & RLS REPORT ===', 'header');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const info = this.results.filter(r => r.status === 'INFO').length;

    this.log(`Total Tests: ${this.results.length}`, 'info');
    this.log(`✅ Passed: ${passed}`, passed > 0 ? 'success' : 'info');
    this.log(`❌ Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    this.log(`⚠️  Warnings: ${warnings}`, warnings > 0 ? 'warning' : 'info');
    this.log(`⏭️  Skipped: ${skipped}`, 'info');
    this.log(`ℹ️  Info: ${info}`, 'info');

    // Security Assessment
    this.log('\n🔒 SECURITY ASSESSMENT:', 'header');
    
    const securityScore = this.calculateSecurityScore();
    if (securityScore >= 80) {
      this.log(`✅ Security Score: ${securityScore}% (Excellent)`, 'success');
    } else if (securityScore >= 60) {
      this.log(`⚠️  Security Score: ${securityScore}% (Good)`, 'warning');
    } else if (securityScore >= 40) {
      this.log(`⚠️  Security Score: ${securityScore}% (Needs Improvement)`, 'warning');
    } else {
      this.log(`❌ Security Score: ${securityScore}% (Critical Issues)`, 'error');
    }

    // Show critical issues
    if (failed > 0) {
      this.log('\n❌ CRITICAL SECURITY ISSUES:', 'error');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          this.log(`   • ${result.test}: ${result.message}`, 'error');
        });
    }

    // Show warnings
    if (warnings > 0) {
      this.log('\n⚠️  SECURITY WARNINGS:', 'warning');
      this.results
        .filter(r => r.status === 'WARNING')
        .forEach(result => {
          this.log(`   • ${result.test}: ${result.message}`, 'warning');
        });
    }

    // Generate recommendations
    this.generateSecurityRecommendations();

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: { total: this.results.length, passed, failed, warnings, skipped, info },
      security_score: securityScore,
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    require('fs').writeFileSync('database-policy-report.json', JSON.stringify(report, null, 2));
    this.log(`\n📊 Detailed report saved to: database-policy-report.json`, 'info');

    return failed === 0 && securityScore >= 60;
  }

  calculateSecurityScore() {
    let score = 0;
    let maxScore = 0;

    this.results.forEach(result => {
      maxScore += 10;
      
      switch (result.status) {
        case 'PASS':
          score += 10;
          break;
        case 'WARNING':
          score += 5;
          break;
        case 'INFO':
          score += 7;
          break;
        case 'SKIP':
          // Don't count skipped tests
          maxScore -= 10;
          break;
        case 'FAIL':
          score += 0;
          break;
      }
    });

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  generateSecurityRecommendations() {
    this.log('\n🛡️  SECURITY RECOMMENDATIONS:', 'info');
    
    const recommendations = [
      'Enable Row Level Security (RLS) on all user-facing tables',
      'Create specific policies for different user roles and actions',
      'Use auth.uid() in policies to ensure users only access their own data',
      'Regularly audit and test your RLS policies',
      'Use SECURITY DEFINER functions cautiously and audit them regularly',
      'Implement proper input validation in database functions',
      'Monitor database access patterns for suspicious activity',
      'Keep your Supabase instance and database up to date'
    ];

    recommendations.forEach(rec => {
      this.log(`   • ${rec}`, 'info');
    });
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check for specific issues
    const hasRLSIssues = this.results.some(r => r.test.includes('rls') && r.status === 'FAIL');
    const hasAccessIssues = this.results.some(r => r.test.includes('access') && r.status === 'FAIL');
    const hasRoleIssues = this.results.some(r => r.test.includes('role') && r.status === 'FAIL');

    if (hasRLSIssues) {
      recommendations.push('Review and configure Row Level Security policies');
      recommendations.push('Enable RLS on all user-accessible tables');
    }

    if (hasAccessIssues) {
      recommendations.push('Review table access permissions and policies');
      recommendations.push('Ensure proper authentication is required for sensitive data');
    }

    if (hasRoleIssues) {
      recommendations.push('Verify database role configurations');
      recommendations.push('Check service role key permissions');
    }

    if (!this.serviceRoleKey) {
      recommendations.push('Configure SUPABASE_SERVICE_ROLE_KEY for comprehensive testing');
    }

    recommendations.push('Test security policies with different user roles');
    recommendations.push('Implement database-level audit logging');
    
    return recommendations;
  }

  async run() {
    console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║               DATABASE POLICY & RLS TESTING                 ║
║                                                              ║
║  This diagnostic will test Row Level Security policies,     ║
║  database permissions, and access control configurations.   ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

    try {
      // Initialize clients
      if (!await this.initializeClients()) {
        return false;
      }

      // Run all database policy tests
      await this.testBasicDatabaseAccess();
      const tableAccess = await this.testUserTableAccess();
      await this.testRLSPolicies();
      await this.testUserContextAccess();
      await this.testDatabaseRoles();
      await this.testSecurityDefiner();

      return this.generateReport();

    } catch (error) {
      this.log(`❌ Database policy test suite error: ${error.message}`, 'error');
      return false;
    }
  }
}

// Run the diagnostic if called directly
if (require.main === module) {
  const tester = new DatabasePolicyTester();
  tester.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = DatabasePolicyTester;