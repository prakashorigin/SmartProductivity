import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "../store/store";
import "../index.css";
import App from "./App.jsx";

const savedTheme = localStorage.getItem("theme") || "system";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const isDark = savedTheme === "dark" || (savedTheme === "system" && prefersDark);
document.documentElement.classList.toggle("dark", isDark);
document.documentElement.style.colorScheme = isDark ? "dark" : "light";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
