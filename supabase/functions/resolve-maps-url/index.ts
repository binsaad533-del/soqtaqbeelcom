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

    let resolvedUrl: string | null = null;
    let currentUrl = url;

    // Follow up to 10 redirects manually
    for (let i = 0; i < 10; i++) {
      const res = await fetch(currentUrl, {
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
          Accept: "text/html,application/xhtml+xml,*/*",
          "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        },
      });

      const location = res.headers.get("location");

      if (location) {
        currentUrl = location.startsWith("http")
          ? location
          : new URL(location, currentUrl).href;
        resolvedUrl = currentUrl;

        // Check if coordinates are already in the redirect URL
        const coords = extractCoords(resolvedUrl);
        if (coords) {
          const result = `https://www.google.com/maps/@${coords.lat},${coords.lng},15z`;
          return jsonResponse({ finalUrl: result, resolvedUrl: result });
        }
        continue;
      }

      // No redirect header — read body for coordinates or meta-refresh
      const body = await res.text();

      const coords = extractCoordsFromBody(body);
      if (coords) {
        const result = `https://www.google.com/maps/@${coords.lat},${coords.lng},15z`;
        return jsonResponse({ finalUrl: result, resolvedUrl: result });
      }

      // meta-refresh redirect
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

    // Fallback: try redirect:follow
    if (!resolvedUrl || resolvedUrl === url) {
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
      if (followedUrl !== url) {
        const coords = extractCoords(followedUrl);
        if (coords) {
          const result = `https://www.google.com/maps/@${coords.lat},${coords.lng},15z`;
          return jsonResponse({ finalUrl: result, resolvedUrl: result });
        }
      }

      const body2 = await res2.text();
      const coords2 = extractCoordsFromBody(body2);
      if (coords2) {
        const result = `https://www.google.com/maps/@${coords2.lat},${coords2.lng},15z`;
        return jsonResponse({ finalUrl: result, resolvedUrl: result });
      }

      resolvedUrl = followedUrl !== url ? followedUrl : resolvedUrl;
    }

    return jsonResponse({
      finalUrl: resolvedUrl || url,
      resolvedUrl: resolvedUrl || url,
    });
  } catch (err) {
    console.error("[resolve-maps-url] Error:", err);
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
