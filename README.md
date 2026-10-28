# NTU PathFinder: 4-Year Degree & Prerequisite Skill-Tree Workshop

Hands-on Spec-Driven Development (SDD) codelab for building an interactive 4-year Nanyang Technological University (NTU) course roadmap and prerequisite skill-tree visualiser using Google Antigravity and the public [NTUMods Developer API](https://ntumods.com/developers) (`https://ntumods.com/mcp` and `https://ntumods.com/data/api/modules.json`).

- Step-by-Step Codelab Guide: [CODELAB.md](./CODELAB.md)
- Agent API Contract & Guardrails: [.agents/rules/ntumods-api-contract.md](./.agents/rules/ntumods-api-contract.md)
- Core Validation Engine: [planner-engine.mjs](./planner-engine.mjs)
- Single-Page Web Application: [index.html](./index.html)
- Automated Verification Suite: [test-pathfinder.mjs](./test-pathfinder.mjs)

---

## Architecture Overview

Unlike single-semester timetable builders, NTU PathFinder plans a student's entire 4-year university journey across 8 semesters (`Year 1 Sem 1` to `Year 4 Sem 2`) using zero API keys and zero backend databases:

```text
+-----------------------------------------------------------------------------------+
| ENTIRE UNI JOURNEY (Top Bar): Total Graduation Progress: 102 / 130 AUs            |
+-----------------------------------------------------------------------------------+
|      YEAR 1 (1xxx)      |      YEAR 2 (2xxx)      |      YEAR 3 (3xxx)      | ... |
+------------+------------+------------+------------+------------+------------+-----+
|   Sem 1    |   Sem 2    |   Sem 1    |   Sem 2    |   Sem 1    |   Sem 2    | ... |
|            |            |            |            |            |            |     |
| [SC1003]   | [SC1007]   | [SC2001]   | [SC2002]   | [SC3000]   | [CC0007]   |     |
|  3 AU      |  3 AU      |  3 AU      |  3 AU      |  3 AU      |  3 AU      |     |
|  (Unlocks  |  (Needs    |  (Needs    |  (Needs    |  (Needs    |  (ICC      |     |
|   SC1007)  |   SC1003)  |   SC1007+  |   SC1003)  |   SC1007+  |   Core)    |     |
|            |            |   MH1812)  |            |   SC2000)  |            |     |
+------------+------------+------------+------------+------------+------------+-----+
```

1. Entire University Journey (Top Bar): Tracks cumulative Academic Units (AUs), Core/Major AUs, and compulsory Interdisciplinary Collaborative Core (ICC) AUs toward the 130 AU graduation target.
2. Per Year (`1xxx` to `4xxx` Catalogue): Filters `GET https://ntumods.com/data/api/modules.json` dynamically by faculty (`CSC`, `CE`, `EEE`, `BUS`, `ACC`, `ME`, `MATH`, `ECON`, `PSY`, `CBE`, `CEE`, `BS`) and organises courses into Year 1 (`1xxx`) through Year 4 (`4xxx`) plus University ICC cores (`CC0001` to `CC0007`, `ML0004`).
3. Per Semester (Skill-Tree & Prerequisite Engine): Hydrates `GET https://ntumods.com/api/modules/{code}` on demand to evaluate 2D Disjunctive Normal Form (DNF) prerequisite groups, mutual exclusions (`mutuallyExclusiveWith`), semester offering availability, and downstream course unlocks (`requiredBy`).

---

## Quick Start

### 1. Run the Automated Test Suite
```bash
node test-pathfinder.mjs
```

### 2. Launch the Web App Locally
```bash
python3 -m http.server 8080
```
Then open `http://localhost:8080` in your browser.

---

## Full Step-by-Step Workshop Guide

Follow [CODELAB.md](./CODELAB.md) for the complete 60-minute Google Codelabs walkthrough, including:
- Phase 0: Connecting the remote NTUMods MCP Server (`https://ntumods.com/mcp`) and anchoring Antigravity with `.agents/rules/ntumods-api-contract.md`.
- Phase 1: Generating the implementation blueprint with `/plan`.
- Phase 2: Writing the normalised data and DNF prerequisite validation engine (`planner-engine.mjs`).
- Phase 3: Building the 8-semester board and skill-tree visualiser (`index.html`).
- Phase 4: Testing real-world edge cases (missing prerequisites, same-semester prerequisite traps, mutual exclusions, and cross-faculty switching).
- Phase 5: Extending the board with AI Career Track presets via the NTUMods MCP server.
