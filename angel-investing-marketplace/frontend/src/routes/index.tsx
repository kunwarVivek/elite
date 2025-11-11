import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  TrendingUp,
  Shield,
  Users,
  Zap,
  Check,
  ArrowRight,
  BarChart3,
  FileText,
  Lock,
  Globe,
  Star
} from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const isAuthenticated = localStorage.getItem('auth_token')
    if (isAuthenticated) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LandingPage,
})

function LandingPage() {
  const [email, setEmail] = useState('')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300">
              ✨ Trusted by 1,000+ investors and 500+ startups
            </Badge>

            <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-7xl">
              Invest in Tomorrow's
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent"> Unicorns</span>
            </h1>

            <p className="mb-10 text-xl leading-8 text-gray-600 dark:text-gray-300">
              The premier angel investing marketplace connecting sophisticated investors with
              high-potential startups. Deal flow, due diligence, and portfolio management—all in one platform.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/auth/register">
                <Button size="lg" className="h-14 px-8 text-lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                  View Pricing
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Free 14-day trial • No credit card required • Cancel anytime
            </p>

            {/* Trust Badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Shield className="h-5 w-5 text-green-600" />
                SOC 2 Certified
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Lock className="h-5 w-5 text-green-600" />
                256-bit Encryption
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Globe className="h-5 w-5 text-green-600" />
                SEC Compliant
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-white py-12 dark:border-gray-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">$500M+</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Capital Deployed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">2,000+</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Deals Completed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">73%</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">15hrs</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Saved Per Week</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Built for Angel Investors Who Mean Business
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Stop juggling spreadsheets and email threads. Get a complete investment management platform.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-7xl gap-8 lg:grid-cols-3">
            <Card className="border-2 hover:border-blue-500 transition-all">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Curated Deal Flow</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Access pre-vetted, high-quality startups. All companies undergo rigorous screening before listing.
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600">
                  <Check className="h-4 w-4" />
                  Save 10+ hours per week
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-blue-500 transition-all">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Automated Deal Management</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  SAFE agreements, convertible notes, cap tables, and term sheets—all managed automatically.
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-green-600">
                  <Check className="h-4 w-4" />
                  Reduce errors by 95%
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-blue-500 transition-all">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Portfolio Intelligence</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Real-time analytics, dilution modeling, and exit waterfall calculations at your fingertips.
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-purple-600">
                  <Check className="h-4 w-4" />
                  2x better decision-making
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 px-6 py-24 dark:bg-slate-900 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Everything You Need to Invest Like a Pro
            </h2>
          </div>

          <div className="mx-auto mt-16 max-w-7xl">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Users, title: 'Deal Syndication', desc: 'Co-invest with other angels and leverage collective due diligence' },
                { icon: Shield, title: 'SEC Compliance', desc: 'Built-in Reg D 506(c) compliance and accreditation verification' },
                { icon: FileText, title: 'Document Automation', desc: 'Generate SAFEs, term sheets, and shareholder agreements instantly' },
                { icon: BarChart3, title: 'Cap Table Management', desc: 'Track ownership, model dilution, and analyze exit scenarios' },
                { icon: TrendingUp, title: 'Portfolio Tracking', desc: 'Monitor your investments with real-time valuations and metrics' },
                { icon: Zap, title: 'Smart Workflows', desc: 'Automated notifications, reminders, and follow-up tasks' },
              ].map((feature, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                      <feature.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Loved by Angel Investors
            </h2>
          </div>

          <div className="mx-auto mt-16 grid max-w-7xl gap-8 md:grid-cols-3">
            {[
              {
                quote: "This platform cut my deal evaluation time in half. The cap table modeling alone is worth it.",
                author: "Sarah Chen",
                role: "Angel Investor, 15+ deals"
              },
              {
                quote: "Finally, a professional platform for angel investing. The compliance features give me peace of mind.",
                author: "Michael Rodriguez",
                role: "Former VP at Goldman Sachs"
              },
              {
                quote: "The syndication feature is a game-changer. I've co-invested on 8 deals in just 6 months.",
                author: "Jennifer Park",
                role: "Tech Entrepreneur & Angel"
              }
            ].map((testimonial, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="mb-4 flex">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="mb-4 text-gray-700 dark:text-gray-300">"{testimonial.quote}"</p>
                  <div className="border-t pt-4">
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 px-6 py-24 dark:bg-blue-700 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Start Investing Smarter Today
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Join 1,000+ angel investors who have already transformed their deal flow. No credit card required.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/auth/register">
              <Button size="lg" variant="secondary" className="h-14 px-8 text-lg">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="h-14 border-white px-8 text-lg text-white hover:bg-blue-700">
                See Pricing
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-blue-100">
            14-day free trial • Full access to all features • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-12 dark:border-gray-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="text-xl font-bold">AngelMarket</div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Professional angel investing platform
              </p>
            </div>
            <div>
              <div className="mb-3 font-semibold">Product</div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link to="/pricing" className="hover:text-blue-600">Pricing</Link></li>
                <li><a href="#" className="hover:text-blue-600">Features</a></li>
                <li><a href="#" className="hover:text-blue-600">Security</a></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 font-semibold">Company</div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-blue-600">About</a></li>
                <li><a href="#" className="hover:text-blue-600">Blog</a></li>
                <li><a href="#" className="hover:text-blue-600">Careers</a></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 font-semibold">Legal</div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-blue-600">Privacy</a></li>
                <li><a href="#" className="hover:text-blue-600">Terms</a></li>
                <li><a href="#" className="hover:text-blue-600">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            © 2025 AngelMarket. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
