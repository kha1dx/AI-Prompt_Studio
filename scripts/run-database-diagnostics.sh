#!/bin/bash

# Database Diagnostics Runner Script
# Runs all database diagnostic tools in sequence

echo "🚀 Starting comprehensive database diagnostics..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required dependencies are installed
echo -e "${YELLOW}📦 Checking dependencies...${NC}"

if ! command -v tsx &> /dev/null; then
    echo -e "${RED}❌ tsx not found. Installing...${NC}"
    npm install -g tsx
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local file not found!${NC}"
    echo "Please create .env.local with your Supabase credentials."
    exit 1
fi

echo -e "${GREEN}✅ Dependencies check passed${NC}"
echo ""

# Step 1: Schema Check
echo -e "${YELLOW}🔍 Step 1: Running schema verification...${NC}"
echo "=================================================="

if tsx scripts/database-schema-check.ts; then
    echo -e "${GREEN}✅ Schema check completed successfully${NC}"
    SCHEMA_SUCCESS=true
else
    echo -e "${RED}❌ Schema check failed${NC}"
    SCHEMA_SUCCESS=false
fi

echo ""

# Step 2: Connectivity Test
echo -e "${YELLOW}🔍 Step 2: Running connectivity test...${NC}"
echo "=================================================="

if tsx scripts/database-connectivity-test.ts; then
    echo -e "${GREEN}✅ Connectivity test completed successfully${NC}"
    CONNECTIVITY_SUCCESS=true
else
    echo -e "${RED}❌ Connectivity test failed${NC}"
    CONNECTIVITY_SUCCESS=false
fi

echo ""

# Step 3: Generate Reports
echo -e "${YELLOW}📊 Step 3: Generating diagnostic reports...${NC}"
echo "=================================================="

# Create reports directory if it doesn't exist
mkdir -p reports

# Generate summary report
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="reports/database-diagnostics-${TIMESTAMP}.md"

cat > "$REPORT_FILE" << EOF
# Database Diagnostics Report

**Generated:** $(date)
**Project:** Prompt Studio
**Supabase URL:** ${NEXT_PUBLIC_SUPABASE_URL}

## Summary

- Schema Check: $($SCHEMA_SUCCESS && echo "✅ PASSED" || echo "❌ FAILED")
- Connectivity Test: $($CONNECTIVITY_SUCCESS && echo "✅ PASSED" || echo "❌ FAILED")

## Environment Variables Check

\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL: $([ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && echo "✅ Set" || echo "❌ Missing")
NEXT_PUBLIC_SUPABASE_ANON_KEY: $([ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] && echo "✅ Set" || echo "❌ Missing")
SUPABASE_SERVICE_ROLE_KEY: $([ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && echo "✅ Set" || echo "❌ Missing")
\`\`\`

## Recommendations

EOF

# Add recommendations based on results
if [ "$SCHEMA_SUCCESS" = false ]; then
    cat >> "$REPORT_FILE" << EOF
### Schema Issues
- Run the missing tables SQL script in your Supabase dashboard
- File: \`scripts/create-missing-tables.sql\`
- Execute the SQL in Supabase SQL Editor

EOF
fi

if [ "$CONNECTIVITY_SUCCESS" = false ]; then
    cat >> "$REPORT_FILE" << EOF
### Connectivity Issues
- Check your internet connection
- Verify Supabase service status
- Confirm API keys are correct and have proper permissions

EOF
fi

cat >> "$REPORT_FILE" << EOF
## Files Generated
- Schema Creation SQL: \`scripts/create-missing-tables.sql\`
- Schema Check Script: \`scripts/database-schema-check.ts\`
- Connectivity Test Script: \`scripts/database-connectivity-test.ts\`

## Next Steps
1. Address any failed checks above
2. Run SQL scripts in Supabase dashboard if tables are missing
3. Re-run diagnostics to verify fixes: \`./scripts/run-database-diagnostics.sh\`
4. Test your application with real user data

## Support
If issues persist, check:
- Supabase dashboard for service status
- Network connectivity and firewall settings
- API key permissions and expiration
EOF

echo -e "${GREEN}✅ Report generated: ${REPORT_FILE}${NC}"

# Step 4: Final Summary
echo ""
echo -e "${YELLOW}📋 FINAL SUMMARY${NC}"
echo "=================================================="

if [ "$SCHEMA_SUCCESS" = true ] && [ "$CONNECTIVITY_SUCCESS" = true ]; then
    echo -e "${GREEN}🎉 All diagnostics passed! Your database is ready.${NC}"
    echo ""
    echo -e "${YELLOW}✨ Next steps:${NC}"
    echo "1. Test your application with real user authentication"
    echo "2. Monitor application logs for any remaining issues"
    echo "3. Consider running these diagnostics periodically"
    exit 0
else
    echo -e "${RED}⚠️  Some diagnostics failed. Please review the issues above.${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Immediate actions needed:${NC}"
    
    if [ "$SCHEMA_SUCCESS" = false ]; then
        echo "1. 🗃️  Run the SQL schema creation script in Supabase"
        echo "   File: scripts/create-missing-tables.sql"
    fi
    
    if [ "$CONNECTIVITY_SUCCESS" = false ]; then
        echo "2. 🌐 Fix connectivity issues (check network, API keys)"
    fi
    
    echo ""
    echo "3. 🔄 Re-run this script after fixes: ./scripts/run-database-diagnostics.sh"
    echo ""
    echo -e "${YELLOW}📊 Detailed report: ${REPORT_FILE}${NC}"
    exit 1
fi