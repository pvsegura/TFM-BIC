/** The request fields logged per request — Fastify's default minus the query string. */
export interface SerializedRequest {
  [key: string]: unknown;
  method: string;
  url: string;
  host?: string;
  remoteAddress?: string;
}

/** `url` without `?query` or `#fragment`. */
export function pathWithoutQuery(url: string): string {
  const end = url.search(/[?#]/);
  return end === -1 ? url : url.slice(0, end);
}

/**
 * Replaces Fastify's default request log serializer (M14): query strings are never logged,
 * because some links carry secrets there — RFC 8058 one-click unsubscribe must put its token in
 * the URL. Nothing else in the API relies on logged query strings.
 */
export function serializeRequest(request: {
  method: string;
  url: string;
  host?: string | undefined;
  ip?: string | undefined;
}): SerializedRequest {
  return {
    method: request.method,
    url: pathWithoutQuery(request.url),
    ...(request.host === undefined ? {} : { host: request.host }),
    ...(request.ip === undefined ? {} : { remoteAddress: request.ip }),
  };
}
