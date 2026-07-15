// Netlify Function: fetches the Google Sheet CSV and returns it to the browser.
// The actual Google Sheet URL never appears in the frontend — it's stored in an
// environment variable that only the Netlify server can read.
//
// Access control: the function requires a valid Netlify Identity JWT.
// - Requests without a token → 401 Unauthorized
// - Requests with valid Identity token → CSV data returned
//
// Netlify automatically injects the identity context when the request carries
// a valid `Authorization: Bearer <token>` header from netlify-identity-widget.

exports.handler = async (event, context) => {
  // 1. Verify the user is logged in via Netlify Identity
  const { user } = context.clientContext || {};
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized. Please log in." }),
    };
  }

  // 2. Fetch the Google Sheet CSV from the URL stored in env variable
  const sheetUrl = process.env.SHEET_CSV_URL;
  if (!sheetUrl) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "SHEET_CSV_URL environment variable is not configured.",
      }),
    };
  }

  try {
    // Add cache-buster so we always get fresh data from Google
    const url = sheetUrl + (sheetUrl.includes("?") ? "&" : "?") + "_t=" + Date.now();
    const res = await fetch(url);
    if (!res.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: `Upstream fetch failed: HTTP ${res.status}`,
        }),
      };
    }
    const csv = await res.text();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        // Netlify caches responses by default; disable to always get fresh data
        "Cache-Control": "no-store",
      },
      body: csv,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Fetch failed: " + err.message }),
    };
  }
};
