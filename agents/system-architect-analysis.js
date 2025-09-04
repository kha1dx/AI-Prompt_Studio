/**
 * 🌐 SYSTEM ARCHITECT - DEBUGGING ANALYSIS
 * Agent Mission: Analyze complete data flow and system integration
 */

const fs = require('fs');
const path = require('path');

class SystemArchitectAnalysis {
    constructor() {
        this.findings = [];
        this.criticalIssues = [];
        this.recommendations = [];
        this.systemFlow = {};
        this.integrationPoints = [];
    }

    async analyzeProject() {
        console.log('🌐 System Architect: Starting complete system analysis...');
        
        await this.mapDataFlow();
        await this.analyzeIntegrationPoints();
        await this.checkMiddleware();
        await this.validateEnvironmentConfig();
        await this.analyzeSystemArchitecture();
        await this.identifyBottlenecks();
        
        return this.generateReport();
    }

    async mapDataFlow() {
        console.log('🗺️ Mapping complete data flow...');
        
        this.systemFlow = {
            frontend: {
                exists: false,
                components: [],
                stateManagement: false,
                apiCalls: false
            },
            api: {
                exists: false,
                routes: [],
                middleware: false,
                errorHandling: false
            },
            external: {
                openai: false,
                supabase: false
            }
        };

        // Check frontend components
        const frontendPaths = [
            'src/components/ChatInterface.js',
            'src/app/page.js',
            'src/pages/index.js'
        ];

        for (const frontendPath of frontendPaths) {
            if (fs.existsSync(frontendPath)) {
                this.systemFlow.frontend.exists = true;
                this.systemFlow.frontend.components.push(frontendPath);
                await this.analyzeFrontendComponent(frontendPath);
            }
        }

        // Check API routes
        const apiPaths = [
            'src/app/api/chat/route.js',
            'src/pages/api/chat.js',
            'pages/api/chat.js'
        ];

        for (const apiPath of apiPaths) {
            if (fs.existsSync(apiPath)) {
                this.systemFlow.api.exists = true;
                this.systemFlow.api.routes.push(apiPath);
                await this.analyzeAPIRoute(apiPath);
            }
        }

        this.findings.push(`📊 System flow mapped: Frontend(${this.systemFlow.frontend.exists}), API(${this.systemFlow.api.exists})`);
    }

    async analyzeFrontendComponent(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            if (content.includes('useState') || content.includes('useEffect')) {
                this.systemFlow.frontend.stateManagement = true;
            }

            if (content.includes('fetch') || content.includes('/api/')) {
                this.systemFlow.frontend.apiCalls = true;
                this.integrationPoints.push({
                    type: 'Frontend → API',
                    location: filePath,
                    method: 'HTTP Request'
                });
            }

        } catch (error) {
            this.criticalIssues.push(`❌ Failed to analyze frontend component: ${error.message}`);
        }
    }

    async analyzeAPIRoute(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            if (content.includes('middleware') || content.includes('cors')) {
                this.systemFlow.api.middleware = true;
            }

            if (content.includes('catch') || content.includes('try')) {
                this.systemFlow.api.errorHandling = true;
            }

            if (content.includes('openai') || content.includes('OpenAI')) {
                this.systemFlow.external.openai = true;
                this.integrationPoints.push({
                    type: 'API → OpenAI',
                    location: filePath,
                    method: 'HTTP Request to OpenAI API'
                });
            }

        } catch (error) {
            this.criticalIssues.push(`❌ Failed to analyze API route: ${error.message}`);
        }
    }

    async analyzeIntegrationPoints() {
        console.log('🔗 Analyzing integration points...');
        
        // Check if frontend can communicate with API
        if (this.systemFlow.frontend.exists && !this.systemFlow.frontend.apiCalls) {
            this.criticalIssues.push('🚨 CRITICAL: Frontend exists but no API calls found');
            this.recommendations.push('📝 Add fetch() calls to communicate with /api/chat');
        }

        // Check if API can communicate with OpenAI
        if (this.systemFlow.api.exists && !this.systemFlow.external.openai) {
            this.criticalIssues.push('🚨 CRITICAL: API exists but no OpenAI integration found');
            this.recommendations.push('📝 Add OpenAI client integration in API route');
        }

        // Check complete flow
        const hasCompleteFlow = this.systemFlow.frontend.apiCalls && 
                               this.systemFlow.api.exists && 
                               this.systemFlow.external.openai;

        if (!hasCompleteFlow) {
            this.criticalIssues.push('🚨 CRITICAL: Incomplete data flow - missing connections');
        } else {
            this.findings.push('✅ Complete data flow established');
        }
    }

    async checkMiddleware() {
        console.log('⚙️ Checking middleware and routing...');
        
        // Check Next.js configuration
        const configFiles = ['next.config.js', 'next.config.mjs'];
        let configFound = false;

        for (const configFile of configFiles) {
            if (fs.existsSync(configFile)) {
                configFound = true;
                this.findings.push(`✅ Next.js config found: ${configFile}`);
                break;
            }
        }

        if (!configFound) {
            this.recommendations.push('📝 Consider adding next.config.js for advanced routing');
        }

        // Check for proper API routing structure
        if (!this.systemFlow.api.exists) {
            this.criticalIssues.push('🚨 CRITICAL: No API routing structure found');
            this.recommendations.push('📝 Create API route structure: src/app/api/chat/route.js');
        }
    }

    async validateEnvironmentConfig() {
        console.log('🔧 Validating environment configuration...');
        
        if (!fs.existsSync('.env.local')) {
            this.criticalIssues.push('🚨 CRITICAL: .env.local missing');
            this.recommendations.push('📝 Create .env.local with required environment variables');
            return;
        }

        const envContent = fs.readFileSync('.env.local', 'utf8');
        
        // Check required environment variables
        const requiredVars = ['OPENAI_API_KEY'];
        const optionalVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXTAUTH_URL'];

        for (const requiredVar of requiredVars) {
            if (!envContent.includes(requiredVar)) {
                this.criticalIssues.push(`🚨 CRITICAL: Missing required environment variable: ${requiredVar}`);
            } else {
                this.findings.push(`✅ Required environment variable found: ${requiredVar}`);
            }
        }

        for (const optionalVar of optionalVars) {
            if (envContent.includes(optionalVar)) {
                this.findings.push(`✅ Optional environment variable found: ${optionalVar}`);
            }
        }
    }

    async analyzeSystemArchitecture() {
        console.log('🏛️ Analyzing system architecture...');
        
        // Determine architecture pattern
        const isAppRouter = fs.existsSync('src/app');
        const isPagesRouter = fs.existsSync('pages') || fs.existsSync('src/pages');

        if (isAppRouter) {
            this.findings.push('✅ Using Next.js App Router architecture');
            // Check for proper App Router structure
            if (!fs.existsSync('src/app/api')) {
                this.criticalIssues.push('🚨 App Router: Missing src/app/api directory');
                this.recommendations.push('📝 Create src/app/api directory for API routes');
            }
        } else if (isPagesRouter) {
            this.findings.push('✅ Using Next.js Pages Router architecture');
            // Check for proper Pages Router structure
            if (!fs.existsSync('pages/api') && !fs.existsSync('src/pages/api')) {
                this.criticalIssues.push('🚨 Pages Router: Missing pages/api directory');
                this.recommendations.push('📝 Create pages/api directory for API routes');
            }
        } else {
            this.criticalIssues.push('🚨 CRITICAL: No clear Next.js routing architecture found');
            this.recommendations.push('📝 Set up proper Next.js project structure');
        }
    }

    async identifyBottlenecks() {
        console.log('🚧 Identifying potential bottlenecks...');
        
        // Check for performance issues
        if (!this.systemFlow.api.errorHandling) {
            this.criticalIssues.push('⚠️ BOTTLENECK: No error handling in API - failures will crash requests');
        }

        if (!this.systemFlow.frontend.stateManagement) {
            this.criticalIssues.push('⚠️ BOTTLENECK: No state management - UI may not update properly');
        }

        // Check for security issues
        this.recommendations.push('📝 SECURITY: Implement rate limiting for API endpoints');
        this.recommendations.push('📝 SECURITY: Validate and sanitize user inputs');
        this.recommendations.push('📝 SECURITY: Use environment variables for sensitive data');
    }

    generateReport() {
        const systemHealth = this.criticalIssues.length === 0 ? 'HEALTHY' : 'CRITICAL_ISSUES';
        const completeness = this.integrationPoints.length >= 2 ? 'COMPLETE' : 'INCOMPLETE';

        return {
            agent: 'System Architect',
            status: systemHealth,
            completeness: completeness,
            findings: this.findings,
            criticalIssues: this.criticalIssues,
            recommendations: this.recommendations,
            systemFlow: this.systemFlow,
            integrationPoints: this.integrationPoints,
            architecture: {
                frontend: this.systemFlow.frontend.exists,
                api: this.systemFlow.api.exists,
                external: this.systemFlow.external
            },
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = SystemArchitectAnalysis;

// Auto-run if called directly
if (require.main === module) {
    const analyzer = new SystemArchitectAnalysis();
    analyzer.analyzeProject().then(report => {
        console.log('\n🌐 SYSTEM ARCHITECT REPORT:');
        console.log(JSON.stringify(report, null, 2));
    }).catch(error => {
        console.error('❌ Analysis failed:', error);
    });
}