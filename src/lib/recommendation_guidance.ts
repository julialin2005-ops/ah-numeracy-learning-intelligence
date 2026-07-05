export const RECOMMENDATION_GUIDANCE: Record<string, {
  label: string;
  why: string;
  action: string;
  doNot?: string;
}> = {
  observe_and_collect_more_evidence: {
    label: "Continue observing — more sessions needed before changing approach.",
    why: "The student showed progress, but transfer and independent cold recall have not yet been confirmed. Progress under scaffolding is not the same as consolidation.",
    action: "Begin the next session with one cold recall probe before using rods, cards, or prompts. Ask: 'How do we make five?' Record whether the student gives a complete equation independently. Repeat with the commutative pair.",
    doNot: "Do not increase challenge or introduce a new fact family until independent retrieval and transfer are observed.",
  },
  maintain_and_consolidate: {
    label: "Maintain and consolidate current learning.",
    why: "Retrieval is developing but not yet consistent. The student knows the bonds but hasn't demonstrated stable independent recall across varied conditions.",
    action: "Revisit the same number bond families using varied representations — cards, fingers, dot patterns. Include at least one cold recall probe per session before introducing any visual support.",
    doNot: "Do not introduce new number families yet. Do not assume scaffolded recall equals consolidation.",
  },
  strengthen_retrieval: {
    label: "Strengthen retrieval of known facts.",
    why: "The student can produce correct answers but retrieval is inconsistent or context-dependent. Fluency requires repeated low-stakes recall practice.",
    action: "Use short daily retrieval sprints: 5–8 facts, no visual aids, timed. Track which facts are consistently retrieved vs. which require reconstruction. Focus practice on inconsistent facts.",
    doNot: "Do not introduce new content until retrieval of current facts is stable.",
  },
  build_number_relationships: {
    label: "Build number relationships using concrete part-whole activities.",
    why: "The student has not yet demonstrated understanding of part-whole structure. Recall without understanding is fragile.",
    action: "Use manipulatives (rods, counters, ten-frames) to model how numbers decompose. Ask the student to generate combinations independently. Record which combinations are produced spontaneously vs. with prompting.",
    doNot: "Do not drill recall before part-whole understanding is established.",
  },
  reduce_counting_dependency: {
    label: "Reduce counting dependency — move toward retrieval.",
    why: "The student is reconstructing answers by counting rather than retrieving from memory. This is slower and less reliable for complex problems.",
    action: "Introduce subitizing and number bond cards. Limit counting time by covering manipulatives after initial exposure. Prompt: 'Can you remember without counting?' Track sessions where counting reduces.",
    doNot: "Do not remove counting support abruptly. Fade gradually over several sessions.",
  },
  separate_competing_fact_families: {
    label: "Separate competing fact families to stabilise retrieval.",
    why: "Retrieval errors are occurring alongside inconsistent recall, likely due to interference between adjacent number bond families practiced in close succession.",
    action: "Focus each session on one fact family only. Do not mix Make 4 and Make 5 within the same session. Confirm stable retrieval within one family before reintroducing the other. Re-test retrieval after a consolidation period.",
    doNot: "Do not alternate between adjacent fact families within the same session until retrieval is consistent within each family independently.",
  },
  increase_challenge: {
    label: "Ready to progress — introduce new number bond combinations.",
    why: "The student demonstrates secure understanding and consistent independent retrieval, including transfer to unpractised numbers.",
    action: "Introduce number bonds for a new target number (e.g., Make 6 or Make 7). Begin with concrete representations, then move to abstract. Test cold recall of existing bonds at the start of each session to confirm retention.",
    doNot: "Do not skip consolidation of new bonds before adding further families.",
  },
};
