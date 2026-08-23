/**
 * Joins a given name and a family name into the name a reader sees.
 *
 * Either part may be empty, because somebody may be listed under a first name
 * or a single-word alias alone. The result never carries a stray space.
 *
 * @param firstName - The given name, or an empty string.
 * @param lastName - The family name, or an empty string.
 * @returns Both parts separated by a space, or whichever one was given.
 */
export function fullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}
