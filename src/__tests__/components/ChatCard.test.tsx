import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatSpaceSection } from "../../components/unread/chat-card";
import type { ChatSpace, ChatMessage } from "../../types/chat";

const baseSpace: ChatSpace = {
  name: "spaces/1",
  spaceType: "SPACE",
  displayName: "General Chat",
};

const messages: ChatMessage[] = [
  {
    name: "spaces/1/messages/m1",
    sender: { name: "users/1", displayName: "Alice" },
    createTime: "2026-06-21T10:00:00Z",
    text: "Hello everyone!",
  },
  {
    name: "spaces/1/messages/m2",
    createTime: "2026-06-21T11:00:00Z",
    text: "Just a message",
  },
];

describe("ChatSpaceSection", () => {
  it("renders the space display name", () => {
    render(<ChatSpaceSection space={{ ...baseSpace, messages }} />);
    expect(screen.getByText("General Chat")).toBeInTheDocument();
  });

  it("renders all messages", () => {
    render(<ChatSpaceSection space={{ ...baseSpace, messages }} />);
    expect(screen.getByText("Hello everyone!")).toBeInTheDocument();
    expect(screen.getByText("Just a message")).toBeInTheDocument();
  });

  it("shows sender name when present", () => {
    render(<ChatSpaceSection space={{ ...baseSpace, messages }} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders fallback text for messages without text", () => {
    const msgs: ChatMessage[] = [
      { name: "spaces/1/messages/m3", createTime: "2026-06-21T12:00:00Z" },
    ];
    render(<ChatSpaceSection space={{ ...baseSpace, messages: msgs }} />);
    expect(screen.getByText("(画像など)")).toBeInTheDocument();
  });

  it("uses space name when displayName is absent", () => {
    const noDisplay: ChatSpace = {
      name: "spaces/2",
      spaceType: "DIRECT_MESSAGE",
    };
    render(<ChatSpaceSection space={{ ...noDisplay, messages }} />);
    expect(screen.getByText("spaces/2")).toBeInTheDocument();
  });
});
