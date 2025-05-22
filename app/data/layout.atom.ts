import { useScreenSize } from "@/app/hooks/dom/useScreenSize";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const screenSizeAtom = atom<ReturnType<typeof useScreenSize>>({
  msm: true,
  sm: false,
  md: false,
  lg: false,
  xl: false,
  xl2: false,
  isMobile: true,
});
export const isMobileAtom = atom((get) => get(screenSizeAtom).isMobile);
export const appThemeAtom = atomWithStorage<"dark" | "light" | "system">(
  "app:theme",
  "dark",
);
export const isDarkModeAtom = atom(true);
