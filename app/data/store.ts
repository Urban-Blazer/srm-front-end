import { atom, useAtomValue } from 'jotai';
import { PoolSearchResult } from '../types';
import { atomWithStorage } from 'jotai/utils';
import { SRM_MAIN_POOL } from '../config';

export const selectedRangeAtom = atom("24 hour");
export const useSelectedRange = () => {
    return useAtomValue(selectedRangeAtom);
};

const defaultPair: PoolSearchResult = SRM_MAIN_POOL;

export const selectedPairAtom = atom<PoolSearchResult | null>(defaultPair);
export const emptyPairAtom = atom<PoolSearchResult | null>(null);

export const selectedPoolId = atom<string | null>(null);

export const isBuyAtom = atomWithStorage<boolean>(
  "app:isBuy",
  true,
);

export const useSelectedPair = () => {
    return useAtomValue(selectedPairAtom);
};