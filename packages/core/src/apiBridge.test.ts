import { describe, expect, it } from "vitest";
import { apiAddress, apiCookieName, apiRequest, failureOf, fieldKey, keptCookieName, parseSetCookie } from "./apiBridge";

describe("apiAddress", () => {
  it("is the school's own address in production", () => {
    expect(apiAddress("greenfield", "brillianda.com")).toEqual({
      host: "greenfield.brillianda.com",
      origin: "https://greenfield.brillianda.com",
      proto: "https",
    });
  });
  it("uses the root itself for the main site, and http on localhost", () => {
    expect(apiAddress(null, "brillianda.com").host).toBe("brillianda.com");
    expect(apiAddress("surebloom", "localhost").origin).toBe("http://surebloom.localhost");
  });
});

describe("apiRequest", () => {
  const staging = "api-rouge-nine-18.vercel.app";
  it("names the school in the path on staging, and comes from the API's own domain", () => {
    expect(apiRequest("fecheck", "/v1/auth/login", staging, true)).toEqual({
      path: "/s/fecheck/v1/auth/login",
      host: staging,
      origin: `https://${staging}`,
      proto: "https",
    });
  });
  it("leaves main-site calls alone on staging", () => {
    expect(apiRequest(null, "/v1/signup", staging, true)).toMatchObject({ path: "/v1/signup", host: staging });
  });
  it("names the school in the host in production", () => {
    expect(apiRequest("fecheck", "/v1/school", "brillianda.com", false)).toMatchObject({ path: "/v1/school", host: "fecheck.brillianda.com" });
  });
});

describe("kept cookies", () => {
  it("keeps each school's cookies apart, and gives back only that school's", () => {
    const kept = keptCookieName("greenfield", "__Host-bd_session");
    expect(kept).toBe("bda.greenfield.__Host-bd_session");
    expect(apiCookieName("greenfield", kept)).toBe("__Host-bd_session");
    expect(apiCookieName("oakridge", kept)).toBeNull();
    expect(apiCookieName(null, keptCookieName(null, "bd_signup"))).toBe("bd_signup");
  });
});

describe("parseSetCookie", () => {
  const now = Date.parse("2026-10-15T12:00:00Z");
  it("reads the name, value and lifetime", () => {
    expect(parseSetCookie("__Host-bd_session=abc.def=; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax", now)).toEqual({
      name: "__Host-bd_session",
      value: "abc.def=",
      maxAge: 2592000,
      remove: false,
    });
  });
  it("treats an empty value or a past expiry as a removal", () => {
    expect(parseSetCookie("bd_session=; Path=/; Max-Age=0", now)?.remove).toBe(true);
    expect(parseSetCookie("bd_session=x; Expires=Thu, 01 Jan 1970 00:00:00 GMT", now)?.remove).toBe(true);
  });
  it("ignores a header without a name", () => {
    expect(parseSetCookie("=x", now)).toBeNull();
  });
});

describe("failureOf", () => {
  it("puts each field's message under the form's key", () => {
    expect(fieldKey("#/terms/1/startsOn")).toBe("terms.1.startsOn");
    const failure = failureOf(
      {
        status: 422,
        code: "validation_failed",
        detail: "2 field(s) need fixing.",
        errors: [
          { pointer: "#/name", detail: "Enter the school’s name" },
          { pointer: "#/guardian/phone", detail: "Enter a Nigerian number" },
        ],
      },
      { name: "schoolName" },
    );
    expect(failure).toEqual({
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: { schoolName: ["Enter the school’s name"], "guardian.phone": ["Enter a Nigerian number"] },
    });
  });
  it("shows the API's sentence for a refusal, and a wait for rate limits", () => {
    expect(failureOf({ status: 409, code: "conflict", detail: "This class still has students." })).toEqual({ ok: false, error: "This class still has students." });
    expect(failureOf({ status: 429, code: "rate_limited", retryAfterSec: 30 }).error).toBe("Too many tries. Wait 30 seconds and try again.");
  });
});
