import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SacredAlert } from "@/components/ui/SacredPage";

describe("SacredAlert accessibility", () => {
  it("announces errors assertively", () => {
    const html = renderToStaticMarkup(
      React.createElement(SacredAlert, { text: "Verification failed", tone: "error" }),
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('aria-atomic="true"');
  });

  it("announces success messages politely", () => {
    const html = renderToStaticMarkup(
      React.createElement(SacredAlert, { text: "Email verified", tone: "success" }),
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});
