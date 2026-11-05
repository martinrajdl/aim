import { briefKeys, metadata } from "@/lib/brief";
export function GET() {
  return Response.json({
    briefs: briefKeys.map((key) => ({
      key,
      label: metadata[key].label,
      reader: metadata[key].reader,
    })),
  });
}
