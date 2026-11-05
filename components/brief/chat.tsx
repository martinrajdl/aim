"use client";
import { useEffect, useRef } from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  CornerDownLeft,
  Undo2,
  X,
} from "lucide-react";
import type { Workspace } from "@/lib/use-workspace";
import type { ChatMessage } from "@/lib/chat-history";
import { appliedPreferences } from "@/lib/applied-preferences";
import { Orb } from "@/components/ui/orb";

function Message({ message }: { message: ChatMessage }) {
  return (
    <article
      className={`home-chat-message ${message.kind === "error" ? "chat-error" : ""}`}
    >
      <p className="home-chat-request">
        <span className="sr-only">You: </span>
        {message.request}
      </p>
      <p className="home-chat-response">
        <span className="sr-only">Aim: </span>
        {message.kind === "success" && <Check size={14} aria-hidden="true" />}
        {message.response}
      </p>
    </article>
  );
}
const suggestions = [
  "Only new this week",
  "Hide the one-liners",
  "Put numbers first",
  "Group by company",
];
export function Chat({ workspace: w }: { workspace: Workspace }) {
  const input = useRef<HTMLTextAreaElement>(null),
    history = useRef<HTMLDivElement>(null);
  const initialCount = useRef(w.messages.length);
  const preferences = appliedPreferences(w.preferences, w.briefs);
  const earlier = w.messages.slice(0, initialCount.current),
    recent = w.messages.slice(initialCount.current);
  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (recent.length || w.pending)
      history.current?.scrollTo({ top: history.current.scrollHeight });
  }, [w.messages, w.pending, recent.length]);
  return (
    <aside
      className="home-chat personalization-panel global-chat"
      id="home-personalization"
      aria-labelledby="home-chat-title"
    >
      <header className="home-chat-header">
        <h2 id="home-chat-title">Personalize</h2>
        <button
          className="home-chat-close"
          onClick={w.closeChat}
          aria-label="Close personalization"
        >
          <X size={18} />
        </button>
      </header>
      {preferences.length > 0 && (
        <section
          className="applied-preferences"
          aria-label="Applied preferences"
        >
          <div className="applied-heading">
            <span>Applied</span>
            <button type="button" onClick={w.reset}>
              Clear all
            </button>
          </div>
          <ul className="preference-pills">
            {preferences.map((p) => (
              <li className="preference-pill" key={p.id}>
                <button
                  type="button"
                  className="preference-pill-label"
                  title={p.detail || "Edit this preference in chat"}
                  aria-label={`Edit preference: ${p.label}`}
                  onClick={() => {
                    w.setInput(p.request);
                    input.current?.focus();
                  }}
                >
                  {p.label}
                </button>
                <button
                  type="button"
                  className="preference-pill-remove"
                  aria-label={`Remove ${p.label}`}
                  title={`Remove ${p.label}`}
                  onClick={() => w.removePreference(p.id)}
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="home-chat-body conversation-body" ref={history}>
        {earlier.length > 0 && (
          <details className="conversation-archive">
            <summary>
              Conversation history{" "}
              <span>
                {earlier.length}
                <ChevronDown size={14} />
              </span>
            </summary>
            <p>Previous requests may differ from your applied preferences.</p>
            {earlier.map((message, i) => (
              <Message key={i} message={message} />
            ))}
          </details>
        )}
        {recent.length === 0 && !w.pending && (
          <div className="chat-start">
            <h3>How would you like to read?</h3>
            <div className="suggested-messages" aria-label="Suggested messages">
              {suggestions.map((request) => (
                <button
                  key={request}
                  type="button"
                  aria-label={`Send suggestion: ${request}`}
                  onClick={() => w.submit(request)}
                >
                  <span>{request}</span>
                  <CornerDownLeft size={14} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}
        <div
          className="home-chat-history"
          aria-label="Personalization conversation"
          aria-live="polite"
        >
          {recent.map((message, i) => (
            <Message key={i} message={message} />
          ))}
        </div>
        {w.pending && (
          <>
            <p className="home-chat-request">{w.pendingRequest}</p>
            <div className="chat-pending" role="status">
              <Orb size={24} />
              <span>Updating your brief…</span>
            </div>
          </>
        )}
        {w.storageNotice && (
          <p className="chat-storage-note" role="status">
            {w.storageNotice}
          </p>
        )}
        {w.chatHistoryError && (
          <p className="chat-storage-note" role="status">
            {w.chatHistoryError}
          </p>
        )}
        {w.retry && (
          <button
            className="chat-retry"
            type="button"
            onClick={() => w.submit(w.retry)}
            disabled={w.pending}
          >
            Retry request
          </button>
        )}
      </div>
      <form
        className="home-chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          w.submit();
        }}
      >
        <label htmlFor="personalize-input" className="sr-only">
          How should your brief change?
        </label>
        <div className="chat-composer">
          <textarea
            ref={input}
            id="personalize-input"
            aria-label="How should your brief change?"
            value={w.input}
            onChange={(e) => w.setInput(e.target.value)}
            rows={3}
            maxLength={1500}
            placeholder="Tell Aim what works for you…"
            aria-describedby="chat-hint"
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                w.submit();
              }
            }}
          />
          {w.pending ? (
            <button
              type="button"
              className="composer-cancel"
              onClick={w.cancel}
            >
              Cancel
            </button>
          ) : (
            <button
              className="composer-send"
              type="submit"
              disabled={!w.input.trim()}
              aria-label="Send request"
              title="Send request"
            >
              <ArrowUp size={16} />
            </button>
          )}
        </div>
        <div className="chat-composer-footer">
          <span id="chat-hint">
            {w.sessionOnly
              ? "Session only · storage unavailable"
              : "Enter to send"}
          </span>
          {w.canUndo && (
            <button type="button" onClick={w.undo}>
              <Undo2 size={13} />
              Undo
            </button>
          )}
        </div>
      </form>
      <p className="sr-only" role="status">
        {w.status}
      </p>
    </aside>
  );
}
