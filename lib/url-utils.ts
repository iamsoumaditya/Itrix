/**
 * URL normalization utility to ensure identical URLs are treated as duplicates.
 */
export function normalizeUrl(inputUrl: string): string {
  if (!inputUrl) return "";
  let trimmed = inputUrl.trim();

  const lower = trimmed.toLowerCase();
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const urlObj = new URL(trimmed);

    // 1. Lowercase hostname & protocol
    urlObj.protocol = urlObj.protocol.toLowerCase();
    urlObj.hostname = urlObj.hostname.toLowerCase();

    // 2. Strip hash fragment
    urlObj.hash = "";

    // 3. Filter tracking query parameters
    const trackingParams = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "fbclid",
      "gclid",
      "_ga",
      "s_kwcid",
      "mc_cid",
      "mc_eid",
    ]);

    const paramsToDelete: string[] = [];
    urlObj.searchParams.forEach((_, key) => {
      if (trackingParams.has(key.toLowerCase())) {
        paramsToDelete.push(key);
      }
    });
    paramsToDelete.forEach((key) => urlObj.searchParams.delete(key));

    // Sort remaining query params for consistent output
    urlObj.searchParams.sort();

    let result = urlObj.toString();

    // 4. Strip trailing slash if pathname ends with '/' (unless root domain '/')
    if (result.endsWith("/") && urlObj.pathname !== "/") {
      result = result.slice(0, -1);
    }

    return result;
  } catch {
    return trimmed.toLowerCase();
  }
}

/**
 * Checks basic robots.txt disallow rules for a target URL.
 */
export async function checkRobotsAllowed(targetUrl: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const urlObj = new URL(targetUrl);
    const robotsUrl = `${urlObj.origin}/robots.txt`;

    const res = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(4000), // 4 second timeout for robots.txt
      headers: {
        "User-Agent": "SupportTicketTriageBot/1.0",
      },
    });

    if (!res.ok) {
      // If robots.txt returns 404 or 500, default to allowed
      return { allowed: true };
    }

    const robotsText = await res.text();
    const pathname = urlObj.pathname;

    // Simple robots.txt line parsing for Disallow: /path
    const lines = robotsText.split("\n");
    let isGlobalUserAgent = true;

    for (const rawLine of lines) {
      const line = rawLine.trim().toLowerCase();
      if (line.startsWith("user-agent:")) {
        const ua = line.replace("user-agent:", "").trim();
        isGlobalUserAgent = ua === "*" || ua.includes("bot");
      } else if (isGlobalUserAgent && line.startsWith("disallow:")) {
        const path = line.replace("disallow:", "").trim();
        if (path && path !== "" && pathname.startsWith(path)) {
          return {
            allowed: false,
            reason: `Disallowed by rule: Disallow ${path}`,
          };
        }
      }
    }

    return { allowed: true };
  } catch {
    // If fetching robots.txt times out or network fails, proceed with crawl
    return { allowed: true };
  }
}
