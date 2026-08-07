import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { StaffInbox } from '@/components/admin/StaffInbox'
import type { Message } from '@/lib/types'

export const metadata = { title: 'Message centre' }

export type InboxThread = {
  id: string
  subject: string
  kind: string
  is_open: boolean
  last_message_at: string
  unread_for_staff: boolean
  member: { id: string; first_name: string; last_name: string; tier: string; vip: boolean } | null
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: { thread?: string }
}) {
  const staff = await requireStaff()
  const supabase = createClient()

  const { data: threads } = await supabase
    .from('message_threads')
    .select('id, subject, kind, is_open, last_message_at, unread_for_staff, member:profiles(id, first_name, last_name, tier, vip)')
    .order('last_message_at', { ascending: false })
    .limit(200)

  const list = (threads ?? []) as unknown as InboxThread[]
  const activeId = searchParams.thread ?? list[0]?.id

  const { data: messages } = activeId
    ? await supabase.from('messages').select('*').eq('thread_id', activeId).order('created_at')
    : { data: [] }

  return (
    <StaffInbox
      staff={staff}
      threads={list}
      activeThreadId={activeId}
      messages={(messages ?? []) as Message[]}
    />
  )
}
