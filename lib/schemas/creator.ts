import { z } from "zod"

export const creatorFormSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  instagramHandle: z
    .string()
    .max(100, "Handle is too long")
    .optional()
    .or(z.literal("")),
  tiktokHandle: z
    .string()
    .max(100, "Handle is too long")
    .optional()
    .or(z.literal("")),
  shippingAddress: z
    .string()
    .max(500, "Address is too long")
    .optional()
    .or(z.literal("")),
  productInterests: z
    .string()
    .max(2000, "Please keep this under 2000 characters")
    .optional()
    .or(z.literal("")),
  contentLink: z
    .string()
    .url("Please enter a valid URL")
    .max(500, "URL is too long")
    .optional()
    .or(z.literal("")),
})

export type CreatorFormValues = z.infer<typeof creatorFormSchema>
