import crypto from "crypto";

const TIKTOK_API_ORIGIN = "https://open.tiktokapis.com";
const CREATOR_INFO_PATH = "/v2/post/publish/creator_info/query/";
const VIDEO_INIT_PATH = "/v2/post/publish/video/init/";
const STATUS_PATH = "/v2/post/publish/status/fetch/";

export const TIKTOK_PRIVACY_LEVELS = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
] as const;

export type TikTokPrivacyLevel = (typeof TIKTOK_PRIVACY_LEVELS)[number];
export type TikTokOperation = "creator_info" | "video_init" | "status";
export type TikTokRetryMode = "retry" | "new_consent_required" | "do_not_retry";
export type TikTokErrorCategory =
  | "authentication"
  | "rate_limit"
  | "policy"
  | "validation"
  | "configuration"
  | "transient"
  | "ambiguous"
  | "unknown";

export type TikTokErrorClassification = {
  category: TikTokErrorCategory;
  retryMode: TikTokRetryMode;
};

export class TikTokPublishingError extends Error {
  readonly code: string;
  readonly httpStatus: number | null;
  readonly logId: string | null;
  readonly operation: TikTokOperation;
  readonly classification: TikTokErrorClassification;

  constructor(input: {
    code: string;
    httpStatus?: number | null;
    logId?: string | null;
    operation: TikTokOperation;
    classification?: TikTokErrorClassification;
  }) {
    super(`TikTok ${input.operation} failed (${input.code})`);
    this.name = "TikTokPublishingError";
    this.code = input.code;
    this.httpStatus = input.httpStatus ?? null;
    this.logId = input.logId ?? null;
    this.operation = input.operation;
    this.classification = input.classification
      ?? classifyTikTokError(input.code, input.httpStatus ?? null, input.operation);
  }
}

export type TikTokCreatorInfo = {
  flowId: string;
  creatorUsername: string;
  creatorNickname: string;
  privacyLevelOptions: TikTokPrivacyLevel[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number;
  fetchedAt: string;
};

export type TikTokExplicitConsent = {
  flowId: string;
  granted: boolean;
  grantedAt: string;
  previewShown: boolean;
  titleEditable: boolean;
  privacySelectedByUser: boolean;
  interactionsSelectedByUser: boolean;
  musicUsageConfirmed: boolean;
  brandedContentPolicyConfirmed: boolean;
};

export type TikTokMediaCompliance = {
  originalOrAuthorized: boolean;
  containsAddedWatermark: boolean;
  containsPromotionalOverlay: boolean;
  containsEmbeddedPromotionalLinkOrText: boolean;
};

export type TikTokVideoPostInput = {
  idempotencyKey: string;
  clientAudited: boolean;
  creatorInfo: TikTokCreatorInfo;
  consent: TikTokExplicitConsent;
  mediaCompliance: TikTokMediaCompliance;
  title: string;
  privacyLevel: TikTokPrivacyLevel;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  promotesOwnBrand: boolean;
  promotesThirdPartyBrand: boolean;
  isAiGenerated: boolean;
  durationSeconds: number;
  source: {
    type: "PULL_FROM_URL";
    videoUrl: string;
    urlOwnershipVerified: boolean;
  };
};

type TikTokEnvelope<T> = {
  data?: T;
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
    logid?: string;
  };
};

export type TikTokVideoInitResult = {
  publishId: string;
  uploadUrl: string | null;
  reused: boolean;
};

export type TikTokInitRecord = {
  fingerprint: string;
  state: "IN_FLIGHT" | "SUCCEEDED" | "REJECTED" | "AMBIGUOUS";
  publishId?: string;
  uploadUrl?: string | null;
  errorCode?: string;
};

export type TikTokInitClaim =
  | { status: "CLAIMED" }
  | { status: "EXISTING"; record: TikTokInitRecord };

/**
 * TikTok's Direct Post init schema does not expose an idempotency key. The
 * caller must therefore persist an atomic claim before the request and keep an
 * ambiguous attempt blocked until a human reconciles it with TikTok.
 */
export interface TikTokInitIdempotencyStore {
  claim(key: string, fingerprint: string): Promise<TikTokInitClaim>;
  resolve(key: string, record: TikTokInitRecord): Promise<void>;
}

export type TikTokPostStatus = {
  publishId: string;
  providerStatus: "PROCESSING_UPLOAD" | "PROCESSING_DOWNLOAD" | "SEND_TO_USER_INBOX" | "PUBLISH_COMPLETE" | "FAILED";
  state: "processing" | "complete" | "failed";
  shouldPollAgain: boolean;
  failReason: string | null;
  failure: TikTokErrorClassification | null;
  publiclyAvailablePostIds: string[];
  uploadedBytes: number | null;
  downloadedBytes: number | null;
};

type FetchLike = typeof fetch;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPrivacyLevel(value: unknown): value is TikTokPrivacyLevel {
  return typeof value === "string" && (TIKTOK_PRIVACY_LEVELS as readonly string[]).includes(value);
}

function apiUrl(path: string): string {
  return `${TIKTOK_API_ORIGIN}${path}`;
}

function bearerHeaders(accessToken: string): Record<string, string> {
  if (!accessToken.trim()) throw new Error("TikTok access token is required");
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json; charset=UTF-8",
  };
}

function errorMetadata(payload: unknown): { code: string; logId: string | null } {
  if (!isRecord(payload) || !isRecord(payload.error)) return { code: "invalid_response", logId: null };
  const code = typeof payload.error.code === "string" ? payload.error.code : "invalid_response";
  const logIdValue = payload.error.log_id ?? payload.error.logid;
  return { code, logId: typeof logIdValue === "string" ? logIdValue : null };
}

function apiError(payload: unknown, response: Response, operation: TikTokOperation): TikTokPublishingError {
  const metadata = errorMetadata(payload);
  return new TikTokPublishingError({
    code: metadata.code === "ok" ? `http_${response.status}` : metadata.code,
    httpStatus: response.status,
    logId: metadata.logId,
    operation,
  });
}

function safeJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export function classifyTikTokError(
  code: string,
  httpStatus: number | null,
  operation: TikTokOperation,
): TikTokErrorClassification {
  const initRetryMode: TikTokRetryMode = operation === "video_init" ? "new_consent_required" : "retry";

  if (["access_token_invalid", "scope_not_authorized", "auth_removed"].includes(code)) {
    return { category: "authentication", retryMode: "do_not_retry" };
  }
  if (["rate_limit_exceeded", "reached_active_user_cap", "spam_risk_too_many_posts"].includes(code)) {
    return { category: "rate_limit", retryMode: initRetryMode };
  }
  if (["spam_risk", "spam_risk_text", "spam_risk_user_banned_from_posting"].includes(code)) {
    return { category: "policy", retryMode: "do_not_retry" };
  }
  if (["privacy_level_option_mismatch", "invalid_param", "invalid_publish_id", "duration_check_failed", "file_format_check_failed", "frame_rate_check_failed", "picture_size_check_failed"].includes(code)) {
    return { category: "validation", retryMode: "do_not_retry" };
  }
  if (["url_ownership_unverified", "unaudited_client_can_only_post_to_private_accounts", "token_not_authorized_for_specified_publish_id"].includes(code)) {
    return { category: "configuration", retryMode: "do_not_retry" };
  }
  if (["internal", "internal_error", "video_pull_failed", "photo_pull_failed"].includes(code) || (httpStatus !== null && httpStatus >= 500)) {
    return { category: "transient", retryMode: initRetryMode };
  }
  if (["network_ambiguous", "invalid_response"].includes(code)) {
    return { category: "ambiguous", retryMode: operation === "video_init" ? "new_consent_required" : "retry" };
  }
  return { category: "unknown", retryMode: "do_not_retry" };
}

export function isUnauditedCreatorAccountPrivate(creatorInfo: TikTokCreatorInfo): boolean {
  const options = new Set(creatorInfo.privacyLevelOptions);
  return options.size === 3
    && options.has("FOLLOWER_OF_CREATOR")
    && options.has("MUTUAL_FOLLOW_FRIENDS")
    && options.has("SELF_ONLY")
    && !options.has("PUBLIC_TO_EVERYONE");
}

export function assertTikTokMediaCompliance(compliance: TikTokMediaCompliance): void {
  if (compliance.originalOrAuthorized !== true) {
    throw new Error("TikTok content must be original or authorized");
  }
  if (compliance.containsAddedWatermark !== false) {
    throw new Error("TikTok content must not contain an added watermark or logo");
  }
  if (compliance.containsPromotionalOverlay !== false || compliance.containsEmbeddedPromotionalLinkOrText !== false) {
    throw new Error("TikTok content must not contain promotional overlays, links, or promotional text");
  }
}

function assertExplicitConsent(
  consent: TikTokExplicitConsent,
  creatorInfo: TikTokCreatorInfo,
  promotesThirdPartyBrand: boolean,
): void {
  if (
    consent.granted !== true
    || consent.previewShown !== true
    || consent.titleEditable !== true
    || consent.privacySelectedByUser !== true
    || consent.interactionsSelectedByUser !== true
    || consent.musicUsageConfirmed !== true
  ) {
    throw new Error("TikTok Direct Post requires explicit, informed, per-post user consent");
  }
  const grantedAt = Date.parse(consent.grantedAt);
  if (!Number.isFinite(grantedAt)) throw new Error("TikTok consent timestamp is invalid");
  const creatorInfoFetchedAt = Date.parse(creatorInfo.fetchedAt);
  if (!Number.isFinite(creatorInfoFetchedAt)) throw new Error("TikTok creator info timestamp is invalid");
  if (!consent.flowId || consent.flowId !== creatorInfo.flowId) {
    throw new Error("TikTok creator info and consent must belong to the same post flow");
  }
  if (grantedAt < creatorInfoFetchedAt) {
    throw new Error("TikTok consent must be granted after the latest creator info query");
  }
  if (promotesThirdPartyBrand && consent.brandedContentPolicyConfirmed !== true) {
    throw new Error("TikTok branded content policy confirmation is required");
  }
}

function assertCreatorChoices(input: TikTokVideoPostInput): void {
  if (!input.creatorInfo.privacyLevelOptions.includes(input.privacyLevel)) {
    throw new Error("TikTok privacy selection is not allowed by the latest creator info");
  }
  if (!input.clientAudited) {
    if (input.privacyLevel !== "SELF_ONLY") {
      throw new Error("Unaudited TikTok clients are restricted to SELF_ONLY");
    }
    if (!isUnauditedCreatorAccountPrivate(input.creatorInfo)) {
      throw new Error("Unaudited TikTok clients may post only to private creator accounts");
    }
  }
  if (input.allowComment && input.creatorInfo.commentDisabled) {
    throw new Error("Comments are disabled by the TikTok creator settings");
  }
  if (input.allowDuet && input.creatorInfo.duetDisabled) {
    throw new Error("Duet is disabled by the TikTok creator settings");
  }
  if (input.allowStitch && input.creatorInfo.stitchDisabled) {
    throw new Error("Stitch is disabled by the TikTok creator settings");
  }
  if (input.promotesThirdPartyBrand && input.privacyLevel === "SELF_ONLY") {
    throw new Error("TikTok branded content cannot use SELF_ONLY privacy");
  }
}

function validateVideoInput(input: TikTokVideoPostInput): void {
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(input.idempotencyKey)) {
    throw new Error("TikTok idempotency key format is invalid");
  }
  if (input.title.length > 2_200) throw new Error("TikTok video title exceeds 2200 UTF-16 code units");
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0) {
    throw new Error("TikTok video duration must be positive");
  }
  if (input.durationSeconds > input.creatorInfo.maxVideoPostDurationSec) {
    throw new Error("TikTok video exceeds the creator's current maximum duration");
  }
  if (!input.source.urlOwnershipVerified) {
    throw new Error("TikTok PULL_FROM_URL requires verified URL ownership");
  }
  const videoUrl = new URL(input.source.videoUrl);
  if (videoUrl.protocol !== "https:" || videoUrl.username || videoUrl.password) {
    throw new Error("TikTok video URL must be credential-free HTTPS");
  }
  assertTikTokMediaCompliance(input.mediaCompliance);
  assertExplicitConsent(input.consent, input.creatorInfo, input.promotesThirdPartyBrand);
  assertCreatorChoices(input);
}

function videoInitBody(input: TikTokVideoPostInput): Record<string, unknown> {
  validateVideoInput(input);
  return {
    post_info: {
      title: input.title,
      privacy_level: input.privacyLevel,
      disable_comment: !input.allowComment,
      disable_duet: !input.allowDuet,
      disable_stitch: !input.allowStitch,
      brand_content_toggle: input.promotesThirdPartyBrand,
      brand_organic_toggle: input.promotesOwnBrand,
      is_aigc: input.isAiGenerated,
    },
    source_info: {
      source: "PULL_FROM_URL",
      video_url: input.source.videoUrl,
    },
  };
}

export function tikTokVideoInitFingerprint(input: TikTokVideoPostInput): string {
  return crypto.createHash("sha256").update(JSON.stringify(videoInitBody(input))).digest("hex");
}

export async function queryTikTokCreatorInfo(input: {
  accessToken: string;
  flowId: string;
  fetchImpl?: FetchLike;
  now?: Date;
}): Promise<TikTokCreatorInfo> {
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(input.flowId)) {
    throw new Error("TikTok post flow id format is invalid");
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(apiUrl(CREATOR_INFO_PATH), {
      method: "POST",
      headers: bearerHeaders(input.accessToken),
      body: "{}",
      cache: "no-store",
    });
  } catch {
    throw new TikTokPublishingError({ code: "network_ambiguous", operation: "creator_info" });
  }
  const payload = await safeJson(response);
  const metadata = errorMetadata(payload);
  if (!response.ok || metadata.code !== "ok") throw apiError(payload, response, "creator_info");
  if (!isRecord(payload) || !isRecord(payload.data)) {
    throw new TikTokPublishingError({ code: "invalid_response", httpStatus: response.status, operation: "creator_info" });
  }

  const data = payload.data;
  const options = Array.isArray(data.privacy_level_options)
    ? data.privacy_level_options.filter(isPrivacyLevel)
    : [];
  if (
    typeof data.creator_username !== "string"
    || typeof data.creator_nickname !== "string"
    || options.length === 0
    || typeof data.comment_disabled !== "boolean"
    || typeof data.duet_disabled !== "boolean"
    || typeof data.stitch_disabled !== "boolean"
    || typeof data.max_video_post_duration_sec !== "number"
    || data.max_video_post_duration_sec <= 0
  ) {
    throw new TikTokPublishingError({ code: "invalid_response", httpStatus: response.status, operation: "creator_info" });
  }

  return {
    flowId: input.flowId,
    creatorUsername: data.creator_username,
    creatorNickname: data.creator_nickname,
    privacyLevelOptions: options,
    commentDisabled: data.comment_disabled,
    duetDisabled: data.duet_disabled,
    stitchDisabled: data.stitch_disabled,
    maxVideoPostDurationSec: data.max_video_post_duration_sec,
    fetchedAt: (input.now ?? new Date()).toISOString(),
  };
}

export async function initializeTikTokVideoPost(input: {
  accessToken: string;
  post: TikTokVideoPostInput;
  idempotencyStore: TikTokInitIdempotencyStore;
  fetchImpl?: FetchLike;
}): Promise<TikTokVideoInitResult> {
  const body = videoInitBody(input.post);
  const fingerprint = tikTokVideoInitFingerprint(input.post);
  const claim = await input.idempotencyStore.claim(input.post.idempotencyKey, fingerprint);
  if (claim.status === "EXISTING") {
    if (claim.record.fingerprint !== fingerprint) {
      throw new Error("TikTok idempotency key was reused for different content");
    }
    if (claim.record.state === "SUCCEEDED" && claim.record.publishId) {
      return {
        publishId: claim.record.publishId,
        uploadUrl: claim.record.uploadUrl ?? null,
        reused: true,
      };
    }
    throw new TikTokPublishingError({
      code: claim.record.state === "AMBIGUOUS" ? "network_ambiguous" : "idempotency_attempt_blocked",
      operation: "video_init",
      classification: {
        category: claim.record.state === "AMBIGUOUS" ? "ambiguous" : "validation",
        retryMode: "new_consent_required",
      },
    });
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(apiUrl(VIDEO_INIT_PATH), {
      method: "POST",
      headers: bearerHeaders(input.accessToken),
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    await input.idempotencyStore.resolve(input.post.idempotencyKey, {
      fingerprint,
      state: "AMBIGUOUS",
      errorCode: "network_ambiguous",
    });
    throw new TikTokPublishingError({ code: "network_ambiguous", operation: "video_init" });
  }

  const payload = await safeJson(response);
  const metadata = errorMetadata(payload);
  if (!response.ok || metadata.code !== "ok") {
    await input.idempotencyStore.resolve(input.post.idempotencyKey, {
      fingerprint,
      state: "REJECTED",
      errorCode: metadata.code,
    });
    throw apiError(payload, response, "video_init");
  }
  if (!isRecord(payload) || !isRecord(payload.data) || typeof payload.data.publish_id !== "string") {
    await input.idempotencyStore.resolve(input.post.idempotencyKey, {
      fingerprint,
      state: "AMBIGUOUS",
      errorCode: "invalid_response",
    });
    throw new TikTokPublishingError({ code: "invalid_response", httpStatus: response.status, operation: "video_init" });
  }

  const uploadUrl = typeof payload.data.upload_url === "string" ? payload.data.upload_url : null;
  await input.idempotencyStore.resolve(input.post.idempotencyKey, {
    fingerprint,
    state: "SUCCEEDED",
    publishId: payload.data.publish_id,
    uploadUrl,
  });
  return { publishId: payload.data.publish_id, uploadUrl, reused: false };
}

export async function fetchTikTokPostStatus(input: {
  accessToken: string;
  publishId: string;
  fetchImpl?: FetchLike;
}): Promise<TikTokPostStatus> {
  if (!input.publishId || input.publishId.length > 64) throw new Error("TikTok publish id is invalid");
  const fetchImpl = input.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(apiUrl(STATUS_PATH), {
      method: "POST",
      headers: bearerHeaders(input.accessToken),
      body: JSON.stringify({ publish_id: input.publishId }),
      cache: "no-store",
    });
  } catch {
    throw new TikTokPublishingError({ code: "network_ambiguous", operation: "status" });
  }

  const payload = await safeJson(response);
  const metadata = errorMetadata(payload);
  if (!response.ok || metadata.code !== "ok") throw apiError(payload, response, "status");
  if (!isRecord(payload) || !isRecord(payload.data)) {
    throw new TikTokPublishingError({ code: "invalid_response", httpStatus: response.status, operation: "status" });
  }
  const data = payload.data;
  const providerStatus = data.status;
  if (!["PROCESSING_UPLOAD", "PROCESSING_DOWNLOAD", "SEND_TO_USER_INBOX", "PUBLISH_COMPLETE", "FAILED"].includes(String(providerStatus))) {
    throw new TikTokPublishingError({ code: "invalid_response", httpStatus: response.status, operation: "status" });
  }
  const typedStatus = providerStatus as TikTokPostStatus["providerStatus"];
  const failReason = typeof data.fail_reason === "string" ? data.fail_reason : null;
  const publicIds = Array.isArray(data.publicaly_available_post_id)
    ? data.publicaly_available_post_id.filter((value) => typeof value === "string" || typeof value === "number").map(String)
    : [];

  return {
    publishId: input.publishId,
    providerStatus: typedStatus,
    state: typedStatus === "FAILED" ? "failed" : typedStatus === "PUBLISH_COMPLETE" ? "complete" : "processing",
    shouldPollAgain: !["FAILED", "PUBLISH_COMPLETE"].includes(typedStatus),
    failReason,
    failure: typedStatus === "FAILED"
      ? classifyTikTokError(failReason ?? "unknown", response.status, "status")
      : null,
    publiclyAvailablePostIds: publicIds,
    uploadedBytes: typeof data.uploaded_bytes === "number" ? data.uploaded_bytes : null,
    downloadedBytes: typeof data.downloaded_bytes === "number" ? data.downloaded_bytes : null,
  };
}
