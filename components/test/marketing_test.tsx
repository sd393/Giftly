"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ShieldCheck, Star, TrendingUp, Briefcase, Clock3, MessageSquare, BadgeCheck, Sparkles, Wallet, Search, Bell, LayoutDashboard, CalendarDays, MapPin, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const stats = [
  { label: "Campaign reliability", value: "+42%" },
  { label: "Missed deliverables", value: "-50%" },
  { label: "Trust score accuracy", value: "92%" },
  { label: "Creator response rate", value: "+31%" },
];

const creatorMetrics = [
  { title: "Trust Score", value: "88", sub: "Top 12% in Food & Travel", icon: ShieldCheck },
  { title: "Brand Acceptance", value: "76%", sub: "8 of last 10 invites accepted", icon: BadgeCheck },
  { title: "On-time Delivery", value: "96%", sub: "12 campaigns completed", icon: Clock3 },
  { title: "Avg. Review", value: "4.8", sub: "From 24 brand reviews", icon: Star },
];

const businessMetrics = [
  { title: "Business Score", value: "91", sub: "Trusted by creators", icon: Briefcase },
  { title: "Active Campaigns", value: "14", sub: "6 need approval today", icon: LayoutDashboard },
  { title: "Payment Reliability", value: "98%", sub: "Average payout in 3.2 days", icon: Wallet },
  { title: "Creator Satisfaction", value: "4.7", sub: "Based on 43 creator reviews", icon: MessageSquare },
];

const creatorCalendar = [
  {
    date: "Apr 4",
    title: "Paris hotel stay",
    time: "11:00 AM",
    type: "Experience",
    status: "Scheduled",
    location: "Hôtel Montalembert",
  },
  {
    date: "Apr 6",
    title: "Draft content due",
    time: "6:00 PM",
    type: "Draft",
    status: "Deadline",
    location: "Submit in platform",
  },
  {
    date: "Apr 8",
    title: "Instagram reel publish",
    time: "9:00 AM",
    type: "Publish",
    status: "Upcoming",
    location: "Instagram + RedNote",
  },
];

const businessCalendar = [
  {
    date: "Apr 4",
    title: "Creator experience check-in",
    time: "11:00 AM",
    type: "Experience",
    status: "Live this week",
    location: "Paris property",
  },
  {
    date: "Apr 6",
    title: "Approve first draft",
    time: "4:00 PM",
    type: "Approval",
    status: "Needs action",
    location: "Campaign workspace",
  },
  {
    date: "Apr 8",
    title: "Campaign publish deadline",
    time: "9:00 AM",
    type: "Publish",
    status: "Upcoming",
    location: "Instagram + RedNote",
  },
];

function statusBadgeClass(status: string) {
  if (["Scheduled", "Upcoming", "Live this week"].includes(status)) {
    return "bg-[#EEF3E8] text-[#4E6B45] hover:bg-[#EEF3E8]";
  }
  if (["Deadline", "Needs action"].includes(status)) {
    return "bg-[#F7E6D8] text-[#9A5C2D] hover:bg-[#F7E6D8]";
  }
  return "bg-neutral-100 text-neutral-700 hover:bg-neutral-100";
}

type CalendarItem = {
  date: string;
  title: string;
  time: string;
  type: string;
  status: string;
  location: string;
};

function CalendarPanel({
  title,
  description,
  items,
  compact = false,
}: {
  title: string;
  description: string;
  items: CalendarItem[];
  compact?: boolean;
}) {
  return (
    <Card className="rounded-[32px] border-black/5 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="rounded-2xl bg-[#ECE6D8] p-3 text-neutral-800">
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={`${item.date}-${item.title}`} className="rounded-3xl bg-[#FCFBF8] p-5">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-white text-center shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-neutral-400">{item.date.split(" ")[0]}</div>
                  <div className="text-lg font-semibold text-neutral-900">{item.date.split(" ")[1]}</div>
                </div>
                <div>
                  <div className="font-medium text-neutral-900">{item.title}</div>
                  <div className="mt-1 text-sm text-neutral-500">{item.time} • {item.type}</div>
                </div>
              </div>
              <Badge className={`rounded-full ${statusBadgeClass(item.status)}`}>{item.status}</Badge>
            </div>
            <div className={`flex ${compact ? "flex-col gap-2" : "items-center justify-between gap-3"}`}>
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <MapPin className="h-4 w-4" />
                <span>{item.location}</span>
              </div>
              {!compact && (
                <Button variant="outline" className="rounded-full border-black/10 bg-white">View details</Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="max-w-2xl space-y-3">
      <div className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-neutral-600 shadow-sm">
        {eyebrow}
      </div>
      <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 md:text-5xl">{title}</h2>
      <p className="text-base leading-7 text-neutral-600 md:text-lg">{subtitle}</p>
    </div>
  );
}

function MetricCard({ title, value, sub, icon: Icon }: { title: string; value: string; sub: string; icon: LucideIcon }) {
  return (
    <Card className="rounded-3xl border-black/5 bg-white/95 shadow-[0_10px_40px_rgba(0,0,0,0.05)]">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="rounded-2xl bg-neutral-100 p-3 text-neutral-700"><Icon className="h-5 w-5" /></div>
          <Badge variant="secondary" className="rounded-full bg-[#EEF3E8] text-[#4E6B45] hover:bg-[#EEF3E8]">Live</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-neutral-500">{title}</p>
          <p className="text-3xl font-semibold text-neutral-950">{value}</p>
          <p className="text-sm text-neutral-600">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Sidebar({ items, active, setActive }: { items: string[]; active: string; setActive: (v: string) => void }) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white p-3 shadow-[0_10px_40px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-center gap-3 px-3 py-2">
        <div className="rounded-2xl bg-[#ECE6D8] p-2"><Sparkles className="h-5 w-5 text-neutral-800" /></div>
        <div>
          <div className="text-sm font-semibold text-neutral-900">Lynkflu</div>
          <div className="text-xs text-neutral-500">Trust marketplace</div>
        </div>
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => setActive(item)}
            className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition ${active === item ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8F6F1] text-neutral-900">
      <section className="relative overflow-hidden px-6 pb-20 pt-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex items-center justify-between rounded-full border border-black/5 bg-white/90 px-5 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#ECE6D8] p-2"><Sparkles className="h-5 w-5" /></div>
              <span className="font-semibold">Lynkflu</span>
            </div>
            <div className="hidden gap-8 text-sm text-neutral-600 md:flex">
              <span>For brands</span>
              <span>For creators</span>
              <span>Case studies</span>
              <span>Pricing</span>
            </div>
            <Button className="rounded-full bg-neutral-900 px-5">Get started</Button>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8 py-8">
              <Badge className="rounded-full border-0 bg-[#EEF3E8] px-4 py-2 text-[#4E6B45] hover:bg-[#EEF3E8]">
                AI-powered accountability for both sides
              </Badge>
              <div className="space-y-5">
                <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-neutral-950 md:text-7xl">
                  Trusted creator partnerships, powered by AI.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-neutral-600 md:text-xl">
                  Connect RedNote, Instagram, and YouTube to build verified profiles, track campaign delivery, manage experience dates and publish deadlines, and create fair reviews for brands and creators.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button className="rounded-full bg-neutral-900 px-6 py-6 text-base">Get Started</Button>
                <Button variant="outline" className="rounded-full border-black/10 bg-white px-6 py-6 text-base">See How It Works</Button>
              </div>
              <div className="grid max-w-3xl grid-cols-2 gap-4 pt-2 md:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
                    <div className="text-2xl font-semibold">{s.value}</div>
                    <div className="mt-1 text-sm text-neutral-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-black/5 bg-white p-5 shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
              <div className="grid gap-4">
                <div className="rounded-[28px] bg-[#FCFBF8] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-neutral-500">Creator profile</div>
                      <div className="text-xl font-semibold">Mia Chen • Travel & Food</div>
                    </div>
                    <Badge className="rounded-full bg-[#EEF3E8] text-[#4E6B45] hover:bg-[#EEF3E8]">Verified</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="text-xs text-neutral-500">Trust score</div>
                      <div className="text-3xl font-semibold">88</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="text-xs text-neutral-500">Audience quality</div>
                      <div className="text-3xl font-semibold">91%</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="text-xs text-neutral-500">On-time delivery</div>
                      <div className="text-3xl font-semibold">96%</div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[28px] bg-neutral-900 p-5 text-white">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="text-sm text-white/70">Campaign status</span>
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex justify-between text-sm"><span>Paris hotel launch</span><span>84%</span></div>
                        <Progress value={84} className="h-2 bg-white/15" />
                      </div>
                      <div>
                        <div className="mb-2 flex justify-between text-sm"><span>Restaurant collab</span><span>62%</span></div>
                        <Progress value={62} className="h-2 bg-white/15" />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[28px] bg-[#ECE6D8] p-5">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="text-sm text-neutral-600">AI insight</span>
                      <Sparkles className="h-5 w-5 text-neutral-700" />
                    </div>
                    <div className="space-y-3 text-sm text-neutral-700">
                      <div className="rounded-2xl bg-white/80 p-4">High engagement consistency across YouTube and Instagram.</div>
                      <div className="rounded-2xl bg-white/80 p-4">Best match this month: boutique hotels and premium dining campaigns.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            eyebrow="Why it works"
            title="Designed for both brands and creators"
            subtitle="Your marketplace becomes stronger when both sides have visibility, fair reviews, and a clear reputation system."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Card className="rounded-[32px] border-black/5 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl">For businesses</CardTitle>
                <CardDescription>Make better creator decisions with real signals, not guesswork.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {[
                  "Filter creators by trust score, niche, and audience quality",
                  "Track campaign delivery and approvals in one place",
                  "Review creators with fair structured feedback",
                  "See payment reliability and creator satisfaction over time",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-[#FCFBF8] p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#4E6B45]" />
                    <span className="text-neutral-700">{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-[32px] border-black/5 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl">For creators</CardTitle>
                <CardDescription>Build a trusted profile that goes beyond follower count.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {[
                  "Connect RedNote, Instagram, and YouTube into one profile",
                  "Show delivery reliability, review quality, and response speed",
                  "Receive fair brand feedback and protect your reputation",
                  "Get AI suggestions to improve profile strength and campaign fit",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-[#FCFBF8] p-4">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-[#4E6B45]" />
                    <span className="text-neutral-700">{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            eyebrow="How it works"
            title="Analyze. Score. Track."
            subtitle="Collect public or connected social data, turn it into explainable trust signals, and monitor every campaign from brief to review."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { title: "Analyze", text: "Import profile data, engagement signals, content patterns, and audience quality across supported platforms.", icon: Search },
              { title: "Score", text: "Generate transparent scores for creators and businesses with factors users can understand.", icon: ShieldCheck },
              { title: "Track", text: "Follow campaign progress, sync experience dates and publish deadlines, automate reminders, and keep reviews fair on both sides.", icon: Bell },
            ].map(({ title, text, icon: Icon }) => (
              <Card key={title} className="rounded-[30px] border-black/5 bg-white shadow-sm">
                <CardContent className="p-8">
                  <div className="mb-5 inline-flex rounded-2xl bg-[#ECE6D8] p-3"><Icon className="h-5 w-5" /></div>
                  <h3 className="mb-3 text-2xl font-semibold">{title}</h3>
                  <p className="leading-7 text-neutral-600">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl rounded-[40px] border border-black/5 bg-neutral-900 px-8 py-14 text-white md:px-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-5">
              <Badge className="rounded-full bg-white/10 text-white hover:bg-white/10">Case study highlight</Badge>
              <h3 className="max-w-2xl text-4xl font-semibold tracking-tight">How a travel brand improved campaign reliability by 42%</h3>
              <p className="max-w-2xl text-base leading-8 text-white/70">
                By using trust scores before outreach, structured reviews after delivery, and automated follow-ups during execution, the team reduced missed deliverables and improved creator quality.
              </p>
              <div className="grid max-w-xl grid-cols-3 gap-4 pt-4">
                {[
                  ["+42%", "Campaign completion"],
                  ["0", "Missed deliverables"],
                  ["+30%", "Faster execution"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-3xl bg-white/5 p-5">
                    <div className="text-3xl font-semibold">{value}</div>
                    <div className="mt-1 text-sm text-white/65">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[32px] bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 text-sm text-white/70">Before → After</div>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4"><span>Average creator trust score</span><span className="font-semibold">62 → 84</span></div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4"><span>On-time approvals</span><span className="font-semibold">58% → 91%</span></div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4"><span>Reported issues</span><span className="font-semibold">11 → 3</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-8 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl rounded-[40px] border border-black/5 bg-white px-8 py-14 shadow-sm md:px-14">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="text-sm font-medium text-neutral-500">Final CTA</div>
              <h3 className="text-4xl font-semibold tracking-tight">Start building better partnerships today</h3>
              <p className="max-w-2xl text-neutral-600">One profile. Multiple platforms. Real accountability for both creators and businesses.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button className="rounded-full bg-neutral-900 px-6 py-6 text-base">Join as Creator</Button>
              <Button variant="outline" className="rounded-full border-black/10 bg-white px-6 py-6 text-base">Book Demo</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CreatorDashboard() {
  const [active, setActive] = useState("Overview");
  const sidebar = ["Overview", "Profile", "Campaigns", "Reviews", "Insights", "Settings"];

  return (
    <div className="min-h-screen bg-[#F8F6F1] p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[250px_1fr]">
        <Sidebar items={sidebar} active={active} setActive={setActive} />
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-[32px] border-black/5 bg-white shadow-sm">
              <CardContent className="p-8">
                <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm text-neutral-500">Creator dashboard</div>
                    <h1 className="text-3xl font-semibold">Welcome back, Mia</h1>
                    <p className="mt-1 text-neutral-600">Your profile is attracting luxury travel and premium food brands this week.</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="rounded-full">Preview profile</Button>
                    <Button className="rounded-full bg-neutral-900">Update media kit</Button>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {creatorMetrics.map((m) => <MetricCard key={m.title} {...m} />)}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-[32px] border-black/5 bg-[#ECE6D8] shadow-sm">
              <CardContent className="p-8">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-neutral-600">AI coach</div>
                    <div className="text-2xl font-semibold">Next best actions</div>
                  </div>
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-3">
                  {[
                    "Link your latest RedNote account data to increase score confidence.",
                    "Reply faster to incoming offers to lift your professionalism score.",
                    "Travel + boutique hotel brands are your highest-fit opportunities this month.",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl bg-white/75 p-4 text-sm text-neutral-700">{item}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <Card className="rounded-[32px] border-black/5 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Connected platforms</CardTitle>
                <CardDescription>Unified audience and performance view</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                {[
                  ["RedNote", "Verified", "128k followers", 83],
                  ["Instagram", "Connected", "94k followers", 91],
                  ["YouTube", "Connected", "41k subscribers", 77],
                ].map(([platform, status, count, score]) => (
                  <div key={platform} className="rounded-3xl bg-[#FCFBF8] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="font-medium">{platform}</div>
                      <Badge className="rounded-full bg-[#EEF3E8] text-[#4E6B45] hover:bg-[#EEF3E8]">{status}</Badge>
                    </div>
                    <div className="text-sm text-neutral-500">{count}</div>
                    <div className="mt-5 text-sm text-neutral-500">Performance score</div>
                    <div className="mb-2 mt-1 text-2xl font-semibold">{score}</div>
                    <Progress value={Number(score)} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-[32px] border-black/5 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Recent reviews</CardTitle>
                <CardDescription>What brands are saying about your work</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  ["Boutique Stay Co.", "Clear communication, beautiful deliverables, and everything arrived on time.", "4.9"],
                  ["Luma Dining", "Excellent content quality. Would love faster first response next time.", "4.7"],
                  ["Nordic Escapes", "Reliable, polished, and easy to collaborate with.", "5.0"],
                ].map(([name, text, score]) => (
                  <div key={name} className="rounded-3xl bg-[#FCFBF8] p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">{name}</div>
                      <Badge variant="secondary" className="rounded-full">{score}</Badge>
                    </div>
                    <p className="text-sm leading-7 text-neutral-600">{text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <CalendarPanel
              title="Campaign calendar"
              description="Coordinate creator visits, approval windows, and publish deadlines"
              items={businessCalendar}
            />
            <CalendarPanel
              title="Campaign calendar"
              description="See experience dates, draft due dates, and publish deadlines in one place"
              items={creatorCalendar}
            />
            <Card className="rounded-[32px] border-black/5 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Campaign pipeline</CardTitle>
                <CardDescription>Track offers, deliverables, and approvals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  ["Paris hotel launch", "Content in review", "84%", "On track"],
                  ["Summer tasting menu", "Awaiting brief", "34%", "Needs action"],
                  ["Wellness retreat vlog", "Scheduled", "58%", "On track"],
                ].map(([title, status, progress, tag]) => (
                  <div key={title} className="rounded-3xl bg-[#FCFBF8] p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{title}</div>
                        <div className="text-sm text-neutral-500">{status}</div>
                      </div>
                      <Badge className={`rounded-full ${tag === "On track" ? "bg-[#EEF3E8] text-[#4E6B45] hover:bg-[#EEF3E8]" : "bg-[#F7E6D8] text-[#9A5C2D] hover:bg-[#F7E6D8]"}`}>{tag}</Badge>
                    </div>
                    <div className="mb-2 flex justify-between text-sm text-neutral-500"><span>Progress</span><span>{progress}</span></div>
                    <Progress value={parseInt(progress)} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-[32px] border-black/5 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Score breakdown</CardTitle>
                <CardDescription>Explainable factors behind your creator score</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {([
                  ["Audience quality", 91],
                  ["Delivery reliability", 96],
                  ["Response speed", 72],
                  ["Review quality", 94],
                ] as const).map(([label, val]) => (
                  <div key={label}>
                    <div className="mb-2 flex justify-between text-sm"><span>{label}</span><span>{val}</span></div>
                    <Progress value={val} className="h-2" />
                  </div>
                ))}
                <div className="rounded-3xl bg-[#FCFBF8] p-5 text-sm leading-7 text-neutral-600">
                  Your response speed is the biggest opportunity. Improving average reply time by 20% could lift your overall score by 4–6 points.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessDashboard() {
  const [active, setActive] = useState("Overview");
  const sidebar = ["Overview", "Creators", "Campaigns", "Reviews", "Payments", "Settings"];

  return (
    <div className="min-h-screen bg-[#F8F6F1] p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[250px_1fr]">
        <Sidebar items={sidebar} active={active} setActive={setActive} />
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-[32px] border-black/5 bg-white shadow-sm">
              <CardContent className="p-8">
                <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm text-neutral-500">Business dashboard</div>
                    <h1 className="text-3xl font-semibold">Good morning, Luma Hospitality</h1>
                    <p className="mt-1 text-neutral-600">Your best-performing creator campaigns are in travel dining and boutique hotel content.</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="rounded-full">View score details</Button>
                    <Button className="rounded-full bg-neutral-900">Launch campaign</Button>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {businessMetrics.map((m) => <MetricCard key={m.title} {...m} />)}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-[32px] border-black/5 bg-[#ECE6D8] shadow-sm">
              <CardContent className="p-8">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-neutral-600">AI operator</div>
                    <div className="text-2xl font-semibold">Efficiency suggestions</div>
                  </div>
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-3">
                  {[
                    "6 creators are waiting for approvals longer than your average benchmark.",
                    "Payment reliability is excellent — feature it on your public brand profile.",
                    "Creators with trust scores above 82 are driving 27% better completion rates.",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl bg-white/75 p-4 text-sm text-neutral-700">{item}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <Card className="rounded-[32px] border-black/5 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Creator pipeline</CardTitle>
                <CardDescription>Shortlisted and active creators for upcoming campaigns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  ["Mia Chen", "Travel & Food", "88", "Ready to brief"],
                  ["Sara Luo", "Luxury stays", "84", "In negotiation"],
                  ["Daniel Park", "Dining & city guides", "79", "Review profile"],
                ].map(([name, niche, score, status]) => (
                  <div key={name} className="flex items-center justify-between rounded-3xl bg-[#FCFBF8] p-5">
                    <div>
                      <div className="font-medium">{name}</div>
                      <div className="text-sm text-neutral-500">{niche}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-white px-3 py-1 text-sm font-medium shadow-sm">Score {score}</div>
                      <Badge className="rounded-full bg-[#EEF3E8] text-[#4E6B45] hover:bg-[#EEF3E8]">{status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-[32px] border-black/5 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Creator reviews of your business</CardTitle>
                <CardDescription>Fairness, communication, and payment reliability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  ["Clear briefs and timely approvals.", "Campaign clarity", "4.8"],
                  ["Payment arrived quickly and exactly as agreed.", "Payment reliability", "5.0"],
                  ["Would love slightly faster revision turnaround.", "Responsiveness", "4.4"],
                ].map(([text, category, score]) => (
                  <div key={text} className="rounded-3xl bg-[#FCFBF8] p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm text-neutral-500">{category}</div>
                      <Badge variant="secondary" className="rounded-full">{score}</Badge>
                    </div>
                    <p className="text-sm leading-7 text-neutral-700">{text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <CalendarPanel
              title="Campaign calendar"
              description="Coordinate creator visits, approval windows, and publish deadlines"
              items={businessCalendar}
            />
            <Card className="rounded-[32px] border-black/5 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Campaign health</CardTitle>
                <CardDescription>Monitor risk and performance across live campaigns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  ["Summer city stays", "Healthy", "91"],
                  ["Chef tasting launch", "Needs approval", "63"],
                  ["Weekend escape bundle", "Healthy", "87"],
                ].map(([title, state, score]) => (
                  <div key={title} className="rounded-3xl bg-[#FCFBF8] p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{title}</div>
                        <div className="text-sm text-neutral-500">Campaign health score</div>
                      </div>
                      <Badge className={`rounded-full ${state === "Healthy" ? "bg-[#EEF3E8] text-[#4E6B45] hover:bg-[#EEF3E8]" : "bg-[#F7E6D8] text-[#9A5C2D] hover:bg-[#F7E6D8]"}`}>{state}</Badge>
                    </div>
                    <div className="mb-2 flex justify-between text-sm text-neutral-500"><span>Health</span><span>{score}</span></div>
                    <Progress value={parseInt(score)} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-[32px] border-black/5 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Business score breakdown</CardTitle>
                <CardDescription>Transparent factors behind your brand reputation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {([
                  ["Campaign clarity", 89],
                  ["Payment reliability", 98],
                  ["Approval speed", 67],
                  ["Creator fairness", 93],
                ] as const).map(([label, val]) => (
                  <div key={label}>
                    <div className="mb-2 flex justify-between text-sm"><span>{label}</span><span>{val}</span></div>
                    <Progress value={val} className="h-2" />
                  </div>
                ))}
                <div className="rounded-3xl bg-[#FCFBF8] p-5 text-sm leading-7 text-neutral-600">
                  Approval speed is the main bottleneck. Reducing review delays by 1 day would likely improve creator satisfaction by 10–15%.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("landing");
  const title = useMemo(() => {
    if (view === "landing") return "Landing Page";
    if (view === "creator") return "Creator Dashboard";
    return "Business Dashboard";
  }, [view]);

  return (
    <div className="bg-[#F8F6F1]">
      <div className="sticky top-0 z-50 border-b border-black/5 bg-[#F8F6F1]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div>
            <div className="text-sm text-neutral-500">Preview</div>
            <div className="font-semibold text-neutral-900">{title}</div>
          </div>
          <div className="flex gap-2 rounded-full bg-white p-1 shadow-sm">
            <Button onClick={() => setView("landing")} variant={view === "landing" ? "primary" : "ghost"} className={`rounded-full ${view === "landing" ? "bg-neutral-900" : ""}`}>Landing</Button>
            <Button onClick={() => setView("creator")} variant={view === "creator" ? "primary" : "ghost"} className={`rounded-full ${view === "creator" ? "bg-neutral-900" : ""}`}>Creator</Button>
            <Button onClick={() => setView("business")} variant={view === "business" ? "primary" : "ghost"} className={`rounded-full ${view === "business" ? "bg-neutral-900" : ""}`}>Business</Button>
          </div>
        </div>
      </div>

      {view === "landing" && <LandingPage />}
      {view === "creator" && <CreatorDashboard />}
      {view === "business" && <BusinessDashboard />}
    </div>
  );
}
