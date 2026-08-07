import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { MessageCenter } from '@/components/messages/MessageCenter'
import type { Message, MessageThread } from '@/lib/types'

export const metadata = { title: 'Messages' }

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: { thread?: string }
}) {
  const profile = await requireProfile()
  const supabase = createClient()

  const { data: threads } = await supabase
    .from('message_threads')
    .select('*')
    .eq('member_id', profile.id)
    .order('last_message_at', { ascending: false })

  const list = (threads ?? []) as MessageThread[]
  const activeId = searchParams.thread ?? list[0]?.id

  const { data: messages } = activeId
    ? await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', activeId)
        .order('created_at')
    : { data: [] }

  return (
    <MessageCenter
      viewer={profile}
      threads={list}
      activeThreadId={activeId}
      messages={(messages ?? []) as Message[]}
    />
  )
}
