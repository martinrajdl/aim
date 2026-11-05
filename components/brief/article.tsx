"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  type Brief,
  type Item,
  articleHref,
  marketHref,
  formatDate,
  objectUrl,
  tierNames,
} from "@/lib/brief";
import { type Workspace } from "@/lib/use-workspace";
import { orderedItems, matches, quantitative } from "@/lib/view-config";
import { Figure } from "./figure";
const statusLabel = (status: string) =>
  status === "new" ? "New" : status === "updated" ? "Updated" : "Carried over";
function SourceLink({
  id,
  label,
  date,
}: {
  id: string;
  label: string;
  date?: string;
}) {
  return (
    <a
      className="evidence-source"
      href={objectUrl(id)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="evidence-source-title">{label}</span>
      <span className="evidence-source-meta">
        {date && <time dateTime={date}>{formatDate(date)}</time>}
        <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
      </span>
    </a>
  );
}
export function Sources({ item, brief }: { item: Item; brief: Brief }) {
  const extra = item.cited_update_ids.filter(
    (id) => !item.read_update_ids.includes(id),
  );
  return (
    <details className="evidence-disclosure">
      <summary>
        <span>Sources and updates</span>
        <span className="evidence-count">
          {
            new Set([
              ...item.read_update_ids,
              ...item.cited_update_ids,
              ...item.cited_signal_ids,
            ]).size
          }
        </span>
        <ChevronDown
          className="disclosure-chevron"
          size={16}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </summary>
      <section className="evidence-content">
        <div className="evidence-source-list">
          {item.read_update_ids.map((id) => {
            const c = brief.citations.find((c) => c.id === id);
            return (
              <SourceLink
                key={id}
                id={id}
                label={c?.title || "Open update"}
                date={c?.date}
              />
            );
          })}
        </div>
        {brief.key === "enterprise" && item.index === 0 && (
          <details className="source-note">
            <summary>One source title differs from this update</summary>
            <p>
              The supplied citation is titled “Black Forest Lab raises $300M for
              AI visual models.” The brief associates the same ID with the
              OpenAI training pause. Both are preserved as supplied.
            </p>
          </details>
        )}
        <div className="object-links">
          {item.cited_signal_ids.map((id, i) => (
            <a
              className="object-link"
              href={objectUrl(id)}
              target="_blank"
              rel="noopener noreferrer"
              key={id}
            >
              Signal {i + 1} <ArrowUpRight size={12} />
            </a>
          ))}
          {extra.map((id, i) => (
            <a
              className="object-link"
              href={objectUrl(id)}
              target="_blank"
              rel="noopener noreferrer"
              key={id}
            >
              Update {i + 1} <ArrowUpRight size={12} />
            </a>
          ))}
        </div>
      </section>
    </details>
  );
}
export function Article({
  brief,
  index,
  workspace: w,
}: {
  brief: Brief;
  index: number;
  workspace: Workspace;
}) {
  const item = brief.items[index],
    view = w.views[brief.key],
    visible = orderedItems(brief, view),
    position = visible.findIndex((i) => i.index === index),
    excluded = !!item && !matches(item, view);
  const back = (
    <Link className="text-button muted" href={marketHref(brief.key)}>
      <ChevronLeft size={14} />
      Back to {brief.label}
    </Link>
  );
  if (!item || excluded)
    return (
      <div className="main">
        <main className="reader" aria-label="Selected update">
          <article className="article">
            <div className="article-topline">{back}</div>
            <div className="empty-reader">
              <h1>
                {excluded
                  ? "Your saved preferences hide this update."
                  : "This update could not be found."}
              </h1>
              <p>Return to the brief to browse its available updates.</p>
              <div className="object-links">
                {back}
                {excluded && (
                  <button className="button" onClick={w.openSettings}>
                    Manage preferences
                  </button>
                )}
              </div>
            </div>
            {brief.items
              .filter(
                (i) =>
                  i.current === view.current && i.figure?.scope === "current",
              )
              .map((i) => (
                <Figure key={i.id} item={i} />
              ))}
          </article>
        </main>
      </div>
    );
  const current = brief.recap.doc.currents.find(
      (c) => c.label === item.current,
    ),
    firstFigure = view.emphasis === "numbers_first" && quantitative(item),
    contextFigures = brief.items.filter(
      (i) =>
        i.index !== item.index &&
        i.current === item.current &&
        i.figure?.scope === "current",
    );
  return (
    <div className="main">
      <main
        className={`reader ${view.density === "compact" ? "compact" : ""}`}
        aria-label="Selected update"
        key={item.id}
      >
        <article className="article">
          <div className="article-topline">
            {back}
            <div className="article-actions">
              <span>
                {position + 1} / {visible.length}
              </span>
              {(
                [
                  [-1, ChevronLeft, "Previous update"],
                  [1, ChevronRight, "Next update"],
                ] as const
              ).map(([offset, Icon, label]) => {
                const next = visible[position + offset];
                return next ? (
                  <Link
                    key={label}
                    className="icon-button"
                    aria-label={label}
                    href={articleHref(brief.key, next.index)}
                  >
                    <Icon size={17} />
                  </Link>
                ) : (
                  <button
                    key={label}
                    className="icon-button"
                    aria-label={label}
                    disabled
                  >
                    <Icon size={17} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="eyebrow article-tier">{tierNames[item.tier]}</div>
          <h1>{item.headline}</h1>
          <div className="article-dateline">
            <time dateTime={item.date}>{formatDate(item.date, true)}</time>
            <span
              className={`status ${item.status === "new" ? "new" : ""}`}
              aria-label={`Update status: ${statusLabel(item.status)}`}
            >
              <span className="dot" aria-hidden="true" />
              {statusLabel(item.status)}
            </span>
          </div>
          {firstFigure && <Figure item={item} />}
          <div className="story-text">
            {item.paragraphs
              .filter((p) => item.tier !== "one_liner" || p !== item.headline)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
          {item.means && (
            <aside className="implication">
              <h2>What it means</h2>
              <p>{item.means}</p>
            </aside>
          )}
          {!firstFigure && <Figure item={item} />}
          <div className="article-monitoring">
            <span>Monitoring area</span>
            <span className="article-monitoring-name">
              {brief.scopes.find((s) => s.id === item.scope_id)?.name ||
                "Other"}
            </span>
          </div>
          <div className="evidence-panel">
            <Sources brief={brief} item={item} />
            {current && (
              <details className="evidence-disclosure">
                <summary>
                  <span>About this current</span>
                  <ChevronDown
                    className="disclosure-chevron"
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </summary>
                <div className="evidence-content">
                  <div className="thread-context">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="eyebrow">
                        Current · {current.since_label}
                      </span>
                      <span
                        className={`status ${current.status === "new" ? "new" : ""}`}
                        aria-label={`Current status: ${statusLabel(current.status)}`}
                      >
                        <span className="dot" aria-hidden="true" />
                        {statusLabel(current.status)}
                      </span>
                    </div>
                    <h3>{current.label}</h3>
                    <p>{current.line}</p>
                    <div className="object-links">
                      {current.cited_signal_ids.map((id, i) => (
                        <a
                          className="object-link"
                          key={id}
                          href={objectUrl(id)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Thread signal {i + 1} <ArrowUpRight size={12} />
                        </a>
                      ))}
                    </div>
                  </div>
                  {contextFigures.map((i) => (
                    <div key={i.id}>
                      {!matches(i, view) && (
                        <p className="context-note">
                          This figure provides thread context from an update
                          outside your current filters.
                        </p>
                      )}
                      <Figure item={i} />
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}
