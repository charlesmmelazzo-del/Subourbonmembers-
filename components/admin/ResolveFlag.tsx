'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function ResolveFlag({ flagId, staffId }: { flagId: string; staffId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  return (
    <button
      onClick={async () => {
        setBusy(true)
        await createClient()
          .from('member_flags')
          .update({ resolved_at: new Date().toISOString(), resolved_by: staffId })
          .eq('id', flagId)
        setBusy(false)
        router.refresh()
      }}
      disabled={busy}
      aria-label="Mark resolved"
      className="shrink-0 rounded-lg p-2 text-cream-muted transition-colors hover:text-gold"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
    </button>
  )
}
