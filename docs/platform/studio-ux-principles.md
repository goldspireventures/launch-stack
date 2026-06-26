# Studio UX principles

**Audience:** Solo founder-operator, future studio staff, engineering  
**Applies to:** Console (Studio OS), client portal, marketing site

## Information hierarchy

| At fingertips | Nested / on demand |
|-----------------|-------------------|
| Desk queue (urgent enquiries, delivery blockers) | Charter full text (Configure) |
| Pipeline board + inspector | Economics charts (Insight) |
| Engagement: client mirror + next runbook step | Copy markdown, audit exports |
| Launch wizard primary CTA | Per-flag catalog edits |

## Layout rules

1. **Desk** — queue left, thin telemetry right; no charts above the fold.
2. **Pipeline** — board is the canvas; lead inspector is a panel, not a new page chrome.
3. **Engagement** — minimal shell header; phase rail; mirror column sticky left; modules right.
4. **Configure / Insight** — side nav modes; embedded child pages hide duplicate headers.

## Motion

- Use motion for **orientation** (page enter, active nav indicator), not decoration.
- Respect `prefers-reduced-motion`.
- Hover on queue rows: subtle translate + border — confirms clickability.

## Color

- Console: dark deck + gold primary (signal, not decoration).
- Urgent: destructive panel gradient; attention: amber panel.
- Marketing: warm orange primary + soft radial glows; never console gold on marketing.

## Static vs live

| Static | Live (poll / mutate) |
|--------|----------------------|
| Charter copy, tier labels | Desk pulse, pipeline cards |
| Mode nav structure | Client mirror preview (~30s) |
| Wizard step labels | Portal issue, payments, deploy webhook |

## Screen helpfulness checklist

Every screen answers: **What needs me?** **What’s next?** **What does the client see?**
