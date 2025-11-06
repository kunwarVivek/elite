import { createFileRoute } from '@tanstack/react-router'
import { CreateUpdatePage } from '@/pages/updates/create-update'

export const Route = createFileRoute('/updates/create')({
  component: CreateUpdatePage,
})
