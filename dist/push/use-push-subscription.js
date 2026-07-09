"use client";
import { useCallback, useEffect, useState } from "react";
import { getDeviceId } from "./device-id";
function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++)
        out[i] = raw.charCodeAt(i);
    return out;
}
function pushSupported() {
    return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}
export function usePushSubscription({ swPath, target }) {
    const [status, setStatus] = useState("default");
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!pushSupported()) {
            setStatus("unsupported");
            return;
        }
        setStatus(Notification.permission);
    }, []);
    const enable = useCallback(async () => {
        setError(null);
        setStatus("working");
        try {
            const reg = await navigator.serviceWorker.register(swPath);
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                setStatus(permission);
                return false;
            }
            const keyRes = await fetch("/api/push/vapid-public-key");
            const { publicKey } = (await keyRes.json());
            if (!publicKey) {
                setError("Chiave push non configurata sul server.");
                setStatus("default");
                return false;
            }
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey).buffer,
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
            if (!res.ok)
                throw new Error("subscribe_failed");
            setStatus("granted");
            return true;
        }
        catch (e) {
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
            setStatus(Notification.permission);
        }
        catch (e) {
            console.warn("[push]", e);
            setError("Disattivazione fallita. Riprova.");
            setStatus("granted");
        }
    }, [swPath]);
    return { status, error, enable, disable };
}
//# sourceMappingURL=use-push-subscription.js.map