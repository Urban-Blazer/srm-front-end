import { CoinMeta } from "../types";

export const whitelistedCoins = ["0x2::sui::SUI"];

export const predefinedCoins: CoinMeta[] = [
  {
    symbol: "SUI",
    name: "SUI",
    typeName: "0x2::sui::SUI",
    decimals: 9,
    image: "https://strapi-dev.scand.app/uploads/sui_c07df05f00.png",
    lists: ["strict", "all"],
  },
  {
    symbol: "USDC",
    name: "USDC",
    typeName:
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    decimals: 6,
    image: "https://strapi-dev.scand.app/uploads/usdc_019d7ef24b.png",
    lists: ["strict", "all"],
  },
  {
    symbol: "SRM",
    name: "SuiRewardsMe",
    typeName:
      "0xbd2301d12b96dd64b41134168931dd54742c0336bcf1752ed346a177ac00d1ed::SuiRewardsMe::SUIREWARDSME",
    decimals: 9,
    image:
      "https://bafybeif5r3biiwsylqsjkkwh4yrsbltbeetq5w3snuodcw56b7iaaglxoa.ipfs.w3s.link/logo_blk.png",
    lists: ["strict", "all"],
    socials: {
      telegram: "https://t.me/suirewards",
      x: "https://x.com/SuiRewardsMe",
      discord: "https://discord.gg/suirewardsme",
      website: "https://suirewards.me",
    },
  },
  {
    symbol: "WAGMI",
    name: "We All Gonna Make It",
    typeName:
      "0x1ef589de086af858d0d6bd690b971eb4fdfb658d728d063e4e264a97ea1799f6::wagmi::WAGMI",
    decimals: 6,
    image: "https://api.movepump.com/uploads/joker_4eab65d13d.jpg",
    lists: ["memecoin", "all"],
    socials: {
      telegram: "https://t.co/w6Hb5Z1yaH",
      x: "https://x.com/WagmiSui_",
      website: "https://www.wagmisui.com/",
    },
  },
  {
    symbol: "VTMT",
    name: "Vitalment",
    typeName:
      "0xb8618876c6e7ccf7bd4a72a2d58082220a3a273dcbde8b78a78f997a42724e47::vtmt::VTMT",
    decimals: 9,
    image: "https://blob.suiget.xyz/uploads/vtmt.jpeg",
    lists: ["memecoin", "all"],
  },
  {
    symbol: "TKI",
    name: "Tokifi",
    typeName:
      "0x983fe8c1ced6003c42908a2942c63dd5e42f001c0a58717666a5bbffef469a54::tki::TKI",
    decimals: 9,
    image: "https://blob.suiget.xyz/uploads/img_67c8c261609fe6.63620796.jpeg",
    lists: ["memecoin", "all"],
    socials: {
      telegram: "https://t.me/+2g_zdkkymvE5YzUx",
      x: "https://x.com/TokifiOnSUI",
      discord: "https://discord.gg/QyVeUDtK",
      website: "https://tokifitoken.com/",
    },
  },
  {
    symbol: "CFUT",
    name: "Captain Futurus Utility Token",
    typeName:
      "0xa543c3268b80c5c27ba705fdb99d01d737aafbf6205ffbef2994bd284b39d90b::CAPTAINFUTURUS::CAPTAINFUTURUS",
    decimals: 9,
    image:
      "https://bafkreibzzntijz75cgaovybqiygjcsxmsv7afat5nm7ijgjuhp2tos6vka.ipfs.w3s.link",
    lists: ["all"],
    socials: {
      telegram: "https://t.me/+n8Lkccxhz-NkZDU0",
      x: "https://x.com/FuturusDaoLtd",
      website: "https://linktr.ee/futurusdao",
      discord: null,
    },
  },
  {
    symbol: "PWC",
    name: "pepe wif cig",
    typeName:
      "0xe230fe98c6f0c45b6279b2113c435e9bca4a3482edd9cc8e9e9fe93f91fafd3d::pwc::PWC",
    decimals: 9,
    image:
      "https://pump.mypinata.cloud/ipfs/QmWVWBFBkVqXXwNyEjnpHek7BM1mgGkkPiFWbin6Ypvmei",
    lists: ["all"],
  },
  {
    symbol: "GABE",
    name: "Gabeonsui",
    typeName:
      "0x13cda3fa8bf4d4dbe2c87763e65c0638855b90dd2a9759be4dece8a69fb56f7b::gabe::GABE",
    decimals: 6,
    image:
      "https://ipfs.io/ipfs/bafkreifmaamm73hb3q5oyoqkw3f4lxo7gms3tclv3omliy422n5g4yslgu",
    lists: ["all"],
  },
  {
    symbol: "KODUCK",
    name: "Koduck On Sui",
    typeName:
      "0x6fee0f4d3e36392531550e1afd2bd879b1326959b2d4870eb7ccea9c69bc144f::koduck::KODUCK",
    decimals: 6,
    image: "https://api.movepump.com/uploads/Generated_Image_2_b54fcbb191.png",
    lists: ["all"],
    socials: {
      telegram: "https://t.me/+v19NyscXdOUwNDZl",
      x: "https://x.com/koducktheduck",
      website: "https://koduck.org/",
    },
  },
  {
    symbol: "OTC",
    name: "Over the Counter",
    typeName:
      "0xa9a4c699ea65b677b2eed8662ae4799676b93490584dbfa920cebe35ebf61059::otc::OTC",
    decimals: 9,
    image: "https://blob.suiget.xyz/uploads/img_6847068f39b5b7.67680672.png",
    lists: ["all"],
    socials: {
      x: "https://x.com/otc_onchain",
      telegram: "https://t.co/MsvLSC1Y25",
      website: "https://www.otconchain.info/",
    },
  },
  {
    symbol: "SUITRUMP",
    name: "SUI TRUMP",
    typeName:
      "0xdeb831e796f16f8257681c0d5d4108fa94333060300b2459133a96631bf470b8::suitrump::SUITRUMP",
    decimals: 6,
    image:
      "https://api.movepump.com/uploads/4fa877d1_e15e_4725_bf83_af59ecf40afa_503e5cc707.jpeg",
    lists: ["all"],
    socials: {
      x: "https://x.com/SUITRUMPCOIN",
      telegram: "https://t.me/suitrumpmeme",
      website: "https://t.co/5cmyWEuWnO",
    },
  },
  {
    symbol: "SEP",
    name: "Sui Eater Protocol",
    typeName:
      "0xe82075a4f218209bd56c4ad0ed35dd4de7b73c803340d97750ace7b832fd3f3b::SEP::SEP",
    decimals: 9,
    image:
      "https://suirewards.me/coinphp/uploads/img_6850b08f4977b1.38717211.png",
    lists: ["all"],
    socials: {
      telegram: "https://t.me/+8xppPdpiTOhkMGQx",
      x: "https://x.com/suieaterrewards?s=21",
      discord: null,
    },
  },
  {
    symbol: "WET",
    name: "WET - A Liquid Meme moving Through SUI",
    typeName:
      "0x150a3765f43bee5e67f8faa04ad8802aab8fe8656d270198b55f825d4816cffe::wet::WET",
    decimals: 6,
    image:
      "https://ipfs.io/ipfs/bafkreibh5552nkf45sokiolhh2hshecrteie6njglf7ttv73chpulvqu4q",
    lists: ["all"],
    socials: {
      x: "https://x.com/WET_sui",
      telegram: "https://t.me/WetOnSuiSafeguard",
      website: "https://wetcoin.fun/",
    },
  },
  {
    symbol: "PEPE",
    name: "Pepe on Sui",
    typeName:
      "0x288710173f12f677ac38b0c2b764a0fea8108cb5e32059c3dd8f650d65e2cb25::pepe::PEPE",
    decimals: 2,
    image:
      "https://ipfs.io/ipfs/bafkreifmaamm73hb3q5oyoqkw3f4lxo7gms3tclv3omliy422n5g4yslgu",
    lists: ["all"],
    socials: {
      x: "https://x.com/pepe_sui_token",
      telegram: "https://t.me/pepe_sui_token",
      website: "https://suipepe.com/",
    },
  },
  {
    symbol: "FARTCOIN",
    name: "Fartcoin on Sui",
    typeName:
      "0x4a2d3947831057dc859d272082900d7b06cf8b2b8ab4e456463f83e3a0e3d7d1::fartcoin::FARTCOIN",
    decimals: 6,
    image:
      "https://ipfs.io/ipfs/bafkreic7dulmv2lkaznuw7bfjwlpz4ypfn4d2yzxrk4uyv223t3233e3le",
    lists: ["all"],
    socials: {
      x: "https://t.me/fartcoinsui",
      telegram: "https://x.com/suifartcoin",
      website: "https://fartcoinonsui.com/",
    },
  },
  {
    symbol: "BOOST",
    name: "Sui Booster DAO",
    typeName:
      "0x7bd673d1b980fc2f1c922f91395c325561a675fc2f349c8ffcff7d03bdbeadc8::boost::BOOST",
    decimals: 6,
    image:
      "https://ipfs.io/ipfs/bafkreid7k5qk4nafu2jqv52vqm66w6wsiiuxv2hqzcsgb3zh5guhvekgxq",
    lists: ["all"],
    socials: {
      x: "https://x.com/suibooster",
      telegram: "https://t.me/sui_booster",
      website: "https://linktr.ee/suibooster",
    },
  },
  {
    symbol: "BULLSHARK",
    name: "BULLSHARK",
    typeName:
      "0xb3a1146f8dba4f5940480764f204047d8ce0794286c8e5bdc1c111ca2a2ea8ae::bullshark::BULLSHARK",
    decimals: 9,
    image:
      "https://bafkreihbeqqcphnt5356uh43becdgr556lspaahyoo4mxshtzxe7ih4qde.ipfs.w3s.link/",
    lists: ["all"],
    socials: {
      x: "https://x.com/Bullsharkbot",
      telegram: "https://t.me/bullshark_portal",
      website: "https://bullshark.fun/",
    },
  },
  {
    symbol: "MOON",
    name: "Moonbag",
    typeName:
      "0x7b888393d6a552819bb0a7f878183abaf04550bfb9546b20ea586d338210826f::moon::MOON",
    decimals: 6,
    image:
      "https://ipfs.io/ipfs/bafkreih7pl4sccgj22drcjfpuposdhxvsjvsi3us3rrdctoohabeaytzk4",
    lists: ["all"],
    socials: {
      x: "https://x.com/moonbagsui",
      telegram: "https://t.me/moonbagsui1",
    },
  },
  {
    symbol: "WAL",
    name: "WAL Token",
    typeName:
      "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
    decimals: 9,
    image: "https://www.walrus.xyz/wal-icon.svg",
    lists: ["all"],
    socials: {
      x: "https://x.com/WalrusProtocol",
      telegram: "https://t.me/WalTokenSui",
      website: "https://linktree.si/WALToken",
    },
  },
  {
    symbol: "MYSTEN",
    name: "Team Mysten ",
    typeName:
      "0x5ed0595332bb9adc4cc7af3fb7eea888cf68377f9497b22a186d681a6e92f1f6::mysten::MYSTEN",
    decimals: 6,
    image: "https://r.turbos.finance/icon/1747058953069.png",
    lists: ["all"],
    socials: {
      x: "https://x.com/teammysten",
      telegram: "https://t.me/teammysten",
      website: "https://www.teammysten.com/",
    },
  },
  {
    symbol: "TOILET",
    name: "Toilet Dust",
    typeName:
      "0xc5b61b1e1f7f88511c9c0c6f475f823c66cc4e2d39a49beb6777059710be8404::toilet::TOILET",
    decimals: 6,
    image: "https://api.movepump.com/uploads/IMG_4034_ef8df5844a.jpeg",
    lists: ["all"],
    socials: {
      x: "https://x.com/Toiletdustsui",
      telegram: "https://t.me/ToiletDustonSui",
      website: "https://www.toiletdust.com/",
    },
  },
];
