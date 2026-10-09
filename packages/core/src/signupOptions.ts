// The signup screens' fixed choices, kept apart from the schemas so a screen can show them
// without loading the checking library up front.
export const SCHOOL_LEVELS = ["NURSERY", "PRIMARY", "SECONDARY"] as const;
export type SchoolLevel = (typeof SCHOOL_LEVELS)[number];
export const SCHOOL_LEVEL_LABEL: Record<SchoolLevel, string> = { NURSERY: "Nursery", PRIMARY: "Primary", SECONDARY: "Secondary" };

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

/** Screen 3. */
export const CODE_LIFETIME_SECONDS = 10 * 60;
export const RESEND_AFTER_SECONDS = 60;
