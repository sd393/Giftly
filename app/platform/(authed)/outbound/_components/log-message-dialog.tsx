'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  MESSAGE_DIRECTIONS,
  MESSAGE_STATUSES,
  outboundMessageSchema,
  type OutboundMessageInput,
} from '@/lib/schemas/outbound'
import { createClient } from '@/lib/supabase/client'

import { logOutboundMessage } from '../_actions'

type EntityOption = {
  id: string
  type: 'creator' | 'brand'
  primary: string
  secondary: string
  updatedAt: string
}

const DEFAULTS = {
  channel: 'email',
  direction: 'outbound',
  status: 'sent',
} as const

export function LogMessageDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [entityOpts, setEntityOpts] = useState<EntityOption[]>([])
  const [entityLoading, setEntityLoading] = useState(false)
  const [entityFilter, setEntityFilter] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<OutboundMessageInput>({
    resolver: zodResolver(outboundMessageSchema),
    defaultValues: {
      channel: DEFAULTS.channel,
      direction: DEFAULTS.direction,
      status: DEFAULTS.status,
    },
  })

  const selectedEntityId = watch('entityId')
  const selectedEntityType = watch('entityType')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setEntityLoading(true)
    ;(async () => {
      const supabase = createClient()
      const [creators, brands] = await Promise.all([
        supabase
          .from('creators')
          .select('id, name, email, updated_at')
          .is('archived_at', null)
          .order('updated_at', { ascending: false })
          .limit(200),
        supabase
          .from('brands')
          .select('id, brand_name, website, updated_at')
          .is('archived_at', null)
          .order('updated_at', { ascending: false })
          .limit(200),
      ])
      if (cancelled) return
      const opts: EntityOption[] = [
        ...(creators.data ?? []).map((c) => ({
          id: c.id,
          type: 'creator' as const,
          primary: c.name,
          secondary: c.email,
          updatedAt: c.updated_at,
        })),
        ...(brands.data ?? []).map((b) => ({
          id: b.id,
          type: 'brand' as const,
          primary: b.brand_name,
          secondary: b.website,
          updatedAt: b.updated_at,
        })),
      ].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      setEntityOpts(opts)
      setEntityLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  const filteredEntities = useMemo(() => {
    const term = entityFilter.trim().toLowerCase()
    if (!term) return entityOpts.slice(0, 30)
    return entityOpts
      .filter(
        (o) =>
          o.primary.toLowerCase().includes(term) ||
          o.secondary.toLowerCase().includes(term)
      )
      .slice(0, 30)
  }, [entityOpts, entityFilter])

  function handleSelectEntity(opt: EntityOption) {
    setValue('entityId', opt.id, { shouldValidate: true })
    setValue('entityType', opt.type, { shouldValidate: true })
    setEntityFilter(`${opt.primary} (${opt.type})`)
  }

  function onSubmit(values: OutboundMessageInput) {
    startTransition(async () => {
      const result = await logOutboundMessage(values)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('message logged')
      reset({
        channel: DEFAULTS.channel,
        direction: DEFAULTS.direction,
        status: DEFAULTS.status,
      })
      setEntityFilter('')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden />
          log message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>log a message</DialogTitle>
          <DialogDescription>
            Manual entry for an IG DM, ad-hoc email, or anything not routed
            through the outreach pipeline.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 text-[0.85rem]"
        >
          <div className="space-y-1.5">
            <Label className="text-[0.75rem] uppercase tracking-[0.08em] text-muted-warm">
              recipient
            </Label>
            <Input
              type="search"
              placeholder="search brands + creators"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            />
            {entityLoading ? (
              <p className="text-[0.75rem] text-muted-warm">loading…</p>
            ) : filteredEntities.length > 0 ? (
              <div className="max-h-44 overflow-y-auto border border-line/60 rounded-md divide-y divide-line/40">
                {filteredEntities.map((opt) => {
                  const isSelected =
                    opt.id === selectedEntityId &&
                    opt.type === selectedEntityType
                  return (
                    <button
                      type="button"
                      key={`${opt.type}:${opt.id}`}
                      onClick={() => handleSelectEntity(opt)}
                      className={`w-full text-left px-3 py-2 hover:bg-cream-warm transition-colors ${
                        isSelected ? 'bg-cream-warm' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-warm">
                          {opt.type}
                        </span>
                        <span className="font-medium">{opt.primary}</span>
                      </div>
                      <div className="text-[0.75rem] text-muted-warm truncate">
                        {opt.secondary}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-[0.75rem] text-muted-warm">no matches.</p>
            )}
            {errors.entityId ? (
              <p className="text-[0.75rem] text-coral-deep">
                {errors.entityId.message}
              </p>
            ) : null}
            {selectedEntityId ? (
              <p className="text-[0.75rem] text-muted-warm">
                selected: {selectedEntityType} ·{' '}
                <code className="text-[0.7rem]">{selectedEntityId}</code>
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>channel</Label>
              <Select
                defaultValue={DEFAULTS.channel}
                onValueChange={(v) =>
                  setValue('channel', v, { shouldValidate: true })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['email', 'instagram_dm', 'tiktok_dm', 'sms', 'other'].map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace(/_/g, ' ')}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>direction</Label>
              <Select
                defaultValue={DEFAULTS.direction}
                onValueChange={(v) =>
                  setValue('direction', v as OutboundMessageInput['direction'])
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_DIRECTIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>subject (optional)</Label>
            <Input {...register('subject')} />
          </div>

          <div className="space-y-1.5">
            <Label>body</Label>
            <Textarea rows={5} {...register('body')} />
            {errors.body ? (
              <p className="text-[0.75rem] text-coral-deep">
                {errors.body.message}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>sender account</Label>
              <Input
                {...register('senderAccount')}
                placeholder="armaan@trygiftly.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>status</Label>
              <Select
                defaultValue={DEFAULTS.status}
                onValueChange={(v) =>
                  setValue('status', v as OutboundMessageInput['status'])
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[0.8rem] text-muted-warm hover:text-ink"
            >
              cancel
            </button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'logging…' : 'log message'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
