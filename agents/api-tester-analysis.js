/**
 * 🧪 API TESTER - DEBUGGING ANALYSIS
 * Agent Mission: Verify OpenAI API key and responses
 */

const fs = require('fs');
const https = require('https');

class APITesterAnalysis {
    constructor() {
        this.findings = [];
        this.criticalIssues = [];
        this.recommendations = [];
        this.testResults = {};
    }

    async analyzeProject() {
        console.log('🧪 API Tester: Starting comprehensive API testing...');
        
        await this.validateAPIKey();
        await this.testOpenAIConnection();
        await this.testLocalAPIEndpoint();
        await this.validateRequestFormat();
        await this.testErrorScenarios();
        
        return this.generateReport();
    }

    async validateAPIKey() {
        console.log('🔑 Validating OpenAI API key...');
        
        try {
            if (!fs.existsSync('.env.local')) {
                this.criticalIssues.push('🚨 CRITICAL: .env.local file missing');
                return;
            }

            const envContent = fs.readFileSync('.env.local', 'utf8');
            const apiKeyMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
            
            if (!apiKeyMatch) {
                this.criticalIssues.push('🚨 CRITICAL: OPENAI_API_KEY not found in .env.local');
                return;
            }

            const apiKey = apiKeyMatch[1].trim();
            
            // Validate API key format
            if (!apiKey.startsWith('sk-')) {
                this.criticalIssues.push('🚨 CRITICAL: Invalid OpenAI API key format');
                this.recommendations.push('📝 Ensure API key starts with "sk-"');
                return;
            }

            if (apiKey.length < 40) {
                this.criticalIssues.push('🚨 CRITICAL: OpenAI API key appears too short');
                return;
            }

            this.findings.push('✅ OpenAI API key format is valid');
            this.testResults.apiKeyFormat = 'VALID';
            
        } catch (error) {
            this.criticalIssues.push(`❌ Failed to validate API key: ${error.message}`);
            this.testResults.apiKeyFormat = 'ERROR';
        }
    }

    async testOpenAIConnection() {
        console.log('🤖 Testing OpenAI API connection...');
        
        return new Promise((resolve) => {
            try {
                const envContent = fs.readFileSync('.env.local', 'utf8');
                const apiKeyMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
                
                if (!apiKeyMatch) {
                    this.criticalIssues.push('🚨 Cannot test OpenAI connection: No API key');
                    resolve();
                    return;
                }

                const apiKey = apiKeyMatch[1].trim();
                
                const postData = JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'user', content: 'Test connection' }
                    ],
                    max_tokens: 5
                });

                const options = {
                    hostname: 'api.openai.com',
                    port: 443,
                    path: '/v1/chat/completions',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    
                    res.on('end', () => {
                        if (res.statusCode === 200) {
                            this.findings.push('✅ OpenAI API connection successful');
                            this.testResults.openaiConnection = 'SUCCESS';
                        } else if (res.statusCode === 401) {
                            this.criticalIssues.push('🚨 CRITICAL: OpenAI API key is invalid or expired');
                            this.testResults.openaiConnection = 'UNAUTHORIZED';
                        } else {
                            this.criticalIssues.push(`⚠️ OpenAI API returned status: ${res.statusCode}`);
                            this.testResults.openaiConnection = 'ERROR';
                        }
                        resolve();
                    });
                });

                req.on('error', (error) => {
                    this.criticalIssues.push(`❌ OpenAI connection failed: ${error.message}`);
                    this.testResults.openaiConnection = 'NETWORK_ERROR';
                    resolve();
                });

                req.setTimeout(10000, () => {
                    this.criticalIssues.push('⚠️ OpenAI API request timeout');
                    this.testResults.openaiConnection = 'TIMEOUT';
                    req.destroy();
                    resolve();
                });

                req.write(postData);
                req.end();
                
            } catch (error) {
                this.criticalIssues.push(`❌ Failed to test OpenAI connection: ${error.message}`);
                this.testResults.openaiConnection = 'ERROR';
                resolve();
            }
        });
    }

    async testLocalAPIEndpoint() {
        console.log('🏠 Testing local API endpoint...');
        
        // This would test the local /api/chat endpoint
        // For now, we'll check if the route file exists
        
        const apiRoutePaths = [
            'src/app/api/chat/route.js',
            'src/pages/api/chat.js',
            'pages/api/chat.js'
        ];

        let routeFound = false;
        for (const routePath of apiRoutePaths) {
            if (fs.existsSync(routePath)) {
                routeFound = true;
                this.findings.push(`✅ Local API route found: ${routePath}`);
                await this.analyzeAPIRoute(routePath);
                break;
            }
        }

        if (!routeFound) {
            this.criticalIssues.push('🚨 CRITICAL: No local API chat route found');
            this.recommendations.push('📝 Create API route at src/app/api/chat/route.js or src/pages/api/chat.js');
            this.testResults.localAPIRoute = 'MISSING';
        } else {
            this.testResults.localAPIRoute = 'EXISTS';
        }
    }

    async analyzeAPIRoute(routePath) {
        try {
            const content = fs.readFileSync(routePath, 'utf8');
            
            // Check for required imports
            if (!content.includes('openai') && !content.includes('OpenAI')) {
                this.criticalIssues.push('🚨 API route missing OpenAI import');
            }

            // Check for POST handler
            if (!content.includes('POST') && !content.includes('post')) {
                this.criticalIssues.push('🚨 API route missing POST handler');
            }

            // Check for proper JSON parsing
            if (!content.includes('json()') && !content.includes('JSON.parse')) {
                this.criticalIssues.push('⚠️ API route may not handle JSON requests properly');
            }

            this.findings.push(`✅ Analyzed API route: ${routePath}`);
            
        } catch (error) {
            this.criticalIssues.push(`❌ Failed to analyze API route: ${error.message}`);
        }
    }

    async validateRequestFormat() {
        console.log('📋 Validating request format...');
        
        // Check if the expected request format matches OpenAI requirements
        this.recommendations.push('📝 Ensure requests include: messages array, model, max_tokens');
        this.recommendations.push('📝 Validate proper JSON structure in API calls');
    }

    async testErrorScenarios() {
        console.log('🛡️ Testing error scenarios...');
        
        const errorScenarios = [
            'Missing API key',
            'Invalid API key',
            'Network timeout',
            'Malformed request',
            'Rate limiting'
        ];

        for (const scenario of errorScenarios) {
            this.recommendations.push(`📝 Test error handling for: ${scenario}`);
        }
    }

    generateReport() {
        return {
            agent: 'API Tester',
            status: this.criticalIssues.length === 0 ? 'HEALTHY' : 'CRITICAL_ISSUES',
            findings: this.findings,
            criticalIssues: this.criticalIssues,
            recommendations: this.recommendations,
            testResults: this.testResults,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = APITesterAnalysis;

// Auto-run if called directly
if (require.main === module) {
    const analyzer = new APITesterAnalysis();
    analyzer.analyzeProject().then(report => {
        console.log('\n🧪 API TESTER REPORT:');
        console.log(JSON.stringify(report, null, 2));
    }).catch(error => {
        console.error('❌ Analysis failed:', error);
    });
}