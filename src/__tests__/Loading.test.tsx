import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Loading } from "../components/screen/loading";

describe("Loading", () => {
  it("renders a loading indicator", () => {
    render(<Loading />);
    expect(screen.getByRole("progressbar", { name: /loading/i })).toBeInTheDocument();
  });

  it('renders "fullscreen" class by default', () => {
    const { container } = render(<Loading />);
    const main = container.querySelector("main");
    expect(main?.className).toContain("fullscreen");
  });

  it('renders "inset" class when isFullscreen is false', () => {
    const { container } = render(<Loading isFullscreen={false} />);
    const main = container.querySelector("main");
    expect(main?.className).toContain("inset");
  });

  it("renders credit link", () => {
    render(<Loading />);
    expect(screen.getByText(/UniSchool/i)).toBeInTheDocument();
  });
});
