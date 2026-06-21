import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { ClassroomCard } from "../../components/unread/classroom-card";
import type { ClassroomCourseWork } from "../../types/classroom";
import { theme } from "../../theme";

const baseWork: ClassroomCourseWork = {
  courseId: "c1",
  id: "w1",
  title: "Test Assignment",
  state: "PUBLISHED",
  alternateLink: "https://classroom.google.com/c/test",
  creationTime: "2026-06-20T10:00:00Z",
  updateTime: "2026-06-21T12:00:00Z",
  workType: "ASSIGNMENT",
};

const renderClassroomCard = (work: ClassroomCourseWork) =>
  render(
    <ThemeProvider theme={theme}>
      <ClassroomCard work={work} />
    </ThemeProvider>,
  );

describe("ClassroomCard", () => {
  it("renders the title", () => {
    renderClassroomCard(baseWork);
    expect(screen.getByText("Test Assignment")).toBeInTheDocument();
  });

  it("renders the update time", () => {
    renderClassroomCard(baseWork);
    expect(screen.getByText(/更新:/)).toBeInTheDocument();
  });

  it("renders a link to the assignment", () => {
    renderClassroomCard(baseWork);
    const link = screen.getByText("開く");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://classroom.google.com/c/test");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows due date when present", () => {
    const work: ClassroomCourseWork = {
      ...baseWork,
      dueDate: { year: 2026, month: 7, day: 1 },
      dueTime: { hours: 23, minutes: 59 },
    };
    renderClassroomCard(work);
    expect(screen.getByText(/期限/)).toBeInTheDocument();
    expect(screen.getByText(/2026\/7\/1/)).toBeInTheDocument();
  });

  it("does not show due label when dueDate is absent", () => {
    renderClassroomCard(baseWork);
    expect(screen.queryByText(/期限/)).not.toBeInTheDocument();
  });

  it("shows due date without time when dueTime is absent", () => {
    const work: ClassroomCourseWork = {
      ...baseWork,
      dueDate: { year: 2026, month: 12, day: 25 },
    };
    renderClassroomCard(work);
    expect(screen.getByText(/2026\/12\/25/)).toBeInTheDocument();
    expect(screen.queryByText(/00:00/)).not.toBeInTheDocument();
  });
});
