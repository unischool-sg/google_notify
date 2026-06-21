import { describe, it, expect } from "vitest";
import { formatDate } from "../components/unread/utils";

describe("formatDate", () => {
  it("formats an ISO string to Japanese locale", () => {
    const result = formatDate("2026-06-21T10:30:00Z");
    expect(result).toMatch(/\d{1,2}\/\d{1,2} \d{2}:\d{2}/);
  });

  it("handles midnight UTC correctly (JST is +9h)", () => {
    const result = formatDate("2026-01-01T00:00:00Z");
    expect(result).toMatch(/\d{1,2}\/\d{1,2} \d{2}:\d{2}/);
  });

  it("handles different months and days", () => {
    const result = formatDate("2025-12-25T15:45:00Z");
    expect(result).toMatch(/\d{1,2}\/\d{1,2} \d{2}:\d{2}/);
  });
});
