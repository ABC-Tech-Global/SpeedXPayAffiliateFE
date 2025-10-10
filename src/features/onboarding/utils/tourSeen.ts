import type { ProfileResponse } from "@/types/api"

export type TourSeenState = boolean | undefined

export const TOUR_SEEN_STORAGE_KEY = "tourSeen"

export function deriveTourSeenFromProfile(profile: ProfileResponse["profile"] | undefined): TourSeenState {
  if (!profile || typeof profile !== "object") return undefined

  if (typeof profile.isTourSeen === "boolean") {
    return profile.isTourSeen
  }

  if (typeof profile.welcomeTourSeen === "boolean") {
    return profile.welcomeTourSeen
  }

  return undefined
}

export function readTourSeenCache(): TourSeenState {
  if (typeof window === "undefined") return undefined
  try {
    const raw = window.sessionStorage.getItem(TOUR_SEEN_STORAGE_KEY)
    if (raw === "1") return true
    if (raw === "0") return false
    return undefined
  } catch {
    return undefined
  }
}

export function writeTourSeenCache(state: TourSeenState): void {
  if (typeof window === "undefined") return
  try {
    if (typeof state === "boolean") {
      window.sessionStorage.setItem(TOUR_SEEN_STORAGE_KEY, state ? "1" : "0")
    } else {
      window.sessionStorage.removeItem(TOUR_SEEN_STORAGE_KEY)
    }
  } catch {
    // Ignore storage failures; caching is only a minor UX hint.
  }
}
