# InsightBoard V2 — .ME custom-domain setup

This guide replaces the earlier .TECH domain plan. Use the .ME domain you already purchased.

## Current V2 host

Use the existing Render V2 service:
- Website: https://insightboard-v2-bsiu.onrender.com
- Render settings: https://dashboard.render.com/web/srv-dbb0tve7bikc73baq6m0
- GitHub branch: `feature/insightboard-v2.0.1.1`

Do not change the production Vercel domain or merge anything into GitHub `main`.

## Connect the purchased .ME domain

The exact registered domain must be entered in place of `your-domain.me` below. DNS records cannot safely be finalized from the extension alone.

1. Sign in to the registrar where you purchased the .ME domain and open its DNS management page. Keep the registrar account and domain active.
2. Open the Render service settings above. Go to **Settings → Custom Domains → Add Custom Domain** and enter the exact .ME domain, for example `your-domain.me`. Add `www.your-domain.me` too only if you want the www address.
3. Render will display the DNS records required for that domain. Copy the values exactly into your registrar's DNS settings. Do not rely on an A-record IP or CNAME target from an old guide; use the records displayed by this Render service.
4. Remove or edit only records that conflict with the hostname being connected. Do not delete unrelated MX or TXT records used for email or domain verification.
5. Return to Render and wait for DNS verification and HTTPS certificate provisioning to complete.
6. Test the exact domain in a browser. Also visit `https://your-domain.me/api/health`; a healthy API should report status `ok` and database `true`.
7. If you add both apex and www hostnames, choose which one will be your public canonical address and verify both resolve as expected.

## Important

- This custom domain should be attached to the V2 Render service above, not Vercel.
- The existing `onrender.com` URL should continue to be available.
- Custom-domain DNS changes happen in Render and at your domain registrar; this documentation change alone does not connect the domain.
- Render automatic deploys are disabled for this service. Editing DNS does not require a code deploy.
- Never share registrar passwords or account recovery codes in chat.

