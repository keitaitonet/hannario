"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 5_000;

export function PendingPoller() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/pending/status", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { granted: boolean };
        if (body.granted) router.replace("/");
      } catch {
        // network blip — retry on next tick
      }
    };
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router]);
  return null;
}
