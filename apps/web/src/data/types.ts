// Shapes shared by every data function (docs/data-contract.md).

/** What every write returns: the result, or a message for a person and errors under each field. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** A school as its pages need it: who it is and how it looks. */
export type SchoolSummary = {
  subdomain: string;
  name: string;
  status: "active" | "suspended" | "archived";
  /** A hex colour, e.g. #4A3AA7. Text colours on it are worked out by the front end. */
  brandColor: string;
  logoUrl: string | null;
};
