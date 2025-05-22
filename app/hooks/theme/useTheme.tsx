import { appThemeAtom, isDarkModeAtom } from "@/app/data/layout.atom";
import { useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";

const useTheme = () => {
  const [isDarkMode, setDarkMode] = useAtom(isDarkModeAtom);
  const theme = useAtomValue(appThemeAtom);

  useEffect(() => {
    switch (theme) {
      case "dark":
        setDarkMode(true);
        break;
      case "light":
        setDarkMode(false);
        break;
      default: {
        const res = window.matchMedia("(prefers-color-scheme: dark)");
        setDarkMode(res.matches);
        res.onchange = () => {
          setDarkMode(
            window.matchMedia("(prefers-color-scheme: dark)").matches,
          );
        };
        return () => {
          res.onchange = null;
        };
      }
    }
  }, [setDarkMode, theme]);

  useEffect(() => {
    if (
      isDarkMode ||
      (typeof isDarkMode === "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);
};

export default useTheme;
