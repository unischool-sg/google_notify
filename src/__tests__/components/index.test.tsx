import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import { IndexPage } from "../../app/index";
import { theme } from "../../theme";

vi.mock("../../hooks/use-classroom", () => ({
  useClassroom: vi.fn(),
}));

import { useClassroom } from "../../hooks/use-classroom";

const mockUseClassroom = useClassroom as ReturnType<typeof vi.fn>;

const renderIndexPage = () =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <IndexPage />
      </MemoryRouter>
    </ThemeProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe("IndexPage", () => {
  it("shows loading state", () => {
    mockUseClassroom.mockReturnValue({
      classroomWorks: [],
      loading: true,
      error: null,
    });

    renderIndexPage();

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockUseClassroom.mockReturnValue({
      classroomWorks: [],
      loading: false,
      error: new Error("Fetch failed"),
    });

    renderIndexPage();

    expect(screen.getByText("Classroomの取得に失敗しました")).toBeInTheDocument();
  });

  it("shows empty state when no unread items", () => {
    mockUseClassroom.mockReturnValue({
      classroomWorks: [],
      loading: false,
      error: null,
    });

    renderIndexPage();

    expect(screen.getByText("未読はありません")).toBeInTheDocument();
  });

  it("shows unread count badge", () => {
    mockUseClassroom.mockReturnValue({
      classroomWorks: [
        {
          id: "w1",
          title: "Homework 1",
          updateTime: new Date(Date.now() + 86400000).toISOString(),
          courseId: "c1",
          state: "PUBLISHED",
          alternateLink: "https://classroom.google.com",
          creationTime: "2026-01-01T00:00:00Z",
          workType: "ASSIGNMENT",
        },
        {
          id: "w2",
          title: "Homework 2",
          updateTime: new Date(Date.now() + 86400000).toISOString(),
          courseId: "c1",
          state: "PUBLISHED",
          alternateLink: "https://classroom.google.com",
          creationTime: "2026-01-01T00:00:00Z",
          workType: "ASSIGNMENT",
        },
      ],
      loading: false,
      error: null,
    });

    renderIndexPage();

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Homework 1")).toBeInTheDocument();
    expect(screen.getByText("Homework 2")).toBeInTheDocument();
  });

  it("shows welcome message when sessionStorage has profile", () => {
    mockUseClassroom.mockReturnValue({
      classroomWorks: [],
      loading: false,
      error: null,
    });
    sessionStorage.setItem("profile", JSON.stringify({ name: "Taro" }));

    renderIndexPage();

    expect(screen.getByText(/ようこそ/)).toBeInTheDocument();
  });

  it("shows 'さらに表示' button when there are more items than initial limit", () => {
    const works = Array.from({ length: 10 }, (_, i) => ({
      id: `w${i}`,
      title: `Work ${i}`,
      updateTime: new Date(Date.now() + 86400000).toISOString(),
      courseId: "c1",
      state: "PUBLISHED" as const,
      alternateLink: "https://classroom.google.com",
      creationTime: "2026-01-01T00:00:00Z",
      workType: "ASSIGNMENT" as const,
    }));
    mockUseClassroom.mockReturnValue({
      classroomWorks: works,
      loading: false,
      error: null,
    });

    renderIndexPage();

    expect(screen.getByText("さらに表示")).toBeInTheDocument();
  });
});
