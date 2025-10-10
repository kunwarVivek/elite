function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Angel Investing Marketplace
              </h1>
            </div>
            <nav className="flex space-x-8">
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Startups
              </a>
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Investors
              </a>
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Deals
              </a>
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Portfolio
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Angel Investing Marketplace
              </h2>
              <p className="text-gray-600 mb-6">
                Connect with innovative startups and sophisticated investors
              </p>
              <div className="space-x-4">
                <button className="btn-primary">
                  Browse Startups
                </button>
                <button className="btn-secondary">
                  Join as Investor
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App