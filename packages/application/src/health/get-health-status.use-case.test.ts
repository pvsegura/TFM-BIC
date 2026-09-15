import { describe, expect, it } from "vitest";

import type { Clock } from "../ports/clock.js";
import { GetHealthStatusUseCase } from "./get-health-status.use-case.js";

class FixedClock implements Clock {
  constructor(private readonly fixed: Date) {}
  now(): Date {
    return this.fixed;
  }
}

describe("GetHealthStatusUseCase", () => {
  it("reports ok status with the current time and validated default language", () => {
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
    const useCase = new GetHealthStatusUseCase(clock);

    const result = useCase.execute({ defaultLanguage: "pl" });

    expect(result).toEqual({
      status: "ok",
      timestamp: "2026-01-01T00:00:00.000Z",
      defaultLanguage: "pl",
    });
  });

  it("propagates domain validation for an invalid default language", () => {
    const useCase = new GetHealthStatusUseCase(new FixedClock(new Date()));

    expect(() => useCase.execute({ defaultLanguage: "not-a-code" })).toThrow();
  });
});
