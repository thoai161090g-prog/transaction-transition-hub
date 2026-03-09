import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_URL = "https://aims-discussions-nottingham-milton.trycloudflare.com/api/txmd5";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

async function fetchWithRetry(url: string, retries: number): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) return res;

      // Don't retry on client errors (4xx)
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`API returned ${res.status}`);
      }

      // Server error (5xx) — retry
      console.warn(`Attempt ${attempt}: API returned ${res.status}, retrying...`);
      await res.text(); // consume body
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Attempt ${attempt} failed: ${err.message}, retrying in ${RETRY_DELAY_MS}ms...`);
    }

    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
  }
  throw new Error(`API unavailable after ${retries} attempts`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const res = await fetchWithRetry(API_URL, MAX_RETRIES);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("LC79 proxy error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
