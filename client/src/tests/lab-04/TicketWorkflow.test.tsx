import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffTicketDetail } from "../../components/StaffTicketDetail.js";
import { AuthProvider } from "../../context/AuthContext.js";
import * as api from "../../api.js";
import { ActionTakenDTO, StaffTicketOwnerDTO, TicketDetail } from "../../types/index.js";

const mockStaffUser = {
  id: 8,
  name: "Sompong IT",
  email: "sompong.it@kmutt.ac.th",
  role: "IT_STAFF" as const,
  mustChangePassword: false,
  isActive: true,
};

const mockAssignees: StaffTicketOwnerDTO[] = [
  { id: 8, name: "Sompong IT", email: "sompong.it@kmutt.ac.th", role: "IT_STAFF" },
  { id: 9, name: "Wichai Support", email: "wichai.sup@kmutt.ac.th", role: "IT_STAFF" },
];

const sampleAction: ActionTakenDTO = {
  id: 501,
  ticketId: 1,
  actionDateTime: "2026-10-30T10:15:00.000Z",
  performedByUserId: 8,
  performedBy: {
    id: 8,
    name: "Sompong IT",
    fullName: "Sompong IT",
    email: "sompong.it@kmutt.ac.th",
    role: "IT_STAFF",
  },
  description: "Replaced faulty network switch port on 3rd floor.",
  actionDescription: "Replaced faulty network switch port on 3rd floor.",
  result: "Port link stable at 1 Gbps; packet loss 0%.",
  followUpRequired: false,
  followUpNote: null,
  attachmentNotes: null,
  version: 1,
  createdAt: "2026-10-30T10:15:00.000Z",
  updatedAt: "2026-10-30T10:15:00.000Z",
};

function buildMockTicket(overrides: Partial<TicketDetail> = {}): TicketDetail {
  return {
    id: 1,
    ticketNumber: "TKT-2026-00020",
    summary: "VPN gateway authentication timeout",
    description: "Users unable to complete RADIUS handshake on campus VPN.",
    categoryId: 4,
    categoryName: "Network",
    category: { id: 4, code: "NET", name: "Network" },
    relatedSystemId: 1,
    relatedSystemName: "Campus VPN",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "IN_PROGRESS",
    requesterId: 1,
    requesterName: "Jennifer Anderson",
    requesterEmail: "jennifer.anderson@kmutt.ac.th",
    requester: {
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      department: "Engineering",
    },
    ownerId: 8,
    owner: {
      id: 8,
      name: "Sompong IT",
      email: "sompong.it@kmutt.ac.th",
      role: "IT_STAFF",
    },
    ticketOwner: "Sompong IT",
    requesterResolvedAt: null,
    requesterResolutionConfirmedAt: null,
    createdAt: "2026-10-30T08:00:00.000Z",
    updatedAt: "2026-10-30T09:00:00.000Z",
    attachments: [],
    removedAttachments: [],
    publicComments: [],
    internalNotes: [],
    actionsTaken: [],
    ...overrides,
  };
}

function renderStaffDetail(ticketId = 1, onBack = vi.fn()) {
  return render(
    <AuthProvider>
      <StaffTicketDetail ticketId={ticketId} onBack={onBack} />
    </AuthProvider>
  );
}

describe("Issue 20: Ticket Status Lifecycle, Concurrency & Resolution Gate UI (AC-20.1..4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, "getMeApi").mockResolvedValue(mockStaffUser);
    vi.spyOn(api, "getStaffAssigneesApi").mockResolvedValue([...mockAssignees]);
  });

  // ===========================================================================
  // 1. Dynamic Status Dropdown Filtering & Terminal States (BR-06, AC-20.1)
  // ===========================================================================
  describe("BR-06 / AC-20.1: Status Transition Matrix Dropdown Filtering", () => {
    it("filters dropdown options to only legal transitions for NEW status (OPEN, IN_PROGRESS, CANCELLED)", async () => {
      vi.spyOn(api, "getTicketDetailApi").mockResolvedValue(
        buildMockTicket({ currentStatus: "NEW" })
      );

      renderStaffDetail();

      await waitFor(() => {
        expect(screen.getByTestId("status-select")).toBeInTheDocument();
      });

      const selectEl = screen.getByTestId("status-select") as HTMLSelectElement;
      const optionValues = Array.from(selectEl.options)
        .map((opt) => opt.value)
        .filter(Boolean);

      expect(optionValues).toEqual(["OPEN", "IN_PROGRESS", "CANCELLED"]);
      expect(optionValues).not.toContain("RESOLVED");
      expect(optionValues).not.toContain("CLOSED");
    });

    it("filters dropdown options to only CLOSED and REOPENED when status is RESOLVED", async () => {
      vi.spyOn(api, "getTicketDetailApi").mockResolvedValue(
        buildMockTicket({ currentStatus: "RESOLVED", actionsTaken: [sampleAction] })
      );

      renderStaffDetail();

      await waitFor(() => {
        expect(screen.getByTestId("status-select")).toBeInTheDocument();
      });

      const selectEl = screen.getByTestId("status-select") as HTMLSelectElement;
      const optionValues = Array.from(selectEl.options)
        .map((opt) => opt.value)
        .filter(Boolean);

      expect(optionValues).toEqual(["CLOSED", "REOPENED"]);
      expect(optionValues).not.toContain("CANCELLED");
      expect(optionValues).not.toContain("IN_PROGRESS");
    });

    it("disables status dropdown and displays terminal state notice for CLOSED and CANCELLED tickets", async () => {
      vi.spyOn(api, "getTicketDetailApi").mockResolvedValue(
        buildMockTicket({ currentStatus: "CLOSED", actionsTaken: [sampleAction] })
      );

      renderStaffDetail();

      await waitFor(() => {
        expect(screen.getByTestId("terminal-status-notice")).toBeInTheDocument();
      });

      const selectEl = screen.getByTestId("status-select") as HTMLSelectElement;
      expect(selectEl).toBeDisabled();
      expect(
        screen.getByText(/No further status transitions permitted/i)
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 2. Resolution Gate Guidance Alert & In-Place Transition (BR-07, AC-20.2)
  // ===========================================================================
  describe("BR-07 / AC-20.2: Resolution Gate Invariant", () => {
    it("displays resolution gate guidance alert when selecting RESOLVED on a ticket with 0 actions taken", async () => {
      vi.spyOn(api, "getTicketDetailApi").mockResolvedValue(
        buildMockTicket({ currentStatus: "IN_PROGRESS", actionsTaken: [] })
      );

      const user = userEvent.setup();
      renderStaffDetail();

      await waitFor(() => {
        expect(screen.getByTestId("status-select")).toBeInTheDocument();
      });

      const selectEl = screen.getByTestId("status-select");
      await user.selectOptions(selectEl, "RESOLVED");

      const gateAlert = await screen.findByTestId("resolution-gate-alert");
      expect(gateAlert).toBeInTheDocument();
      expect(gateAlert).toHaveTextContent(
        /Cannot resolve ticket without at least one recorded Action Taken/i
      );
    });

    it("transitions status to RESOLVED in place without page reload when >= 1 ActionTaken exists", async () => {
      vi.spyOn(api, "getTicketDetailApi").mockResolvedValue(
        buildMockTicket({
          currentStatus: "IN_PROGRESS",
          actionsTaken: [sampleAction],
          updatedAt: "2026-10-30T09:00:00.000Z",
        })
      );

      const transitionSpy = vi
        .spyOn(api, "transitionTicketStatusApi")
        .mockResolvedValue({
          id: 1,
          ticketNumber: "TKT-2026-00020",
          currentStatus: "RESOLVED",
          resolvedAt: "2026-10-30T10:30:00.000Z",
          updatedAt: "2026-10-30T10:30:00.000Z",
        });

      const user = userEvent.setup();
      renderStaffDetail();

      await waitFor(() => {
        expect(screen.getByTestId("status-select")).toBeInTheDocument();
      });

      const selectEl = screen.getByTestId("status-select");
      await user.selectOptions(selectEl, "RESOLVED");

      // Should NOT show resolution gate alert since 1 action exists
      expect(screen.queryByTestId("resolution-gate-alert")).not.toBeInTheDocument();

      const updateBtn = screen.getByTestId("update-status-btn");
      await user.click(updateBtn);

      await waitFor(() => {
        expect(transitionSpy).toHaveBeenCalledWith(1, "RESOLVED");
      });

      // Verify in-place status badge update to RESOLVED and dropdown options updated to CLOSED / REOPENED
      await waitFor(() => {
        const updatedSelect = screen.getByTestId("status-select") as HTMLSelectElement;
        const nextOptions = Array.from(updatedSelect.options)
          .map((o) => o.value)
          .filter(Boolean);
        expect(nextOptions).toEqual(["CLOSED", "REOPENED"]);
      });
    });
  });

  // ===========================================================================
  // 3. Requester Advisory Resolution Banner (BR-08, AC-20.3)
  // ===========================================================================
  describe("BR-08 / AC-20.3: Requester Advisory Resolution Display", () => {
    it("displays advisory confirmation banner when requesterResolvedAt is set while status remains IN_PROGRESS", async () => {
      vi.spyOn(api, "getTicketDetailApi").mockResolvedValue(
        buildMockTicket({
          currentStatus: "IN_PROGRESS",
          requesterResolvedAt: "2026-10-30T11:00:00.000Z",
        })
      );

      renderStaffDetail();

      await waitFor(() => {
        expect(screen.getByTestId("requester-resolved-advisory")).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Requester Confirmed Resolution/i)
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 4. Non-Destructive 409 Conflict Banner (BR-09, AC-20.4)
  // ===========================================================================
  describe("BR-09 / AC-20.4: Non-Destructive 409 Conflict Handling", () => {
    it("renders 409 Conflict banner with Refresh button while preserving unsaved draft inputs", async () => {
      const getDetailSpy = vi
        .spyOn(api, "getTicketDetailApi")
        .mockResolvedValueOnce(
          buildMockTicket({
            currentStatus: "OPEN",
            actionsTaken: [sampleAction],
            updatedAt: "2026-10-30T09:00:00.000Z",
          })
        )
        .mockResolvedValueOnce(
          buildMockTicket({
            currentStatus: "IN_PROGRESS",
            actionsTaken: [sampleAction],
            updatedAt: "2026-10-30T09:45:00.000Z",
          })
        );

      const conflictError: any = new Error(
        "Ticket was modified by another user. Please refresh and try again."
      );
      conflictError.status = 409;
      conflictError.code = "CONFLICT";

      vi.spyOn(api, "transitionTicketStatusApi").mockRejectedValueOnce(conflictError);

      const user = userEvent.setup();
      renderStaffDetail();

      await waitFor(() => {
        expect(screen.getByTestId("status-select")).toBeInTheDocument();
      });

      // Type unsaved draft text into both Public Comment and Internal Note textareas
      const publicCommentInput = screen.getByLabelText(/Add Public Comment/i);
      const internalNoteInput = screen.getByLabelText(/Add Confidential Note/i);

      await user.type(publicCommentInput, "Draft public reply that must not be lost");
      await user.type(internalNoteInput, "Draft internal diagnostic note to preserve");

      // Attempt status transition that fails with 409 Conflict
      const selectEl = screen.getByTestId("status-select");
      await user.selectOptions(selectEl, "IN_PROGRESS");

      const updateBtn = screen.getByTestId("update-status-btn");
      await user.click(updateBtn);

      // Verify 409 Conflict banner appears
      const conflictBanner = await screen.findByTestId("status-conflict-banner");
      expect(conflictBanner).toBeInTheDocument();
      expect(
        within(conflictBanner).getByTestId("refresh-ticket-state-btn")
      ).toBeInTheDocument();

      // Verify draft inputs are completely preserved
      expect(publicCommentInput).toHaveValue("Draft public reply that must not be lost");
      expect(internalNoteInput).toHaveValue("Draft internal diagnostic note to preserve");

      // Click Refresh Ticket State button and verify ticket reloads while drafts remain intact
      const refreshBtn = screen.getByTestId("refresh-ticket-state-btn");
      await user.click(refreshBtn);

      await waitFor(() => {
        expect(getDetailSpy).toHaveBeenCalledTimes(2);
        expect(screen.queryByTestId("status-conflict-banner")).not.toBeInTheDocument();
      });

      expect(publicCommentInput).toHaveValue("Draft public reply that must not be lost");
      expect(internalNoteInput).toHaveValue("Draft internal diagnostic note to preserve");
    });
  });
});

