// Nigerian basics shared by forms: the states, and phone numbers in one format.

/** The 36 states and the FCT, in alphabetical order. */
export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River",
  "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

export type NigerianState = (typeof NIGERIAN_STATES)[number];

/**
 * A Nigerian mobile or landline number in the stored +234 form, or null if it isn't one.
 * Accepts 0803 000 0001, 08030000001, 2348030000001 and +234 803 000 0001.
 */
export function normaliseNigerianPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const match = /^(?:\+?234|0)(\d{10})$/.exec(digits);
  return match ? `+234${match[1]}` : null;
}

/** "+2348030000001" → "0803 000 0001", the way people read and type Nigerian numbers. */
export function displayNigerianPhone(stored: string): string {
  const match = /^\+234(\d{3})(\d{3})(\d{4})$/.exec(stored);
  return match ? `0${match[1]} ${match[2]} ${match[3]}` : stored;
}
