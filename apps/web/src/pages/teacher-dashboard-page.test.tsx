import type {
  RosterStudentResponse,
  TeacherOverviewResponse,
  TeacherStudentsResponse,
} from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TeacherRoute } from "../components/teacher-route.js";
import * as authApi from "../services/auth-api.js";
import { ApiError } from "../services/api-error.js";
import * as api from "../services/teacher-dashboard-api.js";
import { TeacherDashboardPage } from "./teacher-dashboard-page.js";

const OVERVIEW: TeacherOverviewResponse = {
  totalStudents: 2,
  activeStudents: 1,
  inactiveStudents: 1,
  activeWindowDays: 7,
  lessonsCompleted: 5,
  exerciseAttempts: 12,
  accuracyPercent: 75,
  points: 1250,
};

const ANA: RosterStudentResponse = {
  studentId: "7d9f1c1e-2f0a-4c55-9d0e-3d9b8f6a1b2c",
  displayName: "Ana Nowak",
  nickname: "ana",
  avatarId: "avatar-01",
  lessonsCompleted: 3,
  lessonsInProgress: 1,
  exerciseAttempts: 8,
  accuracyPercent: 75,
  points: 1000,
  lastActivityAt: "2026-09-24T10:00:00.000Z",
  active: true,
};
const UNNAMED: RosterStudentResponse = {
  ...ANA,
  studentId: "8e0a2d2f-3a1b-4d66-8e1f-4eac9a7b2c3d",
  displayName: null,
  nickname: null,
  avatarId: null,
  exerciseAttempts: 0,
  accuracyPercent: null,
  points: 250,
  lastActivityAt: null,
  active: false,
};

const page = (
  students: RosterStudentResponse[],
  overrides: Partial<TeacherStudentsResponse> = {},
) => ({
  students,
  page: 1,
  pageSize: 20,
  total: students.length,
  totalPages: students.length === 0 ? 0 : 1,
  sort: { field: "name" as const, direction: "asc" as const },
  ...overrides,
});

const TEACHER = { id: "t", email: "t@example.com", role: "TEACHER" as const, emailVerified: true };

function mockApi(students = [ANA, UNNAMED], overrides: Partial<TeacherStudentsResponse> = {}) {
  vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(TEACHER);
  return {
    overview: vi.spyOn(api, "fetchTeacherOverview").mockResolvedValue(OVERVIEW),
    students: vi.spyOn(api, "fetchTeacherStudents").mockResolvedValue(page(students, overrides)),
  };
}

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderPage(url = "/teacher") {
  const Stub = createRoutesStub([
    {
      Component: TeacherRoute,
      children: [
        {
          path: "/teacher",
          Component: () => (
            <>
              <TeacherDashboardPage />
              <LocationProbe />
            </>
          ),
        },
      ],
    },
    { path: "/teacher/students/:studentId", Component: LocationProbe },
  ]);
  return renderWithProviders(<Stub initialEntries={[url]} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TeacherDashboardPage — overview", () => {
  it("shows the server's totals with their definitions in words", async () => {
    mockApi();
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Teacher dashboard" }),
    ).toBeVisible();
    const overview = await screen.findByRole("region", { name: "Overview" });
    expect(within(overview).getByText("2")).toBeVisible();
    expect(within(overview).getByText("Students")).toBeVisible();
    expect(within(overview).getByText("1,250")).toBeVisible();
    expect(within(overview).getByText("75%")).toBeVisible();
    expect(
      within(overview).getByText(/Active means at least one lesson or exercise in the last 7 days/),
    ).toBeVisible();
  });

  it("shows 'no attempts yet' instead of 0% when there is no accuracy", async () => {
    mockApi();
    vi.spyOn(api, "fetchTeacherOverview").mockResolvedValue({ ...OVERVIEW, accuracyPercent: null });
    renderPage();

    const overview = await screen.findByRole("region", { name: "Overview" });
    expect(await within(overview).findByText("No attempts yet")).toBeVisible();
  });
});

describe("TeacherDashboardPage — student list", () => {
  it("lists students with links, status in words and an explicit fallback name", async () => {
    mockApi();
    renderPage();

    const table = await screen.findByRole("table", { name: "Your students" });
    expect(within(table).getByRole("link", { name: "Ana Nowak" })).toHaveAttribute(
      "href",
      `/teacher/students/${ANA.studentId}`,
    );
    expect(within(table).getByRole("link", { name: "Unnamed student" })).toBeVisible();
    expect(within(table).getByText("Active")).toBeVisible();
    expect(within(table).getByText("Inactive")).toBeVisible();
    expect(within(table).getByText("No activity yet")).toBeVisible();
    expect(within(table).getByText("—")).toBeVisible();
  });

  it("keeps the most important facts readable on small screens", async () => {
    mockApi();
    renderPage();

    const table = await screen.findByRole("table", { name: "Your students" });
    // Lower-priority columns collapse on small screens; a compact summary line replaces them.
    expect(within(table).getByText("3 lessons · 1,000 points · 75% accuracy")).toHaveClass(
      "md:hidden",
    );
    expect(within(table).getByRole("columnheader", { name: "Points" })).toHaveClass("hidden");
  });

  it("puts search, filter and sort in the URL and asks the API with them", async () => {
    const { students } = mockApi();
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("table", { name: "Your students" });

    await user.type(screen.getByRole("searchbox", { name: "Search students" }), "ana");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Activity" }), "active");
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "points");

    await waitFor(() =>
      expect(students).toHaveBeenLastCalledWith({ q: "ana", activity: "active", sort: "points" }),
    );
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/teacher?q=ana&activity=active&sort=points",
    );
  });

  it("pages through the server's pages", async () => {
    const { students } = mockApi([ANA], { total: 45, totalPages: 3 });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Page 1 of 3 · 45 students")).toBeVisible();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => expect(students).toHaveBeenLastCalledWith({ page: 2 }));
  });

  it("explains an empty roster", async () => {
    mockApi([]);
    vi.spyOn(api, "fetchTeacherOverview").mockResolvedValue({ ...OVERVIEW, totalStudents: 0 });
    renderPage();

    expect(await screen.findByText(/No students are linked to you yet/)).toBeVisible();
  });

  it("says when a search finds nobody", async () => {
    mockApi([]);
    renderPage("/teacher?q=zzz");

    expect(await screen.findByText("No students match these filters.")).toBeVisible();
  });

  it("shows a loading state, then a safe error with a retry that works", async () => {
    mockApi();
    const students = vi
      .spyOn(api, "fetchTeacherStudents")
      .mockRejectedValueOnce(new ApiError("Internal Server Error", 500))
      .mockResolvedValue(page([ANA]));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Loading students…")).toBeVisible();
    expect(
      await screen.findByText("We couldn't load your students. Please try again."),
    ).toBeVisible();
    expect(screen.queryByText("Internal Server Error")).toBeNull();
    await user.click(screen.getAllByRole("button", { name: "Try again" })[0]!);

    expect(await screen.findByRole("link", { name: "Ana Nowak" })).toBeVisible();
    expect(students).toHaveBeenCalledTimes(2);
  });
});

describe("TeacherRoute — the UX guard (the API is the real boundary)", () => {
  it("tells a student this area is for teachers and requests no teacher data", async () => {
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({ ...TEACHER, role: "STUDENT" });
    const overview = vi.spyOn(api, "fetchTeacherOverview");
    renderPage();

    expect(await screen.findByRole("heading", { name: "Teachers only" })).toBeVisible();
    expect(overview).not.toHaveBeenCalled();
  });

  it("shows the API's refusal if the role changed after sign-in", async () => {
    mockApi();
    vi.spyOn(api, "fetchTeacherOverview").mockRejectedValue(new ApiError("Forbidden", 403));
    vi.spyOn(api, "fetchTeacherStudents").mockRejectedValue(new ApiError("Forbidden", 403));
    renderPage();

    expect(
      (await screen.findAllByText("Your account does not have access to the teacher dashboard."))
        .length,
    ).toBeGreaterThan(0);
  });
});
