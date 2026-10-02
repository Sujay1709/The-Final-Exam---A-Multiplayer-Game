import { defaultAvatar, PRESETS, type AvatarProfile } from "@/lib/profiles";
const styles = [
  "M30 43Q25 10 52 16Q79 5 79 43L66 25L57 34L46 23Z",
  "M27 49L22 29L38 31L40 12L54 25L70 16L80 40L72 50L60 29L40 38Z",
  "M24 75L24 40Q25 12 53 14Q80 13 80 43L79 76L69 68L70 35L58 29L40 34L34 68Z",
  "M27 49Q16 27 36 23Q42 8 54 18Q75 9 80 33L73 48L66 32L48 29L35 45Z",
  "M26 50Q19 18 52 16Q85 17 78 55L72 30L61 42L57 28L42 40L34 31Z",
  "M27 44L25 28L35 29L38 12L48 23L60 10L64 25L76 22L79 44L64 33L43 35Z",
  "M25 55Q13 42 26 30Q22 14 41 18Q54 5 66 18Q84 16 79 35Q90 47 77 56L69 33L40 30L33 51Z",
  "M26 47Q19 17 51 16Q82 11 79 44L72 33L48 28L37 42Z",
];
export function Avatar({
  profile = defaultAvatar(),
  label = "Player avatar",
  className = "",
}: {
  profile?: AvatarProfile;
  label?: string;
  className?: string;
}) {
  const a = profile;
  return (
    <svg
      viewBox="0 0 104 112"
      className={`manga-avatar ${className}`}
      role="img"
      aria-label={`${label}, ${PRESETS[a.preset]} preset`}
    >
      <rect x="1" y="1" width="102" height="110" rx="20" fill="#25242c" />
      <path
        d="M14 111Q15 77 52 77Q89 77 90 111"
        fill={a.outfit}
        stroke="#17151d"
        strokeWidth="3"
      />
      <path
        d="M44 74L44 84L52 93L61 83L61 74"
        fill={a.skin}
        stroke="#17151d"
        strokeWidth="2"
      />
      <ellipse
        cx="52"
        cy="49"
        rx="25"
        ry="31"
        fill={a.skin}
        stroke="#17151d"
        strokeWidth="2"
      />
      <path
        d={styles[a.preset]}
        fill={a.hair}
        stroke="#17151d"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M34 48L45 46M59 46L70 48" stroke="#292331" strokeWidth="3" />
      <ellipse cx="41" cy="53" rx="4" ry="6" fill="#242032" />
      <ellipse cx="63" cy="53" rx="4" ry="6" fill="#242032" />
      <circle cx="42" cy="51" r="1.5" fill="#fff" />
      <circle cx="64" cy="51" r="1.5" fill="#fff" />
      <path
        d="M51 56L49 63L54 63M44 69Q52 74 60 69"
        fill="none"
        stroke="#623e3b"
        strokeWidth="2"
      />
      <path
        d="M38 84L52 94L66 84M52 95L52 109"
        fill="none"
        stroke="#17151d"
        strokeWidth="2"
      />
      {a.accessory === "glasses" && (
        <g fill="none" stroke="#f7eee2" strokeWidth="2">
          <circle cx="41" cy="54" r="10" />
          <circle cx="63" cy="54" r="10" />
          <path d="M51 54L53 54" />
        </g>
      )}
      {a.accessory === "headphones" && (
        <g fill="#6d93c0" stroke="#17151d" strokeWidth="3">
          <path
            d="M26 50Q22 12 52 12Q83 12 79 50"
            fill="none"
            strokeWidth="5"
          />
          <rect x="21" y="42" width="10" height="23" rx="4" />
          <rect x="74" y="42" width="10" height="23" rx="4" />
        </g>
      )}
      {a.accessory === "star" && (
        <path
          d="M71 25L74 31L81 32L76 37L77 44L71 40L65 44L66 37L61 32L68 31Z"
          fill="#fff3b1"
          stroke="#17151d"
        />
      )}
    </svg>
  );
}
