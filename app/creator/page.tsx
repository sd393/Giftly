import type { Metadata } from "next"
import { CreatorForm } from "./_components/creator-form"

export const metadata: Metadata = {
  title: "Join as a Creator | Giftly",
  description:
    "Sign up to receive free products from brands you love. No obligations — share what you love and earn commissions.",
}

export default function CreatorPage() {
  return (
    <main className="min-h-screen bg-background">
      <CreatorForm />
    </main>
  )
}
