-- Optional shipping address collected on the public creator application so
-- matched brands can ship product without a separate DM exchange.
alter table public.creators add column if not exists shipping_address text;
