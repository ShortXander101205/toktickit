import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffTicketDetail } from "../../src/components/StaffTicketDetail.js";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { TicketDetail, StaffTicketOwnerDTO } from "../../src/types/index.js";

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
  { id: 10, name: "System Admin", email: "admin@kmutt.ac.th", role: "ADMINISTRATOR" },
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
  ownerId: 9,
  owner: {
    id: 9,
    name: "Wichai Support",
    email: "wichai.sup@kmutt.ac.th",
    role: "IT_STAFF",
  },
  ticketOwner: "Wichai Support",
  requesterResolutionConfirmedAt: "2026-09-12T05:30:00.000Z",
  createdAt: "2026-08-15T09:15:00.000Z",
  updatedAt: "2026-08-15T10:00:00.000Z",
  attachments: [
    {
      id: 101,
      ticketId: 1,
      originalFilename: "wifi_signal_trace.log",
      mimeType: "text/plain",
      fileSize: 15420,
      createdAt: "2026-08-15T09:15:00.000Z",
      updatedAt: "2026-08-15T09:15:00.000Z",
    },
  ],
  removedAttachments: [],
  publicComments: [
    {
      id: 201,
      ticketId: 1,
      author: { id: 1, name: "Jennifer Anderson", role: "REQUESTER" },
      content: "Thank you for looking into this. It happens mostly on laptops.",
      createdAt: "2026-08-15T09:30:00.000Z",
    },
  ],
  internalNotes: [
    {
      id: 301,
      ticketId: 1,
      author: { id: 9, name: "Wichai Support", role: "IT_STAFF" },
      content: "Checked AP 3F-02 syslog: beacon frames are missing.",
      createdAt: "2026-08-15T09:45:00.000Z",
    },
  ],
};

function renderComponent(props: { ticketId: number; onBack: () => void }) {
  return render(
    <AuthProvider>
      <StaffTicketDetail {...props} />
    </AuthProvider>
  );
}

describe("Component: StaffTicketDetail (Issue 14 - UI-04, UI-05, AC-14.1..4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, "getMeApi").mockResolvedValue(mockStaffUser);
    vi.spyOn(api, "getTicketDetailApi").mockResolvedValue({ ...mockTicketDetail });
    vi.spyOn(api, "getStaffAssigneesApi").mockResolvedValue([...mockAssignees]);
  });

  it("UI-04 / AC-14.1: renders ticket overview, requester info, and attachments", async () => {
    renderComponent({ ticketId: 1, onBack: vi.fn() });

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
    });

    expect(screen.getByText("Campus Wi-Fi drops intermittently")).toBeInTheDocument();
    expect(screen.getByText("Signal drops every 10 minutes in the library 3rd floor.")).toBeInTheDocument();
    expect(screen.getByText("wifi_signal_trace.log")).toBeInTheDocument();
    expect(screen.getAllByText("Jennifer Anderson").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Engineering")).toBeInTheDocument();
  });

  it("UI-04 / AC-14.4: displays Requester Confirmed Resolution banner when confirmed timestamp is present", async () => {
    renderComponent({ ticketId: 1, onBack: vi.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Requester Confirmed Resolution/i)).toBeInTheDocument();
    });
  });

  it("UI-04 / AC-14.1: clicking 'Claim Ticket' shortcut invokes assignTicketOwnerApi with current user ID", async () => {
    const assignSpy = vi.spyOn(api, "assignTicketOwnerApi").mockResolvedValue({
      id: 1,
      ticketNumber: "TKT-2026-00001",
      ownerId: 8,
      owner: mockStaffUser,
    });

    const user = userEvent.setup();
    renderComponent({ ticketId: 1, onBack: vi.fn() });

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
    });

    const claimButton = screen.getByRole("button", { name: /Claim Ticket/i });
    expect(claimButton).toBeInTheDocument();

    await user.click(claimButton);

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith(1, 8);
    });
  });

  it("UI-04 / AC-14.1: changing IT Priority invokes updateTicketPriorityApi", async () => {
    const prioritySpy = vi.spyOn(api, "updateTicketPriorityApi").mockResolvedValue({
      id: 1,
      ticketNumber: "TKT-2026-00001",
      itPriority: "URGENT",
    });

    const user = userEvent.setup();
    renderComponent({ ticketId: 1, onBack: vi.fn() });

    await waitFor(() => {
      expect(screen.getByLabelText(/IT Priority/i)).toBeInTheDocument();
    });

    const prioritySelect = screen.getByLabelText(/IT Priority/i);
    await user.selectOptions(prioritySelect, "URGENT");

    await waitFor(() => {
      expect(prioritySpy).toHaveBeenCalledWith(1, "URGENT");
    });
  });

  it("UI-04 / AC-14.1: selecting status and clicking 'Update Status' invokes transitionTicketStatusApi", async () => {
    const transitionSpy = vi.spyOn(api, "transitionTicketStatusApi").mockResolvedValue({
      id: 1,
      ticketNumber: "TKT-2026-00001",
      currentStatus: "RESOLVED",
    });

    const user = userEvent.setup();
    renderComponent({ ticketId: 1, onBack: vi.fn() });

    await waitFor(() => {
      expect(screen.getByLabelText(/Transition Workflow Status/i)).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/Transition Workflow Status/i);
    await user.selectOptions(statusSelect, "RESOLVED");

    const updateBtn = screen.getByRole("button", { name: /Update Status/i });
    await user.click(updateBtn);

    await waitFor(() => {
      expect(transitionSpy).toHaveBeenCalledWith(1, "RESOLVED");
    });
  });

  it("UI-05 / AC-14.2: renders Public Comments thread and allows posting a new public comment", async () => {
    const commentSpy = vi.spyOn(api, "postPublicCommentApi").mockResolvedValue({
      id: 202,
      ticketId: 1,
      author: { id: 8, name: "Sompong IT", role: "IT_STAFF" },
      content: "We have rebooted the AP on the 3rd floor.",
      createdAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    renderComponent({ ticketId: 1, onBack: vi.fn() });

    await waitFor(() => {
      expect(screen.getByText("Thank you for looking into this. It happens mostly on laptops.")).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText(/Add Public Comment/i);
    await user.type(textarea, "We have rebooted the AP on the 3rd floor.");

    const postBtn = screen.getByRole("button", { name: /Post Public Comment/i });
    await user.click(postBtn);

    await waitFor(() => {
      expect(commentSpy).toHaveBeenCalledWith(1, "We have rebooted the AP on the 3rd floor.");
    });
  });

  it("UI-05 / DEC-UI-11: renders Confidential Internal Notes with amber styling and allows posting note", async () => {
    const noteSpy = vi.spyOn(api, "postInternalNoteApi").mockResolvedValue({
      id: 302,
      ticketId: 1,
      author: { id: 8, name: "Sompong IT", role: "IT_STAFF" },
      content: "Replaced PoE injector with 30W model.",
      createdAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    renderComponent({ ticketId: 1, onBack: vi.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Confidential Internal Notes/i)).toBeInTheDocument();
      expect(screen.getByText(/Strictly confidential to IT Staff & Administrators/i)).toBeInTheDocument();
      expect(screen.getByText("Checked AP 3F-02 syslog: beacon frames are missing.")).toBeInTheDocument();
    });

    const noteInput = screen.getByLabelText(/Add Confidential Note/i);
    await user.type(noteInput, "Replaced PoE injector with 30W model.");

    const postNoteBtn = screen.getByRole("button", { name: /Post Internal Note/i });
    await user.click(postNoteBtn);

    await waitFor(() => {
      expect(noteSpy).toHaveBeenCalledWith(1, "Replaced PoE injector with 30W model.");
    });
  });
});
