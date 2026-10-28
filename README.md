# NTU PathFinder: 4-Year Degree and Prerequisite Skill-Tree Workshop

Welcome to the hands-on Google Antigravity workshop for Nanyang Technological University (NTU)! In this step-by-step tutorial, you will build NTU PathFinder, an interactive 4-year university degree roadmap and prerequisite skill-tree visualiser powered by the live [NTUMods Open API](https://ntumods.com/developers).

No prior coding experience is required. You will pair-program with the Antigravity AI Agent using Spec-Driven Development (SDD).

- Start the Step-by-Step Codelab Guide: [CODELAB.md](./CODELAB.md)
- Antigravity Workspace Rules: [.agents/rules/workspace.md](./.agents/rules/workspace.md)
- Reference Web App: [index.html](./index.html) and [planner-engine.mjs](./planner-engine.mjs)

---

## What You Will Build

1. An Interactive 8-Semester Degree Board: Plan your entire NTU journey from Year 1 Sem 1 to Year 4 Sem 2 with a live Graduation Academic Unit (AU) progress bar tracking your Core AUs, Interdisciplinary Collaborative Core (ICC) AUs, and Electives.
2. A Live Prerequisite Skill-Tree Visualiser: Click any Year 1 or Year 2 course to highlight the Year 3 and Year 4 modules it unlocks, and automatically catch missing prerequisites or mutually exclusive course clashes before STARS registration.
3. One-Click Cloud Deployment to Vercel: Publish your planner to the cloud with a shareable URL that you and your coursemates can access from anywhere.

```text
                      +-----------------------------------------------+
                      |            Live Public NTUMods APIs           |
                      |  +-------------------+ +-------------------+  |
                      |  |  Bulk Catalogue   | | Module Graph API  |  |
                      |  | /data/api/modules | | /api/modules/CODE |  |
                      |  +---------+---------+ +---------+---------+  |
                      +------------|---------------------|------------+
                                   |                     |
                                   v                     v
                      +-----------------------------------------------+
                      |              Shared Data Layer                |
                      |   * lib/types.ts        * lib/ntumods.ts      |
                      +------------+---------------------+------------+
                                   |                     |
                                   v                     v
      +-----------------------------------------------------------------------+
      |                NTU PathFinder Web Dashboard (app/page.tsx)            |
      |  * Top Bar: Entire 4-Year Graduation Progress (130 AU Target & ICC)   |
      |  * Left Sidebar: Programme Catalogue Grouped by Year 1 to 4 & ICC     |
      |  * Main Grid: 8-Semester Board with Live Prerequisite & Mutex Alerts  |
      |  * Bottom Drawer: Interactive Skill-Tree & Course Unlock Inspector    |
      +-----------------------------------------------------------------------+
```

---

## Follow the Codelab

Open [CODELAB.md](./CODELAB.md) to begin the step-by-step workshop:
1. Environment Setup, Rules and Scaffolding (`.agents/rules/workspace.md`)
2. Phase 1: Architecture Blueprint and Planning Mode with `/plan`
3. Phase 2: Inspect the Campus Data Layer (`lib/types.ts` and `lib/ntumods.ts`)
4. Phase 3: Launch and Test Your 4-Year Degree Planner (`http://localhost:3000`)
5. Phase 4: Supercharge Your Agent with Skills (`taste-skill`) and `/grill-me` Design Interview
6. Phase 5 (Optional Challenge): One-Click Deploy to Vercel
