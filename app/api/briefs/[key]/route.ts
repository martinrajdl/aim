import { keySchema } from "@/lib/brief";
import { getBrief } from "@/lib/server/brief-repository";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const key = keySchema.safeParse((await params).key);
  if (!key.success)
    return Response.json({ error: "Brief not found." }, { status: 404 });
  try {
    const brief = await getBrief(key.data);
    return Response.json({
      key: brief.key,
      fingerprint: brief.fingerprint,
      envelope: {
        recap: brief.recap,
        citations: brief.citations,
        scopes: brief.scopes,
      },
    });
  } catch {
    return Response.json(
      { error: "This brief could not be loaded." },
      { status: 500 },
    );
  }
}
