"use client";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  LayoutGrid,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Orb } from "@/components/ui/orb";

export function ComponentGallery() {
  const [density, setDensity] = useState("comfortable");
  const [fresh, setFresh] = useState(false);
  const [request, setRequest] = useState("");
  const [applied, setApplied] = useState(false);
  return (
    <div className="component-grid">
      <div className="component-example">
        <h3>Buttons</h3>
        <p>Primary, secondary, quiet and disabled.</p>
        <div className="component-stage">
          <Button onClick={() => setApplied(true)}>
            <Check />
            Apply
          </Button>
          <Button variant="outline" onClick={() => setApplied(false)}>
            <Undo2 />
            Undo
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setRequest("");
              setApplied(false);
            }}
          >
            Reset
          </Button>
          <Button disabled>Unavailable</Button>
        </div>
        <span className="component-feedback" role="status">
          {applied ? "Preview applied" : "Try an action"}
        </span>
      </div>
      <div className="component-example">
        <h3>Grid spacing</h3>
        <p>A selected state stays visible after interaction.</p>
        <div className="component-stage">
          <div
            className="design-density-toggle"
            role="group"
            aria-label="Example spacing"
          >
            {(
              [
                ["comfortable", "Comfortable", LayoutGrid],
                ["compact", "Compact", LayoutGrid],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setDensity(key)}
                aria-pressed={density === key}
                aria-label={label}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Open component dialog"
              >
                <SlidersHorizontal />
              </Button>
            </DialogTrigger>
            <DialogContent className="design-demo-dialog">
              <DialogTitle>Dialog preview</DialogTitle>
              <DialogDescription>
                Component preview. These controls do not change your briefs.
              </DialogDescription>
              <label className="design-switch">
                <span>Only new updates</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={fresh}
                  onChange={(e) => setFresh(e.target.checked)}
                />
              </label>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="component-example">
        <h3>Inputs & switches</h3>
        <p>One focus outline, a clear label, visible state.</p>
        <label className="design-switch">
          <span>Only new updates</span>
          <input
            type="checkbox"
            role="switch"
            checked={fresh}
            onChange={(e) => setFresh(e.target.checked)}
          />
        </label>
        <label className="design-input-label" htmlFor="design-request">
          How would you like to read?
        </label>
        <textarea
          id="design-request"
          className="design-textarea"
          placeholder="Put numbers first and hide one-liners"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={2}
        />
        <div className="component-stage">
          <Button disabled={!request.trim()} onClick={() => setApplied(true)}>
            Apply preview <ArrowRight />
          </Button>
        </div>
      </div>
      <div className="component-example">
        <h3>Feedback & disclosure</h3>
        <p>State is expressed in words as well as color.</p>
        <div className="design-state success">
          <Check size={16} />
          Preferences saved
        </div>
        <div className="design-state warning">
          <span className="state-indicator" />
          Some sources need review
        </div>
        <div className="design-state danger">
          <span className="state-indicator" />
          Couldn’t apply changes
        </div>
        <details className="design-disclosure">
          <summary>Loading state</summary>
          <div role="status">
            <Orb size={24} />
            Updating your brief…
          </div>
        </details>
      </div>
    </div>
  );
}
