import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { handlers } from "../mocks/handlers";

// The stand-in API, plus a signed-out answer for the session check every app start makes.
export const server = setupServer(
  ...handlers,
  http.post("/api/v1/auth/refresh", () =>
    HttpResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 }),
  ),
);
