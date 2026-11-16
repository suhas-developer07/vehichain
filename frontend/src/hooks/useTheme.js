import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "vellum-theme";

function readInitialTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export default function useTheme() {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#05070d" : "#f4f1ea");
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // storage can be unavailable in private mode; theme still applies
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme, toggleTheme };
}
