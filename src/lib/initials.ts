/** Two letters for a person or place: "Amaka Obi" → AO. Used on both server and client. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .map((word) => word[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}
