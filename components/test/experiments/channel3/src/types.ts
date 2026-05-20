import { z } from "zod";

export const ProfileSchema = z.object({
  skin_type: z
    .enum(["oily", "dry", "combination", "normal", "sensitive"])
    .optional(),
  hair_type: z.string().optional(),
  avoid_ingredients: z.array(z.string()).default([]),
  required_ingredients: z.array(z.string()).default([]),
  brand_allowlist: z.array(z.string()).default([]),
  brand_blocklist: z.array(z.string()).default([]),
  price_ceiling_usd: z.number().positive().optional(),
  in_stock_only: z.boolean().default(true),
  country: z.string().default("US"),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export type ChosenProduct = {
  product_id: string;
  title: string;
  brand: string | null;
  price: number;
  currency: string;
  checkout_url: string;
  domain: string;
  max_commission_rate: number;
  reason: string;
  alternatives: Array<{ title: string; price: number; checkout_url: string }>;
};
