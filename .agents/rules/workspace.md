# NTU PathFinder Project Rules

## Tech Stack & Conventions
- Framework: Next.js 14 App Router with TypeScript, Tailwind CSS, and `lucide-react` icons.
- Zero API Keys Required: All course data comes from the public NTUMods API (`https://ntumods.com`).

## NTUMods API Endpoints & Data Rules
1. Bulk Catalogue Endpoint (`GET https://ntumods.com/data/api/modules.json`):
   - Returns a JSON object `{ "modules": [ ... ] }`. Always read the array from `data.modules`.
   - Each summary item contains: `code` (string, e.g. `"SC2001"`), `title` (string), `au` (string, e.g. `"3.0"`), `faculty` (string, e.g. `"CSC"`, `"EEE"`, `"BUS"`, `"ACC"`), `categories` (string array), `latestYear` (string, e.g. `"2026"`), `latestSemester` (string), and `isCurrentSemester` (boolean).
   - Convert `au` to a number using `parseFloat(String(item.au ?? 0))`.
   - Filter active modules using `Number(item.latestYear) >= 2025`.
   - Extract the study year (`1` to `4`) from the first digit after the letter prefix (`/^[A-Z]+(\d)/`).
   - For `"CSC"`, exclude legacy `"CZ"` prefixed codes (`CZ1xxx` to `CZ4xxx`) so only current `"SC"` codes appear.
   - Always group the 7 compulsory University-wide Interdisciplinary Collaborative Core (ICC) modules (`CC0001`, `CC0002`, `CC0003`, `CC0005`, `CC0006`, `CC0007`, `ML0004`) into a dedicated `ICC` tab available to every degree programme.

2. Single Module Detail Endpoint (`GET https://ntumods.com/api/modules/{code}`):
   - Returns detailed graph fields for a specific uppercase module code:
     - `au`: number (e.g. `3`), `school`: string, `description`: string.
     - `prerequisites`: 2D array in Disjunctive Normal Form (OR of AND-groups). For example, `[["MH1812", "SC1007"], ["SC1007", "SC1124"]]` means `(MH1812 AND SC1007) OR (SC1007 AND SC1124)` must be placed in a strictly earlier semester on the board.
     - `requiredBy`: string array of downstream modules that this module unlocks (used for skill-tree highlighting).
     - `mutuallyExclusiveWith`: string array of conflicting module codes that cannot be taken together.
     - `latestOffering` and `otherSemesters`: used to check whether a module is offered in Semester `"1"`, Semester `"2"`, or both.

## 4-Year Degree Planner UI Specifications
- Top Sticky Bar (Entire University Journey):
  - Programme selector dropdown (`CSC`, `CE`, `EEE`, `BUS`, `ACC`, `ME`, `MATH`, `ECON`, `PSY`, `CBE`, `CEE`, `BS`).
  - Keyword search input to filter modules by code or topic (e.g. `AI`, `Cyber`, `Finance`).
  - "Load Sample CS Roadmap" button that populates a starter 8-semester Computer Science plan (`SC1003`, `MH1812`, `SC1007`, `SC2001`, `SC2002`, `SC3000`, and the 7 `CC000x`/`ML0004` ICC cores).
  - Graduation Progress Bar tracking Total AUs (out of 130 AUs), Core/Major AUs, ICC AUs (out of 17 AUs), and a live Prerequisite Status badge.
- Left Sidebar (Programme Catalogue):
  - Tabs for `Year 1`, `Year 2`, `Year 3`, `Year 4`, and `ICC`.
  - Target semester dropdown (`Year 1 Sem 1` through `Year 4 Sem 2`) and `+ Add` button on each module card.
- Main Board (4 Years / 8 Semesters Grid):
  - Organised into 4 Year boxes (`Year 1` to `Year 4`), each split into `Sem 1` and `Sem 2` columns (`Y1S1` to `Y4S2`).
  - Each planned card displays its code, title, AU badge, remove (`x`) button, and live validation badge:
    - Green (`Valid`) when all prerequisites are satisfied in earlier semesters.
    - Red (`Needs: ...` or `Mutex: ...`) when a prerequisite is missing from earlier semesters or a mutually exclusive module is on the board.
    - Blue highlight ring (`Unlocked by ...`) when the user clicks an earlier foundation module that unlocks this course.
- Bottom Skill-Tree Inspector Panel:
  - Clicking any module card shows its full description, DNF prerequisites, the list of downstream modules it unlocks (`requiredBy`), and mutually exclusive courses.
