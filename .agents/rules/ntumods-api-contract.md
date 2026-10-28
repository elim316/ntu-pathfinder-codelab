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
