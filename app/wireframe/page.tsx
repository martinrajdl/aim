import { Wireframe } from "@/components/design/wireframe";
import { getBrief } from "@/lib/server/brief-repository";
import { title } from "@/lib/brief";
import { gridItems } from "@/lib/grid";
import { defaultView, groupItems, orderedItems } from "@/lib/view-config";
import "./wireframe.css";

export const metadata = {
  title: "Aim · Annotated wireframe",
  robots: { index: false, follow: false },
};

export default async function WireframePage() {
  const briefs = [await getBrief("space")];
  const samples = briefs.map((brief) => ({
    key: brief.key,
    label: brief.label,
    reader: brief.reader,
    audience: brief.audience,
    subject: title(brief),
    verdict: brief.recap.doc.verdict,
    period: brief.recap.period_start,
    scopes: brief.scopes.map((scope) => scope.name),
    order: gridItems(brief, defaultView).map((item) => item.id),
    contents: orderedItems(brief, defaultView).map((item) => item.id),
    groups: groupItems(brief, { ...defaultView, groupBy: "current" }).map(
      ([label, items]) => ({ label, ids: items.map((item) => item.id) }),
    ),
    items: brief.items.map((item) => ({
      id: item.id,
      index: item.index,
      headline: item.headline,
      means: item.means || "",
      excerpt: item.paragraphs[0] || "",
      tier: item.tier,
      status: item.status,
      date: item.date,
      scope:
        brief.scopes.find((scope) => scope.id === item.scope_id)?.name ||
        "Other",
      current:
        brief.recap.doc.currents.find(
          (current) => current.label === item.current,
        )?.label || null,
      figure: item.figure
        ? {
            title: item.figure.block.head,
            type: item.figure.block.t,
            scope: item.figure.scope,
          }
        : null,
    })),
  }));
  return <Wireframe sample={samples[0]} />;
}
