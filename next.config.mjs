/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // react-pdf sunucu tarafında Node paketi olarak çalışmalı
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
    // PDF yazı tipleri sunucu fonksiyonuna dahil edilsin
    outputFileTracingIncludes: { "/api/pdf/**": ["./src/assets/fonts/**"] },
  },
};

export default nextConfig;
