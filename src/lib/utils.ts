import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEFAULT_RPC_ENDPOINT, SITE_URL } from "@/lib/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return SITE_URL;
}

export function getRpcEndpoint(): string {
  return DEFAULT_RPC_ENDPOINT;
}

export function getCanonicalUrl(path = ""): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, SITE_URL).toString();
}
