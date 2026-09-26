import { useEffect, useState } from "react";

const themeOptions = ["light", "dark", "system"];

function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    return themeOptions.includes(stored) ? stored : "system";
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const useDark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", useDark);
      document.documentElement.style.colorScheme = useDark ? "dark" : "light";
    };

    localStorage.setItem("theme", theme);
    applyTheme();
    if (theme === "system") media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  const cycleTheme = () => {
    const index = themeOptions.indexOf(theme);
    setTheme(themeOptions[(index + 1) % themeOptions.length]);
  };

  const label = theme[0].toUpperCase() + theme.slice(1);
  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`Theme: ${theme}. Activate to change theme.`}
      title={`Theme: ${theme} · Click to switch`}
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀️" : theme === "system" ? "◐" : "🌙"}</span>
      <span className="sr-only">{label} theme</span>
    </button>
  );
}

export default ThemeToggle;
