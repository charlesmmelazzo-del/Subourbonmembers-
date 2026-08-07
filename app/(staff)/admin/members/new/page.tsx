import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireStaff } from '@/lib/auth'
import { NewMemberForm } from '@/components/admin/NewMemberForm'

export const metadata = { title: 'Add a member' }

export default async function NewMemberPage() {
  await requireStaff()

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/members"
        className="mb-5 inline-flex items-center gap-2 text-xs text-cream-muted hover:text-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All members
      </Link>

      <header className="mb-6">
        <p className="label">New membership</p>
        <h1 className="mt-1.5 font-display text-3xl">Add a member</h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-cream-muted">
          They receive an email inviting them to set a password. Nothing is sent until you
          save.
        </p>
      </header>

      <NewMemberForm />
    </div>
  )
}
