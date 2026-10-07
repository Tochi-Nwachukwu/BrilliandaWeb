import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { sessionFor } from "../../test/render";
import { server } from "../../test/server";
import { useAuthStore } from "../auth/authStore";
import { api, ApiError } from "./client";

const URL_PATTERN = "/api/v1/teacher/assignments";
const PATH = "/teacher/assignments";

describe("api client", () => {
  beforeEach(() => {
    useAuthStore.getState().setSession("expired-token", sessionFor("TEACHER").user);
  });

  it("refreshes an expired access token once, even for requests sent together", async () => {
    let refreshes = 0;
    server.use(
      http.get(URL_PATTERN, ({ request }) =>
        request.headers.get("Authorization") === "Bearer fresh-token"
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ error: "Please log in to continue." }, { status: 401 }),
      ),
      http.post("/api/v1/auth/refresh", () => {
        refreshes += 1;
        return HttpResponse.json({ ...sessionFor("TEACHER"), accessToken: "fresh-token" });
      }),
    );

    const results = await Promise.all([api(PATH), api(PATH)]);

    expect(results).toEqual([{ ok: true }, { ok: true }]);
    expect(refreshes).toBe(1);
    expect(useAuthStore.getState().accessToken).toBe("fresh-token");
  });

  it("signs the user out when the session can't be refreshed", async () => {
    server.use(http.get(URL_PATTERN, () => HttpResponse.json({ error: "Please log in to continue." }, { status: 401 })));

    await expect(api(PATH)).rejects.toMatchObject({ status: 401 });
    expect(useAuthStore.getState()).toMatchObject({ status: "anonymous", user: null, accessToken: null });
  });

  it("explains when Brillanda can't be reached", async () => {
    server.use(http.get(URL_PATTERN, () => HttpResponse.error()));
    await expect(api(PATH)).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/internet connection/) });
  });

  it("passes field errors through for inline display", async () => {
    server.use(
      http.get(URL_PATTERN, () =>
        HttpResponse.json({ error: "Validation failed", fields: { value: ["Must be 20 or less"] } }, { status: 400 }),
      ),
    );
    const error = await api(PATH).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fields).toEqual({ value: ["Must be 20 or less"] });
  });
});
