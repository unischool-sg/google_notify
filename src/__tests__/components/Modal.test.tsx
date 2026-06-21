import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "../../components/ui/modal";

describe("Modal", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <Modal isOpen={false}>
        <p>Content</p>
      </Modal>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders content when isOpen is true", () => {
    render(
      <Modal isOpen={true}>
        <p>Hello Modal</p>
      </Modal>,
    );
    expect(screen.getByText("Hello Modal")).toBeInTheDocument();
  });

  it("closes on Escape key", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on overlay click", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        <div>Content</div>
      </Modal>,
    );
    fireEvent.click(screen.getByText("Content").parentElement!.parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when clicking content inside", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        <div>Content</div>
      </Modal>,
    );
    fireEvent.click(screen.getByText("Content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cleans up event listener on close", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal isOpen={true} onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    rerender(
      <Modal isOpen={false} onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("applies custom className and style", () => {
    render(
      <Modal isOpen={true} className="custom-class" style={{ maxWidth: 500 }}>
        <p>Styled</p>
      </Modal>,
    );
    const content = screen.getByText("Styled").parentElement!;
    expect(content.className).toContain("custom-class");
    expect(content.style.maxWidth).toBe("500px");
  });
});
