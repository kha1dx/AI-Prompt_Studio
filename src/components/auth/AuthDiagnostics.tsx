'use client'

/**
 * Authentication Diagnostics Component
 * Interactive component for testing and debugging authentication issues
 */
import React, { useState, useCallback } from 'react'
import { runCompleteDiagnostics, quickHealthCheck, type AuthTestSuite, type ConnectionTestSuite } from '../../utils/diagnostics'

interface DiagnosticsState {
  running: boolean
  results: any
  logs: string[]
  lastRun: Date | null
  error: string | null
}

export default function AuthDiagnostics() {
  const [state, setState] = useState<DiagnosticsState>({
    running: false,
    results: null,
    logs: [],
    lastRun: null,
    error: null
  })

  const [testConfig, setTestConfig] = useState({
    includeFlowTests: true,
    includeConnectivityTests: true,
    testEmail: '',
    testPassword: '',
    verbose: true
  })

  const addLog = useCallback((message: string) => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, `${new Date().toISOString()}: ${message}`]
    }))
  }, [])

  const runQuickCheck = async () => {
    setState(prev => ({ ...prev, running: true, error: null, logs: [] }))
    addLog('Starting quick health check...')
    
    try {
      const result = await quickHealthCheck()
      addLog(`Quick check ${result ? 'passed' : 'failed'}`)
      setState(prev => ({
        ...prev,
        running: false,
        results: { quickCheck: result },
        lastRun: new Date()
      }))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      addLog(`Error: ${errorMsg}`)
      setState(prev => ({
        ...prev,
        running: false,
        error: errorMsg,
        lastRun: new Date()
      }))
    }
  }

  const runFullDiagnostics = async () => {
    setState(prev => ({ ...prev, running: true, error: null, logs: [] }))
    addLog('Starting complete diagnostics suite...')
    
    try {
      const config = {
        ...testConfig,
        testEmail: testConfig.testEmail || `test.${Date.now()}@example.com`
      }
      
      addLog(`Using test email: ${config.testEmail}`)
      
      const results = await runCompleteDiagnostics(config)
      
      addLog(`Diagnostics completed: ${results.summary.passedTests}/${results.summary.totalTests} tests passed`)
      
      setState(prev => ({
        ...prev,
        running: false,
        results,
        lastRun: new Date()
      }))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      addLog(`Error: ${errorMsg}`)
      setState(prev => ({
        ...prev,
        running: false,
        error: errorMsg,
        lastRun: new Date()
      }))
    }
  }

  const clearResults = () => {
    setState({
      running: false,
      results: null,
      logs: [],
      lastRun: null,
      error: null
    })
  }

  const downloadResults = () => {
    if (!state.results) return

    const data = {
      timestamp: new Date().toISOString(),
      config: testConfig,
      results: state.results,
      logs: state.logs
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `auth-diagnostics-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Authentication Diagnostics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive testing and debugging tools for authentication issues
        </p>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Test Configuration</h2>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={testConfig.includeFlowTests}
                onChange={(e) => setTestConfig(prev => ({ ...prev, includeFlowTests: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include Authentication Flow Tests</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={testConfig.includeConnectivityTests}
                onChange={(e) => setTestConfig(prev => ({ ...prev, includeConnectivityTests: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include Connectivity Tests</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={testConfig.verbose}
                onChange={(e) => setTestConfig(prev => ({ ...prev, verbose: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Verbose Logging</span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Test Email (optional)
            </label>
            <input
              type="email"
              value={testConfig.testEmail}
              onChange={(e) => setTestConfig(prev => ({ ...prev, testEmail: e.target.value }))}
              placeholder="test@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Test Password (optional)
            </label>
            <input
              type="password"
              value={testConfig.testPassword}
              onChange={(e) => setTestConfig(prev => ({ ...prev, testPassword: e.target.value }))}
              placeholder="TestPassword123!"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Actions</h2>
          
          <div className="space-y-3">
            <button
              onClick={runQuickCheck}
              disabled={state.running}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors"
            >
              {state.running ? 'Running...' : 'Quick Health Check'}
            </button>

            <button
              onClick={runFullDiagnostics}
              disabled={state.running}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-md transition-colors"
            >
              {state.running ? 'Running...' : 'Full Diagnostics Suite'}
            </button>

            {state.results && (
              <>
                <button
                  onClick={downloadResults}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors"
                >
                  Download Results
                </button>

                <button
                  onClick={clearResults}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors"
                >
                  Clear Results
                </button>
              </>
            )}
          </div>

          {state.lastRun && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Last run: {state.lastRun.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      {state.running && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-800 dark:text-blue-200 font-medium">Running diagnostics...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <h3 className="text-red-800 dark:text-red-200 font-medium mb-2">Error</h3>
          <pre className="text-red-700 dark:text-red-300 text-sm whitespace-pre-wrap">{state.error}</pre>
        </div>
      )}

      {/* Results */}
      {state.results && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Results</h2>
          
          {/* Quick results summary */}
          {state.results.summary && (
            <div className={`p-4 rounded-md ${
              state.results.success 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-medium ${
                  state.results.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                }`}>
                  {state.results.success ? '✅ All Tests Passed' : '❌ Some Tests Failed'}
                </h3>
                <span className={`text-sm ${
                  state.results.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {state.results.summary.passedTests}/{state.results.summary.totalTests} passed
                </span>
              </div>
              
              {state.results.summary.errors?.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">Errors:</p>
                  {state.results.summary.errors.map((error: string, index: number) => (
                    <p key={index} className="text-sm text-red-600 dark:text-red-400">• {error}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Environment Results */}
          {state.results.environment && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Environment Validation</h3>
              <div className="space-y-2">
                {state.results.environment.results.map((result: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{result.variable}</span>
                    <span className={`font-medium ${
                      result.valid ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {result.valid ? '✅ Valid' : '❌ Invalid'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connection Results */}
          {state.results.connection && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Connection Tests</h3>
              <div className="space-y-2">
                {Object.entries(state.results.connection).map(([key, result]: [string, any]) => {
                  if (key === 'overall') return null
                  return (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className={`font-medium ${
                        result.success ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.success ? '✅ Passed' : '❌ Failed'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Flow Results */}
          {state.results.flows && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Authentication Flows</h3>
              <div className="space-y-2">
                {Object.entries(state.results.flows.results).map(([key, result]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{result.flowName}</span>
                    <span className={`font-medium ${
                      result.success ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {result.success ? '✅ Passed' : '❌ Failed'} ({result.totalDuration}ms)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Logs */}
      {state.logs.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Execution Log</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm max-h-96 overflow-y-auto">
            {state.logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Help */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <h3 className="text-blue-800 dark:text-blue-200 font-medium mb-2">How to use this tool:</h3>
        <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
          <li>• <strong>Quick Health Check</strong>: Runs basic environment and connectivity tests</li>
          <li>• <strong>Full Diagnostics Suite</strong>: Comprehensive testing including auth flows</li>
          <li>• <strong>Test Email/Password</strong>: Optional custom credentials (auto-generated if empty)</li>
          <li>• <strong>Download Results</strong>: Save detailed results as JSON for sharing or analysis</li>
          <li>• Check the browser console for detailed logging output</li>
        </ul>
      </div>
    </div>
  )
}