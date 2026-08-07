import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireStaff } from '@/lib/auth'
import { getMemberDossier } from '@/lib/queries'
import { MemberDossierView } from '@/components/admin/MemberDossierView'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { profile } = await getMemberDossier(params.id)
  return { title: profile ? `${profile.first_name} ${profile.last_name}` : 'Member' }
}

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const staff = await requireStaff()
  const dossier = await getMemberDossier(params.id)
  if (!dossier.profile) notFound()

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/members"
        className="mb-5 inline-flex items-center gap-2 text-xs text-cream-muted hover:text-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All members
      </Link>

      <MemberDossierView dossier={dossier} staff={staff} />
    </div>
  )
}
