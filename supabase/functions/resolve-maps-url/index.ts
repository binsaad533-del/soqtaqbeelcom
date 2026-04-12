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
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[resolve-maps-url] Input URL:", url);

    // Strategy 1: Follow redirects manually to get the final URL
    let resolvedUrl: string | null = null;
    let currentUrl = url;

    for (let i = 0; i < 10; i++) {
      console.log(`[resolve-maps-url] Redirect step ${i}: ${currentUrl}`);
      const res = await fetch(currentUrl, {
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
          Accept: "text/html,application/xhtml+xml,*/*",
        },
      });

      console.log(`[resolve-maps-url] Status: ${res.status}`);
      const location = res.headers.get("location");
      console.log(`[resolve-maps-url] Location header: ${location}`);

      if (location) {
        currentUrl = location.startsWith("http")
          ? location
          : new URL(location, currentUrl).href;
        resolvedUrl = currentUrl;

        // Check if the redirected URL already has coordinates
        const coords = extractCoords(resolvedUrl);
        if (coords) {
          console.log(`[resolve-maps-url] Found coords in redirect: ${coords.lat}, ${coords.lng}`);
          const result = `https://www.google.com/maps/@${coords.lat},${coords.lng},15z`;
          return jsonResponse({ finalUrl: result, resolvedUrl: result });
        }
        continue;
      }

      // No more redirects — read body and look for coordinates
      const body = await res.text();
      console.log(`[resolve-maps-url] Body length: ${body.length}`);

      const coords = extractCoordsFromBody(body);
      if (coords) {
        console.log(`[resolve-maps-url] Found coords in body: ${coords.lat}, ${coords.lng}`);
        const result = `https://www.google.com/maps/@${coords.lat},${coords.lng},15z`;
        return jsonResponse({ finalUrl: result, resolvedUrl: result });
      }

      // Check meta-refresh
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

    // Strategy 2: Try with redirect: "follow" as fallback
    if (!resolvedUrl || resolvedUrl === url) {
      console.log("[resolve-maps-url] Trying redirect:follow fallback");
      const res2 = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
          Accept: "text/html,application/xhtml+xml,*/*",
        },
      });
      const followedUrl = res2.url;
      console.log(`[resolve-maps-url] Followed URL: ${followedUrl}`);

      if (followedUrl !== url) {
        const coords = extractCoords(followedUrl);
        if (coords) {
          const result = `https://www.google.com/maps/@${coords.lat},${coords.lng},15z`;
          return jsonResponse({ finalUrl: result, resolvedUrl: result });
        }
      }

      // Read body of final response
      const body2 = await res2.text();
      const coords = extractCoordsFromBody(body2);
      if (coords) {
        const result = `https://www.google.com/maps/@${coords.lat},${coords.lng},15z`;
        return jsonResponse({ finalUrl: result, resolvedUrl: result });
      }

      resolvedUrl = followedUrl;
    }

    console.log("[resolve-maps-url] Final resolved URL:", resolvedUrl);
    return jsonResponse({ finalUrl: resolvedUrl || url, resolvedUrl: resolvedUrl || url });
  } catch (err) {
    console.error("[resolve-maps-url] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
  // Look for coordinate patterns in HTML/JS body
  const patterns = [
    /@(-?\d+\.\d{4,}),(-?\d+\.\d{4,})/,
    /!3d(-?\d+\.\d{4,})!4d(-?\d+\.\d{4,})/,
    /center[=:]\s*(-?\d+\.\d{4,}),(-?\d+\.\d{4,})/,
    /\[(-?\d+\.\d{4,}),\s*(-?\d+\.\d{4,})\]/,
    /lat['":\s]+(-?\d+\.\d{4,}).*?lng['":\s]+(-?\d+\.\d{4,})/s,
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
