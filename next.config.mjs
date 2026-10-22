/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type errors now fail the build (the original config silenced them).
  images: {
    unoptimized: true,
  },
}

export default nextConfig
