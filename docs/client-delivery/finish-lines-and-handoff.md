# Finish lines and handoff (how far Goldspire goes)

**Operator checklist:** [launch-readiness-checklist.md](../deployment/launch-readiness-checklist.md) · **Open delta:** [studio-remaining-work.md](../platform/studio-remaining-work.md).

Goldspire does not sell “we build until you feel done.” We sell **packages** to named **finish lines**, then either hand off or operate via retainer.

## The three finish lines

### 1) Build complete (staging)

**Meaning:** the scope is implemented and running on staging with test credentials.

**Typical use:** internal milestone approval, UAT start.

**Not a handoff.** This is a checkpoint, not delivery.

### 2) Launch ready (default delivery boundary)

**Meaning:** the product is live in production and ready for real users.

**Included:**

- Production URL live (hosting + database configured)
- Core flows verified end-to-end (auth, primary loop, billing if in scope, admin basics)
- Bug-bash window as defined in the SOW / milestones
- Handover: Loom walkthrough + 1 hour live session
- Code access in the client’s org

**Not included unless explicitly sold:**

- Net-new product features (Invention)
- Unlimited polish passes beyond the agreed feedback budget
- Vendor procurement for verification / risk tooling
- Store submissions (unless mobile SKU + add-on)

### 3) Store ready (mobile SKUs only)

**Meaning:** internal/testing builds are produced and the client has submission-ready artifacts.

**Included when sold:**

- iOS/Android builds (internal distribution / TestFlight equivalent)
- Submission drafts/checklists where agreed

**Explicit constraint:** store approval timelines depend on client accounts and platform review.

## After the finish line

### Option A — Handoff

Goldspire completes Launch ready (or Store ready) and hands off. New work becomes a new engagement.

### Option B — Operate (retainer)

Maintenance retainer covers:

- Incidents, upgrades, security patches
- Bugs (anything that worked at launch and stopped working)
- Included feature hours as per retainer tier

New product scope beyond included hours → change order or next phase.

## How to decide the right boundary

- **Tier 1 clone buyers**: default is **Launch ready**. The product should be shippable without requiring the client to hire engineers immediately.
- **Budget-unclear buyers**: start with a **paid discovery sprint**, then pick a package and finish line.
- **Custom buyers (Tier 2/3)**: same finish lines, larger scope; invention is explicitly priced.

