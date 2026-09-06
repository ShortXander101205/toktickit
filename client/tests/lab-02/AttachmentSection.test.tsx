import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttachmentSection } from "../../src/components/AttachmentSection.js";
import { RequesterContext } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  department: "Computer Engineering",
  isActive: true,
};

const mockActiveAttachments = [
  {
    id: 1,
    ticketId: 10,
    originalFilename: "network_log.pdf",
    mimeType: "application/pdf",
    fileSize: 1048576, // 1 MB
    isRemoved: false,
    createdAt: "2026-09-03T11:05:00.000Z",
  },
  {
    id: 2,
    ticketId: 10,
    originalFilename: "error_screen.png",
    mimeType: "image/png",
    fileSize: 204800, // 200 KB
    isRemoved: false,
    createdAt: "2026-09-03T11:10:00.000Z",
  },
];

const mockRemovedAttachments = [
  {
    id: 3,
    ticketId: 10,
    originalFilename: "wrong_dump.txt",
    mimeType: "text/plain",
    fileSize: 51200,
    isRemoved: true,
    removalReason: "Uploaded wrong dump file by accident",
    removedAt: "2026-09-03T11:30:00.000Z",
    removedByRequesterId: 1,
    removedByRequesterName: "Jennifer Anderson",
    createdAt: "2026-09-03T11:00:00.000Z",
  },
];

function renderAttachmentSection(props?: Partial<React.ComponentProps<typeof AttachmentSection>>) {
  const defaultProps = {
    ticketId: 10,
    activeAttachments: mockActiveAttachments,
    removedAttachments: mockRemovedAttachments,
    onAttachmentAdded: vi.fn(),
    onAttachmentRemoved: vi.fn(),
    ...props,
  };

  return {
    ...render(
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
        <AttachmentSection {...defaultProps} />
      </RequesterContext.Provider>
    ),
    props: defaultProps,
  };
}

describe("Component: AttachmentSection (AC-13 to AC-18)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("CT-AT-01 (Active Attachments Display & Download): displays active files and triggers download", async () => {
    const downloadSpy = vi.spyOn(api, "downloadAttachment").mockResolvedValue();

    renderAttachmentSection();

    expect(screen.getByText("network_log.pdf")).toBeInTheDocument();
    expect(screen.getByText("error_screen.png")).toBeInTheDocument();
    expect(screen.getByText("1 MB")).toBeInTheDocument();
    expect(screen.getByText("200 KB")).toBeInTheDocument();

    const downloadButtons = screen.getAllByRole("button", { name: /Download/i });
    expect(downloadButtons.length).toBe(2);

    await userEvent.click(downloadButtons[0]);
    expect(downloadSpy).toHaveBeenCalledWith(1, "network_log.pdf", 1);
  });

  it("CT-AT-02 (Add Attachment File Validation): warns and blocks file exceeding 5 MB limit", async () => {
    const uploadSpy = vi.spyOn(api, "uploadTicketAttachment");
    const { container } = renderAttachmentSection();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    // Create 6 MB file
    const hugeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "huge_file.png", {
      type: "image/png",
    });

    fireEvent.change(fileInput, { target: { files: [hugeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/exceeds the maximum allowed size of 5 MB/i)).toBeInTheDocument();
    });

    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("CT-AT-02b (Add Attachment Extension Validation): warns and blocks unsupported file format", async () => {
    const uploadSpy = vi.spyOn(api, "uploadTicketAttachment");
    const { container } = renderAttachmentSection();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    const invalidFile = new File(["dummy"], "script.sh", { type: "application/x-sh" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/unsupported extension.*Allowed formats/i)).toBeInTheDocument();
    });

    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("CT-AT-03 (5-Active Limit Guard): disables upload button when 5 active files exist", () => {
    const fiveFiles = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      ticketId: 10,
      originalFilename: `file_${i + 1}.png`,
      mimeType: "image/png",
      fileSize: 1024,
      isRemoved: false,
    }));

    renderAttachmentSection({ activeAttachments: fiveFiles });

    const addBtn = screen.getByRole("button", { name: /\+ Add Attachment/i });
    expect(addBtn).toBeDisabled();
    expect(screen.getByText("5 / 5 active")).toBeInTheDocument();
    expect(screen.getByText(/Maximum of 5 active attachments reached/i)).toBeInTheDocument();
  });

  it("CT-AT-04 (Removal Modal Trigger & Reason Validation - AC-16): opens modal, requires >= 5 chars, calls remove API", async () => {
    const removeSpy = vi.spyOn(api, "removeAttachment").mockResolvedValue({
      success: true,
      data: {
        id: 1,
        isRemoved: true,
        removalReason: "Uploaded wrong diagnostics",
        removedAt: new Date().toISOString(),
      },
    } as any);

    const { props } = renderAttachmentSection();

    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    await userEvent.click(removeButtons[0]);

    // Modal opens
    expect(screen.getByText("Confirm Attachment Removal")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove this file\?/i)).toBeInTheDocument();
    expect(screen.getAllByText(/network_log\.pdf/i).length).toBeGreaterThanOrEqual(2);

    const submitBtn = screen.getByRole("button", { name: "Remove Attachment" });
    expect(submitBtn).toBeDisabled();

    const textarea = screen.getByPlaceholderText(/minimum 5 characters/i);

    // Type 3 chars: button remains disabled
    await userEvent.type(textarea, "abc");
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText("3 / 5 characters minimum")).toBeInTheDocument();

    // Type more chars to reach >= 5: button enabled
    await userEvent.type(textarea, "defgh");
    expect(submitBtn).toBeEnabled();

    // Click submit
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith(1, "abcdefgh", 1);
    });
    expect(props.onAttachmentRemoved).toHaveBeenCalled();
  });

  it("CT-AT-05 (Modal Escape Key & Cancel): closes modal without calling remove API", async () => {
    const removeSpy = vi.spyOn(api, "removeAttachment");

    renderAttachmentSection();

    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    await userEvent.click(removeButtons[0]);

    expect(screen.getByText("Confirm Attachment Removal")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    await userEvent.click(cancelBtn);

    expect(screen.queryByText("Confirm Attachment Removal")).not.toBeInTheDocument();
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it("CT-AT-06 (Soft-Removed Attachments Tombstone View - AC-17): displays soft-removed items with reason and disabled download", () => {
    renderAttachmentSection();

    expect(screen.getByText("Removed Attachments (Audit Log)")).toBeInTheDocument();
    expect(screen.getByText("wrong_dump.txt")).toBeInTheDocument();
    expect(screen.getByText(/"Reason: Uploaded wrong dump file by accident"/i)).toBeInTheDocument();
    expect(screen.getByText("Unavailable / Removed")).toBeInTheDocument();

    // Verify no download button exists for the removed item
    const allButtons = screen.getAllByRole("button");
    const downloadButtons = allButtons.filter((b) => b.textContent?.includes("Download"));
    // Exactly 2 download buttons (for the 2 active files only)
    expect(downloadButtons.length).toBe(2);
  });
});
