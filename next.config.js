/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: [
            "strapi-dev.scand.app",
            "via.placeholder.com",
            "bafybeif5r3biiwsylqsjkkwh4yrsbltbeetq5w3snuodcw56b7iaaglxoa.ipfs.w3s.link",],
    },
    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/,
            use: ["@svgr/webpack"],
        });

        return config;
    },
};

module.exports = nextConfig;