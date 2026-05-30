/**
 * Tests for OpenAI practice generation integration.
 *
 * Covers:
 *   1. validatePracticeOutput — schema validation accepts valid output
 *   2. validatePracticeOutput — rejects each missing / empty / malformed field
 *   3. buildSystemPrompt — contains required structural elements
 *   4. buildUserPrompt — incorporates user context correctly
 *   5. generatePracticeContent — PLACEHOLDER mode uses placeholder, no OpenAI call
 *   6. generatePracticeContent — OPENAI mode calls OpenAI and returns AI content
 *   7. generatePracticeContent — falls back to placeholder when OpenAI returns null
 *   8. generatePracticeContent — falls back when output fails schema validation
 *   9. generatePracticeContent — falls back when OPENAI_API_KEY is absent in openai mode
 *  10. generatePracticeContent — promptSpec.name is correct for each mode
 *  11. callOpenAIJsonWithError  — returns { data: null, error } when key absent
 *  12. isOpenAIEnabled — true/false based on OPENAI_API_KEY
 *
 * NOTE: Jest is not yet installed.
 * Run `npm install --save-dev jest ts-jest @types/jest` and add jest.config.ts.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock env so we can control OPENAI_API_KEY and PRACTICE_GENERATION_MODE
const mockEnv: Record<string, string | undefined> = {
  OPENAI_API_KEY: "sk-test-key",
  PRACTICE_GENERATION_MODE: "placeholder",
  NEXT_PUBLIC_APP_URL: "https://test.joinai.app",
};

jest.mock("@/lib/env", () => ({
  env: new Proxy(mockEnv, {
    get: (target, key) => target[key as string],
  }),
}));

// Mock the OpenAI client to intercept HTTP calls
const mockCallOpenAIJsonWithError = jest.fn();
const mockIsOpenAIEnabled = jest.fn(() => true);

jest.mock("@/lib/openai/client", () => ({
  callOpenAIJson: async (sys: string, usr: string) => {
    const result = await mockCallOpenAIJsonWithError(sys, usr);
    return result.data;
  },
  callOpenAIJsonWithError: async (sys: string, usr: string) =>
    mockCallOpenAIJsonWithError(sys, usr),
  isOpenAIEnabled: () => mockIsOpenAIEnabled(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  validatePracticeOutput,
  buildSystemPrompt,
  buildUserPrompt,
  PRACTICE_PROMPT_SPEC,
  PLACEHOLDER_PROMPT_SPEC,
  type OpenAIPracticeOutput,
} from "@/lib/openai/practice-prompt";

import {
  generatePracticeContent,
  type PracticeContext,
} from "@/lib/cron/practice-builder";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_AI_OUTPUT: OpenAIPracticeOutput = {
  title: "The Art of Sacred Pausing",
  reading:
    "In the Sufi tradition, the space between breaths is considered holy ground — " +
    "a threshold where the ego dissolves and the divine becomes perceptible. " +
    "This practice invites you to inhabit that threshold consciously, not as an " +
    "effort but as a homecoming to what has always been present beneath the noise.",
  practice:
    "Find a quiet seat. Set a timer for fifteen minutes. With each exhale, " +
    "consciously release one layer of identity — the role you play at work, " +
    "the relationship you hold, the story you tell yourself. Simply rest in the " +
    "awareness that remains when all of that is set aside.",
  reflectionPrompt:
    "What was present in the silence that you rarely allow yourself to notice?",
  safetyNote:
    "It is entirely natural for old emotions or memories to surface during stillness — " +
    "let them pass through without judgment, like clouds crossing open sky.",
};

function makeContext(overrides: Partial<PracticeContext> = {}): PracticeContext {
  return {
    userId: "user_001",
    displayName: "Seeker",
    level: 3,
    tradition: "sufi",
    intent: "deepen my practice",
    cadence: "DAILY" as const,
    scheduledDate: new Date("2024-01-15T00:00:00.000Z"),
    recentResponseSnippets: ["I noticed a stillness I had not felt before."],
    recentDialogueSnippets: ["What is the relationship between silence and presence?"],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEnv.OPENAI_API_KEY = "sk-test-key";
  mockEnv.PRACTICE_GENERATION_MODE = "placeholder";
  mockIsOpenAIEnabled.mockReturnValue(true);
  mockCallOpenAIJsonWithError.mockResolvedValue({ data: VALID_AI_OUTPUT, error: null });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1–2. validatePracticeOutput
// ═══════════════════════════════════════════════════════════════════════════════

describe("validatePracticeOutput", () => {
  it("accepts a fully valid output object", () => {
    expect(validatePracticeOutput(VALID_AI_OUTPUT)).toBe(true);
  });

  it("rejects null", () => {
    expect(validatePracticeOutput(null)).toBe(false);
  });

  it("rejects a non-object", () => {
    expect(validatePracticeOutput("string")).toBe(false);
    expect(validatePracticeOutput(42)).toBe(false);
    expect(validatePracticeOutput([])).toBe(false);
  });

  const fields: (keyof OpenAIPracticeOutput)[] = [
    "title",
    "reading",
    "practice",
    "reflectionPrompt",
    "safetyNote",
  ];

  for (const field of fields) {
    it(`rejects output with missing field: ${field}`, () => {
      const bad = { ...VALID_AI_OUTPUT };
      delete (bad as Record<string, unknown>)[field];
      expect(validatePracticeOutput(bad)).toBe(false);
    });

    it(`rejects output with empty string for field: ${field}`, () => {
      expect(validatePracticeOutput({ ...VALID_AI_OUTPUT, [field]: "" })).toBe(false);
    });

    it(`rejects output with non-string for field: ${field}`, () => {
      expect(validatePracticeOutput({ ...VALID_AI_OUTPUT, [field]: 123 })).toBe(false);
    });
  }

  it("rejects output where reading is too short (< 30 chars)", () => {
    expect(validatePracticeOutput({ ...VALID_AI_OUTPUT, reading: "Too short." })).toBe(false);
  });

  it("rejects output where practice is too short (< 30 chars)", () => {
    expect(validatePracticeOutput({ ...VALID_AI_OUTPUT, practice: "Breathe." })).toBe(false);
  });

  it("rejects output where title exceeds 200 chars", () => {
    expect(
      validatePracticeOutput({ ...VALID_AI_OUTPUT, title: "x".repeat(201) })
    ).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. buildSystemPrompt
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildSystemPrompt", () => {
  it("returns a non-empty string", () => {
    expect(buildSystemPrompt().length).toBeGreaterThan(100);
  });

  it("includes all five required JSON fields in the schema description", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("title");
    expect(prompt).toContain("reading");
    expect(prompt).toContain("practice");
    expect(prompt).toContain("reflectionPrompt");
    expect(prompt).toContain("safetyNote");
  });

  it("specifies JSON-only response format", () => {
    const prompt = buildSystemPrompt();
    expect(prompt.toLowerCase()).toContain("json");
  });

  it("mentions JoinAI in the role definition", () => {
    expect(buildSystemPrompt()).toContain("JoinAI");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. buildUserPrompt
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildUserPrompt", () => {
  it("includes the user's display name", () => {
    expect(buildUserPrompt(makeContext())).toContain("Seeker");
  });

  it("includes the user's tradition", () => {
    expect(buildUserPrompt(makeContext({ tradition: "buddhist" }))).toContain("buddhist");
  });

  it("includes recent response snippets", () => {
    const ctx = makeContext({
      recentResponseSnippets: ["I felt a deep stillness during the meditation."],
    });
    expect(buildUserPrompt(ctx)).toContain("I felt a deep stillness");
  });

  it("includes recent dialogue snippets", () => {
    const ctx = makeContext({
      recentDialogueSnippets: ["What is the nature of the observer?"],
    });
    expect(buildUserPrompt(ctx)).toContain("What is the nature of the observer");
  });

  it("includes the scheduled date", () => {
    const ctx = makeContext();
    expect(buildUserPrompt(ctx)).toContain("2024-01-15");
  });

  it("mentions cadence (daily or weekly)", () => {
    expect(buildUserPrompt(makeContext({ cadence: "DAILY" }))).toContain("daily");
    expect(buildUserPrompt(makeContext({ cadence: "WEEKLY" }))).toContain("weekly");
  });

  it("omits tradition section when tradition is null", () => {
    const prompt = buildUserPrompt(makeContext({ tradition: null }));
    expect(prompt).not.toContain("Tradition:");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. generatePracticeContent — PLACEHOLDER mode
// ═══════════════════════════════════════════════════════════════════════════════

describe("generatePracticeContent — PLACEHOLDER mode", () => {
  beforeEach(() => {
    mockEnv.PRACTICE_GENERATION_MODE = "placeholder";
  });

  it("returns content without calling OpenAI", async () => {
    await generatePracticeContent(makeContext());
    expect(mockCallOpenAIJsonWithError).not.toHaveBeenCalled();
  });

  it("sets usedOpenAI=false", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.usedOpenAI).toBe(false);
  });

  it("returns a non-empty subject", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.subject.length).toBeGreaterThan(0);
  });

  it("returns bodyText and bodyHtml", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.bodyText.length).toBeGreaterThan(50);
    expect(result.bodyHtml.length).toBeGreaterThan(50);
  });

  it("promptSpec.name is placeholder spec name", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.promptSpec.name).toBe(PLACEHOLDER_PROMPT_SPEC.name);
  });

  it("xpReward is 20 for DAILY cadence", async () => {
    const result = await generatePracticeContent(makeContext({ cadence: "DAILY" }));
    expect(result.xpReward).toBe(20);
  });

  it("xpReward is 10 for WEEKLY cadence", async () => {
    const result = await generatePracticeContent(makeContext({ cadence: "WEEKLY" }));
    expect(result.xpReward).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. generatePracticeContent — OPENAI mode happy path
// ═══════════════════════════════════════════════════════════════════════════════

describe("generatePracticeContent — OPENAI mode happy path", () => {
  beforeEach(() => {
    mockEnv.PRACTICE_GENERATION_MODE = "openai";
    mockCallOpenAIJsonWithError.mockResolvedValue({ data: VALID_AI_OUTPUT, error: null });
  });

  it("calls OpenAI once", async () => {
    await generatePracticeContent(makeContext());
    expect(mockCallOpenAIJsonWithError).toHaveBeenCalledTimes(1);
  });

  it("sets usedOpenAI=true", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.usedOpenAI).toBe(true);
  });

  it("subject includes the AI-generated title", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.subject).toContain(VALID_AI_OUTPUT.title);
  });

  it("bodyText includes the AI reading", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.bodyText).toContain(VALID_AI_OUTPUT.reading.slice(0, 40));
  });

  it("bodyText includes the reflection prompt", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.bodyText).toContain(VALID_AI_OUTPUT.reflectionPrompt);
  });

  it("bodyHtml includes the AI practice instruction", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.bodyHtml).toContain(VALID_AI_OUTPUT.practice.slice(0, 40));
  });

  it("bodyHtml includes the safety note", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.bodyHtml).toContain(VALID_AI_OUTPUT.safetyNote.slice(0, 30));
  });

  it("promptSpec.name is AI prompt spec name", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.promptSpec.name).toBe(PRACTICE_PROMPT_SPEC.name);
  });

  it("passes system prompt and user prompt to the client", async () => {
    await generatePracticeContent(makeContext());
    const [systemArg, userArg] = mockCallOpenAIJsonWithError.mock.calls[0] as [string, string];
    expect(systemArg).toContain("JoinAI");
    expect(userArg).toContain("Seeker");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. generatePracticeContent — fallback when OpenAI returns null
// ═══════════════════════════════════════════════════════════════════════════════

describe("generatePracticeContent — fallback on OpenAI null", () => {
  beforeEach(() => {
    mockEnv.PRACTICE_GENERATION_MODE = "openai";
    mockCallOpenAIJsonWithError.mockResolvedValue({
      data: null,
      error: "Connection timeout",
    });
  });

  it("falls back to placeholder content", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.usedOpenAI).toBe(false);
    expect(result.subject.length).toBeGreaterThan(0);
  });

  it("sets openAIError on the result", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.openAIError).toBe("Connection timeout");
  });

  it("uses placeholder promptSpec on fallback", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.promptSpec.name).toBe(PLACEHOLDER_PROMPT_SPEC.name);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. generatePracticeContent — fallback on schema validation failure
// ═══════════════════════════════════════════════════════════════════════════════

describe("generatePracticeContent — fallback on schema validation failure", () => {
  beforeEach(() => {
    mockEnv.PRACTICE_GENERATION_MODE = "openai";
  });

  it("falls back when model returns object missing required fields", async () => {
    mockCallOpenAIJsonWithError.mockResolvedValue({
      data: { title: "Good title" }, // missing reading, practice, etc.
      error: null,
    });
    const result = await generatePracticeContent(makeContext());
    expect(result.usedOpenAI).toBe(false);
    expect(result.openAIError).toBe("Schema validation failed");
  });

  it("falls back when model returns a non-object", async () => {
    mockCallOpenAIJsonWithError.mockResolvedValue({ data: "raw string", error: null });
    const result = await generatePracticeContent(makeContext());
    expect(result.usedOpenAI).toBe(false);
  });

  it("falls back when reading is too short", async () => {
    mockCallOpenAIJsonWithError.mockResolvedValue({
      data: { ...VALID_AI_OUTPUT, reading: "Too short." },
      error: null,
    });
    const result = await generatePracticeContent(makeContext());
    expect(result.usedOpenAI).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. generatePracticeContent — fallback when OPENAI_API_KEY absent
// ═══════════════════════════════════════════════════════════════════════════════

describe("generatePracticeContent — fallback when key absent", () => {
  beforeEach(() => {
    mockEnv.PRACTICE_GENERATION_MODE = "openai";
    mockIsOpenAIEnabled.mockReturnValue(false);
  });

  it("falls back to placeholder without calling the client", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.usedOpenAI).toBe(false);
    expect(mockCallOpenAIJsonWithError).not.toHaveBeenCalled();
  });

  it("openAIError mentions missing key", async () => {
    const result = await generatePracticeContent(makeContext());
    expect(result.openAIError).toMatch(/OPENAI_API_KEY/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Prompt spec constants
// ═══════════════════════════════════════════════════════════════════════════════

describe("Prompt spec constants", () => {
  it("PRACTICE_PROMPT_SPEC has required fields", () => {
    expect(typeof PRACTICE_PROMPT_SPEC.name).toBe("string");
    expect(typeof PRACTICE_PROMPT_SPEC.version).toBe("number");
    expect(typeof PRACTICE_PROMPT_SPEC.body).toBe("string");
    expect(PRACTICE_PROMPT_SPEC.version).toBeGreaterThan(0);
  });

  it("PLACEHOLDER_PROMPT_SPEC has required fields", () => {
    expect(typeof PLACEHOLDER_PROMPT_SPEC.name).toBe("string");
    expect(typeof PLACEHOLDER_PROMPT_SPEC.version).toBe("number");
    expect(typeof PLACEHOLDER_PROMPT_SPEC.body).toBe("string");
  });

  it("PRACTICE_PROMPT_SPEC and PLACEHOLDER_PROMPT_SPEC have different names", () => {
    expect(PRACTICE_PROMPT_SPEC.name).not.toBe(PLACEHOLDER_PROMPT_SPEC.name);
  });
});
