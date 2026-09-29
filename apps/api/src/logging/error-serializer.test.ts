import { Writable } from "node:stream";

import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { serializeError } from "./error-serializer.js";
import { createLoggerOptions } from "./logger-options.js";

/** The shape drizzle-orm 0.45's `DrizzleQueryError` has: bound parameters in message and props. */
class FakeDrizzleQueryError extends Error {
  constructor(
    readonly query: string,
    readonly params: unknown[],
    override readonly cause?: unknown,
  ) {
    super(`Failed query: ${query}\nparams: ${params.join(",")}`);
    this.name = "DrizzleQueryError";
  }
}

const SECRET_EMAIL = "ada@example.com";
const PRODUCTION_LOG_ENV = { NODE_ENV: "production", LOG_LEVEL: "info", APP_VERSION: "t" } as const;
const SECRET_HASH = "$argon2id$v=19$m=65536$c2FsdA$aGFzaA";

function pgError() {
  return Object.assign(new Error("duplicate key value violates unique constraint"), {
    code: "23505",
    detail: `Key (normalized_email)=(${SECRET_EMAIL}) already exists.`,
  });
}

describe("serializeError", () => {
  it("keeps the query text but never the bound parameters of a failed query", () => {
    const error = new FakeDrizzleQueryError(
      'insert into "users" ("email", "password_hash") values ($1, $2)',
      [SECRET_EMAIL, SECRET_HASH],
      pgError(),
    );

    const serialized = serializeError(error);
    const text = JSON.stringify(serialized);

    expect(text).not.toContain(SECRET_EMAIL);
    expect(text).not.toContain(SECRET_HASH);
    expect(serialized.message).toContain('insert into "users"');
    expect(serialized.message).toContain("params: [redacted]");
    expect(serialized.type).toBe("DrizzleQueryError");
  });

  it("keeps a driver error's code but drops its detail, which quotes row values", () => {
    const serialized = serializeError(new FakeDrizzleQueryError("select 1", [], pgError()));

    expect(serialized.cause?.code).toBe("23505");
    expect(serialized.cause?.message).toContain("duplicate");
    expect(serialized.cause).not.toHaveProperty("detail");
    expect(JSON.stringify(serialized)).not.toContain(SECRET_EMAIL);
  });

  it("serializes an ordinary error with its type, message, stack and status code", () => {
    const error = Object.assign(new Error("Body is too large"), { statusCode: 413 });

    const serialized = serializeError(error);

    expect(serialized).toEqual(
      expect.objectContaining({ type: "Error", message: "Body is too large", statusCode: 413 }),
    );
    expect(serialized.stack).toContain("Body is too large");
  });

  it("never copies arbitrary enumerable properties", () => {
    const error = Object.assign(new Error("boom"), { password: "hunter2", token: "t0k3n" });

    const text = JSON.stringify(serializeError(error));

    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("t0k3n");
  });

  it("handles a thrown non-error value", () => {
    expect(serializeError("plain string")).toEqual({
      type: "string",
      message: "plain string",
      stack: "",
    });
  });

  it("stops following causes after a few levels", () => {
    let error: Error = new Error("root");
    for (let depth = 0; depth < 10; depth += 1) {
      error = new Error(`level ${String(depth)}`, { cause: error });
    }

    const text = JSON.stringify(serializeError(error));

    expect(text).not.toContain("root");
  });
});

describe("createLoggerOptions", () => {
  function captureLogs() {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding, done) {
        lines.push(chunk.toString());
        done();
      },
    });
    return { lines, stream };
  }

  it("is silent under NODE_ENV=test and LOG_LEVEL elsewhere", () => {
    expect(createLoggerOptions({ ...PRODUCTION_LOG_ENV, NODE_ENV: "test" }).level).toBe("silent");
    expect(createLoggerOptions(PRODUCTION_LOG_ENV).level).toBe("info");
  });

  it("wires the error serializer, so a logged failed query carries no parameters", async () => {
    const { lines, stream } = captureLogs();
    const app = Fastify({ logger: { ...createLoggerOptions(PRODUCTION_LOG_ENV), stream } });
    app.get("/boom", () => {
      throw new FakeDrizzleQueryError("select $1", [SECRET_EMAIL]);
    });

    await app.inject({ method: "GET", url: "/boom?token=abc" });
    await app.close();

    const log = lines.join("\n");
    expect(log).toContain("Failed query: select $1");
    expect(log).not.toContain(SECRET_EMAIL);
    expect(log).not.toContain("token=abc");
  });

  it("redacts the message when an error is logged directly, as index.ts does on start-up failure", async () => {
    const { lines, stream } = captureLogs();
    const app = Fastify({ logger: { ...createLoggerOptions(PRODUCTION_LOG_ENV), stream } });

    app.log.error(new FakeDrizzleQueryError("select $1", [SECRET_EMAIL]));
    app.log.warn(`Failed query: select $1\nparams: ${SECRET_EMAIL}`);
    await app.close();

    const log = lines.join("\n");
    expect(log).toContain("params: [redacted]");
    expect(log).not.toContain(SECRET_EMAIL);
  });

  it("leaves ordinary structured log calls unchanged", async () => {
    const { lines, stream } = captureLogs();
    const app = Fastify({ logger: { ...createLoggerOptions(PRODUCTION_LOG_ENV), stream } });

    app.log.info({ lessonId: "pl-greetings", status: "completed" }, "Lesson complete");
    await app.close();

    const entry = JSON.parse(lines.find((line) => line.includes("Lesson complete"))!) as Record<
      string,
      unknown
    >;
    expect(entry).toMatchObject({ lessonId: "pl-greetings", msg: "Lesson complete" });
  });

  it("redacts cookies and the authorization header", async () => {
    const { lines, stream } = captureLogs();
    const app = Fastify({ logger: { ...createLoggerOptions(PRODUCTION_LOG_ENV), stream } });
    app.get("/", (request) => {
      request.log.info({ req: request }, "probe");
      return "ok";
    });

    await app.inject({
      method: "GET",
      url: "/",
      headers: { cookie: "tfm_bic_session=secret-cookie", authorization: "Bearer secret-bearer" },
    });
    await app.close();

    const log = lines.join("\n");
    expect(log).not.toContain("secret-cookie");
    expect(log).not.toContain("secret-bearer");
  });
});
