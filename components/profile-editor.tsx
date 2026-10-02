"use client";
import { Avatar } from "./avatar";
import { PRESETS, SKIN, HAIR, OUTFIT, ACCESSORIES, anonymousAlias, type AvatarProfile } from "@/lib/profiles";
export function ProfileEditor({avatar,onChange}:{avatar:AvatarProfile;onChange:(a:AvatarProfile)=>void}) {
 return <div className="profile-editor"><div className="profile-preview"><Avatar profile={avatar} label="Your character preview"/><div><strong>{PRESETS[avatar.preset]}</strong><p>Cosmetic only. Every character plays by the same rules.</p></div></div>
 <details><summary>Customize your character</summary><div className="preset-grid">{PRESETS.map((name,preset)=><button type="button" key={name} aria-label={`Choose ${name}`} aria-pressed={avatar.preset===preset} className={avatar.preset===preset?"selected":""} onClick={()=>onChange({...avatar,preset})}><Avatar profile={{...avatar,preset}} label={name}/><span>{name}</span></button>)}</div>
 <div className="color-settings">{([["Skin tone","skin",SKIN],["Hair color","hair",HAIR],["Outfit color","outfit",OUTFIT]] as const).map(([label,key,colors])=><fieldset key={key}><legend>{label}</legend><div className="color-swatches">{colors.map((c,i)=><button type="button" aria-label={`${label} ${i+1}`} aria-pressed={avatar[key]===c} key={c} onClick={()=>onChange({...avatar,[key]:c})}><span style={{background:c}}/>{avatar[key]===c&&<span className="swatch-check">✓</span>}</button>)}</div></fieldset>)}</div>
 <label className="settings-field">Accessory<select value={avatar.accessory} onChange={e=>onChange({...avatar,accessory:e.target.value as AvatarProfile["accessory"]})}>{ACCESSORIES.map(a=><option key={a}>{a}</option>)}</select></label></details></div>;
}
export function AliasButton({onChange}:{onChange:(alias:string)=>void}) {return <button type="button" className="text-button" onClick={()=>onChange(anonymousAlias())}>Generate anonymous alias</button>;}
