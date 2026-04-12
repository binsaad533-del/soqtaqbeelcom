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

    // Follow redirects manually to handle Google's multiple redirects
    let currentUrl = url;
    let finalUrl = url;
    
    for (let i = 0; i < 10; i++) {
      const res = await fetch(currentUrl, { redirect: "manual" });
      const location = res.headers.get("location");
      
      if (location) {
        currentUrl = location;
        finalUrl = location;
      } else {
        // No more redirects — check the response body for meta refresh or JS redirect
        const body = await res.text();
        
        // Look for coordinates in the final URL
        const coordMatch = finalUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (coordMatch) break;
        
        // Look for coordinates in response body
        const bodyCoordMatch = body.match(/center=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/);
        if (bodyCoordMatch) {
          finalUrl = `https://www.google.com/maps/@${bodyCoordMatch[1]},${bodyCoordMatch[2]},15z`;
          break;
        }
        
        // Look for ll= parameter
        const llMatch = body.match(/ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (llMatch) {
          finalUrl = `https://www.google.com/maps/@${llMatch[1]},${llMatch[2]},15z`;
          break;
        }

        // Look for data in URL-like patterns in the body
        const dataMatch = body.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (dataMatch) {
          finalUrl = `https://www.google.com/maps/@${dataMatch[1]},${dataMatch[2]},15z`;
          break;
        }
        
        break;
      }
    }

    return new Response(JSON.stringify({ finalUrl, resolvedUrl: finalUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
