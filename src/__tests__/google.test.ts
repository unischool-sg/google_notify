import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInvoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));

import { GoogleAPIClient } from "../lib/google";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("GoogleAPIClient", () => {
  describe("constructor", () => {
    it("sets the access token from constructor", () => {
      const client = new GoogleAPIClient("test-token");
      expect(client).toBeInstanceOf(GoogleAPIClient);
    });
  });

  describe("fetch API URL construction", () => {
    it("uses absolute URL when endpoint is absolute", async () => {
      const client = new GoogleAPIClient("token");
      localStorage.setItem("expires_at", String(Date.now() + 3600_000));

      const mockFetch = vi.fn().mockResolvedValue(new Response("{}"));
      vi.stubGlobal("fetch", mockFetch);

      await client.fetch("https://custom.example.com/api");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://custom.example.com/api",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token",
          }),
        }),
      );
    });

    it("prepends apiBaseUrl for relative endpoints", async () => {
      const client = new GoogleAPIClient("token");
      localStorage.setItem("expires_at", String(Date.now() + 3600_000));

      const mockFetch = vi.fn().mockResolvedValue(new Response("{}"));
      vi.stubGlobal("fetch", mockFetch);

      await client.fetch("/v1/courses");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/v1/courses",
        expect.anything(),
      );
    });

    it("uses custom apiBaseUrl when provided", async () => {
      const client = new GoogleAPIClient("token", "https://custom.base");
      localStorage.setItem("expires_at", String(Date.now() + 3600_000));

      const mockFetch = vi.fn().mockResolvedValue(new Response("{}"));
      vi.stubGlobal("fetch", mockFetch);

      await client.fetch("/api/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://custom.base/api/test",
        expect.anything(),
      );
    });
  });

  describe("token refresh logic", () => {
    it("does not refresh if token is still valid", async () => {
      const client = new GoogleAPIClient("valid-token");
      localStorage.setItem("expires_at", String(Date.now() + 3600_000));

      const mockFetch = vi.fn().mockResolvedValue(new Response("{}"));
      vi.stubGlobal("fetch", mockFetch);

      await client.fetch("https://example.com/api");

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("refreshes token when expired and refresh_token exists", async () => {
      mockInvoke.mockResolvedValue({
        access_token: "new-token",
        refresh_token: null,
        expires_in: 3600,
      });

      const client = new GoogleAPIClient("expired-token");
      localStorage.setItem("expires_at", String(Date.now() - 60_000));
      localStorage.setItem("refresh_token", "rt123");

      const mockFetch = vi.fn().mockResolvedValue(new Response("{}"));
      vi.stubGlobal("fetch", mockFetch);

      await client.fetch("https://example.com/api");

      expect(mockInvoke).toHaveBeenCalledWith("refresh_token", {
        refreshToken: "rt123",
      });
      expect(localStorage.getItem("access_token")).toBe("new-token");
    });

    it("does not refresh if no refresh_token stored", async () => {
      const client = new GoogleAPIClient("expired-token");
      localStorage.setItem("expires_at", String(Date.now() - 60_000));

      const mockFetch = vi.fn().mockResolvedValue(new Response("{}"));
      vi.stubGlobal("fetch", mockFetch);

      await client.fetch("https://example.com/api");

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("clears tokens and reloads on refresh failure", async () => {
      mockInvoke.mockRejectedValue(new Error("refresh failed"));

      const client = new GoogleAPIClient("expired-token");
      localStorage.setItem("expires_at", String(Date.now() - 60_000));
      localStorage.setItem("refresh_token", "rt123");
      localStorage.setItem("access_token", "expired-token");

      const reloadFn = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadFn },
        writable: true,
      });

      const mockFetch = vi.fn().mockResolvedValue(new Response("{}"));
      vi.stubGlobal("fetch", mockFetch);

      await client.fetch("https://example.com/api");

      expect(localStorage.getItem("access_token")).toBeNull();
      expect(localStorage.getItem("refresh_token")).toBeNull();
      expect(localStorage.getItem("expires_at")).toBeNull();
      expect(reloadFn).toHaveBeenCalled();
    });
  });

  describe("Google Classroom API methods", () => {
    it("fetchCourses builds correct URL", async () => {
      const client = new GoogleAPIClient("token");
      localStorage.setItem("expires_at", String(Date.now() + 3600_000));

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ courses: [{ id: "1", name: "Course 1" }] })),
      );
      vi.stubGlobal("fetch", mockFetch);

      const courses = await client.fetchCourses();
      const calledUrl = mockFetch.mock.calls[0][0];

      expect(calledUrl).toContain("classroom.googleapis.com/v1/courses");
      expect(calledUrl).toContain("courseStates=ACTIVE");
      expect(calledUrl).toContain("pageSize=50");
      expect(courses).toHaveLength(1);
      expect(courses[0].id).toBe("1");
    });

    it("fetchCourses returns empty array on missing courses", async () => {
      const client = new GoogleAPIClient("token");
      localStorage.setItem("expires_at", String(Date.now() + 3600_000));
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));

      const courses = await client.fetchCourses();
      expect(courses).toEqual([]);
    });

    it("fetchCourseWorks builds correct URL", async () => {
      const client = new GoogleAPIClient("token");
      localStorage.setItem("expires_at", String(Date.now() + 3600_000));

      const mockFetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ courseWork: [{ id: "w1", title: "Work 1" }] })));
      vi.stubGlobal("fetch", mockFetch);

      const works = await client.fetchCourseWorks("course123");
      const calledUrl = mockFetch.mock.calls[0][0];

      expect(calledUrl).toContain("classroom.googleapis.com/v1/courses/course123/courseWork");
      expect(calledUrl).toContain("orderBy=updateTime+desc");
      expect(works).toHaveLength(1);
      expect(works[0].title).toBe("Work 1");
    });

    it("fetchCourseWorks returns empty array on missing courseWork", async () => {
      const client = new GoogleAPIClient("token");
      localStorage.setItem("expires_at", String(Date.now() + 3600_000));
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));

      const works = await client.fetchCourseWorks("c1");
      expect(works).toEqual([]);
    });
  });

  describe("Google Chat API methods", () => {
    it("fetchChatSpaces builds correct URL", async () => {
      const client = new GoogleAPIClient("token");
      localStorage.setItem("expires_at", String(Date.now() + 3600_000));

      const mockFetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ spaces: [{ name: "spaces/1", displayName: "Chat 1" }] })));
      vi.stubGlobal("fetch", mockFetch);

      const spaces = await client.fetchChatSpaces();
      const calledUrl = mockFetch.mock.calls[0][0];

      expect(calledUrl).toContain("chat.googleapis.com/v1/spaces");
      expect(calledUrl).toContain("pageSize=50");
      expect(spaces).toHaveLength(1);
    });

    it("fetchChatMessages builds correct URL", async () => {
      const client = new GoogleAPIClient("token");
      localStorage.setItem("expires_at", String(Date.now() + 3600_000));

      const mockFetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ messages: [{ name: "spaces/1/messages/m1", text: "Hello" }] })));
      vi.stubGlobal("fetch", mockFetch);

      const messages = await client.fetchChatMessages("spaces/1", 'createTime > "2026-01-01"');
      const calledUrl = mockFetch.mock.calls[0][0];

      expect(calledUrl).toContain("chat.googleapis.com/v1/spaces/1/messages");
      expect(calledUrl).toContain("filter=");
      expect(messages).toHaveLength(1);
      expect(messages[0].text).toBe("Hello");
    });
  });
});
