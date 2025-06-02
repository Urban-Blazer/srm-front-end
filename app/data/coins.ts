import { CoinMeta } from "../types";

export const whitelistedCoins = ["0x2::sui::SUI"];

export const predefinedCoins: CoinMeta[] = [
  {
    symbol: "SUI",
    name: "SUI",
    typeName: "0x2::sui::SUI",
    decimals: 9,
    image: "https://strapi-dev.scand.app/uploads/sui_c07df05f00.png",
    lists: ["strict", "all"]
  },
  {
    symbol: "USDC",
    name: "USDC",
    typeName:
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    decimals: 6,
    image: "https://strapi-dev.scand.app/uploads/usdc_019d7ef24b.png",
    lists: ["strict", "all"]
  },
  {
    symbol: "SRM",
    name: "SuiRewardsMe",
    typeName:
      "0xbd2301d12b96dd64b41134168931dd54742c0336bcf1752ed346a177ac00d1ed::SuiRewardsMe::SUIREWARDSME",
    decimals: 9,
    image:
      "https://bafybeif5r3biiwsylqsjkkwh4yrsbltbeetq5w3snuodcw56b7iaaglxoa.ipfs.w3s.link/logo_blk.png",
    lists: ["memecoin", "all"]
  },
  {
    symbol: "WAGMI",
    name: "We All Gonna Make It",
    typeName:
      "0x1ef589de086af858d0d6bd690b971eb4fdfb658d728d063e4e264a97ea1799f6::wagmi::WAGMI",
    decimals: 6,
    image: "https://api.movepump.com/uploads/joker_4eab65d13d.jpg",
    lists: ["memecoin", "all"]
  },
  {
    symbol: "VTMT",
    name: "Vitalment",
    typeName:
      "0xb8618876c6e7ccf7bd4a72a2d58082220a3a273dcbde8b78a78f997a42724e47::vtmt::VTMT",
    decimals: 9,
    image: "https://blob.suiget.xyz/uploads/vtmt.jpeg",
    lists: ["memecoin", "all"]
  },
  {
    symbol: "TKI",
    name: "Tokifi",
    typeName:
      "0x983fe8c1ced6003c42908a2942c63dd5e42f001c0a58717666a5bbffef469a54::tki::TKI",
    decimals: 9,
    image: "https://blob.suiget.xyz/uploads/img_67c8c261609fe6.63620796.jpeg",
    lists: ["memecoin", "all"]
  },
];
