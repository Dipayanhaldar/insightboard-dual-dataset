# InsightBoard V2 — .TECH domain claim and Render connection

Use this guide after the V2 application is running. The domain is **not registered or connected yet**; these steps are for you to complete. The GitHub Student Developer Pack currently lists one standard .TECH domain free for one year, subject to offer terms and checkout eligibility.

## Part A — Claim the student offer

1. Open the [GitHub Student Developer Pack](https://education.github.com/pack/) and sign in with the GitHub account that has student verification.
2. Open the [.TECH Student Pack offer](https://get.tech/github-student-developer-pack). Follow its current checkout flow; the offer page says to search for a domain, add it to the cart, and verify your GitHub account at checkout.
3. Search for the brand name you want. For example, you could try `insightboard.tech`, but availability is not guaranteed. Pick an available name you own and can renew.
4. At checkout, confirm the student offer is applied and the standard one-year registration total is zero before confirming. Avoid paid upgrades or add-ons unless you intentionally want them.
5. Save the registrar account details and renewal date securely. Check the displayed renewal price and auto-renew settings; the student offer covers the initial eligible year, not necessarily future renewals.

Official offer: https://get.tech/github-student-developer-pack  
GitHub Pack: https://education.github.com/pack/

## Part B — Attach the domain to the V2 Render service

Use the V2 service whose database connection has been verified: `insightboard-v2-bsiu` at https://insightboard-v2-bsiu.onrender.com. Keep the `onrender.com` address enabled while testing.

1. Open the [Render dashboard](https://dashboard.render.com/) and select `insightboard-v2-bsiu`.
2. Open **Settings → Custom Domains → Add Custom Domain**.
3. Enter the exact domain you registered, such as `insightboard.tech`, and save. Add the `www` version too if you want it. Render's UI may add or redirect the paired root/www name automatically.
4. Render will show the DNS records required for that service. Keep that page open; use its displayed values rather than guessing the target.

## Part C — Add the DNS records at the .TECH registrar

1. Sign in to the registrar account where you registered the domain and open DNS management (often called **DNS**, **DNS Records**, or **Manage DNS**).
2. Add or edit only the records needed for the new Render connection. Commonly the root domain uses an `A` record for host `@` pointing to `216.24.57.1`, and `www` uses a `CNAME` pointing to `insightboard-v2-bsiu.onrender.com`. **Use the exact values shown in your Render dashboard if they differ.**
3. Remove conflicting `AAAA` records for the domain while setting this up; Render's custom-domain guidance warns that IPv6 `AAAA` records can interfere.
4. Do not delete unrelated `MX`, `TXT`, or email-verification records. The .TECH offer may include email benefits; those records should only be changed if the email provider specifically instructs you to.
5. Save DNS changes and allow time for propagation.

Reference: [Render custom domains](https://render.com/docs/custom-domains) · [Other DNS providers](https://render.com/docs/configure-other-dns)

## Part D — Verify HTTPS and the app

1. Return to Render → **Settings → Custom Domains** and click **Verify** for the domain. Retry after a few minutes if DNS is still propagating.
2. Wait for Render to issue the TLS certificate, then open `https://your-domain.tech` (replace with your actual registered domain).
3. Test `https://your-domain.tech/api/health`. Expected JSON includes `"status":"ok"` and `"database":true`.
4. Test account registration/sign-in and save a sample aggregate report. Confirm the report appears in account history.
5. After adding `GEMINI_API_KEY` to the V2 Render service's Environment settings, open `https://your-domain.tech/api/ai/status`. It should show `"available":true`. Generate one test AI summary and check your Gemini usage/quota.

## Critical guardrails

- Do not attach this domain to Vercel unless you deliberately decide that later. For now, point it only to the V2 Render service.
- Do not change the current production domain's DNS records and do not merge this feature branch into GitHub `main` as part of this task.
- Never commit the Gemini API key, MongoDB URI, or JWT secret.
- A domain name does not improve backend availability; Render's free web service can still sleep during inactivity.
