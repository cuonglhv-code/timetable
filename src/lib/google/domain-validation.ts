export function isValidGoogleEduEmail(email: string, verifiedDomain: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return domain === verifiedDomain.toLowerCase();
}

export function extractDomain(email: string): string | null {
  return email.split('@')[1]?.toLowerCase() ?? null;
}
