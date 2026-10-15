# Abandoned laboratory artwork

`public/lab/abandoned-laboratory.webp` is original generated environment artwork created for this game. The 1672 × 941 image was generated with the built-in image-generation tool and encoded locally as WebP at quality 90. It depicts dusty college laboratory equipment, a notebook, reagent bottles, a broken terminal, and a locked exit. No external image downloads, text, people, or solutions are embedded in it.

React overlays real labelled controls on the notebook, workbench, and terminal. Their coordinates use percentages of the uncropped illustration. The labelled object list provides the same actions when the image is unavailable or a player prefers keyboard controls. Scene highlights are free and cosmetic; purchased math hints retain their usual timer penalty. Existing manga panels and Professor Voss artwork are preserved.


## Room-world expansion

Seven original 1672 × 941 environment illustrations were generated for this update and saved locally as WebP at quality 88: `fraction-factory`, `algebra-alarm`, `geometry-trap`, `final-study`, `detention-warning`, `detention-isolation`, and `detention-probation`. All are under `public/lab/`. The original abandoned laboratory remains room one. `lib/room-scenes.ts` records uncropped image coordinates, image alternatives, atmosphere, and accessible object labels after visual inspection. These are illustrated environments, not a 3D walking simulation. Actual questions, controls, and diagrams are rendered in code rather than baked into the image.
