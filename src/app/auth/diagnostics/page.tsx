import AuthDiagnostics from '../../../components/auth/AuthDiagnostics'

export const metadata = {
  title: 'Authentication Diagnostics - Prompt Studio',
  description: 'Comprehensive testing and debugging tools for authentication issues'
}

export default function AuthDiagnosticsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <AuthDiagnostics />
    </div>
  )
}