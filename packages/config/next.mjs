// Shared Next.js settings for apps/web and apps/app.

/** Security headers sent on every response. A nonce-based CSP follows with auth in phase 3. */
export const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/** @param {import("next").NextConfig} config */
export function withHelvax(config = {}) {
  return {
    reactStrictMode: true,
    poweredByHeader: false,
    transpilePackages: ["@helvax/ui"],
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders }];
    },
    ...config,
  };
}
