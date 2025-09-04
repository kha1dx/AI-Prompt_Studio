/**
 * 🏗️ BACKEND ARCHITECT - DEBUGGING ANALYSIS
 * Agent Mission: Analyze API routes and server logic
 */

const fs = require('fs');
const path = require('path');

class BackendArchitectAnalysis {
    constructor() {
        this.findings = [];
        this.criticalIssues = [];
        this.recommendations = [];
    }

    async analyzeProject() {
        console.log('🏗️ Backend Architect: Starting comprehensive analysis...');
        
        // Check for API route files
        await this.findAPIRoutes();
        await this.analyzeServerConfig();
        await this.checkEnvironmentSetup();
        await this.testOpenAIIntegration();
        
        return this.generateReport();
    }

    async findAPIRoutes() {
        console.log('🔍 Searching for API route files...');
        
        const possiblePaths = [
            'src/app/api/chat/route.js',
            'src/pages/api/chat.js',
            'pages/api/chat.js',
            'api/chat.js'
        ];

        for (const apiPath of possiblePaths) {
            if (fs.existsSync(apiPath)) {
                this.findings.push(`✅ Found API route: ${apiPath}`);
                await this.analyzeAPIFile(apiPath);
            } else {
                this.findings.push(`❌ Missing API route: ${apiPath}`);
            }
        }

        if (this.findings.filter(f => f.includes('✅ Found API route')).length === 0) {
            this.criticalIssues.push('🚨 CRITICAL: No API chat route found!');
            this.recommendations.push('📝 Create API route at src/app/api/chat/route.js');
        }
    }

    async analyzeAPIFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check for OpenAI import
            if (!content.includes('openai') && !content.includes('OpenAI')) {
                this.criticalIssues.push('🚨 Missing OpenAI import in API route');
            }

            // Check for proper error handling
            if (!content.includes('catch') && !content.includes('try')) {
                this.criticalIssues.push('⚠️ No error handling in API route');
            }

            // Check for API key usage
            if (!content.includes('OPENAI_API_KEY')) {
                this.criticalIssues.push('🚨 API key not being used in route');
            }

            this.findings.push(`✅ Analyzed API file: ${filePath}`);
            
        } catch (error) {
            this.criticalIssues.push(`❌ Failed to analyze ${filePath}: ${error.message}`);
        }
    }

    async analyzeServerConfig() {
        console.log('⚙️ Analyzing server configuration...');
        
        const configFiles = [
            'next.config.js',
            'next.config.mjs',
            'package.json'
        ];

        for (const configFile of configFiles) {
            if (fs.existsSync(configFile)) {
                this.findings.push(`✅ Found config: ${configFile}`);
            }
        }
    }

    async checkEnvironmentSetup() {
        console.log('🔧 Checking environment setup...');
        
        if (fs.existsSync('.env.local')) {
            const envContent = fs.readFileSync('.env.local', 'utf8');
            
            if (envContent.includes('OPENAI_API_KEY')) {
                this.findings.push('✅ OpenAI API key found in environment');
            } else {
                this.criticalIssues.push('🚨 CRITICAL: OpenAI API key missing from .env.local');
            }
        } else {
            this.criticalIssues.push('🚨 CRITICAL: .env.local file missing');
        }
    }

    async testOpenAIIntegration() {
        console.log('🤖 Testing OpenAI integration...');
        
        try {
            // This would test the actual OpenAI connection
            // For now, we'll check if the key format is correct
            const envContent = fs.readFileSync('.env.local', 'utf8');
            const apiKeyMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
            
            if (apiKeyMatch) {
                const apiKey = apiKeyMatch[1].trim();
                if (apiKey.startsWith('sk-')) {
                    this.findings.push('✅ OpenAI API key format appears correct');
                } else {
                    this.criticalIssues.push('🚨 OpenAI API key format is invalid');
                }
            }
        } catch (error) {
            this.criticalIssues.push(`❌ Failed to verify OpenAI setup: ${error.message}`);
        }
    }

    generateReport() {
        return {
            agent: 'Backend Architect',
            status: this.criticalIssues.length === 0 ? 'HEALTHY' : 'CRITICAL_ISSUES',
            findings: this.findings,
            criticalIssues: this.criticalIssues,
            recommendations: this.recommendations,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = BackendArchitectAnalysis;

// Auto-run if called directly
if (require.main === module) {
    const analyzer = new BackendArchitectAnalysis();
    analyzer.analyzeProject().then(report => {
        console.log('\n🏗️ BACKEND ARCHITECT REPORT:');
        console.log(JSON.stringify(report, null, 2));
    }).catch(error => {
        console.error('❌ Analysis failed:', error);
    });
}