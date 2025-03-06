/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: [
            "strapi-dev.scand.app",
            "via.placeholder.com",], // ✅ Allow external images from this domain
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