/**
 * Cloudflare Worker — Supabase Proxy
 *
 * Forwards all requests to your Supabase project, bypassing
 * ISP DNS blocking in India. Your app talks to this Worker URL
 * instead of Supabase directly — everything else stays the same.
 */

const SUPABASE_URL = "https://iienbeqsktevnxwycpnj.supabase.co";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, apikey, x-client-info, x-supabase-api-version",
        },
      });
    }

    // Build the Supabase destination URL
    const supabaseUrl = new URL(url.pathname + url.search, SUPABASE_URL);

    // Copy headers but remove 'host' — let Cloudflare set it correctly for Supabase
    const newHeaders = new Headers();
    for (const [key, value] of request.headers.entries()) {
      if (key.toLowerCase() === 'host') continue; // skip host header
      newHeaders.set(key, value);
    }

    // Forward the request to Supabase
    const proxiedRequest = new Request(supabaseUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
      redirect: "follow",
    });

    // Get response from Supabase
    const response = await fetch(proxiedRequest);

    // Return response with CORS headers added
    const modifiedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    modifiedResponse.headers.set("Access-Control-Allow-Origin", "*");
    modifiedResponse.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    modifiedResponse.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, apikey, x-client-info, x-supabase-api-version"
    );

    return modifiedResponse;
  },
};
