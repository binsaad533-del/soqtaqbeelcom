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

    console.log("[resolve-maps-url] Input:", url);

    // Strategy 1: Follow redirects automatically, then parse the final URL
    let finalUrl = url;
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent": "curl/8.0",
          "Accept": "*/*",
        },
      });
      finalUrl = res.url;
      console.log("[resolve-maps-url] Followed to:", finalUrl);

      // If final URL has coords, use them
      const urlCoords = extractCoordsFromUrl(finalUrl);
      if (urlCoords) {
        console.log("[resolve-maps-url] Coords from URL:", urlCoords);
        const result = `https://www.google.com/maps/@${urlCoords.lat},${urlCoords.lng},15z`;
        return new Response(JSON.stringify({ finalUrl: result, resolvedUrl: result }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Parse body for coords
      const body = await res.text();
      const bodyCoords = extractCoordsFromBody(body);
      if (bodyCoords) {
        console.log("[resolve-maps-url] Coords from body:", bodyCoords);
        const result = `https://www.google.com/maps/@${bodyCoords.lat},${bodyCoords.lng},15z`;
        return new Response(JSON.stringify({ finalUrl: result, resolvedUrl: result }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.log("[resolve-maps-url] Follow failed:", e);
    }

    // Strategy 2: Manual redirect following with HEAD requests
    let currentUrl = url;
    for (let i = 0; i < 15; i++) {
      try {
        const res = await fetch(currentUrl, {
          method: "HEAD",
          redirect: "manual",
          headers: { "User-Agent": "curl/8.0" },
        });
        const location = res.headers.get("location");
        if (location) {
          currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).href;
          finalUrl = currentUrl;
          console.log("[resolve-maps-url] Redirect ->", currentUrl);
          
          const coords = extractCoordsFromUrl(currentUrl);
          if (coords) {
            const result = `https://www.google.com/maps/@${coords.lat},${coords.lng},15z`;
            return new Response(JSON.stringify({ finalUrl: result, resolvedUrl: result }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          continue;
        }
        break;
      } catch {
        break;
      }
    }

    // Strategy 3: GET with manual redirect
    currentUrl = url;
    for (let i = 0; i < 15; i++) {
      try {
        const res = await fetch(currentUrl, {
          redirect: "manual",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          },
        });
        const location = res.headers.get("location");
        if (location) {
          currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).href;
          finalUrl = currentUrl;
          await res.text().catch(() => {});
          
          const coords = extractCoordsFromUrl(currentUrl);
          if (coords) {
            const result = `https://www.google.com/maps/@${coords.lat},${coords.lng},15z`;
            return new Response(JSON.stringify({ finalUrl: result, resolvedUrl: result }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          continue;
        }
        
        const body = await res.text();
        const bodyCoords = extractCoordsFromBody(body);
        if (bodyCoords) {
          const result = `https://www.google.com/maps/@${bodyCoords.lat},${bodyCoords.lng},15z`;
          return new Response(JSON.stringify({ finalUrl: result, resolvedUrl: result }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        break;
      } catch {
        break;
      }
    }

    console.log("[resolve-maps-url] Final (no coords found):", finalUrl);
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
  // /search/LAT,+LNG or /search/LAT,LNG  
  const searchMatch = url.match(/\/search\/(-?\d+\.?\d*)[,+%2C]\s*\+?(-?\d+\.?\d*)/);
  if (searchMatch) {
    const c = { lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) };
    if (c.lat >= -90 && c.lat <= 90 && c.lng >= -180 && c.lng <= 180) return c;
  }

  // @LAT,LNG
  const atMatch = url.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  // ?q=LAT,LNG
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d+)[,+%2C](-?\d+\.?\d+)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }

  // ll=LAT,LNG
  const llMatch = url.match(/ll=(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (llMatch) {
    return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
  }

  // !3dLAT!4dLNG
  const bangMatch = url.match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
  if (bangMatch) {
    return { lat: parseFloat(bangMatch[1]), lng: parseFloat(bangMatch[2]) };
  }

  return null;
}

/** Extract coordinates from HTML body */
function extractCoordsFromBody(body: string): { lat: number; lng: number } | null {
  const patterns = [
    /\/search\/(-?\d+\.?\d*)[,+%2C]\s*\+?(-?\d+\.?\d*)/,
    /center=(-?\d+\.?\d+)%2C(-?\d+\.?\d+)/,
    /ll=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /[?&]q=(-?\d+\.?\d+)[,%2C+](-?\d+\.?\d+)/,
    /!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/,
  ];

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
