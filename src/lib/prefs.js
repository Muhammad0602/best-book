// Small choices remembered on this device (text size, last place read, ...).
const KEY = 'bestbook.pref.';

export const readPref = (name, fallback) => {
  try {
    const raw = window.localStorage.getItem(KEY + name);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
};

export const writePref = (name, value) => {
  try {
    window.localStorage.setItem(KEY + name, JSON.stringify(value));
  } catch (error) {
    // Storage full or blocked: the choice still applies until the app is closed.
  }
};
