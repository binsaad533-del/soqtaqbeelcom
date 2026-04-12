import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return jsonResponse({ error: "Missing url" }, 400);
    }

    const debug: string[] = [];
    debug.push(`input: ${url}`);

    let resolvedUrl: string | null = null;
    let currentUrl = url;

    // Step 1: Follow redirects manually
    for (let i = 0; i < 10; i++) {
      debug.push(`step ${i}: fetching ${currentUrl}`);
      const res = await fetch(currentUrl, {
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
          Accept: "text/html,application/xhtml+xml,*/*",
          "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        },
      });

      debug.push(`status: ${res.status}`);
      const location = res.headers.get("location");
      debug.push(`location: ${location || "none"}`);

      if (location) {
        currentUrl = location.startsWith("http")
          ? location
          : new URL(location, currentUrl).href;
        resolvedUrl = currentUrl;

        const coords = extractCoords(resolvedUrl);
        if (coords) {
          const result = `https://www.google.com/maps/@${coords.lat},${coords.lng},15z`;
          return jsonResponse({ finalUrl: result, resolvedUrl: result, debug });
        }
        continue;
      }

      // Read body for coordinates
      const body = await res.text();
      debug.push(`body length: ${body.length}`);
      debug.push(`body preview: ${body.substring(0, 500)}`);

      const coords = extractCoordsFromBody(body);
      if (coords) {
        const result = `https://www.google.com/maps/@${coords.lat},${coords.lng},15z`;
        return jsonResponse({ finalUrl: result, resolvedUrl: result, debug });
      }

      // meta-refresh
      const metaMatch = body.match(/content=["']\d+;\s*url=([^"']+)["']/i);
      if (metaMatch) {
        currentUrl = metaMatch[1].startsWith("http")
          ? metaMatch[1]
          : new URL(metaMatch[1], currentUrl).href;
        resolvedUrl = currentUrl;
        continue;
      }

      break;
    }

    // Step 2: Try redirect:follow
    debug.push("trying redirect:follow");
    const res2 = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const followedUrl = res2.url;
    debug.push(`followed to: ${followedUrl}`);

    if (followedUrl !== url) {
      const coords = extractCoords(followedUrl);
      if (coords) {
        const result = `https://www.google.com/maps/@${coords.lat},${coords.lng},15z`;
        return jsonResponse({ finalUrl: result, resolvedUrl: result, debug });
      }
    }

    const body2 = await res2.text();
    debug.push(`follow body length: ${body2.length}`);
    debug.push(`follow body preview: ${body2.substring(0, 500)}`);

    const coords2 = extractCoordsFromBody(body2);
    if (coords2) {
      const result = `https://www.google.com/maps/@${coords2.lat},${coords2.lng},15z`;
      return jsonResponse({ finalUrl: result, resolvedUrl: result, debug });
    }

    resolvedUrl = followedUrl !== url ? followedUrl : resolvedUrl;
    return jsonResponse({
      finalUrl: resolvedUrl || url,
      resolvedUrl: resolvedUrl || url,
      debug,
    });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});

function extractCoords(urlStr: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /center=(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const p of patterns) {
    const m = urlStr.match(p);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}

function extractCoordsFromBody(body: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d{4,}),(-?\d+\.\d{4,})/,
    /!3d(-?\d+\.\d{4,})!4d(-?\d+\.\d{4,})/,
    /center[=:]\s*(-?\d+\.\d{4,}),\s*(-?\d+\.\d{4,})/,
    /\[(-?\d+\.\d{4,}),\s*(-?\d+\.\d{4,})\]/,
  ];
  for (const p of patterns) {
    const m = body.match(p);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
