import { atom, useAtomValue } from 'jotai';
import { PoolSearchResult } from '../types';

export const selectedRangeAtom = atom("24 hour");
export const useSelectedRange = () => {
    return useAtomValue(selectedRangeAtom);
};

const defaultPair: PoolSearchResult = {
    "poolId": "0xbad96d82f84d3fa3b31d49054e277eed973347382835b479622f277641abc693",
    "coinA": {
        "typeName": "0x2::sui::SUI",
        "decimals": 9,
        "image": "https://strapi-dev.scand.app/uploads/sui_c07df05f00.png",
        "name": "Sui",
        "symbol": "SUI"
    },
    "coinB": {
        "typeName": "0xbd2301d12b96dd64b41134168931dd54742c0336bcf1752ed346a177ac00d1ed::SuiRewardsMe::SUIREWARDSME",
        "decimals": 9,
        "image": "https://bafybeif5r3biiwsylqsjkkwh4yrsbltbeetq5w3snuodcw56b7iaaglxoa.ipfs.w3s.link/logo_blk.png",
        "name": "SuiRewards.Me",
        "symbol": "SRM"
    }
};

export const selectedPairAtom = atom<PoolSearchResult | null>(defaultPair);


export const useSelectedPair = () => {
    return useAtomValue(selectedPairAtom);
};