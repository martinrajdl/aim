import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Orb } from "@/components/ui/orb";
import { ComponentGallery } from "@/components/design/component-gallery";
import { Figure } from "@/components/brief/figure";
import { getBrief } from "@/lib/server/brief-repository";
const tokens = [
  ["Surface", "surface", "#ffffff"],
  ["Canvas", "canvas", "#f6f5f4"],
  ["Muted surface", "surface-muted", "#f5f5f5"],
  ["Text", "text", "#121212"],
  ["Secondary text", "text-secondary", "#343332"],
  ["Muted text", "text-muted", "#686564"],
  ["Border", "border", "#ebebeb"],
  ["Control border", "control-border", "#8b8785"],
  ["Accent", "accent", "#0b66cb"],
  ["Accent hover", "accent-hover", "#0a52c2"],
  ["Accent soft", "accent-soft", "#e6f4fd"],
  ["Decorative blue", "accent-bright", "#0eaeef"],
];
const states = [
  ["success", "Success", "#20c997", "#087f5b", "#eafaf3", "Preferences saved"],
  ["warning", "Warning", "#f5b82e", "#946200", "#fff8e6", "Review needed"],
  [
    "danger",
    "Error",
    "#f45b72",
    "#d12f4c",
    "#fff0f2",
    "Couldn’t apply changes",
  ],
];
export const metadata = {
  title: "Aim · Design system",
  robots: { index: false, follow: false },
};
export default async function Design() {
  const brief = await getBrief("space");
  return (
    <main className="design-page">
      <header className="design-header">
        <div>
          <span className="design-eyebrow">Aim / Interface reference</span>
          <h1>Aim design system</h1>
          <p>The components, colors and rhythm behind the brief.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/sitemap">
            <ArrowLeft />
            Back to review
          </Link>
        </Button>
      </header>
      <nav className="design-nav" aria-label="Design sections">
        <a href="#components">Components</a>
        <a href="#palette">Palette</a>
        <a href="#type">Typography</a>
        <a href="#spacing">Spacing</a>
        <a href="#loading">Motion & loading</a>
      </nav>
      <section id="components" className="design-section">
        <div className="design-section-heading">
          <h2>Components</h2>
          <p>32px controls · 13px labels · 16px icons · 40px touch targets</p>
        </div>
        <ComponentGallery />
        <div className="design-section-heading">
          <h3>Figures and evidence</h3>
          <p>
            The same figure component and source data used in the article
            reader.
          </p>
        </div>
        <div className="design-figure-preview">
          <Figure item={brief.items[0]} />
        </div>
      </section>
      <section id="palette" className="design-section">
        <div className="design-section-heading">
          <h2>Palette</h2>
          <p>Quiet surfaces, ink for hierarchy, blue for interaction.</p>
        </div>
        <div className="token-grid">
          {tokens.map(([label, token, value]) => (
            <div key={label}>
              <div
                className="token-swatch"
                style={{ background: `var(--aim-${token})` }}
              />
              <h3>{label}</h3>
              <p>{value}</p>
            </div>
          ))}
        </div>
        <div className="design-section-heading">
          <h3>Semantic states</h3>
          <p>Bright indicators paired with readable text and soft surfaces.</p>
        </div>
        <div className="semantic-grid">
          {states.map(([token, name, indicator, ink, soft, example]) => (
            <div key={token} className="semantic-card">
              <div className="semantic-swatches">
                <span style={{ background: `var(--aim-${token}-indicator)` }} />
                <span style={{ background: `var(--aim-${token})` }} />
                <span style={{ background: `var(--aim-${token}-soft)` }} />
              </div>
              <h3>{name}</h3>
              <dl>
                <div>
                  <dt>Indicator</dt>
                  <dd>{indicator}</dd>
                </div>
                <div>
                  <dt>Text</dt>
                  <dd>{ink}</dd>
                </div>
                <div>
                  <dt>Surface</dt>
                  <dd>{soft}</dd>
                </div>
              </dl>
              <div className={`design-state ${token}`}>
                <span className="state-indicator" />
                {example}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section id="type" className="design-section">
        <div className="design-section-heading">
          <h2>Typography</h2>
          <p>Geist for reading. Geist Mono for supporting data.</p>
        </div>
        <div className="type-specimen">
          <span>32 / 40 · Heading</span>
          <h3>A clear view of what matters.</h3>
        </div>
        <div className="type-specimen">
          <span>20 / 28 · Section</span>
          <h4>This week’s currents</h4>
        </div>
        <div className="type-specimen">
          <span>16 / 24 · Reading</span>
          <p>Market intelligence with the context behind each update.</p>
        </div>
        <div className="type-specimen">
          <span>12 / 16 · Metadata</span>
          <div className="mono">
            21 SEPTEMBER 2026 · {brief.items.length} UPDATES
          </div>
        </div>
      </section>
      <section id="spacing" className="design-section">
        <div className="design-section-heading">
          <h2>Spacing & surfaces</h2>
          <p>An 8px foundation. 4px for optical adjustments.</p>
        </div>
        <div className="design-spacing">
          {[8, 16, 24, 32, 40, 48, 64].map((space) => (
            <div key={space}>
              <span style={{ width: space, height: space }} />
              <p>{space}px</p>
            </div>
          ))}
        </div>
        <div className="design-row">
          {[1, 2, 3].map((level, index) => (
            <div
              key={level}
              className="design-elevation"
              style={{
                boxShadow: `var(--aim-shadow-${level})`,
                borderRadius: [4, 8, 16][index],
              }}
            >
              <strong>{["Detail", "Control", "Panel"][index]}</strong>
              <p>
                {[4, 8, 16][index]}px radius · Elevation {level}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section id="loading" className="design-section">
        <div className="design-section-heading">
          <h2>Motion & loading</h2>
          <p>140ms feedback · 220ms panels · Reduced-motion support</p>
        </div>
        <div className="design-row">
          {[24, 32, 48, 96].map((size) => (
            <div className="design-loader-size" key={size}>
              <Orb size={size} />
              <p>{size}px</p>
            </div>
          ))}
        </div>
        <div className="design-loading-example" role="status">
          <Orb size={32} />
          <span>Loading your brief…</span>
        </div>
      </section>
    </main>
  );
}
