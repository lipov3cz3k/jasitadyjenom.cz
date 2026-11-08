// Color theme preference. "system" = no stored value, follow prefers-color-scheme.
export type ThemePreference = "system" | "light" | "dark";

export const THEME_KEY = "jasitadyjenom.theme.v1";

// Runs inline in <head> before first paint so an explicit choice doesn't flash.
export const themeInitScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

const CHANGE_EVENT = "jasitadyjenom:theme";

export function getThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function setThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  try {
    if (preference === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, preference);
  } catch {
    // storage disabled – the choice still applies until reload
  }
  if (preference === "system") delete root.dataset.theme;
  else root.dataset.theme = preference;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeThemePreference(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_KEY) return;
    const value = getThemePreference();
    if (value === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = value;
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
