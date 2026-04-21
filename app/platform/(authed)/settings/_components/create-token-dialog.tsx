'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { API_SCOPES, type ApiScope } from '@/lib/schemas/settings'

import { createApiToken } from '../_actions'

export function CreateTokenDialog() {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [scopes, setScopes] = useState<Set<ApiScope>>(new Set())
  const [created, setCreated] = useState<{
    token: string
    label: string
    scopes: string[]
  } | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setLabel('')
    setScopes(new Set())
    setCreated(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createApiToken({
        label,
        scopes: Array.from(scopes),
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setCreated({
        token: result.data.token,
        label: result.data.label,
        scopes: result.data.scopes,
      })
    })
  }

  async function copyToken() {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created.token)
      toast.success('copied')
    } catch {
      toast.error('copy failed')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden />
          new token
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>token created</DialogTitle>
              <DialogDescription>
                Copy this now. We hash it on save and cannot show it again.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border border-coral/40 bg-coral/5 p-3">
                <p className="text-[0.7rem] uppercase tracking-[0.1em] text-coral-deep font-medium mb-1">
                  {created.label}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[0.75rem] break-all font-mono">
                    {created.token}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={copyToken}
                  >
                    copy
                  </Button>
                </div>
              </div>
              <p className="text-[0.75rem] text-muted-warm">
                scopes: {created.scopes.join(', ')}
              </p>
            </div>

            <DialogFooter>
              <Button
                size="sm"
                onClick={() => {
                  setOpen(false)
                  reset()
                }}
              >
                done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>new api token</DialogTitle>
              <DialogDescription>
                Agents use this as `Authorization: Bearer &lt;token&gt;`.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-[0.85rem]">
              <div className="space-y-1.5">
                <Label>label</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. send-batch pipeline"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>scopes</Label>
                <div className="grid grid-cols-2 gap-2">
                  {API_SCOPES.map((scope) => {
                    const checked = scopes.has(scope)
                    return (
                      <label
                        key={scope}
                        className="flex items-center gap-2 rounded-md border border-line/60 px-3 py-2 cursor-pointer hover:bg-cream-warm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            setScopes((s) => {
                              const next = new Set(s)
                              if (v) next.add(scope)
                              else next.delete(scope)
                              return next
                            })
                          }}
                        />
                        <span className="text-[0.8rem] font-mono">
                          {scope}
                        </span>
                      </label>
                    )
                  })}
                </div>
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
              <Button
                type="submit"
                size="sm"
                disabled={pending || !label || scopes.size === 0}
              >
                {pending ? 'creating…' : 'create token'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
