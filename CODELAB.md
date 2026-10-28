summary: Introduction to Google Antigravity: Build your own NTU 4-Year Degree & Prerequisite Skill-Tree Planner
id: build-ntu-pathfinder-antigravity
categories: AI, Web, Campus
tags: antigravity, ntu, ntumods, mcp
status: Published
authors: NTU Developer Workshop

# Introduction to Google Antigravity: Build your own NTU 4-Year Degree & Prerequisite Skill-Tree Planner

## 1. Overview
Duration: 0:05

In this hands-on codelab, you will practice Spec-Driven Development (SDD) using Google Antigravity to build NTU PathFinder, an interactive 4-year university degree roadmap and prerequisite skill-tree visualiser powered by the live `ntumods.com` public API and Remote MCP Server.

Instead of planning one semester at a time on spreadsheets or static PDF handbooks, your web application maps out your entire 8-semester NTU journey (Year 1 Sem 1 to Year 4 Sem 2) across three levels:
1. Entire University Journey (Top Bar): Tracks your cumulative Academic Units (AUs), Core/Major AUs, and compulsory Interdisciplinary Collaborative Core (ICC) AUs against your 130 AU graduation target.
2. Per Year (1xxx to 4xxx Catalogue): Dynamically loads modules for any NTU faculty (`CSC`, `CE`, `EEE`, `BUS`, `ACC`, `ME`, `MATH`, `ECON`, `PSY`, `CBE`, `CEE`, `BS`) and groups them into Year 1 (`1xxx`) through Year 4 (`4xxx`) plus University ICC cores (`CC0001` to `CC0007`, `ML0004`).
3. Per Semester (Skill-Tree & Prerequisite Engine): Validates 2D Disjunctive Normal Form (DNF) prerequisite chains, checks mutual exclusions (`mutex`), warns when a module is placed in the wrong semester (`Sem 1` vs `Sem 2`), and lights up downstream Year 3 and Year 4 courses that each module unlocks.

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

### What you will learn
- How to connect Google Antigravity to the live NTUMods Remote MCP Server (`https://ntumods.com/mcp`).
- How to anchor an AI coding agent with explicit API contracts in `.agents/rules/` so it avoids real-world schema pitfalls.
- How to use `/plan` mode in Antigravity to design a clean architecture before generating code.
- How to build and test a zero-key frontend web application against the `ntumods.com` Open Data and REST APIs.


## 2. Environment Setup, MCP & Rule Anchoring
Duration: 0:10

Before asking the agent to write code, we will configure the NTUMods MCP server and create an architectural rule file that tells Antigravity the exact schema of the `ntumods.com` endpoints.

### Step 2.1: Connect the NTUMods Remote MCP Server
Open your Antigravity MCP settings and add the public NTUMods streamable HTTP MCP endpoint:

```json
{
  "mcpServers": {
    "ntumods": {
      "url": "https://ntumods.com/mcp"
    }
  }
}
```

This gives your Antigravity agent direct access to six live tools (`search_modules`, `get_module`, `get_module_indexes`, `get_exam`, `list_exams`, and `list_semesters`) without any API key.

### Step 2.2: Anchor the Agent with `.agents/rules/ntumods-api-contract.md`
During live testing of `ntumods.com`, we identified six real schema quirks between the bulk catalogue endpoint (`GET /data/api/modules.json`) and the single module detail endpoint (`GET /api/modules/{code}`) that will break naive code if not specified upfront.

Create `.agents/rules/ntumods-api-contract.md` in your workspace with the following specification:

```markdown
# NTUMods API Contract & Schema Guardrails

Always follow these verified API rules when fetching or parsing data from `https://ntumods.com`:

1. Bulk Catalogue Endpoint (`GET https://ntumods.com/data/api/modules.json`):
   - Returns a JSON object `{ "modules": [ ...4383 items... ] }`, NOT a top-level array. Always read `data.modules`.
   - Each item contains ONLY summary fields: `code` (string), `title` (string), `au` (string, e.g. `"3.0"`), `faculty` (string, e.g. `"CSC"`, `"EEE"`, `"BUS"`, `"ACC"`), `categories` (string array), `latestYear` (string, e.g. `"2026"`), `latestSemester` (string), and `isCurrentSemester` (boolean).
   - It does NOT contain `prerequisites`, `requires`, `requiredBy`, or `mutuallyExclusiveWith`.

2. Single Module Detail Endpoint (`GET https://ntumods.com/api/modules/{code}`):
   - Use uppercase module codes (e.g. `https://ntumods.com/api/modules/SC2001`).
   - Returns rich graph fields:
     - `au`: number (e.g. `3`), unlike the string `"3.0"` in `modules.json`. Always normalise with `parseFloat(String(raw.au ?? 0))`.
     - `school`: string (e.g. `"CSC"`), unlike `"faculty"` in `modules.json`. Always normalise with `raw.faculty || raw.school || ""`.
     - `prerequisites`: 2D array in Disjunctive Normal Form (OR of AND-groups). For example, `[["MH1812", "SC1007"], ["SC1007", "SC1124"]]` means `(MH1812 AND SC1007) OR (SC1007 AND SC1124)` must be completed in a strictly earlier semester.
     - `requiredBy`: string array of downstream modules that this module unlocks (e.g. `["SC2001", "SC2002", "SC3000"]`).
     - `mutuallyExclusiveWith`: string array of conflicting module codes (e.g. `["CZ2001", "CE2001"]`).
     - `latestOffering` and `otherSemesters`: used to check whether a course is offered in Semester `"1"`, Semester `"2"`, or both.

3. Filtering & Curriculum Grouping Rules:
   - Filter active modules using `Number(m.latestYear) >= 2025` rather than `isCurrentSemester === true`, because foundational Semester 1 courses like `SC1003` have `latestYear: "2025"` and `isCurrentSemester: false` during Semester 2.
   - Extract the recommended study year (`1` to `4`) from the first digit after the letter prefix (`/^[A-Z]+(\d)/`).
   - For `"CSC"`, exclude legacy `"CZ"` prefixed codes (`CZ1xxx` to `CZ4xxx`) so students only see modern `"SC"` codes.
   - University-wide Interdisciplinary Collaborative Core (ICC) modules (`CC0001`, `CC0002`, `CC0003`, `CC0005`, `CC0006`, `CC0007`, `ML0004`) are stored under various host faculties (`EEE`, `CSC`, `SSM`) in `modules.json`. Always surface these 7 ICC modules in a dedicated ICC tab for every programme.
```


## 3. Phase 1: Architecture Blueprint with `/plan`
Duration: 0:10

Instead of jumping straight to code generation, use Antigravity's `/plan` command to align on the application structure.

Paste the following prompt into Antigravity:

```text
/plan Read .agents/rules/ntumods-api-contract.md. Design a clean, modular architecture for NTU PathFinder, a 4-Year Degree & Prerequisite Skill-Tree Planner web app with two core files:
1. planner-engine.mjs: Pure ES module containing the data normalisation, faculty/year catalogue grouping, and 8-semester DNF prerequisite, mutual-exclusion, and semester-offering validation functions.
2. index.html: Responsive single-page web UI using Tailwind CSS with a top Graduation AU progress bar, a left Programme Catalogue sidebar grouped by Year 1-4 and ICC tabs, an 8-semester (Year 1 Sem 1 to Year 4 Sem 2) interactive board, and a bottom Prerequisite & Skill-Tree Inspector panel.
```

Review the generated `implementation_plan.md` to confirm that `planner-engine.mjs` is cleanly separated from the DOM rendering logic so it can be unit-tested independently.


## 4. Phase 2: Build the Data & Prerequisite Engine
Duration: 0:15

Ask Antigravity to generate `planner-engine.mjs` following the rules in `.agents/rules/ntumods-api-contract.md`, or verify that your generated file matches the reference implementation in [`planner-engine.mjs`](./planner-engine.mjs).


## 5. Phase 3: Build the Interactive 4-Year Board & Skill-Tree UI
Duration: 0:15

Now prompt Antigravity to build `index.html` importing `./planner-engine.mjs`:

```text
Create index.html importing ./planner-engine.mjs. Include:
1. A sticky header with a Programme selector (CSC, CE, EEE, BUS, ACC, ME, MATH, ECON, PSY, CBE, CEE, BS), a keyword search filter, a "Load Sample CS Roadmap" button, and a live Graduation AU progress bar (Total AUs out of 130, Core/Major AUs, ICC AUs out of 17, and prerequisite status banner).
2. A left sidebar with Year 1, Year 2, Year 3, Year 4, and ICC tabs plus an "Add to Semester" selector (Y1S1 to Y4S2).
3. A 4-Year / 8-Semester grid where each planned module card validates its prerequisites and mutual exclusions via validateModuleInSlot(), highlights missing prerequisites in rose red, and highlights unlocked downstream courses in blue when a module is clicked.
4. A bottom Inspector panel showing the selected module's live description, DNF prerequisites, unlocked modules (requiredBy), and mutually exclusive courses from GET https://ntumods.com/api/modules/{code}.
```


## 6. Phase 4: Launch, Test & Try Out Edge Cases
Duration: 0:10

### Step 6.1: Run the Automated Test Suite
Verify your engine logic before opening the browser:

```bash
node test-pathfinder.mjs
```

### Step 6.2: Serve the Application Locally
Start a local static server from your project folder:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` in your browser. Both `https://ntumods.com/data/api/modules.json` and `https://ntumods.com/api/modules/{code}` include `Access-Control-Allow-Origin: *`, so browser `fetch()` calls work directly from `localhost` without a proxy.

### Step 6.3: Interactive Scenarios to Test
1. Skill-Tree Unlock Highlighting:
   - Click `SC1007 (Data Structures & Algorithms)` in `Year 1 Sem 2`.
   - Watch `SC2001`, `SC2002`, and `SC3000` light up in blue across Year 2 and Year 3, and switch to the `Year 3` or `Year 4` tab in the left catalogue to see all 11 downstream modules badged with `Unlocked by SC1007`.
2. Prerequisite Violation Detection:
   - Click the `×` button on `MH1812 (Discrete Mathematics)` in `Year 1 Sem 1`.
   - Watch `SC2001 (Algorithm Design & Analysis)` in `Year 2 Sem 1` immediately turn red with `Needs: MH1812+SC1007 or SC1007+SC1124`, and the top status banner change to `1 prerequisite or mutex issue(s) detected`.
3. Same-Semester Prerequisite Trap:
   - Add `MH1812` into `Year 2 Sem 1` (the same semester as `SC2001`).
   - Verify that `SC2001` remains flagged as a conflict because prerequisites must be completed in a strictly earlier semester (`Y1S1` or `Y1S2`).
4. Cross-Faculty Switching:
   - Switch the Programme dropdown from `CSC` to `BUS`, `EEE`, or `PSY` and verify that the Year 1 to Year 4 tabs repopulate immediately while preserving the 7 compulsory ICC modules in the `ICC` tab.


## 7. Phase 5: AI Career Track Extension with NTUMods MCP
Duration: 0:05

As a final workshop challenge, use the `ntumods` MCP server in Antigravity chat to generate a custom preset for your own major and career specialisation:

```text
Using the ntumods MCP server, find the core Year 1 and Year 2 modules for my degree programme plus 4 Year 3/Year 4 prescribed electives focused on [Artificial Intelligence / Quantitative Finance / Robotics / Cybersecurity]. Verify their prerequisites using get_module, and add a new preset button to index.html that loads my custom 8-semester roadmap.
```
