/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    images: {
        unoptimized: true,
    },
    trailingSlash: true,
    distDir: process.env.NODE_ENV === 'production' ? '../app' : '.next',
};

module.exports = nextConfig;
