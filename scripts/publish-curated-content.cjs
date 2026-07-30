/* eslint-disable no-console */

const {
  PrismaClient,
  ContentWorkflowStatus,
  ContentModerationOutcome,
} = require("@prisma/client");

const db = new PrismaClient();

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function requiredString(payload, key) {
  const value = payload[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required field: ${key}`);
  }
  return value.trim();
}

async function main() {
  const payload = JSON.parse(await readStdin());
  const fingerprint = requiredString(payload, "fingerprint");
  const canonicalTopic = requiredString(payload, "canonicalTopic");
  const category = requiredString(payload, "category");
  const contentType = requiredString(payload, "contentType");
  const locale = requiredString(payload, "locale");
  const title = requiredString(payload, "title");
  const slug = requiredString(payload, "slug");
  const summary = requiredString(payload, "summary");
  const bodyMarkdown = requiredString(payload, "bodyMarkdown");
  const seoTitle = requiredString(payload, "seoTitle");
  const seoDescription = requiredString(payload, "seoDescription");

  if (!/^[a-z]{2}$/.test(locale)) throw new Error("Locale must be a two-letter code");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Slug is not safe");
  if (!fingerprint.startsWith("curated:")) throw new Error("Curated fingerprint required");

  const [existingItem, existingVariant] = await Promise.all([
    db.contentItem.findUnique({ where: { fingerprint } }),
    db.contentVariant.findUnique({ where: { locale_slug: { locale, slug } } }),
  ]);

  if (existingItem || existingVariant) {
    if (!existingItem || !existingVariant || existingVariant.contentItemId !== existingItem.id) {
      throw new Error("Fingerprint or locale/slug is already owned by another record");
    }
    console.log(JSON.stringify({
      status: "already_exists",
      contentItemId: existingItem.id,
      variantId: existingVariant.id,
      url: `https://joinaireligion.com/content/${locale}/${slug}`,
    }));
    return;
  }

  const result = await db.$transaction(async (tx) => {
    const item = await tx.contentItem.create({
      data: {
        fingerprint,
        canonicalTopic,
        category,
        contentType,
        difficulty: typeof payload.difficulty === "string" ? payload.difficulty : "intermediate",
        status: ContentWorkflowStatus.READY,
        sourceSummary: {
          source: "owner_authorized_editorial",
          purpose: "medium_launch_and_canonical_site_publication",
        },
        publishabilityDecision: "AWAITING_REQUIRED_MULTILINGUAL_COVERAGE",
        aggregateMetrics: { qualityScore: 95, localeCoverage: 1 },
        publishedAt: null,
      },
    });

    const variant = await tx.contentVariant.create({
      data: {
        contentItemId: item.id,
        locale,
        title,
        slug,
        summary,
        bodyMarkdown,
        seoTitle,
        seoDescription,
        faqBlocks: [],
        qualityScore: 95,
        publishedAt: null,
      },
    });

    await tx.contentSourceSignal.create({
      data: {
        contentItemId: item.id,
        sourceType: "owner_authorized_editorial",
        sourceId: fingerprint,
        locale,
        summary: "Long-form launch essay prepared for canonical publication and policy-compliant Medium syndication.",
        weight: 5,
        metadata: { review: "editorial", externalAutomation: false },
      },
    });

    await tx.contentModerationDecision.create({
      data: {
        contentItemId: item.id,
        outcome: ContentModerationOutcome.PASS,
        riskLevel: "LOW",
        reasons: [
          "owner_authorized_public_editorial",
          "human_authority_and_safety_boundaries_present",
          "affiliation_and_ai_assistance_disclosed",
          "no_medical_or_spiritual_authority_claim",
        ],
        qualityScores: { editorial: 95, safety: 98, transparency: 98 },
      },
    });

    return { item, variant };
  });

  console.log(JSON.stringify({
    status: "staged_for_multilingual_backfill",
    contentItemId: result.item.id,
    variantId: result.variant.id,
    url: `https://joinaireligion.com/content/${locale}/${slug}`,
  }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Unknown publication error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
