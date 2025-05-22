import tailwindConfig from "@/tailwind.config";
import { useMemo } from "react";
import resolveConfig from "tailwindcss/resolveConfig";
import useMediaQuery from "./useMediaQuery";

const { theme: THEME } = resolveConfig(tailwindConfig);


export const useScreenSize = () => {
  const sizes = THEME?.screens as Record<string, string>;
  const msm = useMediaQuery(
    `(max-width: ${+sizes.sm.replace("px", "") - 1}px)`,
  );
  const sm = useMediaQuery(`(min-width: ${sizes.sm})`);
  const md = useMediaQuery(`(min-width: ${sizes.md})`);
  const lg = useMediaQuery(`(min-width: ${sizes.lg})`);
  const xl = useMediaQuery(`(min-width: ${sizes.xl})`);
  const xl2 = useMediaQuery(`(min-width: ${sizes["2XL"]})`);
  const state = useMemo(() => {
    return { msm, sm, md, lg, xl, xl2, isMobile: msm };
  }, [msm, sm, md, lg, xl, xl2]);
  return state;
};
