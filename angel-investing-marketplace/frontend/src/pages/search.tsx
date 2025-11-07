import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import {
  Search,
  TrendingUp,
  Building2,
  Users,
  Briefcase,
  FileText,
  User,
  Filter,
  X,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'INVESTMENT' | 'PITCH' | 'SYNDICATE' | 'SPV' | 'USER' | 'UPDATE';
  title: string;
  description: string;
  url: string;
  metadata?: {
    amount?: number;
    status?: string;
    memberCount?: number;
    date?: Date;
    avatarUrl?: string;
  };
}

type SearchFilter = 'all' | 'INVESTMENT' | 'PITCH' | 'SYNDICATE' | 'SPV' | 'USER' | 'UPDATE';

export default function GlobalSearchPage() {
  const search = useSearch({ from: '/search' });
  const navigate = useNavigate();

  const [query, setQuery] = useState((search as any).q || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const queryParam = (search as any).q;
    if (queryParam) {
      setQuery(queryParam);
      performSearch(queryParam);
    }
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);

      const params = new URLSearchParams();
      params.append('q', searchQuery);
      if (filter !== 'all') {
        params.append('type', filter);
      }

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();
      setResults(data.data || []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
    navigate({ to: '/search', search: { q: query } });
  };

  const handleFilterChange = (newFilter: SearchFilter) => {
    setFilter(newFilter);
    if (hasSearched) {
      performSearch(query);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'INVESTMENT':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'PITCH':
        return <Briefcase className="h-5 w-5 text-green-600" />;
      case 'SYNDICATE':
        return <Users className="h-5 w-5 text-purple-600" />;
      case 'SPV':
        return <Building2 className="h-5 w-5 text-orange-600" />;
      case 'USER':
        return <User className="h-5 w-5 text-indigo-600" />;
      case 'UPDATE':
        return <FileText className="h-5 w-5 text-gray-600" />;
      default:
        return <Search className="h-5 w-5 text-gray-600" />;
    }
  };

  const getResultTypeLabel = (type: string) => {
    switch (type) {
      case 'INVESTMENT':
        return 'Investment';
      case 'PITCH':
        return 'Pitch';
      case 'SYNDICATE':
        return 'Syndicate';
      case 'SPV':
        return 'SPV';
      case 'USER':
        return 'User';
      case 'UPDATE':
        return 'Update';
      default:
        return type;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredResults = filter === 'all'
    ? results
    : results.filter(r => r.type === filter);

  const resultCounts = {
    all: results.length,
    INVESTMENT: results.filter(r => r.type === 'INVESTMENT').length,
    PITCH: results.filter(r => r.type === 'PITCH').length,
    SYNDICATE: results.filter(r => r.type === 'SYNDICATE').length,
    SPV: results.filter(r => r.type === 'SPV').length,
    USER: results.filter(r => r.type === 'USER').length,
    UPDATE: results.filter(r => r.type === 'UPDATE').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Search className="h-8 w-8 text-blue-600" />
            Search
          </h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for investments, pitches, syndicates, SPVs, users..."
                className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setHasSearched(false);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        {hasSearched && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Filter className="h-5 w-5 text-gray-600 flex-shrink-0" />
              <div className="flex gap-2">
                {(['all', 'INVESTMENT', 'PITCH', 'SYNDICATE', 'SPV', 'USER', 'UPDATE'] as SearchFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => handleFilterChange(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                      filter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'all' ? 'All' : getResultTypeLabel(f)}
                    {resultCounts[f] > 0 && (
                      <span className={`ml-1 ${filter === f ? 'text-blue-200' : 'text-gray-500'}`}>
                        ({resultCounts[f]})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Searching...</p>
          </div>
        ) : !hasSearched ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Search the platform</h3>
            <p className="text-gray-600 mb-6">
              Find investments, pitches, syndicates, SPVs, users, and more
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-sm text-gray-500">Try searching for:</span>
              {['SaaS', 'FinTech', 'Series A', 'AI'].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setQuery(term);
                    performSearch(term);
                  }}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 transition"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">
              Try different keywords or adjust your filters
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Found {filteredResults.length} {filteredResults.length === 1 ? 'result' : 'results'} for "{query}"
              </p>
            </div>

            <div className="space-y-3">
              {filteredResults.map((result) => (
                <Link
                  key={result.id}
                  to={result.url}
                  className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition group"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon or Avatar */}
                    <div className="flex-shrink-0">
                      {result.type === 'USER' && result.metadata?.avatarUrl ? (
                        <img
                          src={result.metadata.avatarUrl}
                          alt={result.title}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <div className="p-3 bg-gray-100 rounded-lg">
                          {getResultIcon(result.type)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
                              {result.title}
                            </h3>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-medium">
                              {getResultTypeLabel(result.type)}
                            </span>
                          </div>
                          <p className="text-gray-600 line-clamp-2">{result.description}</p>
                        </div>

                        {/* Metadata */}
                        <div className="flex-shrink-0 text-right">
                          {result.metadata?.amount && (
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(result.metadata.amount)}
                            </p>
                          )}
                          {result.metadata?.status && (
                            <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                              result.metadata.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : result.metadata.status === 'FUNDED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {result.metadata.status}
                            </span>
                          )}
                          {result.metadata?.memberCount !== undefined && (
                            <p className="text-sm text-gray-600 mt-1">
                              {result.metadata.memberCount} {result.metadata.memberCount === 1 ? 'member' : 'members'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      {result.metadata?.date && (
                        <p className="text-xs text-gray-500">
                          {new Date(result.metadata.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
