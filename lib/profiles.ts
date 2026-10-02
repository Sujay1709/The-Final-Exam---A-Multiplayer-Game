export const PRESETS = ["Nova", "Kai", "Mira", "Echo", "Rin", "Axel", "Zuri", "Theo"] as const;
export const SKIN = ["#f5d4b5", "#d9aa83", "#b77a55", "#794a36"] as const;
export const HAIR = ["#242635", "#e4e5ed", "#994d35", "#546d9c", "#884c8e"] as const;
export const OUTFIT = ["#ff9b42", "#6d93c0", "#b074b2", "#648c80", "#d3c39a"] as const;
export const ACCESSORIES = ["none", "glasses", "headphones", "star"] as const;
export interface AvatarProfile { preset: number; skin: string; hair: string; outfit: string; accessory: typeof ACCESSORIES[number] }
export const defaultAvatar = (preset=0):AvatarProfile => ({ preset:preset%8, skin:SKIN[preset%4], hair:HAIR[preset%5], outfit:OUTFIT[preset%5], accessory:"none" });
export function validateAvatar(value: unknown): AvatarProfile {
  if (value === undefined) return defaultAvatar();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Choose a valid avatar.");
  const a=value as Record<string,unknown>;
  if(!Number.isInteger(a.preset)||Number(a.preset)<0||Number(a.preset)>7||!SKIN.includes(a.skin as never)||!HAIR.includes(a.hair as never)||!OUTFIT.includes(a.outfit as never)||!ACCESSORIES.includes(a.accessory as never)) throw new Error("Choose colors and accessories from the avatar options.");
  return {preset:Number(a.preset),skin:String(a.skin),hair:String(a.hair),outfit:String(a.outfit),accessory:a.accessory as AvatarProfile["accessory"]};
}
export function anonymousAlias():string {
  const words=["Hidden","Quiet","Cosmic","Clever","Secret","Swift","Brave","Misty"];
  const nouns=["Fox","Comet","Owl","Panda","Lynx","Orbit","Raven","Spark"];
  const bytes=crypto.getRandomValues(new Uint8Array(3));
  return `${words[bytes[0]%8]}${nouns[bytes[1]%8]}${bytes[2]}`;
}
