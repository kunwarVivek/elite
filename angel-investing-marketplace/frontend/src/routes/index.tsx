import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuth } from '@/providers/AuthProvider'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // Redirect authenticated users to dashboard
    const isAuthenticated = localStorage.getItem('auth_token')
    if (isAuthenticated) {
      throw redirect({
        to: '/dashboard',
      })
    }
  },
  component: () => <HomePage />,
})

function HomePage() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return null // Will redirect via beforeLoad
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-angel-50 to-primary-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Connect with the Future of Innovation
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Join the premier angel investing marketplace where visionary entrepreneurs
            meet sophisticated investors to build tomorrow's unicorns.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/auth/register"
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
            >
              Start Investing Today
            </a>
            <a
              href="/auth/login"
              className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-8 rounded-lg border border-gray-300 transition-colors duration-200"
            >
              Sign In as Investor
            </a>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-angel-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-angel-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
              <p className="text-gray-600">Discover and invest in promising startups with our streamlined platform</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Verified Opportunities</h3>
              <p className="text-gray-600">All startups are thoroughly vetted and verified before listing</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Expert Network</h3>
              <p className="text-gray-600">Connect with experienced angels and successful entrepreneurs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}