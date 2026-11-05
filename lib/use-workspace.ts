"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  briefKeys,
  keySchema,
  normalizeBrief,
  type Brief,
  type BriefKey,
} from "./brief";
import { defaultView, validView, type ViewConfig } from "./view-config";
import { loadPreferences, savePreferences, sourceSnapshot } from "./storage";
import {
  requestSchema,
  validateOutcome,
  outcomeMessage,
  type CustomizationRequest,
} from "./customization";
import {
  loadChatHistory,
  saveChatHistory,
  type ChatMessage,
} from "./chat-history";
import { removePreference, type PreferenceId } from "./applied-preferences";

class RequestError extends Error {}
export type Views = Record<BriefKey, ViewConfig>;
type Clarification = NonNullable<CustomizationRequest["clarification"]>;
const clarificationKey = "aim:clarification:global:2";

export function useWorkspace() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [preferences, setPreferences] = useState<ViewConfig>(() =>
    structuredClone(defaultView),
  );
  const [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [loadAttempt, setLoadAttempt] = useState(0);
  const [chat, setChat] = useState(false),
    [pending, setPending] = useState(false),
    [status, setStatus] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]),
    [chatHistoryError, setChatHistoryError] = useState("");
  const [pendingRequest, setPendingRequest] = useState("");
  const [input, setInput] = useState(""),
    [retry, setRetry] = useState(""),
    [sessionOnly, setSessionOnly] = useState(false);
  const [previous, setPrevious] = useState<ViewConfig | null>(null),
    [storageNotice, setStorageNotice] = useState("");
  const revision = useRef(0),
    controller = useRef<AbortController | null>(null);
  const preferencesRef = useRef(preferences),
    messagesRef = useRef(messages),
    clarification = useRef<Clarification | undefined>(undefined);
  const views = Object.fromEntries(
    briefKeys.map((key) => [key, preferences]),
  ) as Views;
  function invalidate() {
    revision.current++;
    controller.current?.abort();
    controller.current = null;
    setPending(false);
  }
  useEffect(() => {
    try {
      const saved = loadChatHistory(localStorage);
      messagesRef.current = saved;
      setMessages(saved);
    } catch {
      setChatHistoryError("Saved chat history could not be loaded.");
    }
  }, []);
  function appendMessage(message: ChatMessage) {
    const next = [...messagesRef.current, message];
    messagesRef.current = next;
    setMessages(next);
    try {
      saveChatHistory(next, localStorage);
      setChatHistoryError("");
    } catch {
      setChatHistoryError(
        "Chat history could not be saved. New messages last for this session.",
      );
    }
  }
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setLoadError("");
    (async () => {
      try {
        const list = await fetch("/api/briefs", { signal: c.signal });
        if (!list.ok) throw Error();
        const manifest = z
          .object({ briefs: z.array(z.object({ key: keySchema })).length(3) })
          .parse(await list.json());
        if (new Set(manifest.briefs.map((b) => b.key)).size !== 3)
          throw Error();
        const loaded = await Promise.all(
          manifest.briefs.map(async ({ key }) => {
            const response = await fetch(`/api/briefs/${key}`, {
              signal: c.signal,
            });
            if (!response.ok) throw Error();
            const body = z
              .object({
                key: keySchema,
                fingerprint: z.string(),
                envelope: z.unknown(),
              })
              .parse(await response.json());
            if (body.key !== key) throw Error();
            return normalizeBrief(key, body.envelope, body.fingerprint);
          }),
        );
        if (c.signal.aborted) return;
        let restored: ReturnType<typeof loadPreferences>;
        try {
          restored = loadPreferences(loaded, localStorage);
        } catch {
          restored = {
            config: structuredClone(defaultView),
            unavailable: true,
            notice: "Saved preferences are unavailable.",
            rewrite: false,
          };
        }
        setBriefs(loaded);
        preferencesRef.current = restored.config;
        setPreferences(restored.config);
        setSessionOnly(restored.unavailable);
        setStorageNotice(restored.notice);
        if (restored.rewrite) {
          try {
            if (!savePreferences(loaded, restored.config, localStorage))
              setSessionOnly(true);
          } catch {
            setSessionOnly(true);
          }
        }
        try {
          const saved = JSON.parse(
            localStorage.getItem(clarificationKey) || "null",
          );
          const parsed = requestSchema.shape.clarification.safeParse(
            saved?.value,
          );
          if (
            parsed.success &&
            JSON.stringify(saved?.sources) ===
              JSON.stringify(sourceSnapshot(loaded))
          )
            clarification.current = parsed.data;
        } catch {}
        try {
          const saved = JSON.parse(
            sessionStorage.getItem("aim:shell:1") || "null",
          );
          setChat(typeof saved?.chat === "boolean" ? saved.chat : false);
        } catch {}
      } catch {
        if (!c.signal.aborted)
          setLoadError("Your brief could not be loaded. Please try again.");
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    })();
    return () => c.abort();
  }, [loadAttempt]);
  useEffect(() => {
    if (!loading)
      try {
        sessionStorage.setItem("aim:shell:1", JSON.stringify({ chat }));
      } catch {}
  }, [chat, loading]);
  useEffect(() => () => controller.current?.abort(), []);
  function saveClarification(value?: Clarification) {
    clarification.current = value;
    try {
      if (value)
        localStorage.setItem(
          clarificationKey,
          JSON.stringify({ sources: sourceSnapshot(briefs), value }),
        );
      else localStorage.removeItem(clarificationKey);
    } catch {
      setSessionOnly(true);
    }
  }
  function commit(config: ViewConfig, remember = true) {
    const valid = validView(config, briefs);
    if (!valid) return;
    invalidate();
    if (remember) setPrevious(preferencesRef.current);
    preferencesRef.current = valid;
    setPreferences(valid);
    saveClarification();
    try {
      setSessionOnly(!savePreferences(briefs, valid, localStorage));
    } catch {
      setSessionOnly(true);
    }
    setStorageNotice("");
    setRetry("");
  }
  function reset() {
    commit(structuredClone(defaultView));
    setStatus("Default preferences restored.");
  }
  function undo() {
    if (!previous) return;
    commit(previous, false);
    setPrevious(null);
    setStatus("Previous preferences restored.");
  }
  function remove(id: PreferenceId) {
    commit(removePreference(preferencesRef.current, id));
    setStatus("Preference removed.");
  }
  async function submit(request = input) {
    if (!request.trim() || controller.current || loading || !briefs.length)
      return;
    invalidate();
    const c = new AbortController();
    controller.current = c;
    const requestRevision = revision.current,
      requestId = crypto.randomUUID(),
      unresolved = clarification.current;
    setPending(true);
    setPendingRequest(request.trim());
    setStatus("");
    setRetry("");
    setInput("");
    try {
      const response = await fetch("/api/customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          revision: requestRevision,
          request: request.trim(),
          config: preferencesRef.current,
          sources: sourceSnapshot(briefs),
          clarification: unresolved,
        }),
        signal: AbortSignal.any([c.signal, AbortSignal.timeout(50000)]),
      });
      const body = await response.json();
      if (c.signal.aborted || revision.current !== requestRevision) return;
      if (!response.ok)
        throw new RequestError(
          typeof body.error === "string"
            ? body.error
            : "Personalization is unavailable. Your preferences are unchanged.",
        );
      if (body.requestId !== requestId || body.revision !== requestRevision)
        throw new RequestError(
          "This response is out of date. Your preferences are unchanged.",
        );
      const outcome = validateOutcome(body.outcome, briefs),
        acknowledgment = outcomeMessage(outcome);
      if (outcome.outcome === "apply") commit(outcome.config!);
      if (outcome.outcome === "clarify") {
        const requests = [...(unresolved?.requests || []), request.trim()];
        saveClarification({
          requests:
            requests.length > 6
              ? [requests[0], ...requests.slice(-5)]
              : requests,
          reason:
            outcome.reason === "choose_organizations"
              ? "choose_organizations"
              : "ambiguous_request",
        });
      } else if (outcome.outcome === "unsupported") saveClarification();
      appendMessage({
        request: request.trim(),
        response: acknowledgment,
        kind: outcome.outcome === "apply" ? "success" : "info",
      });
      setStatus(acknowledgment);
    } catch (error) {
      if (c.signal.aborted || revision.current !== requestRevision) return;
      const message =
        error instanceof RequestError
          ? error.message
          : error instanceof Error && error.name === "TimeoutError"
            ? "That took too long. Your preferences are unchanged."
            : "That request could not be completed. Your preferences are unchanged. Please retry.";
      appendMessage({
        request: request.trim(),
        response: message,
        kind: "error",
      });
      setStatus(message);
      setRetry(request);
    } finally {
      if (controller.current === c) {
        controller.current = null;
        setPending(false);
      }
    }
  }
  return {
    briefs,
    preferences,
    views,
    loading,
    loadError,
    reload: () => setLoadAttempt((x) => x + 1),
    chat,
    toggleChat: () => setChat((v) => !v),
    closeChat: () => setChat(false),
    openSettings: () => setChat(true),
    pending,
    pendingRequest,
    status,
    messages,
    chatHistoryError,
    input,
    setInput,
    submit,
    reset,
    undo,
    canUndo: !!previous,
    removePreference: remove,
    retry,
    sessionOnly,
    storageNotice,
    cancel: () => {
      invalidate();
      setStatus("Request cancelled. Your preferences are unchanged.");
    },
  };
}
export type Workspace = ReturnType<typeof useWorkspace>;
