import { describe, expect, it } from "vitest";
import { apiAddress, apiCookieName, failureOf, fieldKey, keptCookieName, parseSetCookie } from "./apiBridge";

describe("apiAddress", () => {
  it("puts the school in front of the API's root on staging", () => {
    expect(apiAddress("greenfield", "api-rouge-nine-18.vercel.app")).toEqual({
      host: "greenfield.api-rouge-nine-18.vercel.app",
      origin: "https://greenfield.api-rouge-nine-18.vercel.app",
      proto: "https",
    });
  });
  it("uses the root itself for the main site, and http on localhost", () => {
    expect(apiAddress(null, "brillianda.com").host).toBe("brillianda.com");
    expect(apiAddress("surebloom", "localhost").origin).toBe("http://surebloom.localhost");
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
