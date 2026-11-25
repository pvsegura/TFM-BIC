import { bookIndexSchema, type BookIndexResponse } from "@verbysia/contracts";

import { requestJson } from "./api-request.js";

/** Page numbers of a course's printed books (`GET /books/:course`). */
export async function fetchBookIndex(course: string): Promise<BookIndexResponse> {
  return bookIndexSchema.parse(await requestJson(`/books/${encodeURIComponent(course)}`));
}
