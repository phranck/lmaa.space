import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api.ts";

type PushState = "unsupported" | "prompt" | "denied" | "subscribed" | "unsubscribed";

function getInitialPushState(): PushState {
  if (
    typeof navigator === "undefined" ||
    typeof window === "undefined" ||
    typeof Notification === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return "unsupported";
  }
  return Notification.permission === "denied" ? "denied" : "prompt";
}

async function createPushSubscription(vapidPublicKey: string): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidPublicKey,
  });
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>(getInitialPushState);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    const permission = Notification.permission;
    if (permission === "denied") {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setState(sub ? "subscribed" : "unsubscribed");
      })
      .catch(() => {
        setState("unsubscribed");
      });
  }, []);

  const enable = useCallback(async () => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    try {
      const { vapidPublicKey } = await api.get<{ vapidPublicKey: string | null }>(
        "/admin/push/vapid-public-key",
      );
      if (!vapidPublicKey) {
        registeredRef.current = false;
        return;
      }

      const sub = await createPushSubscription(vapidPublicKey);

      const json = sub.toJSON();
      await api.post("/admin/push/subscribe", {
        endpoint: sub.endpoint,
        keys: {
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
      });

      setState("subscribed");
    } catch {
      setState(Notification.permission === "denied" ? "denied" : "unsubscribed");
    } finally {
      registeredRef.current = false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.post("/admin/push/unsubscribe", { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
    } catch {
      // ignore
    }
  }, []);

  return { state, enable, unsubscribe };
}
