"use client";

import { useCallback, useEffect, useState } from "react";
import { getDeviceId } from "./device-id";

/**
 * Hook riusabile per attivare/disattivare Web Push su un dispositivo, per
 * qualsiasi portale (admin piattaforma, gestione tenant, agenda, ecc.).
 * Incapsula: registrazione service worker, permesso Notification, subscribe
 * PushManager e chiamata alle API generiche /api/push/subscribe|unsubscribe.
 *
 * Il `target` determina a chi sono legate le subscription lato server
 * (vedi src/app/api/push/subscribe/route.ts e src/lib/push/send.ts).
 */
export type PushSubscribeTarget =
  | { scope: "tenant"; tenantId: string }
  | { scope: "siteadmin" };

export type PushSubscriptionStatus = "unsupported" | "default" | "denied" | "granted" | "working";

type Options = {
  /** Path del service worker da registrare per questo portale, es. "/admin-sw.js". */
  swPath: string;
  target: PushSubscribeTarget;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function usePushSubscription({ swPath, target }: Options) {
  const [status, setStatus] = useState<PushSubscriptionStatus>("default");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported()) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as PushSubscriptionStatus);
  }, []);

  const enable = useCallback(async () => {
    setError(null);
    setStatus("working");
    try {
      const reg = await navigator.serviceWorker.register(swPath);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission as PushSubscriptionStatus);
        return false;
      }
      const keyRes = await fetch("/api/push/vapid-public-key");
      const { publicKey } = (await keyRes.json()) as { publicKey?: string };
      if (!publicKey) {
        setError("Chiave push non configurata sul server.");
        setStatus("default");
        return false;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(target.scope === "tenant" ? { scope: "tenant", tenantId: target.tenantId } : { scope: "siteadmin" }),
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
          deviceId: getDeviceId(),
          pageUrl: window.location.pathname,
        }),
      });
      if (!res.ok) throw new Error("subscribe_failed");
      setStatus("granted");
      return true;
    } catch (e) {
      console.warn("[push]", e);
      setError("Attivazione fallita. Riprova.");
      setStatus("default");
      return false;
    }
  }, [swPath, target]);

  const disable = useCallback(async () => {
    setError(null);
    setStatus("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration(swPath);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus(Notification.permission as PushSubscriptionStatus);
    } catch (e) {
      console.warn("[push]", e);
      setError("Disattivazione fallita. Riprova.");
      setStatus("granted");
    }
  }, [swPath]);

  return { status, error, enable, disable };
}
