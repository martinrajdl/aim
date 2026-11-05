export type WireframeScreen = "brief" | "article" | "chat" | "grouped";
export const wireframeScreens = [
  {
    id: "brief",
    label: "Brief",
    task: "Scan one reader’s week and choose a story.",
  },
  {
    id: "article",
    label: "Article",
    task: "Read an update and inspect its evidence.",
  },
  {
    id: "chat",
    label: "Chat",
    task: "Describe a preference and see it applied.",
  },
  {
    id: "grouped",
    label: "Grouped brief",
    task: "See how a preference reshapes the same reporting.",
  },
] satisfies { id: WireframeScreen; label: string; task: string }[];
export const wireframeRoles = {
  navigation: "Navigation",
  context: "Context",
  reading: "Reading",
  evidence: "Evidence",
  controls: "Controls",
};
export type WireframeRole = keyof typeof wireframeRoles;
type Note = {
  number: string;
  title: string;
  role: WireframeRole;
  short: string;
  why: string;
  content: string;
  behavior: string;
  connection?: { label: string; screen: WireframeScreen; zone: string };
};
// Authored rationale, not measured usability findings. Reporting remains supplied text.
export const wireframeNotes = {
  shell: {
    number: "01",
    title: "A quiet, stable frame",
    role: "navigation",
    short: "Aim and the edition date on the left; Personalize on the right.",
    why: "A reader receives their own brief. The other samples belong to different people, so they do not appear as categories or tabs in this interface.",
    content:
      "The Aim masthead, supplied edition date and Personalize action. The reviewer sitemap is the only place to switch sample personas.",
    behavior:
      "The masthead returns to this reader’s brief. Personalize stays available from the brief and article. This wireframe’s state tabs explain the journey; they are not product navigation.",
    connection: { label: "Open personalization", screen: "chat", zone: "chat" },
  },
  summary: {
    number: "02",
    title: "This reader’s week in context",
    role: "context",
    short: "The original subject and verdict introduce the brief.",
    why: "The situation and business perspective come from the authored brief. A separate cross-persona overview would mix reporting written for unrelated readers.",
    content:
      "Original subject, or verdict when subject is empty, plus the supplied verdict and eligible update count.",
    behavior:
      "Preferences select and arrange the reporting without rewriting it. The verdict retains its whole-week meaning when some updates are hidden.",
    connection: {
      label: "Explore the lead story",
      screen: "brief",
      zone: "lead",
    },
  },
  lead: {
    number: "03",
    title: "An editorial entry point",
    role: "reading",
    short: "One lead story has room for its implication and evidence.",
    why: "Editorial hierarchy provides a place to begin without flattening every development into an equally prominent card. Prominence follows an authored order, not an inferred relevance score.",
    content:
      "Original headline, date, implication or paragraph preview, and supplied figure preview.",
    behavior:
      "Open the story in the article reader. On mobile, this becomes the first item in a compact, continuous list of eligible updates.",
    connection: {
      label: "Read the lead article",
      screen: "article",
      zone: "article",
    },
  },
  support: {
    number: "04",
    title: "Other developments, in proportion",
    role: "reading",
    short: "Supporting stories provide alternative starting points.",
    why: "A reader can compare developments without committing to the lead. Every story belongs to the same brief and business context.",
    content:
      "Source headlines, dates and existing implications or paragraph previews.",
    behavior:
      "Each card opens the same article reader. Tablet layouts reduce the number of columns; mobile gives every update a list row.",
    connection: {
      label: "Read a supporting article",
      screen: "article",
      zone: "article",
    },
  },
  rail: {
    number: "05",
    title: "The rest stays discoverable",
    role: "reading",
    short: "Remaining updates complement the featured stories.",
    why: "A selective editorial composition still needs to expose the complete eligible inventory. Featured items are not repeated in the remaining-updates rail.",
    content:
      "Original dates and headlines, including brief items and one-liners not already featured.",
    behavior:
      "Read down the rail or open any update. On mobile the reporting forms one continuous list, without a second Headlines/More updates switch.",
    connection: { label: "Open an update", screen: "article", zone: "article" },
  },
  strip: {
    number: "06",
    title: "Use the available reading space",
    role: "reading",
    short: "Additional headlines fill the grid below the lead row.",
    why: "Extra desktop space should reveal more useful entry points while preserving readable line lengths. Smaller screens simplify the composition.",
    content:
      "Source headlines and dates with clear links into the article reader.",
    behavior:
      "Featured capacity adapts to the available reading area. All other eligible items remain accessible, with each update appearing once.",
    connection: {
      label: "Inspect the remaining updates",
      screen: "brief",
      zone: "rail",
    },
  },
  contents: {
    number: "07",
    title: "Move through this brief",
    role: "navigation",
    short: "Back to brief, position and previous/next accompany the article.",
    why: "A dedicated reader needs a clear return and a way to continue, without adding another navigation panel.",
    content:
      "A Back to brief link, position within eligible updates and previous/next controls.",
    behavior:
      "Navigation follows the same saved preferences as the grid. It never switches to another persona or a combined homepage.",
    connection: {
      label: "Return to the brief",
      screen: "brief",
      zone: "summary",
    },
  },
  article: {
    number: "08",
    title: "One update, room to read",
    role: "reading",
    short: "The original headline, date, status and paragraphs.",
    why: "Progressive disclosure keeps the grid concise while preserving a complete reading experience one click away.",
    content:
      "Source content tier, date, item status, headline and paragraphs. Schematic lines stand in for prose; they add no reporting.",
    behavior:
      "The reading pane scrolls inside the viewport. An update hidden by preferences offers a route to adjust them, without silently removing filters.",
    connection: {
      label: "Inspect the evidence",
      screen: "article",
      zone: "sources",
    },
  },
  meaning: {
    number: "09",
    title: "The supplied business implication",
    role: "context",
    short: "What it means stays next to the reporting it explains.",
    why: "Business relevance comes from the supplied intelligence, not an invented score or generated helper text.",
    content:
      "The original means text when present. No implication is created when the source omits it.",
    behavior:
      "The implication retains its meaning under filtering or reordering. Evidence and monitoring context remain close by.",
    connection: {
      label: "Inspect the figure",
      screen: "article",
      zone: "figure",
    },
  },
  figure: {
    number: "10",
    title: "Evidence with its original scope",
    role: "evidence",
    short: "Timelines, charts, tables and comparisons stay with their story.",
    why: "Figures support the reporting and preserve the units and qualifications needed to interpret it correctly.",
    content:
      "The source figure and scope. This wireframe uses a titled placeholder rather than invented values.",
    behavior:
      "Whole-current evidence remains labeled as context. Historical timeline points are retained even when only new updates are selected.",
    connection: {
      label: "Inspect source context",
      screen: "article",
      zone: "sources",
    },
  },
  sources: {
    number: "11",
    title: "Traceability, on demand",
    role: "evidence",
    short: "Monitoring area, source updates and current context.",
    why: "Verification should remain close to the claim without overwhelming the first reading pass.",
    content:
      "Original monitoring area, curated source updates, signals and current context. Known source discrepancies remain disclosed.",
    behavior:
      "Disclosures expand evidence inside the reader. External Aim object links preserve the article context.",
  },
  chat: {
    number: "12",
    title: "Ask beside the result",
    role: "controls",
    short: "Chat is the primary way to personalise the reading experience.",
    why: "The reader can describe an intent and see the grid change. There is one preference profile, so no persona selector or scope explanation is needed in the panel.",
    content:
      "Conversation, suggested requests and a composer. Suggestions are ready-to-send messages, not a separate set of settings.",
    behavior:
      "A validated response updates the shared preferences and the grid. The same preferences apply in articles and persist across reviewer sample switches. This schematic makes no model calls.",
    connection: {
      label: "Inspect applied preferences",
      screen: "chat",
      zone: "applied",
    },
  },
  applied: {
    number: "13",
    title: "Visible, reversible preferences",
    role: "controls",
    short:
      "Applied pills describe the current state, with remove and clear-all actions.",
    why: "A chat history is not an accurate description of the current configuration. Pills make active changes inspectable without a second settings screen.",
    content:
      "Only active custom preferences. Each pill exposes a remove action on hover or keyboard focus; touch keeps it accessible. Clear all restores defaults.",
    behavior:
      "Removing a preference immediately updates the brief. The shared profile stays in localStorage and does not fork by persona. Conversation history remains separate.",
    connection: {
      label: "See the grouped result",
      screen: "grouped",
      zone: "grouped",
    },
  },
  history: {
    number: "14",
    title: "History records earlier requests",
    role: "controls",
    short: "Completed exchanges survive reload without being replayed.",
    why: "Earlier requests may no longer match the active preferences, but can still help the reader revisit an intent.",
    content:
      "Previous completed requests and replies in a disclosure, separate from the active preference pills.",
    behavior:
      "Restoring history never sends another request or reapplies an old configuration. Clear all preferences keeps the conversation record.",
    connection: {
      label: "See active preferences",
      screen: "chat",
      zone: "applied",
    },
  },
  grouped: {
    number: "15",
    title: "The same brief, rearranged",
    role: "reading",
    short: "Group by company, current or monitoring area through chat.",
    why: "Grouping changes how related stories are read without creating another top-level reading mode.",
    content:
      "Source-backed group headings and eligible updates. This example uses the real current-grouping helper and retains unmatched items.",
    behavior:
      "A grouping preference appears as an applied pill. Remove it to return to the default editorial composition. The preference remains global even though each brief contains different groups.",
    connection: {
      label: "Remove the grouping preference",
      screen: "chat",
      zone: "applied",
    },
  },
} satisfies Record<string, Note>;
export type WireframeZone = keyof typeof wireframeNotes;
export const startingZones: Record<WireframeScreen, WireframeZone> = {
  brief: "summary",
  article: "article",
  chat: "chat",
  grouped: "grouped",
};
