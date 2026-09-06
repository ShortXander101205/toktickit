import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequesterTicketDetail } from "../../src/components/RequesterTicketDetail.js";
import { RequesterContext } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  department: "Computer Engineering",
  isActive: true,
};

const mockTicketDetail = {
  id: 1,
  ticketNumber: "TKT-2026-00001",
  summary: "Laptop battery drains quickly",
  description: "My laptop battery is draining much faster than usual even when idle.",
  categoryId: 2,
  categoryName: "Hardware",
  relatedSystemId: 7,
  relatedSystemName: "Corporate Laptop",
  requestedPriority: "High",
  itPriority: "High",
  currentStatus: "New",
  ticketOwner: null,
  requesterId: 1,
  requesterName: "Jennifer Anderson",
  requesterEmail: "jennifer.anderson@kmutt.ac.th",
  createdAt: "2026-09-03T11:00:00.000Z",
  updatedAt: "2026-09-03T11:00:00.000Z",
  attachments: [
    {
      id: 101,
      ticketId: 1,
      originalFilename: "diagnostic_log.pdf",
      mimeType: "application/pdf",
      fileSize: 1048576,
      isRemoved: false,
      createdAt: "2026-09-03T11:05:00.000Z",
    },
  ],
  removedAttachments: [
    {
      id: 102,
      ticketId: 1,
      originalFilename: "wrong_file.png",
      mimeType: "image/png",
      fileSize: 204800,
      isRemoved: true,
      removalReason: "Uploaded wrong screenshot",
      removedAt: "2026-09-03T11:20:00.000Z",
      removedByRequesterId: 1,
      removedByRequesterName: "Jennifer Anderson",
      createdAt: "2026-09-03T11:00:00.000Z",
    },
  ],
};

function renderComponent(props: { ticketId: number; onBack: () => void }) {
  return render(
    <RequesterContext.Provider
      value={{
        currentRequester: mockRequester,
        setCurrentRequester: vi.fn(),
        requesters: [mockRequester],
        isLoading: false,
        error: null,
        isSwitchModalOpen: false,
        openSwitchModal: vi.fn(),
        closeSwitchModal: vi.fn(),
        refreshRequesters: vi.fn(),
        selectRequester: vi.fn(),
        clearRequester: vi.fn(),
      }}
    >
      <RequesterTicketDetail {...props} />
    </RequesterContext.Provider>
  );
}

describe("Component: RequesterTicketDetail (AC-11, AC-12)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("CT-TD-01 (Read-Only Detail Rendering - AC-11): renders all read-only fields, badges, and attachment workspace", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketDetail as any);

    renderComponent({ ticketId: 1, onBack: vi.fn() });

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
    });

    // Check header attributes
    expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(
      screen.getByText("My laptop battery is draining much faster than usual even when idle.")
    ).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Corporate Laptop")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();

    // Check Priority & Status badges
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getAllByText("High").length).toBeGreaterThanOrEqual(2); // Requested and IT priority

    // Check child attachment section rendered
    expect(screen.getByText("Attachments")).toBeInTheDocument();
    expect(screen.getByText("diagnostic_log.pdf")).toBeInTheDocument();
    expect(screen.getByText("wrong_file.png")).toBeInTheDocument();
  });

  it("CT-TD-02 (Exclusion Audit - No Public Comments / Status Transitions): verifies zero comment or status transition controls in DOM", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketDetail as any);

    renderComponent({ ticketId: 1, onBack: vi.fn() });

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
    });

    // Check absence of Public Comments, Internal Notes, Actions Taken
    expect(screen.queryByText(/Public Comments/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Internal Notes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Actions Taken/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Add Comment/i)).not.toBeInTheDocument();

    // Check absence of status transition buttons (Resolve, Close, Reopen, Cancel)
    expect(screen.queryByRole("button", { name: /Resolve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Close Ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reopen/i })).not.toBeInTheDocument();
  });

  it("CT-TD-03 (Navigation Back to My Tickets): clicking Back button triggers callback prop", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketDetail as any);
    const handleBack = vi.fn();

    renderComponent({ ticketId: 1, onBack: handleBack });

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
    });

    const backBtn = screen.getByRole("button", { name: /← Back to My Tickets/i });
    await userEvent.click(backBtn);

    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it("CT-TD-04 (403 Forbidden Access Panel Rendering - AC-12): renders Access Denied callout when unauthorized", async () => {
    const error403: any = new Error("Access denied");
    error403.status = 403;
    vi.spyOn(api, "fetchTicketDetail").mockRejectedValue(error403);
    const handleBack = vi.fn();

    renderComponent({ ticketId: 99, onBack: handleBack });

    await waitFor(() => {
      expect(screen.getByText("Access Denied")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/You do not have permission to view ticket #99 because it belongs to a different requester/i)
    ).toBeInTheDocument();

    const backBtn = screen.getByRole("button", { name: /← Back to My Tickets/i });
    await userEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it("CT-TD-05 (404 Not Found Panel Rendering): renders Ticket Not Found callout when ticket does not exist", async () => {
    const error404: any = new Error("Not found");
    error404.status = 404;
    vi.spyOn(api, "fetchTicketDetail").mockRejectedValue(error404);

    renderComponent({ ticketId: 4040, onBack: vi.fn() });

    await waitFor(() => {
      expect(screen.getByText("Ticket Not Found")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/The requested ticket #4040 could not be found or may have been removed/i)
    ).toBeInTheDocument();
  });

  it("CT-TD-06 (Skeleton Loading State): renders placeholder glow during active fetch", () => {
    // Return a promise that never resolves during initial render
    vi.spyOn(api, "fetchTicketDetail").mockReturnValue(new Promise(() => {}));

    const { container } = renderComponent({ ticketId: 1, onBack: vi.fn() });

    expect(container.querySelector(".placeholder-glow")).toBeInTheDocument();
  });
});
