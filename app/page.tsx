import { Gift, Package, Share2, Settings, Truck, DollarSign, Sparkles, TrendingUp, Users, ShieldCheck, Zap, Heart } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="px-6 py-24 md:py-32 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-lg font-medium tracking-widest text-muted-foreground uppercase">
            Welcome to
          </p>
          <h1 className="mt-4 text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Giftly
          </h1>
          <p className="mt-6 text-xl text-muted-foreground md:text-2xl text-pretty">
            Free Products. Real Commissions.
          </p>
          <p className="mt-4 text-lg text-muted-foreground text-pretty max-w-xl mx-auto">
            Brands send free products to creators with no obligation to post. Love it? Share your link and earn on every sale.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-secondary px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            How It Works
          </h2>

          {/* For Creators */}
          <div className="mt-16">
            <h3 className="text-center text-xl font-semibold text-foreground md:text-2xl">
              For Creators
            </h3>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Gift className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-foreground">Get Matched</h4>
                <p className="mt-2 text-muted-foreground">
                  Tell us your niche and interests. We&apos;ll connect you with brands you&apos;ll love.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Package className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-foreground">Receive Free Product</h4>
                <p className="mt-2 text-muted-foreground">
                  Products arrive at your door—no strings attached, no posting required.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Share2 className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-foreground">Share & Earn</h4>
                <p className="mt-2 text-muted-foreground">
                  Love it? Share your affiliate link and earn commission on every sale you drive.
                </p>
              </div>
            </div>
          </div>

          {/* For Brands */}
          <div className="mt-20">
            <h3 className="text-center text-xl font-semibold text-foreground md:text-2xl">
              For Brands
            </h3>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Settings className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-foreground">Set Preferences</h4>
                <p className="mt-2 text-muted-foreground">
                  Define your target audience and creator preferences. We handle the matching.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Truck className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-foreground">Ship Product</h4>
                <p className="mt-2 text-muted-foreground">
                  Send products directly to matched creators. No upfront influencer fees.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <DollarSign className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-foreground">Pay Only on Sales</h4>
                <p className="mt-2 text-muted-foreground">
                  Commission-based model means you only pay when creators drive real sales.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Giftly - Creator Benefits */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Why Creators Love Giftly
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Sparkles className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Zero Obligations</h3>
              <p className="mt-2 text-muted-foreground">
                Keep every product you receive. Post only if you genuinely love it—no contracts, no pressure.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <TrendingUp className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Competitive Commissions</h3>
              <p className="mt-2 text-muted-foreground">
                Earn 15-30% on every sale you drive. Real income from products you actually use and recommend.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Heart className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Curated Matches</h3>
              <p className="mt-2 text-muted-foreground">
                Only receive products that fit your niche and aesthetic. No random spam—just brands aligned with your content.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Giftly - Brand Benefits */}
      <section className="bg-secondary px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Why Brands Choose Giftly
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                <ShieldCheck className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Risk-Free Model</h3>
              <p className="mt-2 text-muted-foreground">
                No upfront influencer fees. Pay commissions only when creators drive actual sales to your store.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                <Users className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Authentic Advocacy</h3>
              <p className="mt-2 text-muted-foreground">
                Creators who post genuinely love your product. Authentic recommendations convert better than paid ads.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                <Zap className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Smart Matching</h3>
              <p className="mt-2 text-muted-foreground">
                Our algorithm connects your products with creators whose audience demographics match your ideal customer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Join thousands of creators and brands already using Giftly to build authentic partnerships.
          </p>
          <p className="mt-6 text-primary-foreground/70">
            Email us at{" "}
            <a
              href="mailto:hello@giftly.com"
              className="font-medium text-primary-foreground underline underline-offset-4 hover:no-underline"
            >
              hello@giftly.com
            </a>{" "}
            to get started.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-lg font-semibold text-foreground">Giftly</p>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Giftly. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}
