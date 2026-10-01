# Professor Voss: manga prologue artwork

Generated with the built-in `imagegen` tool in reference-image generation mode. The existing professor portrait supplied character identity; all three outputs were visually inspected. Each original PNG is **1672 × 941 pixels**. Speech bubbles and dialogue are rendered as HTML, keeping lettering crisp and accessible instead of embedding text in the artwork.

## Final assets and prompt set

Shared direction: cinematic manga and detailed graphic-novel ink, expressive faces, realistic laboratory materials, olive and lime lighting, consistent round glasses and long nose, no baked-in text or speech bubbles. Older Voss has wild silver hair. College Voss has dark hair. Landscape composition leaves space for white dialogue bubbles.

1. **`public/story/manga-credit.png` — The missing credit.** Young Elias Voss holds his mathematics research notebook in the foreground at a college science fair. His teammates receive a trophy behind him. His expression conveys hurt and disbelief. Warm amber flashback lighting, intricate ink lines and clear facial details.
2. **`public/story/manga-grudge.png` — The grudge.** Older Professor Voss alone in his green-lit science laboratory, studying an old team photograph, research notes and unopened letters. A clenched hand and tense expression show his resentment growing. Detailed glassware, equipment and cinematic shadows.
3. **`public/story/manga-lab.png` — The experiment.** Older Professor Voss builds the escape room in his science laboratory, wiring a keypad, number locks and locked doors. Scientific glassware, electronic equipment and reunion invitations explain how the plan became real. Crisp detailed ink and dramatic lime lighting.

The story reveals a printing error that Voss interpreted as deliberate betrayal. This gives the character a motive while leaving room for the reunion to resolve the misunderstanding. Three short chapters auto-advance every 11 seconds, stop at the final chapter, and support manual reading and reduced motion.

## Files

- Scene data, controls and accessibility: `components/prologue.tsx`
- Animation, responsive layout and speech clouds: `app/globals.css`
- First-visit and replay integration: `app/page.tsx`
- Local preview screenshot: `docs/prologue-preview.jpg`
