import { requestSchema, outcomeMessage } from "@/lib/customization";
import { getBrief } from "@/lib/server/brief-repository";
import { validView } from "@/lib/view-config";
import { customize } from "@/lib/server/customize";
export const runtime = "nodejs";
export const maxDuration = 60;
let windowStart = Date.now(),
  requests = 0;
export async function POST(request: Request) {
  const origin = request.headers.get("origin"),
    host = request.headers.get("host") ?? new URL(request.url).host;
  let sameOrigin = !origin;
  let hostname = "";
  try {
    hostname = new URL(`http://${host}`).hostname;
    sameOrigin = !origin || new URL(origin).host === host;
  } catch {
    /* Invalid origins are rejected before provider access. */
  }
  if (!sameOrigin)
    return Response.json(
      { error: "This request is not allowed." },
      { status: 403 },
    );
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(hostname) &&
    (!process.env.AIM_CUSTOMIZE_TOKEN ||
      request.headers.get("authorization") !==
        `Bearer ${process.env.AIM_CUSTOMIZE_TOKEN}`)
  )
    return Response.json(
      { error: "Personalization is only available in the local preview." },
      { status: 403 },
    );
  if (!process.env.AZURE_OPENAI_API_KEY)
    return Response.json(
      {
        error:
          "Personalization is temporarily unavailable. You can still read, remove preferences or reset your brief.",
      },
      { status: 503 },
    );
  if (Date.now() - windowStart > 60000) {
    windowStart = Date.now();
    requests = 0;
  }
  if (++requests > 20)
    return Response.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429 },
    );
  if (Number(request.headers.get("content-length")) > 32000)
    return Response.json({ error: "Request is too large." }, { status: 413 });
  let input;
  try {
    const body = await request.text();
    if (body.length > 32000)
      return Response.json({ error: "Request is too large." }, { status: 413 });
    input = requestSchema.parse(JSON.parse(body));
  } catch {
    return Response.json(
      { error: "That request could not be read." },
      { status: 400 },
    );
  }
  try {
    if (new Set(input.sources.map((b) => b.key)).size !== input.sources.length)
      return Response.json({ error: "Duplicate brief." }, { status: 400 });
    const briefs = await Promise.all(input.sources.map((b) => getBrief(b.key)));
    if (
      input.sources.some(
        (entry, i) => entry.fingerprint !== briefs[i].fingerprint,
      ) ||
      !validView(input.config, briefs)
    )
      return Response.json(
        { error: "This brief has changed. Reload it before trying again." },
        { status: 409 },
      );
    const deadline = AbortSignal.timeout(45000);
    const result = await customize(
      input,
      briefs,
      AbortSignal.any([request.signal, deadline]),
    );
    return Response.json({
      requestId: input.requestId,
      revision: input.revision,
      outcome: result,
      message: outcomeMessage(result),
    });
  } catch (error) {
    const timeout =
      error instanceof Error &&
      ["AbortError", "TimeoutError"].includes(error.name);
    return Response.json(
      {
        error: timeout
          ? "That took too long. Your view is unchanged. Try again when you are ready."
          : "Personalization could not complete that request. Your view is unchanged. Please retry.",
      },
      { status: timeout ? 504 : 502 },
    );
  }
}
