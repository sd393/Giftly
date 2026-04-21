'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Database, Json } from '@/lib/supabase/types'

import { updateMessageStatus } from '../_actions'

type MessageStatus = Database['public']['Enums']['message_status']
type MessageDirection = Database['public']['Enums']['message_direction']
type EntityType = Database['public']['Enums']['entity_type']
type CreatedByKind = Database['public']['Enums']['created_by_kind']

export type MessageRow = {
  id: string
  entityType: EntityType
  entityId: string
  entityName: string
  channel: string
  direction: MessageDirection
  subject: string | null
  body: string
  senderAccount: string | null
  status: MessageStatus
  sentAt: string
  createdBy: CreatedByKind
  externalId: string | null
  metadata: Json
}

export function MessagesTable({ rows }: { rows: MessageRow[] }) {
  const [selected, setSelected] = useState<MessageRow | null>(null)

  if (rows.length === 0) {
    return (
      <p className="mt-6 text-[0.9rem] text-muted-warm">
        no messages match these filters.
      </p>
    )
  }

  return (
    <>
      <div className="border border-line/60 rounded-md bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">when</TableHead>
              <TableHead>to / from</TableHead>
              <TableHead className="w-28">channel</TableHead>
              <TableHead>sender</TableHead>
              <TableHead className="w-24">status</TableHead>
              <TableHead>preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => setSelected(r)}
              >
                <TableCell className="text-ink-soft text-[0.8rem]">
                  {formatWhen(r.sentAt)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="mr-2 text-[0.65rem] uppercase"
                  >
                    {r.entityType}
                  </Badge>
                  {r.entityName}
                </TableCell>
                <TableCell className="text-ink-soft">
                  <span className="capitalize">
                    {r.direction === 'inbound' ? '← ' : ''}
                    {r.channel.replace(/_/g, ' ')}
                  </span>
                </TableCell>
                <TableCell className="text-ink-soft text-[0.8rem]">
                  {r.senderAccount || (r.createdBy === 'agent' ? 'agent' : '—')}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                  {isAutoResponder(r) ? (
                    <Badge
                      variant="outline"
                      className="ml-1 text-[0.6rem] uppercase"
                    >
                      auto
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-ink-soft text-[0.85rem] max-w-[24rem]">
                  <div className="truncate">
                    {r.subject ? <strong>{r.subject} · </strong> : null}
                    {firstLine(r.body)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MessageDetailSheet
        message={selected}
        onClose={() => setSelected(null)}
      />
    </>
  )
}

function MessageDetailSheet({
  message,
  onClose,
}: {
  message: MessageRow | null
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()

  function handleStatus(next: MessageStatus) {
    if (!message) return
    startTransition(async () => {
      const result = await updateMessageStatus(message.id, next)
      if (!result.success) {
        toast.error(result.error ?? 'failed')
        return
      }
      toast.success(`marked ${next}`)
      onClose()
    })
  }

  return (
    <Sheet open={Boolean(message)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {message ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="text-[0.65rem] uppercase"
                >
                  {message.entityType}
                </Badge>
                <Link
                  href={
                    message.entityType === 'creator'
                      ? `/creators/${message.entityId}`
                      : `/brands/${message.entityId}`
                  }
                  className="font-display text-[1.15rem] tracking-tight hover:text-coral"
                  onClick={onClose}
                >
                  {message.entityName}
                </Link>
              </SheetTitle>
              <SheetDescription className="text-[0.8rem]">
                {message.direction === 'inbound' ? 'inbound via' : 'sent via'}{' '}
                {message.channel.replace(/_/g, ' ')} ·{' '}
                {new Date(message.sentAt).toLocaleString()}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5 px-4 pb-6">
              <div className="grid grid-cols-2 gap-3 text-[0.8rem]">
                <Meta label="status">
                  <span className="inline-flex items-center gap-1">
                    <StatusBadge status={message.status} />
                    {isAutoResponder(message) ? (
                      <Badge variant="outline" className="text-[0.6rem] uppercase">
                        auto
                      </Badge>
                    ) : null}
                  </span>
                </Meta>
                <Meta label="logged by">
                  <span className="capitalize">{message.createdBy}</span>
                </Meta>
                {message.senderAccount ? (
                  <Meta label="sender">{message.senderAccount}</Meta>
                ) : null}
                {message.externalId ? (
                  <Meta label="external id">
                    <code className="text-[0.7rem]">
                      {message.externalId}
                    </code>
                  </Meta>
                ) : null}
              </div>

              {message.subject ? (
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.1em] text-muted-warm mb-1">
                    subject
                  </p>
                  <p className="font-medium">{message.subject}</p>
                </div>
              ) : null}

              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.1em] text-muted-warm mb-1">
                  body
                </p>
                <pre className="whitespace-pre-wrap text-[0.85rem] leading-[1.55] font-sans text-ink bg-cream-warm/50 border border-line/40 rounded-md p-3">
                  {message.body}
                </pre>
              </div>

              {metadataHasContent(message.metadata) ? (
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.1em] text-muted-warm mb-1">
                    metadata
                  </p>
                  <pre className="whitespace-pre-wrap text-[0.75rem] font-mono bg-cream-warm/50 border border-line/40 rounded-md p-3">
                    {JSON.stringify(message.metadata, null, 2)}
                  </pre>
                </div>
              ) : null}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  disabled={pending || message.status === 'replied'}
                  onClick={() => handleStatus('replied')}
                >
                  mark replied
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || message.status === 'failed'}
                  onClick={() => handleStatus('failed')}
                >
                  mark dead
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || message.status === 'bounced'}
                  onClick={() => handleStatus('bounced')}
                >
                  mark bounced
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function Meta({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[0.7rem] uppercase tracking-[0.1em] text-muted-warm">
        {label}
      </p>
      <div className="mt-0.5">{children}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: MessageStatus }) {
  const variant =
    status === 'replied'
      ? 'default'
      : status === 'bounced' || status === 'failed'
        ? 'destructive'
        : 'secondary'
  return (
    <Badge variant={variant} className="text-[0.65rem] uppercase">
      {status}
    </Badge>
  )
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function firstLine(body: string): string {
  const line = body.split(/\r?\n/).find((l) => l.trim().length > 0) ?? body
  return line.length > 120 ? line.slice(0, 119) + '…' : line
}

function isAutoResponder(r: MessageRow): boolean {
  if (r.direction !== 'inbound') return false
  const meta = r.metadata as { auto_responder?: boolean } | null
  return Boolean(meta && meta.auto_responder === true)
}

function metadataHasContent(m: Json): boolean {
  if (m == null) return false
  if (typeof m === 'object' && !Array.isArray(m)) {
    return Object.keys(m).length > 0
  }
  if (Array.isArray(m)) return m.length > 0
  return true
}
