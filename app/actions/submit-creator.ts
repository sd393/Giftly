"use server"

import { Resend } from "resend"
import {
  creatorFormSchema,
  type CreatorFormValues,
} from "@/lib/schemas/creator"

const resend = new Resend(process.env.RESEND_API_KEY)

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatField(value: string | undefined): string {
  if (!value) return "—"
  return escapeHtml(value)
}

export async function submitCreatorForm(
  data: CreatorFormValues
): Promise<{ success: boolean; error?: string }> {
  const parsed = creatorFormSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid form data. Please check your inputs.",
    }
  }

  const {
    email,
    instagramHandle,
    tiktokHandle,
    shippingAddress,
    productInterests,
    contentLink,
  } = parsed.data

  const escapedEmail = escapeHtml(email)
  const contentLinkHtml = contentLink
    ? `<a href="${escapeHtml(contentLink)}">${escapeHtml(contentLink)}</a>`
    : "—"

  try {
    const { data, error } = await resend.emails.send({
      from: "Giftly <onboarding@resend.dev>",
      to: ["alphaone968@gmail.com"],
      subject: `New Creator Application: ${email}`,
      html: `
        <h2>New Creator Application</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 12px 8px; font-weight: bold; vertical-align: top; border-bottom: 1px solid #eee;">Email</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${escapedEmail}</td>
          </tr>
          <tr>
            <td style="padding: 12px 8px; font-weight: bold; vertical-align: top; border-bottom: 1px solid #eee;">Instagram</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${formatField(instagramHandle)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 8px; font-weight: bold; vertical-align: top; border-bottom: 1px solid #eee;">TikTok</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${formatField(tiktokHandle)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 8px; font-weight: bold; vertical-align: top; border-bottom: 1px solid #eee;">Shipping Address</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #eee; white-space: pre-line;">${formatField(shippingAddress)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 8px; font-weight: bold; vertical-align: top; border-bottom: 1px solid #eee;">Product Interests</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #eee; white-space: pre-line;">${formatField(productInterests)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 8px; font-weight: bold; vertical-align: top;">Content Link</td>
            <td style="padding: 12px 8px;">${contentLinkHtml}</td>
          </tr>
        </table>
      `,
    })

    if (error) {
      console.error("Resend API error:", error)
      return {
        success: false,
        error: `Email failed: ${error.message}`,
      }
    }

    console.log("Email sent successfully, id:", data?.id)
    return { success: true }
  } catch (error) {
    console.error("Failed to send creator application email:", error)
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    }
  }
}
