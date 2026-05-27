/**
 * Reusable Prisma mock factory for Phase 2 tests.
 * Provides typed mock handles for all models touched by the test suite.
 */

export interface MockUser {
  id: string;
  email: string;
  displayName: string | null;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  currentLevel: number;
  xpTotal: number;
  daysActive: number;
  onboardingDone: boolean;
  onboardingDoneAt: Date | null;
  lastLoginAt: Date | null;
  lastActivityAt: Date | null;
  role: string;
  preferredLocale: string;
  emailOptIn: boolean;
  unsubscribedAt: Date | null;
  acceptedTermsAt: Date | null;
  unsubscribeToken: string | null;
}

export interface MockProfile {
  id: string;
  userId: string;
  bio: string | null;
  tradition: string | null;
  country: string | null;
  city: string | null;
  phone: string | null;
  secondaryEmail: string | null;
  socialMedia: object | null;
  avatarPath: string | null;
}

export const makeUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: "user_test_001",
  email: "seeker@example.com",
  displayName: "Test Seeker",
  passwordHash: "hashedpw",
  emailVerifiedAt: null,
  currentLevel: 1,
  xpTotal: 0,
  daysActive: 0,
  onboardingDone: false,
  onboardingDoneAt: null,
  lastLoginAt: null,
  lastActivityAt: null,
  role: "USER",
  preferredLocale: "en",
  emailOptIn: false,
  unsubscribedAt: null,
  acceptedTermsAt: new Date(),
  unsubscribeToken: null,
  ...overrides,
});

export const makeProfile = (overrides: Partial<MockProfile> = {}): MockProfile => ({
  id: "profile_test_001",
  userId: "user_test_001",
  bio: null,
  tradition: null,
  country: null,
  city: null,
  phone: null,
  secondaryEmail: null,
  socialMedia: null,
  avatarPath: null,
  ...overrides,
});

/**
 * Build a mock NextRequest-like object for route handler testing.
 * The handlers receive a standard Request; we replicate its interface.
 */
export function buildJsonRequest(body: object, method = "POST"): Request {
  return new Request("http://localhost/api/test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function buildFormDataRequest(formData: FormData, method = "POST"): Request {
  return new Request("http://localhost/api/test", { method, body: formData });
}

/**
 * Decode a NextResponse JSON body.
 */
export async function jsonBody(response: Response): Promise<Record<string, unknown>> {
  return response.json();
}
