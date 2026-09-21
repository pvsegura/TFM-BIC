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
});
