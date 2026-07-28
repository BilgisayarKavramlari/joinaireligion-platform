export const INDEXNOW_KEY = "a7b0c8281b76042cee20e19e3dbeb629";

const SITE_HOST = "joinaireligion.com";
const SITE_URL = `https://${SITE_HOST}`;
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export type IndexNowResult = {
  submitted: number;
  accepted: boolean;
  status: number | null;
};

export async function submitIndexNowUrls(urls: string[]): Promise<IndexNowResult> {
  const validUrls = [...new Set(urls)].filter((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === SITE_HOST;
    } catch {
      return false;
    }
  }).slice(0, 10_000);

  if (validUrls.length === 0) return { submitted: 0, accepted: false, status: null };

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: SITE_HOST,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: validUrls,
    }),
    signal: AbortSignal.timeout(8_000),
  });

  return {
    submitted: validUrls.length,
    accepted: response.status === 200 || response.status === 202,
    status: response.status,
  };
}

