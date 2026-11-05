"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  type Brief,
  type Item,
  formatDate,
  title,
  articleHref,
  tierNames,
} from "@/lib/brief";
import type { Workspace } from "@/lib/use-workspace";
import { groupItems } from "@/lib/view-config";
import { gridItems, partitionGrid } from "@/lib/grid";
import { FigurePreview } from "./figure";

type StoryKind = "lead" | "support" | "secondary" | "rail" | "group";
function StoryCard({
  brief,
  item,
  kind,
  numbersFirst = false,
}: {
  brief: Brief;
  item: Item;
  kind: StoryKind;
  numbersFirst?: boolean;
}) {
  const summary =
    item.means || (item.tier !== "one_liner" ? item.paragraphs[0] : "");
  const showFigure = kind === "lead";
  return (
    <Link
      className={`brief-story brief-story--${kind}`}
      href={articleHref(brief.key, item.index)}
      aria-label={`Read: ${item.headline}`}
    >
      <div className="brief-story-meta">
        <span>{tierNames[item.tier]}</span>
        <time dateTime={item.date}>{formatDate(item.date)}</time>
      </div>
      <h2>{item.headline}</h2>
      {showFigure && numbersFirst && <FigurePreview item={item} />}
      {summary && (
        <div className="brief-story-relevance">
          {item.means && (
            <span className="brief-story-label">Why it matters</span>
          )}
          <p>{summary}</p>
        </div>
      )}
      {showFigure && !numbersFirst && <FigurePreview item={item} />}
      <span className="brief-story-link">
        {kind === "lead" ? "Read the analysis" : "Read story"}
        <ArrowRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}

export function PublicationGrid({
  brief,
  workspace: w,
}: {
  brief: Brief;
  workspace: Workspace;
}) {
  const view = w.views[brief.key];
  const items = gridItems(brief, view);
  const { lead, support, secondary, remaining } = partitionGrid(items);

  return (
    <div className="publication-grid-stage">
      <main
        className={`brief-publication ${view.density === "compact" ? "is-compact" : ""}`}
      >
        <div className="brief-publication-inner">
          <section className="edition-summary" aria-label="Brief summary">
            <div className="edition-eyebrow">
              <span>{brief.label}</span>
              <span>
                {items.length} {items.length === 1 ? "update" : "updates"}
              </span>
            </div>
            <h1>{title(brief)}</h1>
            {brief.recap.doc.subject.trim() && <p>{brief.recap.doc.verdict}</p>}
            <span className="edition-reader">For {brief.audience}</span>
          </section>

          {!items.length ? (
            <div className="brief-empty">
              <h2>No matching updates</h2>
              <p>No updates in this brief match your preferences.</p>
              <button onClick={w.openSettings}>Adjust preferences</button>
            </div>
          ) : view.groupBy !== "tier" ? (
            <section className="edition-groups" aria-label="Grouped updates">
              {view.groupBy === "company" && (
                <p className="edition-group-note">
                  Updates can appear under more than one company. The total
                  counts each update once.
                </p>
              )}
              {groupItems(brief, view).map(([name, grouped]) => (
                <section className="edition-group" key={name}>
                  <h2>
                    {name} <span>{grouped.length}</span>
                  </h2>
                  <div className="edition-group-grid">
                    {grouped.map((item) => (
                      <StoryCard
                        key={item.id}
                        brief={brief}
                        item={item}
                        kind="group"
                      />
                    ))}
                  </div>
                </section>
              ))}
            </section>
          ) : lead ? (
            <section
              className={`edition-grid ${remaining.length ? "" : "without-rail"} ${support.length ? "" : "single-story"}`}
              aria-label="This week’s updates"
            >
              <div className="edition-lead">
                <StoryCard
                  brief={brief}
                  item={lead}
                  kind="lead"
                  numbersFirst={view.emphasis === "numbers_first"}
                />
              </div>
              {support.length > 0 && (
                <div className="edition-support">
                  {support.map((item) => (
                    <StoryCard
                      key={item.id}
                      brief={brief}
                      item={item}
                      kind="support"
                    />
                  ))}
                </div>
              )}
              {secondary.length > 0 && (
                <div className="edition-secondary">
                  {secondary.map((item) => (
                    <StoryCard
                      key={item.id}
                      brief={brief}
                      item={item}
                      kind="secondary"
                    />
                  ))}
                </div>
              )}
              {remaining.length > 0 && (
                <aside className="edition-rail" aria-label="More updates">
                  <h2>More this week</h2>
                  <div className="edition-rail-stories">
                    {remaining.map((item) => (
                      <StoryCard
                        key={item.id}
                        brief={brief}
                        item={item}
                        kind="rail"
                      />
                    ))}
                  </div>
                </aside>
              )}
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
