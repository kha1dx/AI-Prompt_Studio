/**
 * 🏆 MASTER COORDINATOR - HIVE MIND DEBUG OPERATION
 * Orchestrates all debugging agents and consolidates results
 */

const BackendArchitectAnalysis = require('./backend-architect-analysis');
const FrontendDeveloperAnalysis = require('./frontend-developer-analysis');
const APITesterAnalysis = require('./api-tester-analysis');
const SystemArchitectAnalysis = require('./system-architect-analysis');

class MasterCoordinator {
    constructor() {
        this.agents = [];
        this.reports = {};
        this.consolidatedFindings = {
            criticalIssues: [],
            recommendations: [],
            systemStatus: 'UNKNOWN',
            rootCause: null,
            actionPlan: []
        };
    }

    async executeHiveMindDebug() {
        console.log('🏆 MASTER COORDINATOR: Initiating Hive Mind Debug Operation');
        console.log('=====================================');
        
        await this.deployAllAgents();
        await this.consolidateReports();
        await this.identifyRootCause();
        await this.createActionPlan();
        
        return this.generateMasterReport();
    }

    async deployAllAgents() {
        console.log('🚀 Deploying elite debugging squad...');
        
        const agents = [
            { name: 'BackendArchitect', class: BackendArchitectAnalysis, icon: '🏗️' },
            { name: 'FrontendDeveloper', class: FrontendDeveloperAnalysis, icon: '⚛️' },
            { name: 'APITester', class: APITesterAnalysis, icon: '🧪' },
            { name: 'SystemArchitect', class: SystemArchitectAnalysis, icon: '🌐' }
        ];

        // Execute all agents in parallel
        const analysisPromises = agents.map(async (agent) => {
            console.log(`${agent.icon} Deploying ${agent.name}...`);
            const analyzer = new agent.class();
            try {
                const report = await analyzer.analyzeProject();
                this.reports[agent.name] = report;
                console.log(`${agent.icon} ${agent.name} analysis complete`);
                return report;
            } catch (error) {
                console.error(`❌ ${agent.name} analysis failed:`, error);
                this.reports[agent.name] = {
                    agent: agent.name,
                    status: 'FAILED',
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        });

        await Promise.all(analysisPromises);
        console.log('✅ All agents deployed and reporting');
    }

    async consolidateReports() {
        console.log('📊 Consolidating agent reports...');
        
        // Collect all critical issues
        for (const [agentName, report] of Object.entries(this.reports)) {
            if (report.criticalIssues) {
                this.consolidatedFindings.criticalIssues.push(...report.criticalIssues.map(issue => ({
                    agent: agentName,
                    issue: issue
                })));
            }

            if (report.recommendations) {
                this.consolidatedFindings.recommendations.push(...report.recommendations.map(rec => ({
                    agent: agentName,
                    recommendation: rec
                })));
            }
        }

        // Determine overall system status
        const failedAgents = Object.values(this.reports).filter(r => r.status === 'FAILED').length;
        const criticalAgents = Object.values(this.reports).filter(r => r.status === 'CRITICAL_ISSUES').length;
        
        if (failedAgents > 0) {
            this.consolidatedFindings.systemStatus = 'SYSTEM_FAILURE';
        } else if (criticalAgents > 0) {
            this.consolidatedFindings.systemStatus = 'CRITICAL_ISSUES';
        } else {
            this.consolidatedFindings.systemStatus = 'HEALTHY';
        }
    }

    async identifyRootCause() {
        console.log('🔍 Identifying root cause...');
        
        const issues = this.consolidatedFindings.criticalIssues;
        
        // Pattern recognition for common root causes
        const patterns = {
            'MISSING_API_ROUTE': issues.filter(i => i.issue.includes('API route') || i.issue.includes('route.js')).length,
            'INVALID_API_KEY': issues.filter(i => i.issue.includes('API key')).length,
            'MISSING_COMPONENTS': issues.filter(i => i.issue.includes('component') || i.issue.includes('ChatInterface')).length,
            'INCOMPLETE_FLOW': issues.filter(i => i.issue.includes('flow') || i.issue.includes('integration')).length,
            'ERROR_HANDLING': issues.filter(i => i.issue.includes('error handling')).length
        };

        // Find the most likely root cause
        const maxPattern = Math.max(...Object.values(patterns));
        const rootCause = Object.keys(patterns).find(key => patterns[key] === maxPattern);

        switch (rootCause) {
            case 'MISSING_API_ROUTE':
                this.consolidatedFindings.rootCause = {
                    type: 'MISSING_API_ROUTE',
                    description: 'No API route found for chat functionality',
                    priority: 'CRITICAL',
                    impact: 'Chat requests have nowhere to go'
                };
                break;
            case 'INVALID_API_KEY':
                this.consolidatedFindings.rootCause = {
                    type: 'INVALID_API_KEY',
                    description: 'OpenAI API key is missing, invalid, or expired',
                    priority: 'CRITICAL',
                    impact: 'Cannot communicate with OpenAI services'
                };
                break;
            case 'MISSING_COMPONENTS':
                this.consolidatedFindings.rootCause = {
                    type: 'MISSING_COMPONENTS',
                    description: 'Chat interface components are missing or incomplete',
                    priority: 'HIGH',
                    impact: 'Users cannot interact with the chat system'
                };
                break;
            case 'INCOMPLETE_FLOW':
                this.consolidatedFindings.rootCause = {
                    type: 'INCOMPLETE_FLOW',
                    description: 'Data flow between frontend, API, and OpenAI is broken',
                    priority: 'CRITICAL',
                    impact: 'Complete system communication failure'
                };
                break;
            default:
                this.consolidatedFindings.rootCause = {
                    type: 'MULTIPLE_ISSUES',
                    description: 'Multiple critical issues detected',
                    priority: 'CRITICAL',
                    impact: 'System requires comprehensive fixes'
                };
        }

        console.log(`🎯 Root cause identified: ${this.consolidatedFindings.rootCause.type}`);
    }

    async createActionPlan() {
        console.log('📋 Creating comprehensive action plan...');
        
        const rootCause = this.consolidatedFindings.rootCause;
        
        switch (rootCause.type) {
            case 'MISSING_API_ROUTE':
                this.consolidatedFindings.actionPlan = [
                    '1. Create src/app/api/chat/route.js with POST handler',
                    '2. Implement OpenAI integration in the route',
                    '3. Add proper error handling and validation',
                    '4. Test the API endpoint functionality'
                ];
                break;
                
            case 'INVALID_API_KEY':
                this.consolidatedFindings.actionPlan = [
                    '1. Verify OpenAI API key in .env.local',
                    '2. Test API key with OpenAI directly',
                    '3. Update API key if expired or invalid',
                    '4. Ensure proper key format (starts with sk-)'
                ];
                break;
                
            case 'MISSING_COMPONENTS':
                this.consolidatedFindings.actionPlan = [
                    '1. Create ChatInterface component with proper state management',
                    '2. Add form elements for user input',
                    '3. Implement message display functionality',
                    '4. Connect component to API endpoint'
                ];
                break;
                
            case 'INCOMPLETE_FLOW':
                this.consolidatedFindings.actionPlan = [
                    '1. Map complete data flow: Frontend → API → OpenAI → Response',
                    '2. Fix missing integration points',
                    '3. Add error handling at each step',
                    '4. Test end-to-end functionality'
                ];
                break;
                
            default:
                this.consolidatedFindings.actionPlan = [
                    '1. Address all critical issues identified by agents',
                    '2. Implement recommended fixes in priority order',
                    '3. Test each component after fixes',
                    '4. Verify complete system functionality'
                ];
        }

        // Add common final steps
        this.consolidatedFindings.actionPlan.push(
            '5. Run comprehensive tests',
            '6. Monitor for additional issues',
            '7. Document fixes for future reference'
        );
    }

    generateMasterReport() {
        const report = {
            operation: 'HIVE_MIND_DEBUG',
            timestamp: new Date().toISOString(),
            status: this.consolidatedFindings.systemStatus,
            rootCause: this.consolidatedFindings.rootCause,
            actionPlan: this.consolidatedFindings.actionPlan,
            agentReports: this.reports,
            summary: {
                totalAgents: Object.keys(this.reports).length,
                criticalIssues: this.consolidatedFindings.criticalIssues.length,
                recommendations: this.consolidatedFindings.recommendations.length,
                systemHealth: this.consolidatedFindings.systemStatus
            },
            consolidatedFindings: this.consolidatedFindings
        };

        console.log('\n🏆 MASTER COORDINATOR FINAL REPORT:');
        console.log('====================================');
        console.log(`🎯 Root Cause: ${report.rootCause.type}`);
        console.log(`📊 System Status: ${report.status}`);
        console.log(`🚨 Critical Issues: ${report.summary.criticalIssues}`);
        console.log(`📝 Recommendations: ${report.summary.recommendations}`);
        console.log('\n📋 ACTION PLAN:');
        report.actionPlan.forEach((action, index) => {
            console.log(`   ${action}`);
        });

        return report;
    }
}

module.exports = MasterCoordinator;

// Auto-run if called directly
if (require.main === module) {
    const coordinator = new MasterCoordinator();
    coordinator.executeHiveMindDebug().then(report => {
        console.log('\n🏆 OPERATION COMPLETE - Full debugging results generated');
    }).catch(error => {
        console.error('❌ Master coordination failed:', error);
    });
}