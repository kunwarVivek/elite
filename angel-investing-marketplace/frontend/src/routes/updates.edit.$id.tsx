import { createFileRoute } from '@tantml:router'
import { EditUpdatePage } from '@/pages/updates/edit-update'

export const Route = createFileRoute('/updates/edit/$id')({
  component: EditUpdatePage,
})
