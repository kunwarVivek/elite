import { createFileRoute } from '@tanstack/react-router'
import { PortfolioDashboard } from '@/pages/portfolio/portfolio-dashboard'
import { MobileLayout } from '@/components/portfolio/mobile-layout'

export const Route = createFileRoute('/portfolio')({
  component: PortfolioLayout,
})

function PortfolioLayout() {
  const [currentPage, setCurrentPage] = React.useState('dashboard')

  return (
    <MobileLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      <PortfolioDashboard />
    </MobileLayout>
  )
}