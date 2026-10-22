import { describe, expect, it } from "vitest";
import { rootDomains, routeFor, schoolOfHost } from "./hosts";

const roots = rootDomains(undefined);
const route = (host: string, path: string, search = "") => routeFor({ host, path, search, roots });

describe("schoolOfHost", () => {
  it("finds the school in its address, in any case and with a port", () => {
    expect(schoolOfHost("Surebloom.Brillianda.com", roots)).toBe("surebloom");
    expect(schoolOfHost("greenfield.localhost:3000", roots)).toBe("greenfield");
  });
  it("is null for the main site and for addresses that aren't ours", () => {
    expect(schoolOfHost("brillianda.com", roots)).toBeNull();
    expect(schoolOfHost("localhost:3000", roots)).toBeNull();
    expect(schoolOfHost("brillianda-web.vercel.app", roots)).toBeNull();
    expect(schoolOfHost("a.b.brillianda.com", roots)).toBeNull();
    expect(schoolOfHost("evilbrillianda.com", roots)).toBeNull();
  });
  it("uses the configured domain", () => {
    expect(schoolOfHost("surebloom.staging.example.ng", rootDomains("staging.example.ng"))).toBe("surebloom");
  });
});

describe("routeFor", () => {
  it("shows a school's pages at its own address", () => {
    expect(route("surebloom.brillianda.com", "/")).toEqual({ kind: "school", school: "surebloom", path: "/s/surebloom" });
    expect(route("surebloom.brillianda.com", "/students/st1")).toEqual({ kind: "school", school: "surebloom", path: "/s/surebloom/students/st1" });
    expect(route("surebloom.brillianda.com", "/manifest.webmanifest")).toEqual({ kind: "school", school: "surebloom", path: "/s/surebloom/manifest.webmanifest" });
    expect(route("surebloom.brillianda.com", "/app-icon/192")).toEqual({ kind: "school", school: "surebloom", path: "/s/surebloom/app-icon/192" });
  });
  it("leaves files, the service worker and the offline page alone", () => {
    for (const path of ["/_next/static/chunks/a.js", "/sw.js", "/offline", "/photos/students-sky-960.webp", "/robots.txt", "/icon.svg"])
      expect(route("surebloom.brillianda.com", path)).toEqual({ kind: "pass" });
  });
  it("keeps the development addresses working, for that school only", () => {
    expect(route("surebloom.brillianda.com", "/s/surebloom/classes")).toEqual({ kind: "pass" });
    expect(route("surebloom.brillianda.com", "/s/greenfield/classes")).toEqual({ kind: "not-found" });
    expect(route("localhost:3000", "/s/greenfield/classes")).toEqual({ kind: "pass" });
  });
  it("sends signup and www to the main site", () => {
    expect(route("surebloom.brillianda.com", "/signup", "?x=1")).toEqual({ kind: "redirect", url: "https://brillianda.com/signup?x=1" });
    expect(route("www.brillianda.com", "/pricing")).toEqual({ kind: "redirect", url: "https://brillianda.com/pricing" });
    // The team console is never served on a school's address.
    expect(route("surebloom.brillianda.com", "/console/schools")).toEqual({ kind: "redirect", url: "https://brillianda.com/console/schools" });
    expect(route("surebloom.localhost:3000", "/signup")).toEqual({ kind: "redirect", url: "http://localhost:3000/signup" });
  });
  it("forwards /api to the backend, with the school", () => {
    expect(route("surebloom.brillianda.com", "/api/v1/me")).toEqual({ kind: "api", path: "/v1/me", school: "surebloom" });
    expect(route("brillianda.com", "/api/v1/signup")).toEqual({ kind: "api", path: "/v1/signup", school: null });
  });
  it("passes the main site through", () => {
    expect(route("brillianda.com", "/")).toEqual({ kind: "pass" });
    expect(route("brillianda.com", "/login")).toEqual({ kind: "pass" });
  });
  it("sends the API's ?school= email links to the school's own address", () => {
    const staging = rootDomains("staging.brillianda.com");
    expect(routeFor({ host: "staging.brillianda.com", path: "/invite", search: "?token=abc&school=surebloomschool", roots: staging })).toEqual({
      kind: "redirect",
      url: "https://surebloomschool.staging.brillianda.com/invite?token=abc",
    });
    expect(route("brillianda.com", "/", "?school=surebloom")).toEqual({ kind: "redirect", url: "https://surebloom.brillianda.com/" });
    // Not one of our domains: the school's /s/ pages there.
    expect(route("brillianda-web.vercel.app", "/reset-password", "?token=t&school=greenfield")).toEqual({ kind: "redirect", url: "https://brillianda-web.vercel.app/s/greenfield/reset-password?token=t" });
    // Not a school name, or a main-site page: left alone.
    expect(route("brillianda.com", "/invite", "?school=../x")).toEqual({ kind: "pass" });
    expect(route("brillianda.com", "/signup", "?school=surebloom")).toEqual({ kind: "pass" });
  });
});
