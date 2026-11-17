// Share target fallback. Normally the service worker answers this POST in the browser
// (src/sw/sw.ts); this runs only when it is not active yet. The body is never read,
// so shared photos are dropped instead of being processed here.

function toReportForm(): Response {
  // Relative Location: request.url behind Cloud Run is the container address
  return new Response(null, { status: 303, headers: { Location: "/nahlasit" } });
}

export const GET = toReportForm;
export const POST = toReportForm;
