import "@testing-library/jest-dom";
import { vi } from "vitest";

class MockStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null {
    const keys = [...this.store.keys()];
    return keys[index] ?? null;
  }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, value); }
}

Object.defineProperty(globalThis, "localStorage", { value: new MockStorage(), writable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: new MockStorage(), writable: true });

vi.stubGlobal(
  "fetch",
  vi.fn().mockRejectedValue(
    new Error(
      "fetch is not mocked. Use vi.stubGlobal('fetch', mockFn) in your test to set up a mock.",
    ),
  ),
);
