import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionsTakenSection } from "../../components/ActionsTakenSection.js";
import { StaffTicketDetail } from "../../components/StaffTicketDetail.js";
import { RequesterTicketDetail } from "../../components/RequesterTicketDetail.js";
import { AuthProvider } from "../../context/AuthContext.js";
import { RequesterContext } from "../../context/RequesterContext.js";
import * as api from "../../api.js";
import { ActionTakenDTO, TicketDetail } from "../../types/index.js";

const mockStaffUser = {
  id: 8,
  name: "Sompong IT",
  email: "sompong.it@kmutt.ac.th",
  role: "IT_STAFF" as const,
  mustChangePassword: false,
  isActive: true,
};

const mockAdminUser = {
  id: 10,
  name: "System Admin",
  email: "admin@kmutt.ac.th",
  role: "ADMINISTRATOR" as const,
  mustChangePassword: false,
  isActive: true,
};

const mockRequesterUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  department: "Engineering",
  isActive: true,
};

const sampleActionsUnsorted: ActionTakenDTO[] = [
  {
    id: 20,
    ticketId: 1,
    actionDateTime: "2026-10-30T14:30:00.000Z",
    performedByUserId: 10,
    performedBy: {
      id: 10,
      name: "System Admin",
      fullName: "System Admin",
      email: "admin@kmutt.ac.th",
      role: "ADMINISTRATOR",
    },
    description: "Replaced faulty PoE switch port module on 3F rack.",
    actionDescription: "Replaced faulty PoE switch port module on 3F rack.",
    result: "Link negotiated at 1Gbps full duplex; packet loss dropped to 0%.",
    followUpRequired: true,
    followUpNote: "Monitor switch syslog after 24 hours of peak student traffic.",
    attachmentNotes: "switch_port_diagnostics.txt",
    version: 2,
    createdAt: "2026-10-30T14:30:00.000Z",
    updatedAt: "2026-10-30T15:00:00.000Z",
  },
  {
    id: 10,
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
    description: "Inspected access point AP-3F-02 signal strength and error counters.",
    actionDescription: "Inspected access point AP-3F-02 signal strength and error counters.",
    result: "Detected high CRC errors on upstream Ethernet cable.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    version: 1,
    createdAt: "2026-10-30T10:15:00.000Z",
    updatedAt: "2026-10-30T10:15:00.000Z",
  },
];

const mockTicketDetail: TicketDetail = {
  id: 1,
  ticketNumber: "TKT-2026-00001",
  summary: "Campus Wi-Fi drops intermittently",
  description: "Signal drops every 10 minutes in the library 3rd floor.",
  categoryId: 4,
  categoryName: "Network",
  category: { id: 4, code: "NET", name: "Network" },
  relatedSystemId: 1,
  relatedSystemName: "Campus Wi-Fi",
  requestedPriority: "HIGH",
  itPriority: "MEDIUM",
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
  createdAt: "2026-10-30T09:00:00.000Z",
  updatedAt: "2026-10-30T14:30:00.000Z",
  attachments: [],
  removedAttachments: [],
  publicComments: [
    {
      id: 201,
      ticketId: 1,
      author: { id: 1, name: "Jennifer Anderson", role: "REQUESTER" },
      content: "Happens mostly near study room 3B.",
      createdAt: "2026-10-30T09:30:00.000Z",
    },
  ],
  internalNotes: [
    {
      id: 301,
      ticketId: 1,
      author: { id: 8, name: "Sompong IT", role: "IT_STAFF" },
      content: "Switch management VLAN IP is 10.20.3.12.",
      createdAt: "2026-10-30T09:45:00.000Z",
    },
  ],
};

describe("Issue 19: Actions Taken UI, Ticket Detail Integration & Access Control (UI-03, UI-04, AC-19.1..4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UI-19.01 (AC-19.1, FR-02): renders chronological Actions Taken records (actionDateTime ASC) with row numbers, performer role badges, description, result, follow-up badge/note, and attachment notes", async () => {
    vi.spyOn(api, "getActionsTakenApi").mockResolvedValue({
      items: sampleActionsUnsorted,
      totalCount: 2,
    });

    render(
      <ActionsTakenSection
        ticketId={1}
        canEdit={true}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-table")).toBeInTheDocument();
    });

    // Verify count badge
    expect(screen.getByTestId("actions-taken-count")).toHaveTextContent("2");

    // Verify chronological ordering (10:15 record is Row 1, 14:30 record is Row 2)
    const row1 = screen.getByTestId("action-row-1");
    const row2 = screen.getByTestId("action-row-2");

    expect(within(row1).getByText("1")).toBeInTheDocument();
    expect(within(row1).getByText("2026-10-30 10:15")).toBeInTheDocument();
    expect(within(row1).getByText("Sompong IT")).toBeInTheDocument();
    expect(within(row1).getByText("IT Staff")).toBeInTheDocument();
    expect(
      within(row1).getByText("Inspected access point AP-3F-02 signal strength and error counters.")
    ).toBeInTheDocument();
    expect(
      within(row1).getByText("Detected high CRC errors on upstream Ethernet cable.")
    ).toBeInTheDocument();
    expect(within(row1).getByText("Completed")).toBeInTheDocument();

    expect(within(row2).getByText("2")).toBeInTheDocument();
    expect(within(row2).getByText("2026-10-30 14:30")).toBeInTheDocument();
    expect(within(row2).getByText("System Admin")).toBeInTheDocument();
    expect(within(row2).getByText("Admin")).toBeInTheDocument();
    expect(
      within(row2).getByText("Replaced faulty PoE switch port module on 3F rack.")
    ).toBeInTheDocument();
    expect(
      within(row2).getByText("Link negotiated at 1Gbps full duplex; packet loss dropped to 0%.")
    ).toBeInTheDocument();
    expect(within(row2).getByText("Follow-Up Required")).toBeInTheDocument();
    expect(
      within(row2).getByText(/Monitor switch syslog after 24 hours of peak student traffic\./i)
    ).toBeInTheDocument();
    expect(
      within(row2).getByText(/switch_port_diagnostics\.txt/i)
    ).toBeInTheDocument();
  });

  it("UI-19.02 (UI-03, BR-04, AC-19.2): dynamically toggles Follow-Up Note visibility and enforces mandatory validation when Follow-Up Required is enabled", async () => {
    vi.spyOn(api, "getActionsTakenApi").mockResolvedValue({
      items: [],
      totalCount: 0,
    });
    const createSpy = vi.spyOn(api, "createActionTakenApi");

    const user = userEvent.setup();
    render(
      <ActionsTakenSection
        ticketId={1}
        canEdit={true}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /\+ Add Action Taken/i }));

    // Initially Follow-Up Required is unchecked and Follow-Up Note is not in DOM
    const followUpSwitch = screen.getByLabelText(/Follow-Up Required\?/i);
    expect(followUpSwitch).not.toBeChecked();
    expect(screen.queryByLabelText(/Follow-Up Note/i)).not.toBeInTheDocument();

    // Fill valid Description and Result
    await user.type(
      screen.getByLabelText(/Action Description/i),
      "Reset port security MAC table on floor 3 switch."
    );
    await user.type(
      screen.getByLabelText(/Result \/ Outcome/i),
      "Client re-authenticated via 802.1X."
    );

    // Toggle Follow-Up Required ON
    await user.click(followUpSwitch);
    expect(followUpSwitch).toBeChecked();

    const followUpNoteInput = screen.getByLabelText(/Follow-Up Note/i);
    expect(followUpNoteInput).toBeInTheDocument();
    expect(followUpNoteInput).toBeRequired();

    // Attempt submit with blank Follow-Up Note -> blocked with validation error
    await user.click(screen.getByRole("button", { name: /Save Action/i }));
    expect(createSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("error-action-followup-note")).toHaveTextContent(
      /Follow-Up Note is required when Follow-Up Required is enabled/i
    );

    // Toggle Follow-Up Required OFF -> hides Follow-Up Note and clears error
    await user.click(followUpSwitch);
    expect(screen.queryByLabelText(/Follow-Up Note/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-action-followup-note")).not.toBeInTheDocument();
  });

  it("UI-19.03 (BR-03, AC-19.1): auto-populates read-only Performed By field with authenticated IT Staff or Admin identity", async () => {
    vi.spyOn(api, "getActionsTakenApi").mockResolvedValue({
      items: [],
      totalCount: 0,
    });

    const user = userEvent.setup();
    render(
      <ActionsTakenSection
        ticketId={1}
        canEdit={true}
        currentUser={mockAdminUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /\+ Add Action Taken/i }));

    const performedByInput = screen.getByLabelText(/Performed By \(Auto\)/i) as HTMLInputElement;
    expect(performedByInput).toBeInTheDocument();
    expect(performedByInput.value).toBe("System Admin (Admin)");
    expect(performedByInput).toHaveAttribute("readonly");
    expect(performedByInput).toBeDisabled();
  });

  it("UI-19.04 (BR-05, AC-19.2): enforces Blur Validation Rule (blanks out future date & whitespace on blur without error; triggers validation only on explicit Submit)", async () => {
    vi.spyOn(api, "getActionsTakenApi").mockResolvedValue({
      items: [],
      totalCount: 0,
    });
    const createSpy = vi.spyOn(api, "createActionTakenApi");

    const user = userEvent.setup();
    render(
      <ActionsTakenSection
        ticketId={1}
        canEdit={true}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Add Action Taken/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /\+ Add Action Taken/i }));

    // 1. Future date clears on blur without showing any error alert
    const dateInput = screen.getByLabelText(/Action Date\/Time/i) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2099-12-31T23:59" } });
    expect(dateInput.value).toBe("2099-12-31T23:59");
    fireEvent.blur(dateInput);
    expect(dateInput.value).toBe("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // 2. Whitespace-only description clears on blur without showing any error alert
    const descInput = screen.getByLabelText(/Action Description/i) as HTMLTextAreaElement;
    fireEvent.change(descInput, { target: { value: "     " } });
    fireEvent.blur(descInput);
    expect(descInput.value).toBe("");
    expect(screen.queryByTestId("error-action-description")).not.toBeInTheDocument();

    // 3. Explicit Submit click triggers form-level validation messages for missing Description and Result
    await user.click(screen.getByRole("button", { name: /Save Action/i }));
    expect(createSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("error-action-description")).toBeInTheDocument();
    expect(screen.getByTestId("error-action-result")).toBeInTheDocument();
  });

  it("UI-19.05 (FR-02, AC-19.1): submits valid Create Action form, shows Saving... busy state, and appends new action to the chronological list", async () => {
    vi.spyOn(api, "getActionsTakenApi").mockResolvedValue({
      items: [sampleActionsUnsorted[1]],
      totalCount: 1,
    });

    let resolvePost!: (value: ActionTakenDTO) => void;
    const createSpy = vi.spyOn(api, "createActionTakenApi").mockImplementation(
      () =>
        new Promise<ActionTakenDTO>((resolve) => {
          resolvePost = resolve;
        })
    );

    const user = userEvent.setup();
    render(
      <ActionsTakenSection
        ticketId={1}
        canEdit={true}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-count")).toHaveTextContent("1");
    });

    await user.click(screen.getByRole("button", { name: /\+ Add Action Taken/i }));

    await user.type(
      screen.getByLabelText(/Action Description/i),
      "Applied firmware patch v4.2.1 to AP-3F-02."
    );
    await user.type(
      screen.getByLabelText(/Result \/ Outcome/i),
      "AP rebooted cleanly and clients reconnected."
    );
    await user.click(screen.getByLabelText(/Follow-Up Required\?/i));
    await user.type(
      screen.getByLabelText(/Follow-Up Note/i),
      "Verify uptime metrics tomorrow morning."
    );
    await user.type(
      screen.getByLabelText(/Attachment Notes/i),
      "ap_firmware_upgrade.log"
    );

    const saveBtn = screen.getByRole("button", { name: /Save Action/i });
    await user.click(saveBtn);

    // Verify busy state while request is in flight
    expect(screen.getByRole("button", { name: /Saving\.\.\./i })).toBeDisabled();

    resolvePost({
      id: 30,
      ticketId: 1,
      actionDateTime: "2026-10-31T08:00:00.000Z",
      performedByUserId: 8,
      performedBy: {
        id: 8,
        name: "Sompong IT",
        fullName: "Sompong IT",
        email: "sompong.it@kmutt.ac.th",
        role: "IT_STAFF",
      },
      description: "Applied firmware patch v4.2.1 to AP-3F-02.",
      actionDescription: "Applied firmware patch v4.2.1 to AP-3F-02.",
      result: "AP rebooted cleanly and clients reconnected.",
      followUpRequired: true,
      followUpNote: "Verify uptime metrics tomorrow morning.",
      attachmentNotes: "ap_firmware_upgrade.log",
      version: 1,
      createdAt: "2026-10-31T08:00:00.000Z",
      updatedAt: "2026-10-31T08:00:00.000Z",
    });

    await waitFor(() => {
      expect(screen.queryByTestId("actions-taken-form")).not.toBeInTheDocument();
    });

    expect(createSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        actionDescription: "Applied firmware patch v4.2.1 to AP-3F-02.",
        result: "AP rebooted cleanly and clients reconnected.",
        followUpRequired: true,
        followUpNote: "Verify uptime metrics tomorrow morning.",
        attachmentNotes: "ap_firmware_upgrade.log",
      })
    );

    expect(screen.getByTestId("actions-taken-count")).toHaveTextContent("2");
    expect(
      screen.getByText("Applied firmware patch v4.2.1 to AP-3F-02.")
    ).toBeInTheDocument();
  });

  it("UI-19.06 (FR-02, BR-12, AC-19.3): allows IT Staff/Admin to edit an existing action with optimistic concurrency version and updates record in place", async () => {
    vi.spyOn(api, "getActionsTakenApi").mockResolvedValue({
      items: [sampleActionsUnsorted[0]], // version: 2
      totalCount: 1,
    });

    const updateSpy = vi.spyOn(api, "updateActionTakenApi").mockResolvedValue({
      ...sampleActionsUnsorted[0],
      description: "Replaced faulty PoE switch port module and patched fiber uplink.",
      actionDescription: "Replaced faulty PoE switch port module and patched fiber uplink.",
      result: "Zero packet loss verified over 48h test.",
      followUpRequired: false,
      followUpNote: null,
      version: 3,
    });

    const user = userEvent.setup();
    render(
      <ActionsTakenSection
        ticketId={1}
        canEdit={true}
        currentUser={mockAdminUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Edit action 1/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Edit action 1/i }));

    expect(screen.getByText("Edit Action Taken")).toBeInTheDocument();
    expect(screen.getByText("Version v2")).toBeInTheDocument();

    const descInput = screen.getByLabelText(/Action Description/i);
    await user.clear(descInput);
    await user.type(
      descInput,
      "Replaced faulty PoE switch port module and patched fiber uplink."
    );

    const resultInput = screen.getByLabelText(/Result \/ Outcome/i);
    await user.clear(resultInput);
    await user.type(resultInput, "Zero packet loss verified over 48h test.");

    // Uncheck Follow-Up Required
    await user.click(screen.getByLabelText(/Follow-Up Required\?/i));

    await user.click(screen.getByRole("button", { name: /Update Action/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        1,
        20,
        expect.objectContaining({
          actionDescription:
            "Replaced faulty PoE switch port module and patched fiber uplink.",
          result: "Zero packet loss verified over 48h test.",
          followUpRequired: false,
          followUpNote: null,
          version: 2,
        })
      );
    });

    expect(
      screen.getByText(
        "Replaced faulty PoE switch port module and patched fiber uplink."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("UI-19.07 (BR-12, AC-19.2): preserves local form state and displays error alert when API returns 409 Conflict or 422 error", async () => {
    vi.spyOn(api, "getActionsTakenApi").mockResolvedValue({
      items: [sampleActionsUnsorted[0]],
      totalCount: 1,
    });

    const conflictErr: any = new Error(
      "Action Taken has been modified by another user. Please refresh and try again."
    );
    conflictErr.status = 409;
    conflictErr.code = "CONCURRENCY_CONFLICT";
    vi.spyOn(api, "updateActionTakenApi").mockRejectedValue(conflictErr);

    const user = userEvent.setup();
    render(
      <ActionsTakenSection
        ticketId={1}
        canEdit={true}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Edit action 1/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Edit action 1/i }));

    const descInput = screen.getByLabelText(/Action Description/i) as HTMLTextAreaElement;
    await user.clear(descInput);
    await user.type(descInput, "Updated diagnostic description preserved after conflict.");

    await user.click(screen.getByRole("button", { name: /Update Action/i }));

    await waitFor(() => {
      expect(screen.getByTestId("action-form-error")).toHaveTextContent(
        /Action Taken has been modified by another user/i
      );
    });

    // Verify form stays open and preserves user's typed input
    expect(screen.getByTestId("actions-taken-form")).toBeInTheDocument();
    expect(descInput.value).toBe(
      "Updated diagnostic description preserved after conflict."
    );
  });

  it("UI-19.08 (UI-04, BR-02, AC-19.4): strictly suppresses all create/edit controls in RequesterTicketDetail while displaying chronological actions in read-only mode", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue({
      ...mockTicketDetail,
    });
    vi.spyOn(api, "getActionsTakenApi").mockResolvedValue({
      items: sampleActionsUnsorted,
      totalCount: 2,
    });

    render(
      <RequesterContext.Provider
        value={{
          requesters: [mockRequesterUser],
          currentRequester: mockRequesterUser,
          setCurrentRequester: vi.fn(),
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
        <RequesterTicketDetail ticketId={1} onBack={vi.fn()} />
      </RequesterContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-table")).toBeInTheDocument();
    });

    // Requesters can view all action records and follow-up badges
    expect(
      screen.getByText("Inspected access point AP-3F-02 signal strength and error counters.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Replaced faulty PoE switch port module on 3F rack.")
    ).toBeInTheDocument();
    expect(screen.getByText("Follow-Up Required")).toBeInTheDocument();

    // Complete DOM suppression of create/edit controls (BR-02, AC-19.4)
    expect(
      screen.queryByRole("button", { name: /\+ Add Action Taken/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Edit action/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("actions-taken-form")).not.toBeInTheDocument();
  });

  it("UI-19.09 (AC-19.1): displays empty state message cleanly when ticket has zero Actions Taken records", async () => {
    vi.spyOn(api, "getActionsTakenApi").mockResolvedValue({
      items: [],
      totalCount: 0,
    });

    render(
      <ActionsTakenSection
        ticketId={1}
        canEdit={false}
        currentUser={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-empty")).toBeInTheDocument();
    });

    expect(
      screen.getByText("No actions taken recorded yet.")
    ).toBeInTheDocument();
  });

  it("UI-19.10 (AC-19.1): renders loading skeleton while fetching and error banner with working Retry trigger on failure", async () => {
    const getSpy = vi
      .spyOn(api, "getActionsTakenApi")
      .mockRejectedValueOnce(new Error("Database connection timeout"))
      .mockResolvedValueOnce({
        items: [sampleActionsUnsorted[1]],
        totalCount: 1,
      });

    const user = userEvent.setup();
    render(
      <ActionsTakenSection
        ticketId={1}
        canEdit={true}
        currentUser={mockStaffUser}
      />
    );

    // Initially renders loading skeleton
    expect(screen.getByTestId("actions-taken-skeleton")).toBeInTheDocument();

    // Transitions to error alert on failure
    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Database connection timeout")).toBeInTheDocument();

    // Clicking Retry re-fetches and renders table
    await user.click(screen.getByRole("button", { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-table")).toBeInTheDocument();
    });
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it("UI-19.11 (NFR-03, AC-19.1): embeds ActionsTakenSection in StaffTicketDetail with responsive card data-labels and Zen Green visual separation from Public Comments and Internal Notes", async () => {
    vi.spyOn(api, "getMeApi").mockResolvedValue(mockStaffUser);
    vi.spyOn(api, "getTicketDetailApi").mockResolvedValue({
      ...mockTicketDetail,
    });
    vi.spyOn(api, "getStaffAssigneesApi").mockResolvedValue([]);
    vi.spyOn(api, "getActionsTakenApi").mockResolvedValue({
      items: sampleActionsUnsorted,
      totalCount: 2,
    });

    render(
      <AuthProvider>
        <StaffTicketDetail ticketId={1} onBack={vi.fn()} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-section")).toBeInTheDocument();
      expect(screen.getByTestId("actions-taken-table")).toBeInTheDocument();
    });

    const actionsSection = screen.getByTestId("actions-taken-section");
    expect(actionsSection).toHaveClass("actions-taken-section");

    // Verify responsive table/card classes and data-label attributes for Tablet/Mobile stacking
    const table = screen.getByTestId("actions-taken-table");
    expect(table).toHaveClass("at-table-desktop", "at-cards-mobile");

    const row1 = screen.getByTestId("action-row-1");
    expect(row1).toHaveClass("at-row-card");
    const cells = within(row1).getAllByRole("cell");
    expect(cells[0]).toHaveAttribute("data-label", "No.");
    expect(cells[1]).toHaveAttribute("data-label", "Date/Time");
    expect(cells[2]).toHaveAttribute("data-label", "Performed By");
    expect(cells[3]).toHaveAttribute("data-label", "Action Description");
    expect(cells[4]).toHaveAttribute("data-label", "Result / Outcome");
    expect(cells[5]).toHaveAttribute("data-label", "Follow-Up Status");
    expect(cells[6]).toHaveAttribute("data-label", "Actions");

    // Verify all three sections coexist and are visually distinct on StaffTicketDetail
    expect(screen.getByRole("heading", { name: /Actions Taken/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Public Comments/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Confidential Internal Notes/i })).toBeInTheDocument();
  });
});
