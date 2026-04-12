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

    // Step 1: Follow redirects with a browser-like User-Agent
    let currentUrl = url;
    let finalUrl = url;
    const redirectChain: string[] = [url];

    for (let i = 0; i < 15; i++) {
      const res = await fetch(currentUrl, {
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ar,en;q=0.9",
        },
      });

      const location = res.headers.get("location");
      if (location) {
        // Resolve relative URLs
        currentUrl = location.startsWith("http")
          ? location
          : new URL(location, currentUrl).href;
        finalUrl = currentUrl;
        redirectChain.push(currentUrl);
        // Consume body to avoid resource leak
        await res.text().catch(() => {});
        continue;
      }

      // No more redirects — parse body for coords
      const body = await res.text();

      // Try extracting coords from the final redirected URL first
      const urlCoords = extractCoordsFromUrl(finalUrl);
      if (urlCoords) {
        console.log("[resolve-maps-url] Found coords in redirect URL:", urlCoords);
        finalUrl = `https://www.google.com/maps/@${urlCoords.lat},${urlCoords.lng},15z`;
        break;
      }

      // Try extracting from the HTML body
      const bodyCoords = extractCoordsFromBody(body);
      if (bodyCoords) {
        console.log("[resolve-maps-url] Found coords in body:", bodyCoords);
        finalUrl = `https://www.google.com/maps/@${bodyCoords.lat},${bodyCoords.lng},15z`;
        break;
      }

      break;
    }

    console.log("[resolve-maps-url] Redirect chain:", redirectChain);
    console.log("[resolve-maps-url] Final URL:", finalUrl);

    return new Response(JSON.stringify({ finalUrl, resolvedUrl: finalUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[resolve-maps-url] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Extract coordinates from a Google Maps URL */
function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  // Pattern: @LAT,LNG
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const coords = { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    if (isValidSaudiCoords(coords.lat, coords.lng)) return coords;
  }

  // Pattern: ?q=LAT,LNG or &q=LAT,LNG
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+)[,+](-?\d+\.\d+)/);
  if (qMatch) {
    const coords = { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    if (isValidSaudiCoords(coords.lat, coords.lng)) return coords;
  }

  // Pattern: /search/LAT,+LNG or /search/LAT,LNG
  const searchMatch = url.match(/\/search\/(-?\d+\.\d+)[,+]\s*(-?\d+\.\d+)/);
  if (searchMatch) {
    const coords = { lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) };
    if (isValidSaudiCoords(coords.lat, coords.lng)) return coords;
  }

  // Pattern: ll=LAT,LNG
  const llMatch = url.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (llMatch) {
    const coords = { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
    if (isValidSaudiCoords(coords.lat, coords.lng)) return coords;
  }

  // Pattern: !3dLAT!4dLNG (Google internal data param)
  const bangMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bangMatch) {
    const coords = { lat: parseFloat(bangMatch[1]), lng: parseFloat(bangMatch[2]) };
    if (isValidSaudiCoords(coords.lat, coords.lng)) return coords;
  }

  // Fallback: try any @LAT,LNG without Saudi validation
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  if (searchMatch) return { lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) };

  return null;
}

/** Extract coordinates from HTML body — more careful to avoid random numbers */
function extractCoordsFromBody(body: string): { lat: number; lng: number } | null {
  // Look for explicit coordinate patterns in structured data or URLs within body
  const patterns = [
    // center=LAT%2CLNG (URL-encoded comma)
    /center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/,
    // ll=LAT,LNG
    /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    // @LAT,LNG in a maps URL context
    /maps\.google\.[^"]*@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /google\.[^"]*\/maps[^"]*@(-?\d+\.\d+),(-?\d+\.\d+)/,
    // ?q=LAT,LNG or search/LAT,LNG
    /[?&]q=(-?\d+\.\d+)[,%2C+](-?\d+\.\d+)/,
    /\/search\/(-?\d+\.\d+)[,+]\s*(-?\d+\.\d+)/,
    // !3dLAT!4dLNG
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      // Prefer Saudi/MENA region coords, but accept any valid coords
      if (isValidSaudiCoords(lat, lng)) return { lat, lng };
    }
  }

  // Second pass: accept coords outside Saudi region as fallback
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }

  return null;
}

/** Check if coordinates are within Saudi Arabia / nearby MENA region */
function isValidSaudiCoords(lat: number, lng: number): boolean {
  // Saudi Arabia approximate bounds (with generous padding)
  return lat >= 15 && lat <= 33 && lng >= 34 && lng <= 56;
}
