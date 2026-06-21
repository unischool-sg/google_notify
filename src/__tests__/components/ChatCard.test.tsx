import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { ChatSpaceSection } from "../../components/unread/chat-card";
import type { ChatSpace, ChatMessage } from "../../types/chat";
import { theme } from "../../theme";

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

const renderChatSpaceSection = (space: ChatSpace & { messages: ChatMessage[] }) =>
  render(
    <ThemeProvider theme={theme}>
      <ChatSpaceSection space={space} />
    </ThemeProvider>,
  );

describe("ChatSpaceSection", () => {
  it("renders the space display name", () => {
    renderChatSpaceSection({ ...baseSpace, messages });
    expect(screen.getByText("General Chat")).toBeInTheDocument();
  });

  it("renders all messages", () => {
    renderChatSpaceSection({ ...baseSpace, messages });
    expect(screen.getByText("Hello everyone!")).toBeInTheDocument();
    expect(screen.getByText("Just a message")).toBeInTheDocument();
  });

  it("shows sender name when present", () => {
    renderChatSpaceSection({ ...baseSpace, messages });
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders fallback text for messages without text", () => {
    const msgs: ChatMessage[] = [
      { name: "spaces/1/messages/m3", createTime: "2026-06-21T12:00:00Z" },
    ];
    renderChatSpaceSection({ ...baseSpace, messages: msgs });
    expect(screen.getByText("(画像など)")).toBeInTheDocument();
  });

  it("uses space name when displayName is absent", () => {
    const noDisplay: ChatSpace = {
      name: "spaces/2",
      spaceType: "DIRECT_MESSAGE",
    };
    renderChatSpaceSection({ ...noDisplay, messages });
    expect(screen.getByText("spaces/2")).toBeInTheDocument();
  });
});
