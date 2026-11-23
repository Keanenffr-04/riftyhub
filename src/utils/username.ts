const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i

/** GitHub usernames: letters, digits and single hyphens (not at either end), up to 39 characters. */
export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value)
}
