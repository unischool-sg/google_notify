import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { Loading } from "../../components/screen/loading";
import { theme } from "../../theme";

const renderLoading = (props?: { isFullscreen?: boolean }) =>
  render(
    <ThemeProvider theme={theme}>
      <Loading {...props} />
    </ThemeProvider>,
  );

describe("Loading", () => {
  it("renders a loading indicator", () => {
    renderLoading();
    expect(screen.getByRole("progressbar", { name: /loading/i })).toBeInTheDocument();
  });

  it('renders "fullscreen" class by default', () => {
    const { container } = renderLoading();
    const main = container.querySelector("main");
    expect(main?.className).toContain("fullscreen");
  });

  it('renders "inset" class when isFullscreen is false', () => {
    const { container } = renderLoading({ isFullscreen: false });
    const main = container.querySelector("main");
    expect(main?.className).toContain("inset");
  });

  it("renders credit link", () => {
    renderLoading();
    expect(screen.getByText(/UniSchool/i)).toBeInTheDocument();
  });
});
