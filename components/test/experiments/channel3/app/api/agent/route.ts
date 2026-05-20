import { NextResponse } from "next/server";
import { getClient } from "../../../src/channel3";
import { loadProfile } from "../../../src/profile";
import { runAgent } from "../../../src/llm";

export const runtime = "nodejs";
// The agent can run up to 5 LLM iterations × tool round-trips; give it room.
export const maxDuration = 300;

type Body = { query?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set on the server. Agent mode needs it; Browse mode does not." },
      { status: 500 },
    );
  }

  try {
    const profile = loadProfile(process.cwd());
    const { chosen, considered } = await runAgent(query, profile);

    // Enrich with the main product image for UI display — the LLM doesn't
    // emit image URLs (and shouldn't, to avoid hallucination). Free endpoint.
    let image: string | null = null;
    try {
      const detail = await getClient().products.retrieve(chosen.product_id);
      image =
        detail.images?.find((i) => i.is_main_image)?.url ??
        detail.images?.[0]?.url ??
        null;
    } catch {
      // Non-fatal: render without image.
    }

    return NextResponse.json({ chosen, considered, image, profileUsed: profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
