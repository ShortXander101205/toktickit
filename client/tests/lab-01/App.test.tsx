import { describe, it, expect, vi } from "vitest";
import * as api from "../../src/api.js";
import { render, screen } from "@testing-library/react";
import App from "../../src/App.js";

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  // Issue 4 — write these yourself. Hint: mock the api module with
  // vi.spyOn(api, "checkSystem").mockResolvedValue(...) / .mockRejectedValue(...)
  // then click the button and assert the Online list / Offline message.
  it("shows Online message on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({ online: true, categories: [] });
    render(<App />);
    const button = screen.getByRole("button", { name: /Check System/i });
    button.click();
    expect(await screen.findByText(/System Status: Online/i)).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("Backend is offline"));
    render(<App />);
    const button = screen.getByRole("button", { name: /Check System/i });
    button.click();
    expect(await screen.findByText(/System Status: Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
  });
});
