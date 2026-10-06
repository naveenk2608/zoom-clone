"use client";

// Temporary connection check for Phase 1. It proves the frontend can reach the
// API over HTTP(S) and the WebSocket endpoint over WS(S).
// Phase 3 replaces this page with the dashboard.

import { useEffect, useState } from "react";

import { getHealth } from "@/lib/api";
import { API_URL, WS_URL } from "@/lib/config";

type CheckResult =
  | { state: "checking" }
  | { state: "ok"; detail: string }
  | { state: "failed"; detail: string };

const RESULT_COLORS: Record<CheckResult["state"], string> = {
  checking: "text-gray-500",
  ok: "text-green-700",
  failed: "text-red-700",
};

export default function ConnectionCheckPage() {
  const health = useHealthCheck();
  const echo = useEchoCheck();

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Zoom Clone: connection check</h1>
      <div className="mt-8 space-y-6">
        <CheckRow label="API health" target={`${API_URL}/api/health`} result={health} />
        <CheckRow label="WebSocket echo" target={`${WS_URL}/ws/ping`} result={echo} />
      </div>
    </main>
  );
}

type CheckRowProps = {
  label: string;
  target: string;
  result: CheckResult;
};

function CheckRow({ label, target, result }: CheckRowProps) {
  return (
    <section>
      <h2 className="font-medium">{label}</h2>
      <p className="break-all text-sm text-gray-500">{target}</p>
      <p className={`mt-1 ${RESULT_COLORS[result.state]}`}>{resultText(result)}</p>
    </section>
  );
}

function resultText(result: CheckResult): string {
  switch (result.state) {
    case "checking":
      return "Checking…";
    case "ok":
      return result.detail;
    case "failed":
      return `Failed: ${result.detail}`;
  }
}

/** Calls GET /api/health once. */
function useHealthCheck(): CheckResult {
  const [result, setResult] = useState<CheckResult>({ state: "checking" });

  useEffect(() => {
    // Set on cleanup, so a run React has already discarded can't update state.
    let ignore = false;

    getHealth()
      .then((health) => {
        if (!ignore) setResult({ state: "ok", detail: health.status });
      })
      .catch((error: unknown) => {
        if (!ignore) setResult({ state: "failed", detail: errorMessage(error) });
      });

    return () => {
      ignore = true;
    };
  }, []);

  return result;
}

/** Opens /ws/ping, sends one message and waits for the echo. */
function useEchoCheck(): CheckResult {
  const [result, setResult] = useState<CheckResult>({ state: "checking" });

  useEffect(() => {
    let ignore = false;
    const socket = new WebSocket(`${WS_URL}/ws/ping`);

    socket.onopen = () => {
      socket.send(`ping ${new Date().toISOString()}`);
    };
    socket.onmessage = (event: MessageEvent<string>) => {
      if (!ignore) setResult({ state: "ok", detail: event.data });
      socket.close();
    };
    socket.onerror = () => {
      // Closing a socket that is still connecting also fires "error",
      // which is why the ignore flag matters here.
      if (!ignore) setResult({ state: "failed", detail: "Could not connect" });
    };

    return () => {
      ignore = true;
      socket.close();
    };
  }, []);

  return result;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
