"use client";
import { Maximize2 } from "lucide-react";
import { type Item, formatDate, objectUrl } from "@/lib/brief";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export const figureNames = {
  timeline: "Timeline",
  chart: "Bar chart",
  table: "Table",
  comparison: "Comparison",
};
export function FigureContent({
  item,
  preview = false,
}: {
  item: Item;
  preview?: boolean;
}) {
  if (!item.figure) return null;
  const b = item.figure.block;
  if (b.t === "timeline")
    return (
      <div className="timeline" role="list">
        {b.points.map((point, i) => (
          <div
            key={`${point.update_id}:${i}`}
            className={`timeline-point ${item.figure!.fresh_update_ids.includes(point.update_id) ? "fresh" : ""}`}
            role="listitem"
          >
            <time className="timeline-date mono" dateTime={point.date}>
              {formatDate(point.date)}
            </time>
            <div className="timeline-text">
              <a
                href={objectUrl(point.update_id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {point.text}
              </a>
              {item.figure!.fresh_update_ids.includes(point.update_id) && (
                <span className="sr-only">This week</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  if (b.t === "chart") {
    const max = Math.max(b.max_value || 0, ...b.data.map((r) => r.value), 1);
    return (
      <>
        {b.title &&
          (preview ? (
            <figcaption>{b.title}</figcaption>
          ) : (
            <div className="figure-title">{b.title}</div>
          ))}
        <div
          className={preview ? "home-chart-bars" : "bar-chart"}
          role="img"
          aria-label={`${b.title || b.head}. ${b.data.map((r) => `${r.label}: ${r.value} ${b.unit}`).join("; ")}`}
        >
          {b.data.map((row, i) => (
            <div className={preview ? "chart-row" : "bar-row"} key={i}>
              <div className={preview ? "chart-label" : "bar-row-label"}>
                <span>
                  {row.label}
                  {row.note && <small className="bar-note"> {row.note}</small>}
                </span>
                <strong>
                  {row.value} <small>{b.unit}</small>
                </strong>
              </div>
              <div className={preview ? "chart-track" : "bar-track"}>
                <div
                  className={`${preview ? "chart-fill" : "bar-fill"} ${row.highlight ? "highlight" : ""}`}
                  style={{ width: `${(row.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
          <div className={preview ? "chart-scale" : "bar-axis"}>
            <span>0</span>
            {!preview && <span>{Math.round(max / 2)}</span>}
            <span>
              {max} {b.unit}
            </span>
          </div>
        </div>
        {b.foot && <p className="figure-foot">{b.foot}</p>}
      </>
    );
  }
  if (b.t === "table")
    return (
      <>
        <div
          className={preview ? "home-table-scroll" : "table-wrap"}
          tabIndex={preview ? undefined : 0}
          aria-label={b.title || b.head}
        >
          <table className={preview ? "" : "data-table"}>
            {b.title && <caption className="figure-title">{b.title}</caption>}
            <thead>
              <tr>
                {b.cols.map((col, i) => (
                  <th scope="col" key={i}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, i) => (
                <tr key={i}>
                  {row.cells.map((cell, j) => (
                    <td key={j}>
                      {cell.text || <span aria-label="Unspecified">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {b.rows.some((r) => r.cells.some((c) => !c.text)) && (
          <p className="table-key">— Not specified in this brief</p>
        )}
      </>
    );
  return (
    <div className="comparison">
      {(["them", "us"] as const).map((key) => (
        <div
          className={`comparison-side ${key === "us" ? "after" : ""}`}
          key={key}
        >
          <h4>{b[key].name}</h4>
          <ul>
            {b[key].points.map((point, i) => (
              <li key={i}>{point.text}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
export function Figure({
  item,
  expanded = false,
}: {
  item: Item;
  expanded?: boolean;
}) {
  if (item.figureError)
    return (
      <p className="context-note">
        This figure could not be displayed. The original update is available
        below.
      </p>
    );
  if (!item.figure) return null;
  const b = item.figure.block;
  return (
    <section
      className="figure-card"
      aria-label={`${figureNames[b.t]}: ${b.head}`}
    >
      <div className="figure-header">
        <span className="figure-type mono">{figureNames[b.t]}</span>
        {!expanded && (
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="expand"
                aria-label={`Expand ${figureNames[b.t].toLowerCase()}`}
              >
                <Maximize2 size={12} />
              </button>
            </DialogTrigger>
            <DialogContent>
              <div className="panel-header">
                <DialogTitle>{figureNames[b.t]}</DialogTitle>
                <DialogDescription className="sr-only">
                  {b.head}
                </DialogDescription>
              </div>
              <div className="dialog-content">
                <Figure item={item} expanded />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <h3>{b.head}</h3>
      {b.lead && <p className="figure-lead">{b.lead}</p>}
      <FigureContent item={item} />
      {item.figure.scope === "current" && (
        <div className="context-note">
          Current context · {item.current}
          {b.t === "timeline" && (
            <>
              <br />
              Blue dots mark this week’s updates. Earlier updates provide
              context.
            </>
          )}
        </div>
      )}
    </section>
  );
}
export function FigurePreview({ item }: { item: Item }) {
  if (!item.figure || item.figure.block.t === "timeline") return null;
  const block = item.figure.block;
  if (block.t === "comparison")
    return (
      <figure className="home-comparison">
        <figcaption>{block.head}</figcaption>
        {(["them", "us"] as const).map((key) => (
          <div key={key}>
            <h3>{block[key].name}</h3>
            <ul>
              {block[key].points.map((point, index) => (
                <li key={index}>{point.text}</li>
              ))}
            </ul>
          </div>
        ))}
      </figure>
    );
  return (
    <figure
      className={
        item.figure.block.t === "chart"
          ? "home-chart"
          : item.figure.block.t === "table"
            ? "home-table"
            : "home-comparison"
      }
    >
      <FigureContent item={item} preview />
      {item.figure.scope === "current" && <small>Current context</small>}
    </figure>
  );
}
