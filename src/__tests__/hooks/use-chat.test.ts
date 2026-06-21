import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useChat } from "../../hooks/use-chat";

const mockMethods = vi.hoisted(() => ({
  fetchChatSpaces: vi.fn(),
  fetchChatMessages: vi.fn(),
}));

vi.mock("../../lib/google", () => ({
  GoogleAPIClient: class {
    fetchChatSpaces = mockMethods.fetchChatSpaces;
    fetchChatMessages = mockMethods.fetchChatMessages;
  },
}));

beforeEach(() => {
  mockMethods.fetchChatSpaces.mockReset();
  mockMethods.fetchChatMessages.mockReset();
});

describe("useChat", () => {
  it("starts loading false when token is provided", () => {
    const { result } = renderHook(() =>
      useChat("token", 'createTime > "2026-01-01"'),
    );
    expect(result.current.loading).toBe(false);
  });

  it("fetches spaces and messages successfully", async () => {
    mockMethods.fetchChatSpaces.mockResolvedValue([
      { name: "spaces/1", displayName: "Room 1", spaceType: "SPACE" },
    ]);
    mockMethods.fetchChatMessages.mockResolvedValue([
      {
        name: "spaces/1/messages/m1",
        text: "Hello",
        createTime: "2026-06-21T10:00:00Z",
      },
    ]);

    const { result } = renderHook(() => useChat("token", "filter"));

    await waitFor(() => expect(result.current.chatMessages.length).toBe(1));

    expect(result.current.error).toBeNull();
    expect(result.current.chatMessages[0].displayName).toBe("Room 1");
    expect(result.current.chatMessages[0].messages).toHaveLength(1);
    expect(result.current.chatMessages[0].messages[0].text).toBe("Hello");
  });

  it("returns empty when no spaces exist", async () => {
    mockMethods.fetchChatSpaces.mockResolvedValue([]);

    const { result } = renderHook(() => useChat("token", "filter"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.chatMessages).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("sets error on fetch failure", async () => {
    mockMethods.fetchChatSpaces.mockRejectedValue(new Error("API error"));

    const { result } = renderHook(() => useChat("token", "filter"));

    await waitFor(() => expect(result.current.error).toBeTruthy());

    expect(result.current.error?.message).toBe("API error");
  });
});
