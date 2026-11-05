"use client";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { useWorkspace } from "@/lib/use-workspace";
import { keySchema, formatDate, type BriefKey } from "@/lib/brief";
import { PublicationGrid } from "./publication-grid";
import { Article } from "./article";
import { Chat } from "./chat";
import { Orb } from "@/components/ui/orb";
export function BriefApp() {
  const params = useSearchParams(),
    parsed = keySchema.safeParse(params.get("market")),
    market: BriefKey = parsed.success ? parsed.data : "space",
    itemParam = params.get("item"),
    index =
      itemParam !== null && /^\d+$/.test(itemParam) ? Number(itemParam) : -1,
    isArticle = itemParam !== null;
  const w = useWorkspace(),
    selected = w.briefs.find((b) => b.key === market),
    chatButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function escape(e: KeyboardEvent) {
      if (
        e.key !== "Escape" ||
        e.defaultPrevented ||
        (e.target instanceof Element && e.target.closest('[role="dialog"]')) ||
        document.querySelector('[role="dialog"]')
      )
        return;
      if (w.chat) {
        w.closeChat();
        chatButton.current?.focus();
      }
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [w.chat, w.closeChat]);
  if (w.loading)
    return (
      <main className="load-screen" role="status">
        <Orb size={48} />
        <p>Loading your brief…</p>
      </main>
    );
  if (w.loadError || !selected)
    return (
      <main className="load-screen">
        <h1>Your brief is unavailable</h1>
        <p>{w.loadError}</p>
        <button className="button" onClick={w.reload}>
          Try again
        </button>
      </main>
    );
  const period = selected.recap.period_start;
  return (
    <div
      className={`grid-shell ${isArticle ? "app brief-shell is-article" : "home-shell"} ${w.chat ? "with-chat" : ""}`}
    >
      <a className="skip-link" href="#brief-content">
        Skip to brief
      </a>
      <header className="aim-header">
        <div className="aim-header-center">
          <Link
            className="aim-wordmark"
            href={`/?market=${market}`}
            aria-label="Back to your brief"
          >
            <span className="aim-brand-mark" aria-hidden="true" />
            <span>Aim</span>
          </Link>
          <time className="aim-edition-date" dateTime={period}>
            <span className="aim-edition-full">
              Week of {formatDate(period, true)}
            </span>
            <span className="aim-edition-short">
              Week of {formatDate(period)}
            </span>
          </time>
        </div>
        <div className="aim-header-actions">
          <button
            ref={chatButton}
            className="aim-personalize"
            onClick={w.toggleChat}
            aria-label="Personalize"
            title="Personalize"
            aria-controls="home-personalization"
            aria-expanded={w.chat}
          >
            <SlidersHorizontal size={16} />
            <span>Personalize</span>
          </button>
        </div>
      </header>
      <div id="brief-content" className="content-slot" tabIndex={-1}>
        {isArticle && selected ? (
          <Article brief={selected} index={index} workspace={w} />
        ) : (
          <PublicationGrid key={market} brief={selected} workspace={w} />
        )}
      </div>
      {w.chat && (
        <Chat
          workspace={{
            ...w,
            closeChat: () => {
              w.closeChat();
              chatButton.current?.focus();
            },
          }}
        />
      )}
    </div>
  );
}
