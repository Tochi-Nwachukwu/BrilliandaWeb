// The marketing site's "request a trial" form: what it collects and how it is checked. Shared so
// the page and the server give the same answers.

export type TrialRequest = {
  schoolName: string;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  studentCount: number;
  state?: string;
  interests: string[];
  message?: string;
  website: string; // honeypot: must stay empty
};

export type TrialErrors = Partial<Record<keyof TrialRequest, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** 11 digits starting 0, or the same number written +234… / 234… */
const PHONE = /^(?:\+?234|0)\d{10}$/;

export function validateTrialRequest(values: Record<string, unknown>): TrialErrors {
  const errors: TrialErrors = {};
  const text = (key: string): string => String(values[key] ?? "").trim();

  if (text("schoolName").length < 2) errors.schoolName = "Tell us the school’s name";
  if (text("contactName").length < 2) errors.contactName = "Tell us your name";
  if (!text("role")) errors.role = "Choose your role";

  const email = text("email");
  if (!email) errors.email = "We need an email to reply to";
  else if (!EMAIL.test(email)) errors.email = "Check this email address";

  const phone = text("phone").replace(/[\s-]/g, "");
  if (!phone) errors.phone = "A phone number, in case email fails";
  else if (!PHONE.test(phone)) errors.phone = "Enter a Nigerian number, e.g. 08012345678";

  const count = text("studentCount").replace(/,/g, "");
  if (!count) errors.studentCount = "Roughly how many students?";
  else if (!/^\d{1,6}$/.test(count) || Number(count) < 1) errors.studentCount = "Enter a number, e.g. 420";

  if (text("message").length > 1000) errors.message = "Please keep this under 1,000 characters";

  return errors;
}
