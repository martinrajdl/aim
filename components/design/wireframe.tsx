"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  LayoutGrid,
  MessageSquare,
  MousePointer2,
  SlidersHorizontal,
  SquareDashedMousePointer,
  X,
} from "lucide-react";
import { formatDate, tierNames, type BriefKey, type Tier } from "@/lib/brief";
import {
  startingZones,
  wireframeNotes,
  wireframeRoles,
  wireframeScreens,
  type WireframeRole,
  type WireframeScreen,
  type WireframeZone,
} from "./wireframe-notes";

type SampleItem = {
  id: string;
  index: number;
  headline: string;
  means: string;
  excerpt: string;
  tier: Tier;
  status: string;
  date: string;
  scope: string;
  current: string | null;
  figure: { title: string; type: string; scope: string } | null;
};
type Sample = {
  key: BriefKey;
  label: string;
  reader: string;
  audience: string;
  subject: string;
  verdict: string;
  period: string;
  scopes: string[];
  order: string[];
  contents: string[];
  groups: { label: string; ids: string[] }[];
  items: SampleItem[];
};
type Story = { brief: Sample; item: SampleItem };
type ReadingScreen = Exclude<WireframeScreen, "chat">;
type Actions = {
  selected: WireframeZone;
  inspect: (zone: WireframeZone) => void;
  openStory: (id: string) => void;
};
const WireframeActions = createContext<Actions | null>(null);
const screenIcons = [LayoutGrid, LayoutGrid, MessageSquare, LayoutGrid];

function GhostLines() {
  return (
    <span className="wf-lines" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
function Zone({
  id,
  children,
  className = "",
}: {
  id: WireframeZone;
  children?: ReactNode;
  className?: string;
}) {
  const { selected, inspect } = useContext(WireframeActions)!;
  const entry = wireframeNotes[id];
  return (
    <section
      className={`wf-zone wf-${entry.role} ${selected === id ? "wf-selected" : ""} ${className}`}
      data-zone={id}
    >
      <button
        className="wf-zone-heading"
        type="button"
        aria-label={`Explain ${entry.title}`}
        aria-pressed={selected === id}
        onClick={() => inspect(id)}
      >
        <span className="wf-number">{entry.number}</span>
        <span>{entry.title}</span>
        <ArrowUpRight size={13} aria-hidden="true" />
      </button>
      <p className="wf-zone-caption">{entry.short}</p>
      {children && <div className="wf-zone-content">{children}</div>}
    </section>
  );
}
function StoryButton({
  story,
  label = "Read story",
  preview = false,
}: {
  story: Story;
  label?: string;
  preview?: boolean;
}) {
  const { openStory } = useContext(WireframeActions)!;
  return (
    <div className="wf-story-example" data-example-item={story.item.id}>
      <span className="wf-source-label">
        {story.brief.label} · {formatDate(story.item.date)}
      </span>
      <button
        className="wf-story-link"
        type="button"
        onClick={() => openStory(story.item.id)}
      >
        <span>{story.item.headline}</span>
        <span className="wf-link-label">
          {label}
          <ArrowRight size={13} aria-hidden="true" />
        </span>
      </button>
      {preview && (
        <>
          <span className="wf-source-label">For {story.brief.audience}</span>
          <div className="wf-meaning-preview">
            {story.item.means && <span>Why it matters</span>}
            <p>{story.item.means || story.item.excerpt}</p>
          </div>
        </>
      )}
    </div>
  );
}
function FigurePlaceholder({ item }: { item: SampleItem }) {
  if (!item.figure) return null;
  return (
    <div
      className="wf-figure-placeholder"
      aria-label="Schematic figure placeholder, no plotted data"
    >
      <span />
      <span />
      <span />
      <p>
        {item.figure.type} · {item.figure.title}
      </p>
    </div>
  );
}

export function Wireframe({ sample }: { sample: Sample }) {
  const [screen, setScreen] = useState<WireframeScreen>("brief");
  const [selected, setSelected] = useState<WireframeZone>("summary");
  const [mobilePanel, setMobilePanel] = useState<"canvas" | "notes">("canvas");
  const [articleId, setArticleId] = useState<string | null>(null);
  const [readingScreen, setReadingScreen] = useState<ReadingScreen>("brief");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [currentOpen, setCurrentOpen] = useState(false);
  const [exampleRequest, setExampleRequest] = useState("");
  const [groupedExample, setGroupedExample] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [scrollTarget, setScrollTarget] = useState<WireframeZone | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const canvasTab = useRef<HTMLButtonElement>(null);
  const notesTab = useRef<HTMLButtonElement>(null);
  const all = sample.items.map((item) => ({ brief: sample, item }));
  const byId = new Map(all.map((story) => [story.item.id, story]));
  const isPanel = screen === "chat";
  const baseScreen = isPanel ? readingScreen : screen;
  const articleItem =
    sample.items.find((item) => item.id === articleId) ||
    byId.get(sample.order[0])!.item;
  const active = wireframeScreens.find((entry) => entry.id === screen)!;
  const note = wireframeNotes[selected];
  const featured = sample.order.slice(0, 6).map((id) => byId.get(id)!);
  const featuredIds = new Set(featured.map((story) => story.item.id));
  const railItems = all.filter((story) => !featuredIds.has(story.item.id));
  const connection = "connection" in note ? note.connection : undefined;

  useEffect(() => {
    if (
      scrollTarget &&
      (mobilePanel === "canvas" ||
        window.matchMedia("(min-width: 761px)").matches)
    )
      canvas.current
        ?.querySelector(".wf-selected")
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [screen, scrollTarget, mobilePanel]);
  function navigate(
    next: WireframeScreen,
    zone: WireframeZone = startingZones[next],
  ) {
    if (next === "chat" && !isPanel) setReadingScreen(screen as ReadingScreen);
    if (next === "grouped") setGroupedExample(true);
    setScreen(next);
    setSelected(zone);
    setMobilePanel("canvas");
    setScrollTarget(zone === startingZones[next] ? null : zone);
    if (window.matchMedia("(max-width: 760px)").matches)
      canvasTab.current?.focus();
  }
  function inspect(zone: WireframeZone) {
    setSelected(zone);
    setMobilePanel("notes");
    setScrollTarget(zone);
    if (window.matchMedia("(max-width: 760px)").matches)
      notesTab.current?.focus();
  }
  function openStory(id: string) {
    setArticleId(id);
    setSourcesOpen(false);
    setCurrentOpen(false);
    if (isPanel) setReadingScreen("article");
    else navigate("article");
  }
  function clearExample() {
    setGroupedExample(false);
    if (readingScreen === "grouped") setReadingScreen("brief");
    setFeedback("Example defaults restored.");
  }
  function followConnection() {
    if (!connection) return;
    if (selected === "lead") return openStory(featured[0].item.id);
    if (selected === "support") return openStory(featured[1].item.id);
    if (selected === "rail" && railItems[0])
      return openStory(railItems[0].item.id);
    navigate(connection.screen, connection.zone as WireframeZone);
  }

  const summary = (
    <Zone id="summary" className="wf-intro">
      <strong className="wf-source-title">{sample.subject}</strong>
      <p className="wf-source-excerpt">{sample.verdict}</p>
      <div className="wf-summary-meta">
        <span>For {sample.audience}</span>
        <span>{sample.items.length} updates</span>
      </div>
    </Zone>
  );
  const editorial = (
    <>
      {summary}
      <div className="wf-editorial-grid">
        <Zone id="lead" className="wf-lead">
          <StoryButton story={featured[0]} label="Read the analysis" preview />
          <FigurePlaceholder item={featured[0].item} />
        </Zone>
        <Zone id="support" className="wf-support">
          {featured.slice(1, 3).map((story) => (
            <StoryButton key={story.item.id} story={story} preview />
          ))}
        </Zone>
        <Zone id="rail" className="wf-rail">
          <strong className="wf-source-title">More this week</strong>
          <div className="wf-rail-rows">
            {railItems.map((story) => (
              <StoryButton key={story.item.id} story={story} label="Read" />
            ))}
          </div>
          <span className="wf-scroll-label">
            {railItems.length} updates · Scroll ↕
          </span>
        </Zone>
        <Zone id="strip" className="wf-strip">
          <div className="wf-strip-items">
            {featured.slice(3).map((story) => (
              <StoryButton key={story.item.id} story={story} />
            ))}
          </div>
        </Zone>
      </div>
    </>
  );
  const grouped = (
    <>
      {summary}
      <Zone id="grouped">
        <div className="wf-demo-caption">
          Example preference: Grouping → By current
        </div>
        <div className="wf-grouped-examples">
          {sample.groups.map((group) => (
            <section key={group.label}>
              <h3>
                {group.label}
                <span>{group.ids.length}</span>
              </h3>
              <div>
                {group.ids.map((id) => (
                  <StoryButton key={id} story={byId.get(id)!} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </Zone>
    </>
  );
  const article = (
    <div className="wf-reader-layout">
      <Zone id="contents">
        <div className="wf-reader-top">
          <button onClick={() => navigate("brief")}>
            <ArrowLeft size={13} />
            Back to brief
          </button>
          <span>
            {sample.contents.indexOf(articleItem.id) + 1} /{" "}
            {sample.items.length}
          </span>
          <div>
            {[-1, 1].map((offset) => {
              const next =
                sample.contents[
                  sample.contents.indexOf(articleItem.id) + offset
                ];
              return (
                <button
                  key={offset}
                  disabled={!next}
                  aria-label={
                    offset < 0
                      ? "Previous example update"
                      : "Next example update"
                  }
                  onClick={() => openStory(next)}
                >
                  {offset < 0 ? "←" : "→"}
                </button>
              );
            })}
          </div>
        </div>
      </Zone>
      <Zone id="article">
        <span className="wf-source-label">
          {tierNames[articleItem.tier]} · {formatDate(articleItem.date)} ·{" "}
          {articleItem.status}
        </span>
        <strong className="wf-article-headline">{articleItem.headline}</strong>
        <GhostLines />
        <GhostLines />
      </Zone>
      {articleItem.means && (
        <Zone id="meaning">
          <span className="wf-source-label">What it means · Supplied text</span>
          <p className="wf-source-excerpt">{articleItem.means}</p>
        </Zone>
      )}
      {articleItem.figure && (
        <Zone id="figure">
          <FigurePlaceholder item={articleItem} />
          <span className="wf-source-label">
            {articleItem.figure.scope === "current"
              ? "Whole-current context"
              : "This update"}
          </span>
        </Zone>
      )}
      <Zone id="sources">
        <div className="wf-inline">
          <span>Monitoring area</span>
          <strong>{articleItem.scope}</strong>
        </div>
        <button
          className="wf-disclosure"
          aria-expanded={sourcesOpen}
          onClick={() => setSourcesOpen(!sourcesOpen)}
        >
          Sources and updates <span>{sourcesOpen ? "−" : "+"}</span>
        </button>
        {sourcesOpen && (
          <p className="wf-disclosed">
            Curated source updates and signals → Aim objects in a new tab.
          </p>
        )}
        {articleItem.current && (
          <>
            <button
              className="wf-disclosure"
              aria-expanded={currentOpen}
              onClick={() => setCurrentOpen(!currentOpen)}
            >
              About this current <span>{currentOpen ? "−" : "+"}</span>
            </button>
            {currentOpen && (
              <p className="wf-disclosed">
                {articleItem.current}
                <br />
                Original current context, signals and related evidence.
              </p>
            )}
          </>
        )}
      </Zone>
    </div>
  );
  const reading =
    baseScreen === "article"
      ? article
      : baseScreen === "grouped" || (baseScreen === "brief" && groupedExample)
        ? grouped
        : editorial;

  const personalization = (
    <aside className="wf-chat-layout" aria-label="Example personalization">
      <div className="wf-panel-title">
        <strong>Personalize</strong>
        <button
          aria-label="Close example personalization"
          onClick={() => navigate(readingScreen)}
        >
          <X size={14} />
        </button>
      </div>
      <Zone id="applied">
        {groupedExample ? (
          <div className="wf-applied-row">
            <span className="wf-applied-pill">
              By current
              <button
                aria-label="Remove example grouping preference"
                onClick={clearExample}
              >
                <X size={12} />
              </button>
            </span>
            <button className="wf-clear-example" onClick={clearExample}>
              Clear all
            </button>
          </div>
        ) : (
          <p className="wf-simulation-note">No custom preferences applied.</p>
        )}
      </Zone>
      <Zone id="chat">
        <strong className="wf-source-title">How would you like to read?</strong>
        <div
          className="wf-example-requests"
          aria-label="Example suggested messages"
        >
          <button onClick={() => setExampleRequest("Group updates by current")}>
            <MessageSquare size={13} /> Group updates by current{" "}
            <ArrowRight size={13} />
          </button>
          <button onClick={() => setExampleRequest("Restore default reading")}>
            <MessageSquare size={13} /> Restore default reading{" "}
            <ArrowRight size={13} />
          </button>
        </div>
        {feedback && (
          <p className="wf-example-feedback" role="status">
            {feedback}
          </p>
        )}
      </Zone>
      <Zone id="history">
        <details className="wf-history">
          <summary>
            Conversation history <ChevronDown size={12} />
          </summary>
          <p>Earlier requests can differ from the preferences applied now.</p>
          <GhostLines />
          <span className="wf-source-label">
            Illustrative archive, no personal messages loaded.
          </span>
        </details>
      </Zone>
      <div className="wf-composer-example">
        <span>Ask for a change</span>
        <div className="wf-composer-placeholder">
          {exampleRequest || "e.g. Group updates by current"}
        </div>
        <button
          className="wf-demo-send"
          disabled={!exampleRequest}
          onClick={() => {
            if (exampleRequest === "Group updates by current") {
              setGroupedExample(true);
              setFeedback("By current applied in this isolated example.");
            } else clearExample();
            setExampleRequest("");
          }}
        >
          Preview example <ArrowRight size={12} />
        </button>
        <p>Illustration only · No model request</p>
      </div>
    </aside>
  );

  const flows: {
    from: string;
    to: string;
    screen: WireframeScreen;
    zone?: WireframeZone;
  }[] =
    screen === "chat"
      ? [
          {
            from: "Applied pill",
            to: "Active preference",
            screen: "chat",
            zone: "applied",
          },
          { from: "Grouping", to: "Rearranged brief", screen: "grouped" },
        ]
      : screen === "article"
        ? [
            { from: "Back", to: "Brief", screen: "brief" },
            {
              from: "Sources",
              to: "Evidence",
              screen: "article",
              zone: "sources",
            },
            { from: "Personalize", to: "Chat", screen: "chat" },
          ]
        : [
            { from: "Story", to: "Article", screen: "article" },
            { from: "Personalize", to: "Chat", screen: "chat" },
          ];

  return (
    <WireframeActions value={{ selected, inspect, openStory }}>
      <main className="wf-page">
        <header className="wf-header">
          <div className="wf-heading">
            <span className="wf-logo">
              <SquareDashedMousePointer size={23} strokeWidth={1.4} />
            </span>
            <div>
              <p className="wf-eyebrow">Aim / Design anatomy</p>
              <h1>The interface, explained.</h1>
            </div>
          </div>
          <div className="wf-header-links">
            <Link href="/sitemap">Review samples</Link>
            <Link href="/design">Design system</Link>
            <Link className="wf-open-app" href="/">
              Open app <ArrowUpRight size={15} />
            </Link>
          </div>
        </header>
        <div className="wf-introduction">
          <p>
            Colored panels explain the current UI. Select one to follow the
            thinking.
          </p>
          <span className="wf-baseline">One reader · One brief</span>
        </div>
        <nav className="wf-screens" aria-label="Wireframe screens">
          {wireframeScreens.map((entry, index) => {
            const Icon = screenIcons[index];
            return (
              <button
                key={entry.id}
                aria-pressed={screen === entry.id}
                onClick={() => navigate(entry.id)}
              >
                <span className="wf-step-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Icon size={15} aria-hidden="true" />
                <span>{entry.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="wf-legend">
          <div>
            {Object.entries(wireframeRoles).map(([role, label]) => (
              <span className={`wf-legend-item wf-${role}`} key={role}>
                <i />
                {label}
              </span>
            ))}
          </div>
          <span className="wf-click-hint">
            <MousePointer2 size={13} />
            Walkthrough states above · Select a panel below
          </span>
        </div>
        <div
          className="wf-mobile-switch"
          role="group"
          aria-label="Wireframe panel"
        >
          <button
            ref={canvasTab}
            aria-pressed={mobilePanel === "canvas"}
            onClick={() => setMobilePanel("canvas")}
          >
            Wireframe
          </button>
          <button
            ref={notesTab}
            aria-pressed={mobilePanel === "notes"}
            onClick={() => setMobilePanel("notes")}
          >
            Explanation <span>{note.number}</span>
          </button>
        </div>
        <div className={`wf-workspace wf-show-${mobilePanel}`}>
          <section
            className="wf-stage"
            aria-label={`${active.label} wireframe`}
          >
            <header className="wf-stage-heading">
              <div>
                <span className="wf-eyebrow">State / {active.label}</span>
                <p>{active.task}</p>
              </div>
              <span className="wf-schematic-label">Schematic</span>
            </header>
            <div
              className="wf-canvas"
              key={screen}
              ref={canvas}
              tabIndex={0}
              aria-label="Scrollable wireframe canvas"
            >
              <div className={`wf-mock-shell wf-screen-${screen}`}>
                <div className="wf-mock-header">
                  <Zone id="shell" className="wf-masthead">
                    <strong>Aim</strong>
                    <span>Week of {formatDate(sample.period)}</span>
                  </Zone>
                  <button
                    className="wf-personalize-trigger"
                    onClick={() => navigate(isPanel ? readingScreen : "chat")}
                  >
                    <SlidersHorizontal size={13} />
                    Personalize
                  </button>
                </div>
                <div
                  className={`wf-mock-body ${isPanel ? "wf-with-panel" : ""}`}
                >
                  <div className="wf-mock-main">
                    {isPanel ? (
                      <div className="wf-retained-content">
                        <span className="wf-demo-caption">
                          This brief remains visible · Compressed schematic
                        </span>
                        {baseScreen === "article" ? (
                          <Zone id="article">
                            <strong className="wf-source-title">
                              {articleItem.headline}
                            </strong>
                            <GhostLines />
                            <FigurePlaceholder item={articleItem} />
                          </Zone>
                        ) : (
                          <>
                            <Zone
                              id={
                                baseScreen === "grouped" ||
                                (baseScreen === "brief" && groupedExample)
                                  ? "grouped"
                                  : "lead"
                              }
                            >
                              {baseScreen === "grouped" ||
                              (baseScreen === "brief" && groupedExample) ? (
                                <strong className="wf-source-title">
                                  Grouped by current
                                </strong>
                              ) : (
                                <StoryButton story={featured[0]} preview />
                              )}
                              <GhostLines />
                            </Zone>
                          </>
                        )}
                        <div className="wf-connection-callout">
                          <ArrowLeft size={14} />
                          <span>
                            Preferences update this reading experience and
                            remain shared across reviewer samples.
                          </span>
                        </div>
                      </div>
                    ) : (
                      reading
                    )}
                  </div>
                  {isPanel && personalization}
                </div>
              </div>
            </div>
            <footer className="wf-flow">
              <span className="wf-eyebrow">Connections</span>
              <div>
                {flows.map((flow) => (
                  <button
                    key={flow.from}
                    onClick={() => navigate(flow.screen, flow.zone)}
                  >
                    <span>{flow.from}</span>
                    <ArrowRight size={13} />
                    <strong>{flow.to}</strong>
                  </button>
                ))}
              </div>
            </footer>
          </section>
          <aside
            className={`wf-inspector wf-${note.role}`}
            aria-label="Panel explanation"
          >
            <div className="wf-inspector-top">
              <span className="wf-eyebrow">The thinking behind it</span>
              <span className="wf-inspector-number">{note.number}</span>
            </div>
            <div
              className="wf-inspector-scroll"
              tabIndex={0}
              aria-label="Scrollable explanation"
              key={selected}
            >
              <span className="wf-role-label">
                {wireframeRoles[note.role as WireframeRole]}
              </span>
              <h2>{note.title}</h2>
              <section>
                <h3>Why here</h3>
                <p>{note.why}</p>
              </section>
              <section>
                <h3>What belongs here</h3>
                <p>{note.content}</p>
              </section>
              <section>
                <h3>How it connects</h3>
                <p>{note.behavior}</p>
              </section>
              {connection && (
                <button className="wf-follow" onClick={followConnection}>
                  {connection.label}
                  <ArrowRight size={16} />
                </button>
              )}
              <div className="wf-inspector-footnote">
                Design rationale, not a measured usability result. Color
                identifies the panel’s role, not its importance.
              </div>
            </div>
          </aside>
        </div>
        <footer className="wf-page-footer">
          <span>
            One reader’s brief · Supplied source excerpts · Authored annotations
          </span>
          <span>Isolated examples · No product preferences are changed</span>
        </footer>
        <p className="sr-only" role="status">
          {active.label} state. Selected panel {note.number}: {note.title}.
        </p>
      </main>
    </WireframeActions>
  );
}
