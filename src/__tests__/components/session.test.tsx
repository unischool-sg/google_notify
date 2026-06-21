import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { SessionProvider } from "../../components/provider/session";
import { theme } from "../../theme";

const mockInvoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

vi.mock("../../hooks/use-profile", () => ({
  useProfile: vi.fn(),
}));

import { useProfile } from "../../hooks/use-profile";

const mockUseProfile = useProfile as ReturnType<typeof vi.fn>;

const renderSessionProvider = () =>
  render(
    <ThemeProvider theme={theme}>
      <SessionProvider />
    </ThemeProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SessionProvider", () => {
  it("shows loading state initially (checking token)", () => {
    mockUseProfile.mockReturnValue({
      isLoading: true,
      profile: null,
      error: null,
    });

    renderSessionProvider();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows login modal when not logged in", () => {
    mockUseProfile.mockReturnValue({
      isLoading: false,
      profile: null,
      error: null,
    });

    renderSessionProvider();
    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
    expect(screen.getByText("ログイン")).toBeInTheDocument();
  });

  it("calls invoke('login') on button click and stores token", async () => {
    mockUseProfile.mockReturnValue({
      isLoading: false,
      profile: null,
      error: null,
    });
    mockInvoke.mockResolvedValue({
      access_token: "new-access-token",
      refresh_token: "new-refresh-token",
      expires_in: 3600,
    });

    renderSessionProvider();

    const button = screen.getByText("Sign in with Google");
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("login");
    });
  });

  it("stores profile in sessionStorage when loaded", () => {
    const profile = { name: "Test User", email: "test@example.com" };
    mockUseProfile.mockReturnValue({
      isLoading: false,
      profile,
      error: null,
    });

    renderSessionProvider();
    expect(sessionStorage.getItem("profile")).toBe(JSON.stringify(profile));
  });

  it("removes profile from sessionStorage on error", () => {
    mockUseProfile.mockReturnValue({
      isLoading: false,
      profile: null,
      error: new Error("Failed"),
    });

    renderSessionProvider();
    expect(sessionStorage.getItem("profile")).toBeNull();
  });

  it("returns null when logged in and profile loaded", () => {
    mockUseProfile.mockReturnValue({
      isLoading: false,
      profile: { name: "User" },
      error: null,
    });

    const { container } = renderSessionProvider();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
