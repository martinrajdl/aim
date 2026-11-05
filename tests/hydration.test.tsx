// @vitest-environment jsdom
import React from "react";
import { act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { Figure } from "../components/brief/figure";
import { briefs } from "./fixtures";

it("hydrates an article figure when browser month abbreviations differ from the server", async () => {
  const preview = <Figure item={briefs[0].items[0]} expanded />;
  const container = document.createElement("div");
  container.innerHTML = renderToString(preview);
  document.body.appendChild(container);
  const serverText = container.querySelector("time")!.textContent;
  const OriginalFormatter = Intl.DateTimeFormat;
  // ICU versions can abbreviate September differently for the same locale.
  const formatting = vi
    .spyOn(Intl, "DateTimeFormat")
    .mockImplementation(function (
      ...args: ConstructorParameters<typeof Intl.DateTimeFormat>
    ) {
      const formatter = new OriginalFormatter(...args);
      const format = formatter.format;
      Object.defineProperty(formatter, "format", {
        value: (date: Date | number) => format(date).replace("Sept", "Sep"),
      });
      return formatter;
    });
  const recoverable = vi.fn();
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => {
      root = hydrateRoot(container, preview, {
        onRecoverableError: recoverable,
      });
    });
    expect(recoverable).not.toHaveBeenCalled();
    expect(container.querySelector("time")!.textContent).toBe(serverText);
  } finally {
    await act(async () => root?.unmount());
    formatting.mockRestore();
    container.remove();
  }
});
