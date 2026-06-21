import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { Modal } from "../../components/ui/modal";
import { theme } from "../../theme";

const renderModal = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("Modal", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = renderModal(
      <Modal isOpen={false}>
        <p>Content</p>
      </Modal>,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("renders content when isOpen is true", () => {
    renderModal(
      <Modal isOpen={true}>
        <p>Hello Modal</p>
      </Modal>,
    );
    expect(screen.getByText("Hello Modal")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Escape key", () => {
    const onClose = vi.fn();
    renderModal(
      <Modal isOpen={true} onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on overlay click", () => {
    const onClose = vi.fn();
    renderModal(
      <Modal isOpen={true} onClose={onClose}>
        <div>Content</div>
      </Modal>,
    );
    const backdrop = document.body.querySelector(".MuiBackdrop-root");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when clicking content inside", () => {
    const onClose = vi.fn();
    renderModal(
      <Modal isOpen={true} onClose={onClose}>
        <div>Content</div>
      </Modal>,
    );
    fireEvent.click(screen.getByText("Content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cleans up event listener on close", () => {
    const onClose = vi.fn();
    const { rerender } = renderModal(
      <Modal isOpen={true} onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    rerender(
      <ThemeProvider theme={theme}>
        <Modal isOpen={false} onClose={onClose}>
          <p>Content</p>
        </Modal>
      </ThemeProvider>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("applies custom className and style", () => {
    renderModal(
      <Modal isOpen={true} className="custom-class" style={{ maxWidth: 500 }}>
        <p>Styled</p>
      </Modal>,
    );
    const paper = screen.getByRole("dialog");
    expect(paper.className).toContain("custom-class");
    expect(paper.style.maxWidth).toBe("500px");
  });
});
