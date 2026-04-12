import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Resolve a Google Maps short URL to its final URL with coordinates.
 * Google short links (maps.app.goo.gl) use HTTP redirects that may chain
 * through intermediate pages. We follow them manually to capture the final URL.
 */
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

    let currentUrl = url;
    let finalUrl = url;

    // Follow up to 10 redirects manually
    for (let i = 0; i < 10; i++) {
      const res = await fetch(currentUrl, {
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; bot)",
        },
      });

      const location = res.headers.get("location");

      if (location) {
        // Resolve relative redirects
        currentUrl = location.startsWith("http")
          ? location
          : new URL(location, currentUrl).href;
        finalUrl = currentUrl;
        continue;
      }

      // No more HTTP redirects — check the HTML body for meta-refresh or JS redirect
      if (res.status >= 200 && res.status < 400) {
        finalUrl = res.url || currentUrl;
        const body = await res.text();

        // Try to extract coordinates directly from the HTML/JS response
        const coordPatterns = [
          /@(-?\d+\.\d+),(-?\d+\.\d+)/,
          /center=(-?\d+\.\d+),(-?\d+\.\d+)/,
          /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
          /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
          /\[(-?\d+\.\d{4,}),\s*(-?\d+\.\d{4,})\]/,
        ];

        for (const pattern of coordPatterns) {
          const match = body.match(pattern);
          if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
              // Build a clean URL with coordinates
              const resolvedUrl = `https://www.google.com/maps/@${lat},${lng},15z`;
              return new Response(
                JSON.stringify({ finalUrl: resolvedUrl, resolvedUrl }),
                {
                  status: 200,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                },
              );
            }
          }
        }

        // Check for meta-refresh redirect
        const metaMatch = body.match(
          /content=["']\d+;\s*url=([^"']+)["']/i,
        );
        if (metaMatch) {
          currentUrl = metaMatch[1].startsWith("http")
            ? metaMatch[1]
            : new URL(metaMatch[1], currentUrl).href;
          finalUrl = currentUrl;
          continue;
        }

        // Check for JS window.location redirect
        const jsMatch = body.match(
          /window\.location\s*=\s*["']([^"']+)["']/i,
        );
        if (jsMatch) {
          currentUrl = jsMatch[1].startsWith("http")
            ? jsMatch[1]
            : new URL(jsMatch[1], currentUrl).href;
          finalUrl = currentUrl;
          continue;
        }
      }

      break;
    }

    return new Response(
      JSON.stringify({ finalUrl, resolvedUrl: finalUrl }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
