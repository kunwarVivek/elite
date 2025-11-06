import { createFileRoute } from '@tanstack/react-router'
import { ManageUpdatesPage } from '@/pages/updates/manage-updates'

export const Route = createFileRoute('/updates/manage')({
  component: ManageUpdatesPage,
})
