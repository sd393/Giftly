import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase/server'

import { PageHeader } from '../_components/page-header'
import { CreateTokenDialog } from './_components/create-token-dialog'
import { TokenRowActions } from './_components/token-row-actions'

export default async function SettingsPage() {
  const supabase = await createClient()

  const [{ data: userData }, teamRes, tokensRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc('list_team_members'),
    supabase
      .from('api_tokens')
      .select('id, label, scopes, created_at, last_used_at, revoked_at, created_by')
      .order('created_at', { ascending: false }),
  ])

  const user = userData.user
  const team = teamRes.data ?? []
  const tokens = tokensRes.data ?? []

  const teamById = new Map<string, { email: string; full_name: string | null }>()
  for (const t of team) {
    teamById.set(t.id, { email: t.email, full_name: t.full_name ?? null })
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-[900px]">
      <PageHeader title="settings" subtitle="account, team, api tokens" />

      <section className="mt-8">
        <h2 className="text-[0.75rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-3">
          account
        </h2>
        <div className="bg-white border border-line/60 rounded-md p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[0.9rem]">
            <div>
              <p className="text-[0.7rem] uppercase tracking-[0.1em] text-muted-warm">
                email
              </p>
              <p className="mt-0.5">{user?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-[0.7rem] uppercase tracking-[0.1em] text-muted-warm">
                name
              </p>
              <p className="mt-0.5">
                {(user?.user_metadata?.full_name as string | undefined) ?? '—'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[0.75rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-3">
          team
        </h2>
        <div className="bg-white border border-line/60 rounded-md overflow-hidden">
          {team.length === 0 ? (
            <p className="p-5 text-[0.9rem] text-muted-warm">
              no teammates have signed in yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>name</TableHead>
                  <TableHead>email</TableHead>
                  <TableHead>last active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.full_name ?? '—'}
                      {m.id === user?.id ? (
                        <Badge variant="secondary" className="ml-2 text-[0.65rem]">
                          you
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-ink-soft">{m.email}</TableCell>
                    <TableCell className="text-ink-soft text-[0.8rem]">
                      {m.last_sign_in_at
                        ? new Date(m.last_sign_in_at).toLocaleString()
                        : 'never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <p className="mt-2 text-[0.75rem] text-muted-warm">
          anyone with a @trygiftly.com email gets access automatically on first
          sign-in. no invites.
        </p>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-[0.75rem] uppercase tracking-[0.15em] text-muted-warm font-medium">
            api tokens
          </h2>
          <CreateTokenDialog />
        </div>

        <div className="bg-white border border-line/60 rounded-md overflow-hidden">
          {tokens.length === 0 ? (
            <p className="p-5 text-[0.9rem] text-muted-warm">
              no tokens yet. create one to let an agent call the platform api.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>label</TableHead>
                  <TableHead>scopes</TableHead>
                  <TableHead>created</TableHead>
                  <TableHead>last used</TableHead>
                  <TableHead>by</TableHead>
                  <TableHead className="w-24 text-right">status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((t) => {
                  const creator = teamById.get(t.created_by)
                  const revoked = Boolean(t.revoked_at)
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.label}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {t.scopes.map((s) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="text-[0.65rem]"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-ink-soft text-[0.8rem]">
                        {new Date(t.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-ink-soft text-[0.8rem]">
                        {t.last_used_at
                          ? new Date(t.last_used_at).toLocaleString()
                          : '—'}
                      </TableCell>
                      <TableCell className="text-ink-soft text-[0.8rem]">
                        {creator?.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {revoked ? (
                          <Badge variant="outline" className="text-[0.65rem]">
                            revoked
                          </Badge>
                        ) : (
                          <TokenRowActions id={t.id} />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  )
}
