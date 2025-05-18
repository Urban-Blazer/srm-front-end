import { CoinMeta } from "../types";

export const predefinedCoins: CoinMeta[] = [
    {
        symbol: "SUI",
        name: "SUI",
        typeName: "0x2::sui::SUI",
        decimals: 9,
        image: "https://strapi-dev.scand.app/uploads/sui_c07df05f00.png",
    },
    // {
    //     symbol: "USDC",
    //     name: "USDC",
    //     typeName: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    //     decimals: 6,
    //     image: "https://strapi-dev.scand.app/uploads/usdc_019d7ef24b.png",
    // },
    {
        symbol: "SRM",
        name: "SuiRewardsMe",
        typeName: "0xbd2301d12b96dd64b41134168931dd54742c0336bcf1752ed346a177ac00d1ed::SuiRewardsMe::SUIREWARDSME",
        decimals: 9,
        image: "https://bafybeif5r3biiwsylqsjkkwh4yrsbltbeetq5w3snuodcw56b7iaaglxoa.ipfs.w3s.link/logo_blk.png",
    },
    {
        symbol: "WAGMI",
        name: "We All Gonna Make It",
        typeName: "0x1ef589de086af858d0d6bd690b971eb4fdfb658d728d063e4e264a97ea1799f6::wagmi::WAGMI",
        decimals: 6,
        image: "https://api.movepump.com/uploads/joker_4eab65d13d.jpg",
    }
];