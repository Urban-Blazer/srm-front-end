/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: [
            "suirewardsme.staxenterprise.tech",
            "circle.com",
            "api.suiai.fun",
            "strapi-dev.scand.app",
            "api.movepump.com",
            "via.placeholder.com",
            "bafybeif5r3biiwsylqsjkkwh4yrsbltbeetq5w3snuodcw56b7iaaglxoa.ipfs.w3s.link",
        ],
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