import type { Database } from '@/lib/supabase/types'

type Msg = Pick<
  Database['public']['Tables']['outbound_messages']['Row'],
  | 'id'
  | 'channel'
  | 'direction'
  | 'subject'
  | 'body'
  | 'sender_account'
  | 'status'
  | 'sent_at'
  | 'created_by'
>

type Task = Pick<
  Database['public']['Tables']['outbound_tasks']['Row'],
  'id' | 'title' | 'description' | 'status' | 'due_at' | 'owner_id' | 'completed_at' | 'created_at'
>

type Event =
  | { kind: 'created'; at: string }
  | { kind: 'message'; at: string; data: Msg }
  | { kind: 'task'; at: string; data: Task }

export function ActivityTimeline({
  createdAt,
  messages,
  tasks,
}: {
  createdAt: string
  messages: Msg[]
  tasks: Task[]
}) {
  const events: Event[] = [
    { kind: 'created', at: createdAt } as Event,
    ...messages.map<Event>((m) => ({ kind: 'message', at: m.sent_at, data: m })),
    ...tasks.map<Event>((t) => ({ kind: 'task', at: t.created_at, data: t })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1))

  if (events.length === 1) {
    return (
      <p className="text-[0.85rem] text-muted-warm">
        record created {formatRelative(createdAt)}. no messages or tasks yet.
      </p>
    )
  }

  return (
    <ol className="space-y-3">
      {events.map((e, i) => (
        <li
          key={`${e.kind}-${i}-${e.at}`}
          className="bg-white border border-line/60 rounded-md p-4"
        >
          {e.kind === 'created' ? (
            <p className="text-[0.85rem] text-ink-soft">
              record created · {formatAbsolute(e.at)}
            </p>
          ) : e.kind === 'message' ? (
            <div>
              <div className="flex items-center gap-2 text-[0.75rem] text-muted-warm">
                <span className="uppercase tracking-[0.1em]">
                  {e.data.direction}
                </span>
                <span>·</span>
                <span>{e.data.channel}</span>
                <span>·</span>
                <span>{e.data.status}</span>
                {e.data.sender_account ? (
                  <>
                    <span>·</span>
                    <span>{e.data.sender_account}</span>
                  </>
                ) : null}
                <span className="ml-auto">{formatAbsolute(e.at)}</span>
              </div>
              {e.data.subject ? (
                <p className="mt-1 text-[0.9rem] font-medium">
                  {e.data.subject}
                </p>
              ) : null}
              <p className="mt-1 text-[0.85rem] text-ink-soft whitespace-pre-line line-clamp-4">
                {e.data.body}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-[0.75rem] text-muted-warm">
                <span className="uppercase tracking-[0.1em]">task</span>
                <span>·</span>
                <span>{e.data.status}</span>
                {e.data.due_at ? (
                  <>
                    <span>·</span>
                    <span>due {formatAbsolute(e.data.due_at)}</span>
                  </>
                ) : null}
                <span className="ml-auto">{formatAbsolute(e.at)}</span>
              </div>
              <p className="mt-1 text-[0.9rem] font-medium">{e.data.title}</p>
              {e.data.description ? (
                <p className="mt-1 text-[0.85rem] text-ink-soft whitespace-pre-line">
                  {e.data.description}
                </p>
              ) : null}
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRelative(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const day = 24 * 60 * 60 * 1000
  if (diff < day) return 'today'
  if (diff < 2 * day) return 'yesterday'
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`
  return new Date(iso).toLocaleDateString()
}
