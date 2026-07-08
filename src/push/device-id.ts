"use client";

// Identità stabile del browser/dispositivo, persistita in localStorage.
// Usata per correlare una Web Push subscription a un dispositivo fisico
// senza bisogno di un account (es. filtri mail per dispositivo).
const STORAGE_KEY = "menuary-device-id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
