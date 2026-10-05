import type { JellyfinSession } from "../jellyfin";
import { DEMO_PASSWORD, DEMO_SERVER_HOST, DEMO_SERVER_URL, DEMO_USERNAME } from "./constants";

function normalizeHost(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/\/+$/, "");
}

export function isDemoCredentials(rawServerUrl: string, username: string, password: string): boolean {
  return (
    normalizeHost(rawServerUrl) === DEMO_SERVER_HOST &&
    username.trim().toLowerCase() === DEMO_USERNAME &&
    password === DEMO_PASSWORD
  );
}

export function isDemoServerUrl(serverUrl: string): boolean {
  return serverUrl.startsWith("demo://");
}

export function createDemoSession(): JellyfinSession {
  return { serverUrl: DEMO_SERVER_URL, token: "demo-token", userId: "demo-user", userName: "Demo" };
}
