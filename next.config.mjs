/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // @ffmpeg-installer/ffmpeg uses dynamic require() to locate its
  // platform-specific binary (linux-x64, darwin-arm64, etc). Turbopack
  // can't statically resolve those, so we have to mark it external and
  // let Node resolve it at runtime.
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg'],
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
      // Eval video uploads can reach 500 MB (5+ min 1080p phone video).
      // Default Server Action body limit is ~1 MB; without this raise,
      // submissions fail before the action runs. Mirrors `MAX_BYTES` in
      // app/portal/creator/_actions.ts and the eval-videos bucket
      // file_size_limit.
      bodySizeLimit: '500mb',
    },
  },
}

export default nextConfig
