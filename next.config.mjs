/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      // Platform lives on app.trygiftly.com (via proxy.ts rewrite into
      // /platform/*). The marketing site lives on trygiftly.com. Both origins
      // must be trusted so Server Action POSTs pass Next.js's origin check.
      allowedOrigins: [
        'trygiftly.com',
        'www.trygiftly.com',
        'app.trygiftly.com',
      ],
    },
  },
}

export default nextConfig
