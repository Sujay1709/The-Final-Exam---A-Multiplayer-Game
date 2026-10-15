export interface FamilyTreeDiagram {
  kind: "family-tree";
  people: { id: string; name: string; detail: string; x: number; y: number }[];
  links: { from: string; to: string; relation: "parent" | "sibling" }[];
}
