#!/usr/bin/env node

/**
 * Check actual table structure and compare with expected schema
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getTableColumns(tableName) {
  console.log(`🔍 Checking ${tableName} table structure...`);
  
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');

    if (error) {
      console.error(`  ❌ Error checking ${tableName}:`, error.message);
      return [];
    }

    console.log(`  📋 Current columns in ${tableName}:`);
    data.forEach(col => {
      console.log(`    - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });

    return data.map(col => col.column_name);
  } catch (err) {
    console.error(`  ❌ Exception checking ${tableName}:`, err.message);
    return [];
  }
}

async function main() {
  console.log('🔍 Database Table Structure Analysis');
  console.log('====================================');
  
  const conversationColumns = await getTableColumns('conversations');
  
  console.log('\n📊 EXPECTED vs ACTUAL COLUMNS:');
  console.log('==============================');
  
  const expectedColumns = [
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
    'last_activity_at'  // THIS IS THE MISSING COLUMN
  ];
  
  console.log('Conversations table:');
  expectedColumns.forEach(col => {
    const exists = conversationColumns.includes(col);
    console.log(`  ${exists ? '✅' : '❌'} ${col}`);
  });
  
  const missingColumns = expectedColumns.filter(col => !conversationColumns.includes(col));
  const extraColumns = conversationColumns.filter(col => !expectedColumns.includes(col));
  
  if (missingColumns.length > 0) {
    console.log(`\n❌ MISSING COLUMNS (${missingColumns.length}):`);
    missingColumns.forEach(col => console.log(`  - ${col}`));
  }
  
  if (extraColumns.length > 0) {
    console.log(`\n➕ EXTRA COLUMNS (${extraColumns.length}):`);
    extraColumns.forEach(col => console.log(`  - ${col}`));
  }
  
  if (missingColumns.length > 0) {
    console.log('\n💡 SOLUTION:');
    console.log('The missing columns need to be added to fix the database errors.');
    console.log('Run the following SQL in your Supabase dashboard:');
    console.log('');
    
    missingColumns.forEach(col => {
      switch(col) {
        case 'last_activity_at':
          console.log(`ALTER TABLE conversations ADD COLUMN ${col} TIMESTAMP WITH TIME ZONE DEFAULT NOW();`);
          break;
        case 'message_count':
          console.log(`ALTER TABLE conversations ADD COLUMN ${col} INTEGER DEFAULT 0;`);
          break;
        case 'is_favorite':
          console.log(`ALTER TABLE conversations ADD COLUMN ${col} BOOLEAN DEFAULT false;`);
          break;
        case 'tags':
          console.log(`ALTER TABLE conversations ADD COLUMN ${col} TEXT[] DEFAULT '{}';`);
          break;
        default:
          console.log(`ALTER TABLE conversations ADD COLUMN ${col} TEXT;`);
      }
    });
    
    console.log('\n🔄 After running the SQL, test your application again.');
  } else {
    console.log('\n🎉 All expected columns are present!');
  }
}

main().catch(err => {
  console.error('❌ Analysis failed:', err);
  process.exit(1);
});