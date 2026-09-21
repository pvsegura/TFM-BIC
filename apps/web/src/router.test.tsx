import { isValidElement } from "react";
import { matchRoutes } from "react-router";
import { describe, expect, it } from "vitest";

import { ProtectedRoute } from "./components/protected-route.js";
import { routes } from "./router.js";

function match(path: string) {
  return matchRoutes(routes, path) ?? [];
}

function leafPath(path: string) {
  return match(path).at(-1)?.route.path;
}

function isBehindLogin(path: string) {
  return match(path).some(
    ({ route }) => isValidElement(route.element) && route.element.type === ProtectedRoute,
  );
}

describe("routes", () => {
  it("serves the real dashboard and achievements pages, behind the login route", () => {
    expect(leafPath("/dashboard")).toBe("dashboard");
    expect(leafPath("/achievements")).toBe("achievements");
    expect(isBehindLogin("/dashboard")).toBe(true);
    expect(isBehindLogin("/achievements")).toBe(true);
  });

  it("does not use an API path for the gamification pages, so no proxy bypass is needed", () => {
    // The API lives under /gamification; the pages are /dashboard and /achievements.
    expect(leafPath("/gamification/summary")).toBe("*");
  });

  it("puts the lessons list under /learn/lessons, ahead of the public /learn/:languageCode route", () => {
    expect(leafPath("/learn/lessons")).toBe("learn/lessons");
  });

  it("puts one lesson under /learn/lessons/:lessonId, ahead of the public content route", () => {
    expect(leafPath("/learn/lessons/pl-greetings")).toBe("learn/lessons/:lessonId");
  });

  it("keeps the public catalog pages where they were", () => {
    expect(leafPath("/learn")).toBe("learn/:languageCode?/:levelId?");
    expect(leafPath("/learn/pl")).toBe("learn/:languageCode?/:levelId?");
    expect(leafPath("/learn/pl/a1")).toBe("learn/:languageCode?/:levelId?");
    expect(leafPath("/learn/pl/a1/pl-greetings")).toBe("learn/:languageCode/:levelId/:contentId");
  });

  it("puts every lesson page behind the login route, and the public catalog outside it", () => {
    expect(isBehindLogin("/learn/lessons")).toBe(true);
    expect(isBehindLogin("/learn/lessons/pl-greetings")).toBe(true);
    expect(isBehindLogin("/learn/pl/a1")).toBe(false);
    expect(isBehindLogin("/login")).toBe(false);
  });

  it("does not reserve /lessons for a page: that path belongs to the API (ADR-019)", () => {
    expect(leafPath("/lessons")).toBe("*");
  });

  it("puts one exercise under /learn/exercises/:exerciseId, ahead of the public /learn/:languageCode/:levelId route", () => {
    expect(leafPath("/learn/exercises/pl-greetings-polite-hello")).toBe(
      "learn/exercises/:exerciseId",
    );
  });

  it("puts every exercise page behind the login route", () => {
    expect(isBehindLogin("/learn/exercises/pl-greetings-polite-hello")).toBe(true);
  });

  it("does not reserve /exercises for a page: that path belongs to the API (ADR-020)", () => {
    expect(leafPath("/exercises")).toBe("*");
    expect(leafPath("/exercises/pl-greetings-polite-hello")).toBe("*");
  });
});
