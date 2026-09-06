import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateTicket } from "../../src/components/CreateTicket.js";
import { RequesterContext } from "../../src/context/RequesterContext.js";

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  isActive: true,
};

const mockCategories = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
  { id: 3, name: "Software" },
  { id: 4, name: "Network" },
];

const mockSystems = [
  { id: 1, name: "Email" },
  { id: 2, name: "Campus Wi-Fi" },
];

function renderCreateTicket(onSuccess = vi.fn(), onCancel = vi.fn()) {
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
      <CreateTicket onSuccess={onSuccess} onCancel={onCancel} />
    </RequesterContext.Provider>
  );
}

describe("Component: CreateTicket Form (UI-03, UI-04, UI-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/categories")) {
        return { ok: true, json: async () => ({ success: true, data: mockCategories }) } as any;
      }
      if (urlStr.includes("/related-systems")) {
        return { ok: true, json: async () => ({ success: true, data: mockSystems }) } as any;
      }
      return { ok: true, json: async () => ({ success: true, data: {} }) } as any;
    });
  });

  it("renders read-only system generated fields and populated dropdowns", async () => {
    renderCreateTicket();

    // Read-only displays
    expect(screen.getByDisplayValue(/Jennifer Anderson/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Auto-Generated/i)).toBeDisabled();

    // Wait for reference dropdowns to load
    await waitFor(() => {
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
      expect(screen.getByText("Campus Wi-Fi")).toBeInTheDocument();
    });
  });

  it("displays field errors only on submit attempt when fields are empty (AC-02)", async () => {
    renderCreateTicket();

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    // Form-level validation displays
    await waitFor(() => {
      expect(screen.getByText(/summary is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      expect(screen.getByText(/please select a category/i)).toBeInTheDocument();
      expect(screen.getByText(/please select a related system/i)).toBeInTheDocument();
    });
  });

  it("displays minimum length boundary errors on submit (AC-03)", async () => {
    renderCreateTicket();

    await waitFor(() => {
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
      expect(screen.getByText("Campus Wi-Fi")).toBeInTheDocument();
    });

    // Fill short inputs
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "Four" } }); // 4 chars
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Too short" } }); // 9 chars

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/summary must be between 5 and 100 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/description must be between 10 and 2000 characters/i)).toBeInTheDocument();
    });
  });

  it("blur validation rule: pure whitespace inputs clear on blur during general entry", async () => {
    renderCreateTicket();

    await waitFor(() => {
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
      expect(screen.getByText("Campus Wi-Fi")).toBeInTheDocument();
    });

    const summaryInput = screen.getByLabelText(/summary/i);
    fireEvent.change(summaryInput, { target: { value: "   " } });
    fireEvent.blur(summaryInput);

    expect((summaryInput as HTMLInputElement).value).toBe("");
  });

  it("submitting busy state: disables button and displays spinner (AC-19)", async () => {
    // Hang /tickets request specifically while letting reference dropdowns load
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/categories")) return { ok: true, json: async () => ({ success: true, data: mockCategories }) } as any;
      if (urlStr.includes("/related-systems")) return { ok: true, json: async () => ({ success: true, data: mockSystems }) } as any;
      if (urlStr.includes("/tickets")) {
        return new Promise(() => {}); // hangs indefinitely
      }
      return { ok: true, json: async () => ({ success: true }) } as any;
    });

    renderCreateTicket();

    await waitFor(() => {
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
      expect(screen.getByText("Campus Wi-Fi")).toBeInTheDocument();
    });

    // Fill valid data
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "Valid summary for test" } });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Valid description that has more than ten characters." },
    });

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/submitting\.\.\./i)).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();
    });
  });

  it("graceful recovery on API failure: preserves typed inputs in form state (AC-20)", async () => {
    // Mock server error on ticket submit
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/categories")) return { ok: true, json: async () => ({ success: true, data: mockCategories }) } as any;
      if (urlStr.includes("/related-systems")) return { ok: true, json: async () => ({ success: true, data: mockSystems }) } as any;
      if (urlStr.includes("/tickets")) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ success: false, error: { message: "Internal Server Error" } }),
        } as any;
      }
      return { ok: true, json: async () => ({ success: true }) } as any;
    });

    renderCreateTicket();

    await waitFor(() => {
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
      expect(screen.getByText("Campus Wi-Fi")).toBeInTheDocument();
    });

    // Fill valid data
    const summaryInput = screen.getByLabelText(/summary/i);
    const descInput = screen.getByLabelText(/description/i);

    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "1" } });
    fireEvent.change(summaryInput, { target: { value: "My Preserved Summary" } });
    fireEvent.change(descInput, { target: { value: "My Preserved Description content that remains." } });

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    // Verify error banner is displayed
    await waitFor(() => {
      expect(screen.getByText(/unable to submit ticket/i)).toBeInTheDocument();
    });

    // Verify input retention
    expect((summaryInput as HTMLInputElement).value).toBe("My Preserved Summary");
    expect((descInput as HTMLTextAreaElement).value).toBe("My Preserved Description content that remains.");
  });

  it("rejects upload of unsupported file types (.txt) on the client (AC-14)", async () => {
    renderCreateTicket();

    await waitFor(() => {
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
      expect(screen.getByText("Campus Wi-Fi")).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/attachments/i);
    const invalidFile = new File(["dummy content"], "report.txt", { type: "text/plain" });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/report\.txt is not an allowed format/i)).toBeInTheDocument();
      expect(screen.queryByText("report.txt (")).not.toBeInTheDocument();
    });
  });

  it("rejects upload of files exceeding 5 MB on the client (AC-14)", async () => {
    renderCreateTicket();

    await waitFor(() => {
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
      expect(screen.getByText("Campus Wi-Fi")).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/attachments/i);
    // Create a 6MB dummy file
    const largeFile = new File(["x"], "huge.png", { type: "image/png" });
    Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/huge\.png exceeds the 5 mb size limit/i)).toBeInTheDocument();
    });
  });

  it("shows success view with generated ticket number upon 201 response (AC-01, AC-05)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/categories")) return { ok: true, json: async () => ({ success: true, data: mockCategories }) } as any;
      if (urlStr.includes("/related-systems")) return { ok: true, json: async () => ({ success: true, data: mockSystems }) } as any;
      if (urlStr.includes("/tickets")) {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            data: {
              id: 99,
              ticketNumber: "TKT-2026-00099",
              summary: "Printer broken in library",
              description: "The paper tray feed motor makes a loud grinding noise.",
              categoryId: 2,
              categoryName: "Hardware",
              relatedSystemId: 1,
              relatedSystemName: "Printer",
              requestedPriority: "High",
              itPriority: "High",
              currentStatus: "New",
              requesterId: 1,
              requesterName: "Jennifer Anderson",
              createdAt: "2026-09-05T15:00:00.000Z",
              updatedAt: "2026-09-05T15:00:00.000Z",
              attachments: [],
            },
          }),
        } as any;
      }
      return { ok: true, json: async () => ({ success: true }) } as any;
    });

    renderCreateTicket();

    await waitFor(() => {
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
      expect(screen.getByText("Campus Wi-Fi")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "Printer broken in library" } });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "The paper tray feed motor makes a loud grinding noise." },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    await waitFor(() => {
      expect(screen.getByText(/ticket created successfully!/i)).toBeInTheDocument();
      expect(screen.getByTestId("ticket-number-display")).toHaveTextContent("TKT-2026-00099");
      expect(screen.getByRole("button", { name: /view in my tickets/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ create another ticket/i })).toBeInTheDocument();
    });
  });
});
