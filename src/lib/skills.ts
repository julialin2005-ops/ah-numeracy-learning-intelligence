// Canonical skill names — must match skills.skill_name exactly (FK).
export const SKILL_NAMES = [
  "Counting — forward to 10",
  "Counting — backward from 10",
  "Subitizing — within 5",
  "Subitizing — 6 and 7",
  "Cardinality — quantity invariance",
  "Staircase — building and reading",
  "Make 3 — number bonds",
  "Make 4 — number bonds",
  "Make 5 — 2+3",
  "Make 5 — 3+2",
  "Make 5 — 1+4",
  "Make 5 — 4+1",
  "Make 5 — 0+5 and 5+0",
  "Make 5 — conceptual (two ways)",
  "Make 6 — number bonds",
  "Make 7 — number bonds",
  "Make 8 — number bonds",
  "Make 9 — number bonds",
  "Make 10 — number bonds",
  "Bridging through 10",
  "Place value — tens and ones",
] as const;

export type SkillName = (typeof SKILL_NAMES)[number];

export const SKILL_GROUPS: { label: string; skills: SkillName[] }[] = [
  {
    label: "Foundational",
    skills: [
      "Counting — forward to 10",
      "Counting — backward from 10",
      "Subitizing — within 5",
      "Subitizing — 6 and 7",
      "Cardinality — quantity invariance",
      "Staircase — building and reading",
    ],
  },
  {
    label: "Number bonds",
    skills: [
      "Make 3 — number bonds",
      "Make 4 — number bonds",
      "Make 5 — 2+3",
      "Make 5 — 3+2",
      "Make 5 — 1+4",
      "Make 5 — 4+1",
      "Make 5 — 0+5 and 5+0",
      "Make 5 — conceptual (two ways)",
      "Make 6 — number bonds",
      "Make 7 — number bonds",
      "Make 8 — number bonds",
      "Make 9 — number bonds",
      "Make 10 — number bonds",
    ],
  },
  {
    label: "Bridging & extension",
    skills: ["Bridging through 10", "Place value — tens and ones"],
  },
];
