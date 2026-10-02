"use client";
import { useEffect, useState } from "react";
import {
  anonymousAlias,
  defaultAvatar,
  validateAvatar,
  type AvatarProfile,
} from "./profiles";
export interface Preferences {
  alias: string;
  avatar: AvatarProfile;
  sound: boolean;
  reducedMotion: boolean;
}
const defaults: Preferences = {
  alias: "",
  avatar: defaultAvatar(),
  sound: false,
  reducedMotion: false,
};
export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(defaults),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let next = { ...defaults, alias: anonymousAlias() };
    try {
      const saved = JSON.parse(
        localStorage.getItem("last-exam-preferences") ?? "null",
      );
      if (saved)
        next = {
          alias:
            typeof saved.alias === "string" && saved.alias.length <= 20
              ? saved.alias
              : next.alias,
          avatar: validateAvatar(saved.avatar),
          sound: saved.sound === true,
          reducedMotion: saved.reducedMotion === true,
        };
    } catch {}
    setPreferences(next);
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        "last-exam-preferences",
        JSON.stringify(preferences),
      );
    } catch {}
    document.documentElement.dataset.reduceMotion = String(
      preferences.reducedMotion,
    );
  }, [preferences, loaded]);
  return {
    preferences,
    update: (patch: Partial<Preferences>) =>
      setPreferences((p) => ({ ...p, ...patch })),
  };
}
