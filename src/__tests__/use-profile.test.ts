import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useProfile } from "../hooks/use-profile";

const mockMethods = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("../lib/google", () => ({
  GoogleAPIClient: class {
    fetch = mockMethods.fetch;
  },
}));

beforeEach(() => {
  mockMethods.fetch.mockReset();
});

describe("useProfile", () => {
  it("returns error immediately when token is empty", () => {
    const { result } = renderHook(() => useProfile(""));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.profile).toBeNull();
  });

  it("fetches and returns profile successfully", async () => {
    const profileData = {
      sub: "12345",
      name: "Test User",
      email: "test@example.com",
    };

    mockMethods.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(profileData),
    });

    const { result } = renderHook(() => useProfile("token"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.profile).toEqual(profileData);
  });

  it("sets error when response is not ok", async () => {
    mockMethods.fetch.mockResolvedValue({ ok: false });

    const { result } = renderHook(() => useProfile("token"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.profile).toBeNull();
  });

  it("sets error on network failure", async () => {
    mockMethods.fetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useProfile("token"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.profile).toBeNull();
  });
});
