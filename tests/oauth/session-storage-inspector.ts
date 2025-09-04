/**
 * SESSION STORAGE INSPECTOR FOR OAUTH PKCE
 * 
 * Comprehensive inspection and debugging tool for session storage operations
 * in OAuth PKCE flows. Helps identify and resolve storage-related issues.
 */

interface StorageEvent {
  timestamp: number
  operation: 'set' | 'get' | 'remove' | 'clear'
  key: string
  value?: string
  success: boolean
  error?: string
  metadata?: Record<string, any>
}

interface StorageSnapshot {
  timestamp: number
  keys: string[]
  values: Record<string, string>
  totalSize: number
  keyCount: number
}

interface StorageHealth {
  available: boolean
  quotaExceeded: boolean
  keysWorking: boolean
  persistenceWorking: boolean
  crossTabWorking: boolean
  issues: string[]
  recommendations: string[]
}

export class SessionStorageInspector {
  private events: StorageEvent[] = []
  private snapshots: StorageSnapshot[] = []
  private watchedKeys: Set<string> = new Set()
  private originalSessionStorage: Storage
  private proxiedStorage: Storage
  private isMonitoring: boolean = false

  constructor() {
    this.originalSessionStorage = typeof window !== 'undefined' ? window.sessionStorage : this.createMockStorage()
    this.proxiedStorage = this.createProxiedStorage()
    
    console.log('🔍 [STORAGE-INSPECTOR] Session Storage Inspector initialized')
    
    // Auto-watch PKCE-related keys
    this.watchKey('pkce-code-verifier')
    this.watchKey('pkce-state')
    this.watchKey('oauth-session-id')
    this.watchKey('oauth-redirect-url')
  }

  /**
   * Start monitoring session storage operations
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    
    // Replace global sessionStorage with proxied version
    if (typeof window !== 'undefined') {
      (window as any).sessionStorage = this.proxiedStorage
    }

    this.takeSnapshot('monitoring-started')
    console.log('📊 [STORAGE-INSPECTOR] Monitoring started')
  }

  /**
   * Stop monitoring and restore original sessionStorage
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    
    // Restore original sessionStorage
    if (typeof window !== 'undefined') {
      (window as any).sessionStorage = this.originalSessionStorage
    }

    this.takeSnapshot('monitoring-stopped')
    console.log('⏹️ [STORAGE-INSPECTOR] Monitoring stopped')
  }

  /**
   * Add a key to watch for changes
   */
  public watchKey(key: string): void {
    this.watchedKeys.add(key)
    console.log(`👀 [STORAGE-INSPECTOR] Now watching key: ${key}`)
  }

  /**
   * Remove a key from watch list
   */
  public unwatchKey(key: string): void {
    this.watchedKeys.delete(key)
    console.log(`👁️ [STORAGE-INSPECTOR] Stopped watching key: ${key}`)
  }

  /**
   * Take a snapshot of current storage state
   */
  public takeSnapshot(label?: string): StorageSnapshot {
    const keys: string[] = []
    const values: Record<string, string> = {}
    let totalSize = 0

    // Get all keys and values
    for (let i = 0; i < this.originalSessionStorage.length; i++) {
      const key = this.originalSessionStorage.key(i)
      if (key) {
        keys.push(key)
        const value = this.originalSessionStorage.getItem(key) || ''
        values[key] = value
        totalSize += key.length + value.length
      }
    }

    const snapshot: StorageSnapshot = {
      timestamp: Date.now(),
      keys,
      values,
      totalSize,
      keyCount: keys.length
    }

    this.snapshots.push(snapshot)

    if (label) {
      console.log(`📸 [STORAGE-INSPECTOR] Snapshot taken: ${label}`)
      console.log(`   Keys: ${snapshot.keyCount}`)
      console.log(`   Total size: ${snapshot.totalSize} bytes`)
    }

    return snapshot
  }

  /**
   * Check storage health and identify issues
   */
  public async checkStorageHealth(): Promise<StorageHealth> {
    console.log('🩺 [STORAGE-INSPECTOR] Checking storage health...')

    const health: StorageHealth = {
      available: false,
      quotaExceeded: false,
      keysWorking: false,
      persistenceWorking: false,
      crossTabWorking: false,
      issues: [],
      recommendations: []
    }

    try {
      // Test 1: Basic availability
      health.available = !!this.originalSessionStorage

      if (!health.available) {
        health.issues.push('SessionStorage is not available')
        health.recommendations.push('Check browser support and privacy settings')
        return health
      }

      // Test 2: Basic operations
      const testKey = `__storage_test_${Date.now()}`
      const testValue = 'test-value-12345'

      try {
        this.originalSessionStorage.setItem(testKey, testValue)
        const retrievedValue = this.originalSessionStorage.getItem(testKey)
        health.keysWorking = retrievedValue === testValue
        this.originalSessionStorage.removeItem(testKey)

        if (!health.keysWorking) {
          health.issues.push('Basic key operations not working')
          health.recommendations.push('Check if storage is disabled or full')
        }
      } catch (error) {
        health.issues.push(`Key operations failed: ${(error as Error).message}`)
        if ((error as Error).message.includes('QuotaExceededError')) {
          health.quotaExceeded = true
          health.recommendations.push('Clear unnecessary data from sessionStorage')
        }
      }

      // Test 3: Persistence within same tab
      const persistenceKey = `__persistence_test_${Date.now()}`
      const persistenceValue = `persistence-${Math.random()}`

      try {
        this.originalSessionStorage.setItem(persistenceKey, persistenceValue)
        
        // Simulate page navigation by checking if value persists
        setTimeout(() => {
          const persistedValue = this.originalSessionStorage.getItem(persistenceKey)
          health.persistenceWorking = persistedValue === persistenceValue
          this.originalSessionStorage.removeItem(persistenceKey)

          if (!health.persistenceWorking) {
            health.issues.push('Storage persistence not working')
            health.recommendations.push('Check if storage is being cleared between operations')
          }
        }, 100)

      } catch (error) {
        health.issues.push(`Persistence test failed: ${(error as Error).message}`)
      }

      // Test 4: PKCE-specific keys
      const pkceKeys = ['pkce-code-verifier', 'pkce-state', 'oauth-session-id']
      for (const key of pkceKeys) {
        try {
          const testValue = `test-${key}-${Date.now()}`
          this.originalSessionStorage.setItem(key, testValue)
          const retrieved = this.originalSessionStorage.getItem(key)
          
          if (retrieved !== testValue) {
            health.issues.push(`PKCE key ${key} not working properly`)
          }
          
          this.originalSessionStorage.removeItem(key)
        } catch (error) {
          health.issues.push(`PKCE key ${key} failed: ${(error as Error).message}`)
        }
      }

      // Test 5: Storage size limits
      try {
        const largeValue = 'x'.repeat(1024 * 1024) // 1MB
        const sizeTestKey = '__size_test'
        
        this.originalSessionStorage.setItem(sizeTestKey, largeValue)
        this.originalSessionStorage.removeItem(sizeTestKey)
      } catch (error) {
        if ((error as Error).message.includes('QuotaExceededError')) {
          health.quotaExceeded = true
          health.issues.push('Storage quota is limited or exceeded')
          health.recommendations.push('Monitor and clean up storage usage')
        }
      }

    } catch (error) {
      health.issues.push(`General storage error: ${(error as Error).message}`)
      health.recommendations.push('Check browser console for detailed errors')
    }

    // Log health report
    console.log('🩺 [STORAGE-INSPECTOR] Health Check Complete')
    console.log(`   Available: ${health.available ? '✅' : '❌'}`)
    console.log(`   Keys Working: ${health.keysWorking ? '✅' : '❌'}`)
    console.log(`   Persistence: ${health.persistenceWorking ? '✅' : '❌'}`)
    console.log(`   Quota Issues: ${health.quotaExceeded ? '⚠️' : '✅'}`)
    
    if (health.issues.length > 0) {
      console.log('   Issues:')
      health.issues.forEach(issue => console.log(`     • ${issue}`))
      console.log('   Recommendations:')
      health.recommendations.forEach(rec => console.log(`     • ${rec}`))
    }

    return health
  }

  /**
   * Inspect PKCE-specific storage operations
   */
  public inspectPKCEStorage(): Record<string, any> {
    console.log('🔐 [STORAGE-INSPECTOR] Inspecting PKCE storage...')

    const pkceData = {
      codeVerifier: this.originalSessionStorage.getItem('pkce-code-verifier'),
      state: this.originalSessionStorage.getItem('pkce-state'),
      sessionId: this.originalSessionStorage.getItem('oauth-session-id'),
      redirectUrl: this.originalSessionStorage.getItem('oauth-redirect-url')
    }

    const analysis = {
      hasCodeVerifier: !!pkceData.codeVerifier,
      codeVerifierLength: pkceData.codeVerifier?.length || 0,
      codeVerifierValid: pkceData.codeVerifier ? this.validateCodeVerifier(pkceData.codeVerifier) : false,
      hasState: !!pkceData.state,
      stateLength: pkceData.state?.length || 0,
      hasSessionId: !!pkceData.sessionId,
      hasRedirectUrl: !!pkceData.redirectUrl,
      allRequiredPresent: !!(pkceData.codeVerifier && pkceData.state)
    }

    const report = {
      pkceData: {
        ...pkceData,
        codeVerifier: pkceData.codeVerifier ? pkceData.codeVerifier.substring(0, 10) + '...' : null
      },
      analysis,
      issues: [] as string[],
      recommendations: [] as string[]
    }

    // Identify issues
    if (!analysis.hasCodeVerifier) {
      report.issues.push('Code verifier is missing from storage')
      report.recommendations.push('Ensure code verifier is stored during OAuth initiation')
    }

    if (!analysis.codeVerifierValid && analysis.hasCodeVerifier) {
      report.issues.push('Code verifier format is invalid')
      report.recommendations.push('Check code verifier generation and storage process')
    }

    if (!analysis.hasState) {
      report.issues.push('OAuth state is missing from storage')
      report.recommendations.push('Ensure state is generated and stored with code verifier')
    }

    console.log('🔐 [STORAGE-INSPECTOR] PKCE Storage Analysis')
    console.log(`   Code Verifier: ${analysis.hasCodeVerifier ? '✅' : '❌'} (${analysis.codeVerifierLength} chars)`)
    console.log(`   State: ${analysis.hasState ? '✅' : '❌'} (${analysis.stateLength} chars)`)
    console.log(`   Session ID: ${analysis.hasSessionId ? '✅' : '❌'}`)
    console.log(`   All Required: ${analysis.allRequiredPresent ? '✅' : '❌'}`)

    return report
  }

  /**
   * Get storage events filtered by key
   */
  public getEventsForKey(key: string): StorageEvent[] {
    return this.events.filter(event => event.key === key)
  }

  /**
   * Get all events within a time range
   */
  public getEventsInTimeRange(startTime: number, endTime: number): StorageEvent[] {
    return this.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    )
  }

  /**
   * Export inspection data
   */
  public exportInspectionData(): string {
    const data = {
      events: this.events,
      snapshots: this.snapshots,
      watchedKeys: Array.from(this.watchedKeys),
      exportTime: Date.now(),
      inspectorVersion: '1.0.0'
    }

    return JSON.stringify(data, null, 2)
  }

  /**
   * Clear inspection data
   */
  public clearInspectionData(): void {
    this.events = []
    this.snapshots = []
    console.log('🧹 [STORAGE-INSPECTOR] Inspection data cleared')
  }

  // Private helper methods
  private createProxiedStorage(): Storage {
    const inspector = this
    
    return new Proxy(this.originalSessionStorage, {
      get(target, prop) {
        if (prop === 'setItem') {
          return function(key: string, value: string) {
            inspector.logStorageEvent('set', key, value)
            return target.setItem.call(target, key, value)
          }
        }
        
        if (prop === 'getItem') {
          return function(key: string) {
            const value = target.getItem.call(target, key)
            inspector.logStorageEvent('get', key, value || undefined)
            return value
          }
        }
        
        if (prop === 'removeItem') {
          return function(key: string) {
            inspector.logStorageEvent('remove', key)
            return target.removeItem.call(target, key)
          }
        }
        
        if (prop === 'clear') {
          return function() {
            inspector.logStorageEvent('clear', '')
            return target.clear.call(target)
          }
        }
        
        return target[prop as keyof Storage]
      }
    })
  }

  private logStorageEvent(operation: StorageEvent['operation'], key: string, value?: string): void {
    const event: StorageEvent = {
      timestamp: Date.now(),
      operation,
      key,
      value,
      success: true
    }

    this.events.push(event)

    // Log to console if watching this key
    if (this.watchedKeys.has(key) || key === '') {
      console.log(`📝 [STORAGE-INSPECTOR] ${operation.toUpperCase()} ${key}${value ? ` = ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}` : ''}`)
    }
  }

  private validateCodeVerifier(verifier: string): boolean {
    return verifier.length >= 43 && 
           verifier.length <= 128 && 
           /^[A-Za-z0-9\-._~]+$/.test(verifier)
  }

  private createMockStorage(): Storage {
    const storage = new Map<string, string>()
    
    return {
      setItem: (key: string, value: string) => storage.set(key, value),
      getItem: (key: string) => storage.get(key) || null,
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
      key: (index: number) => Array.from(storage.keys())[index] || null,
      get length() { return storage.size }
    }
  }

  /**
   * Browser console helper methods
   */
  public debug = {
    start: () => this.startMonitoring(),
    stop: () => this.stopMonitoring(),
    snapshot: (label?: string) => this.takeSnapshot(label),
    health: () => this.checkStorageHealth(),
    pkce: () => this.inspectPKCEStorage(),
    events: (key?: string) => key ? this.getEventsForKey(key) : this.events,
    export: () => this.exportInspectionData(),
    clear: () => this.clearInspectionData(),
    watch: (key: string) => this.watchKey(key),
    unwatch: (key: string) => this.unwatchKey(key)
  }
}

// Global instance
export const sessionStorageInspector = new SessionStorageInspector()

// Browser console access
if (typeof window !== 'undefined') {
  (window as any).__storageInspector = sessionStorageInspector.debug
}