import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequesterSelector } from "../../src/components/RequesterSelector.js";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";
import { RequesterUser } from "../../src/types/index.js";

const mockActiveUsers: RequesterUser[] = [
  {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
    isActive: true,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Michael Brown",
    email: "michael.brown@kmutt.ac.th",
    isActive: true,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  },
  {
    id: 3,
    name: "David Lee",
    email: "david.lee@kmutt.ac.th",
    isActive: true,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  },
  {
    id: 4,
    name: "Sarah Johnson",
    email: "sarah.johnson@kmutt.ac.th",
    isActive: true,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  },
];

describe("Feature 2: RequesterSelector Component & Context", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders loading spinner while fetching active requesters", () => {
    // Delay resolution so loading state is visible
    vi.spyOn(api, "fetchRequesters").mockReturnValue(new Promise(() => {}));

    render(
      <RequesterProvider>
        <RequesterSelector />
      </RequesterProvider>
    );
    expect(screen.getByText(/loading available requesters/i)).toBeInTheDocument();
  });

  it("Mode A (First-Time): Cancel button is not rendered; Continue disabled until selection", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockActiveUsers);

    render(
      <RequesterProvider>
        <RequesterSelector />
      </RequesterProvider>
    );

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    // Cancel button must not exist in mandatory first-time selection
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toBeDisabled();

    // Select requester from dropdown
    const select = screen.getByTestId("requester-select");
    fireEvent.change(select, { target: { value: "1" } });

    expect(continueBtn).toBeEnabled();
  });

  it("Mode B (Context-Switch): Cancel button is visible and clicking Cancel aborts without changes", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockActiveUsers);
    const onCancel = vi.fn();

    render(
      <RequesterProvider>
        <RequesterSelector isSwitchMode={true} onCancel={onCancel} />
      </RequesterProvider>
    );

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    expect(cancelBtn).toBeInTheDocument();

    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("confirming selection stores identity in sessionStorage and updates context", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockActiveUsers);

    const TestConsumer = () => {
      const { currentRequester } = useRequester();
      return <div>Active User: {currentRequester ? currentRequester.name : "None"}</div>;
    };

    render(
      <RequesterProvider>
        <RequesterSelector />
        <TestConsumer />
      </RequesterProvider>
    );

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const select = screen.getByTestId("requester-select");
    fireEvent.change(select, { target: { value: "1" } });

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText(/Active User: Jennifer Anderson/i)).toBeInTheDocument();
      const stored = window.sessionStorage.getItem("toktickit_active_requester");
      expect(stored).toContain("Jennifer Anderson");
    });
  });

  it("stale or deactivated user in sessionStorage is purged when active list loads", async () => {
    window.sessionStorage.setItem(
      "toktickit_active_requester",
      JSON.stringify({ id: 999, name: "Ghost User", email: "ghost@kmutt.ac.th", isActive: true })
    );

    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockActiveUsers);

    render(
      <RequesterProvider>
        <RequesterSelector />
      </RequesterProvider>
    );

    // After API resolves, the stale ID 999 is detected as missing from active list and purged
    await waitFor(() => {
      expect(window.sessionStorage.getItem("toktickit_active_requester")).toBeNull();
    });
  });

  it("renders safe alert boundary with retry button when API fails", async () => {
    vi.spyOn(api, "fetchRequesters").mockRejectedValue(new Error("Network Error"));

    render(
      <RequesterProvider>
        <RequesterSelector />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/unable to reach the server/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry connection/i })).toBeInTheDocument();
    });
  });
});
