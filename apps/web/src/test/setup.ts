import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { resetMockDb } from "../mocks/db";
import { resetPlatform } from "../mocks/platformDb";
import { resetSchool } from "../mocks/schoolDb";
import { useAuthStore } from "../shared/auth/authStore";
import { server } from "./server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  useAuthStore.setState({ status: "unknown", accessToken: null, user: null });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockDb();
  resetPlatform();
  resetSchool();
});

afterAll(() => server.close());
