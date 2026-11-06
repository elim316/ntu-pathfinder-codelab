// Core NTU PathFinder Data & Validation Engine
// Tested against live ntumods.com API payloads (/data/api/modules.json and /api/modules/{code})

export const ICC_CORE_CODES = [
  "CC0001",
  "CC0002",
  "CC0003",
  "CC0005",
  "CC0006",
  "CC0007",
  "ML0004",
];

export const ICC_CORE_SET = new Set(ICC_CORE_CODES);

export const SEMESTERS = [
  { id: "Y1S1", year: 1, sem: 1, label: "Year 1 Sem 1" },
  { id: "Y1S2", year: 1, sem: 2, label: "Year 1 Sem 2" },
  { id: "Y2S1", year: 2, sem: 1, label: "Year 2 Sem 1" },
  { id: "Y2S2", year: 2, sem: 2, label: "Year 2 Sem 2" },
  { id: "Y3S1", year: 3, sem: 1, label: "Year 3 Sem 1" },
  { id: "Y3S2", year: 3, sem: 2, label: "Year 3 Sem 2" },
  { id: "Y4S1", year: 4, sem: 1, label: "Year 4 Sem 1" },
  { id: "Y4S2", year: 4, sem: 2, label: "Year 4 Sem 2" },
];

export const VALID_SEMESTER_IDS = new Set(SEMESTERS.map((s) => s.id));

export const SEMESTER_INDEX_BY_ID = new Map(
  SEMESTERS.map((s, idx) => [s.id, idx])
);

/**
 * Escapes untrusted text before interpolation into DOM strings.
 * Neutralises HTML markup, quotes, and script injection vectors.
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Validates module code structure (e.g. SC2001, CC0001, MH1812).
 * Prevents path traversal and injection via malformed codes.
 * Rejects prototype pollution property keys.
 */
export function isValidModuleCode(code) {
  if (typeof code !== "string") return false;
  const upper = code.trim().toUpperCase();
  if (upper === "__PROTO__" || upper === "CONSTRUCTOR" || upper === "PROTOTYPE") {
    return false;
  }
  return /^[A-Z0-9]{5,10}$/.test(upper);
}

/**
 * Extracts the study year (1 to 4) from an NTU module code (e.g. "SC2001" -> 2, "CC0001" -> 0).
 */
export function getModuleYearLevel(code) {
  if (!code || typeof code !== "string") return 0;
  const match = code.match(/^[A-Z]+(\d)/);
  if (!match) return 0;
  const digit = Number(match[1]);
  return digit >= 1 && digit <= 4 ? digit : 0;
}

/**
 * Normalises a raw item from /data/api/modules.json or /api/modules/{code}.
 * Handles the schema differences between bulk and detail endpoints:
 * - Bulk uses `faculty` (string) and `au` (string "3.0")
 * - Detail uses `school` (string) and `au` (number 3)
 */
export function normaliseModuleSummary(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      code: "",
      title: "",
      au: 0,
      faculty: "",
      categories: [],
      latestYear: 0,
      latestSemester: "",
      yearLevel: 0,
      isIcc: false,
    };
  }
  const code = String(raw.code || "").toUpperCase();
  return {
    code,
    title: String(raw.title || ""),
    au: parseFloat(String(raw.au ?? 0)) || 0,
    faculty: String(raw.faculty || raw.school || ""),
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    latestYear: Number(raw.latestYear || raw.latestOffering?.year || 0),
    latestSemester: String(raw.latestSemester || raw.latestOffering?.semester || ""),
    yearLevel: getModuleYearLevel(code),
    isIcc: ICC_CORE_SET.has(code),
  };
}

/**
 * Filters the bulk /data/api/modules.json payload ({ modules: [...] }) by faculty
 * and groups active modules (latestYear >= 2025) into Year 1-4 plus ICC common cores.
 * Prioritises modern SCxxxx codes over legacy CZxxxx codes for CSC.
 */
export function groupCatalogueByYear(bulkPayload, facultyCode) {
  const rawList = Array.isArray(bulkPayload) ? bulkPayload : bulkPayload?.modules || [];
  const groups = { 1: [], 2: [], 3: [], 4: [], icc: [] };

  for (const raw of rawList) {
    if (!raw || !raw.code) continue;
    const code = String(raw.code).toUpperCase();
    const isIcc = ICC_CORE_SET.has(code);

    if (isIcc) {
      groups.icc.push(normaliseModuleSummary(raw));
      continue;
    }

    const latestYear = Number(raw.latestYear || raw.latestOffering?.year || 0);
    if (latestYear < 2025) continue;

    const faculty = raw.faculty || raw.school || "";
    if (faculty !== facultyCode) continue;

    // Skip legacy CZ codes in CSC when modern SC equivalents exist
    if (facultyCode === "CSC" && code.startsWith("CZ")) continue;

    const yearLevel = getModuleYearLevel(code);
    if (yearLevel >= 1 && yearLevel <= 4) {
      groups[yearLevel].push(normaliseModuleSummary(raw));
    }
  }

  for (const key of [1, 2, 3, 4, "icc"]) {
    groups[key].sort((a, b) => a.code.localeCompare(b.code));
  }
  return groups;
}

/**
 * Evaluates whether a module's prerequisites, mutual exclusions, and semester offerings
 * are satisfied given the current 8-semester plan (`plan` maps semesterId -> array of module codes)
 * and a dictionary of hydrated module details (`detailsByCode`).
 *
 * Note on NTUMods `prerequisites` schema:
 * `prerequisites` is a 2D DNF array (OR of AND-groups):
 * e.g. [["MH1812", "SC1007"], ["SC1007", "SC1124"]]
 * means (MH1812 AND SC1007) OR (SC1007 AND SC1124) must appear in STRICTLY EARLIER semesters.
 */
export function validateModuleInSlot(code, targetSemId, plan, detailsByCode) {
  if (!VALID_SEMESTER_IDS.has(targetSemId)) {
    return {
      status: "unverified",
      prereqMet: false,
      missingPrereqGroups: [],
      mutexConflicts: [],
      semesterWarning: `Invalid semester: ${targetSemId}`,
      unlocks: [],
    };
  }

  const targetIndex = SEMESTER_INDEX_BY_ID.get(targetSemId) ?? -1;
  const targetSemObj = targetIndex >= 0 ? SEMESTERS[targetIndex] : null;
  const earlierCodes = new Set();
  const allPlannedCodes = new Set();

  for (let idx = 0; idx < SEMESTERS.length; idx++) {
    const sem = SEMESTERS[idx];
    const codesInSem = plan && Array.isArray(plan[sem.id]) ? plan[sem.id] : [];
    for (const c of codesInSem) {
      if (typeof c === "string") {
        const upper = c.toUpperCase();
        if (upper !== code.toUpperCase()) allPlannedCodes.add(upper);
        if (idx < targetIndex) earlierCodes.add(upper);
      }
    }
  }

  const detail =
    detailsByCode && typeof detailsByCode === "object"
      ? detailsByCode[code] || detailsByCode[code.toUpperCase()] || null
      : null;
  if (!detail) {
    return {
      status: "unverified",
      prereqMet: true,
      missingPrereqGroups: [],
      mutexConflicts: [],
      semesterWarning: null,
      unlocks: [],
    };
  }

  // 1. Check 2D DNF prerequisites against strictly earlier semesters
  const prereqGroups = Array.isArray(detail.prerequisites) ? detail.prerequisites : [];
  let prereqMet = true;
  if (prereqGroups.length > 0) {
    prereqMet = prereqGroups.some(
      (andGroup) =>
        Array.isArray(andGroup) &&
        andGroup.length > 0 &&
        andGroup.every(
          (reqCode) =>
            typeof reqCode === "string" && earlierCodes.has(reqCode.toUpperCase())
        )
    );
  }

  // 2. Check mutual exclusions across the entire 8-semester plan
  const mutexList = Array.isArray(detail.mutuallyExclusiveWith) ? detail.mutuallyExclusiveWith : [];
  const mutexConflicts = mutexList.filter(
    (mCode) => typeof mCode === "string" && allPlannedCodes.has(mCode.toUpperCase())
  );

  // 3. Check if module has historically been offered in targetSemObj.sem ("1" or "2")
  const offeredSemesters = new Set();
  if (detail.latestOffering?.semester) {
    offeredSemesters.add(String(detail.latestOffering.semester));
  }
  for (const s of detail.otherSemesters || []) {
    if (s?.semester) offeredSemesters.add(String(s.semester));
  }
  let semesterWarning = null;
  if (
    targetSemObj &&
    offeredSemesters.size > 0 &&
    !offeredSemesters.has(String(targetSemObj.sem))
  ) {
    semesterWarning = `${code} is typically only offered in Semester ${Array.from(offeredSemesters).join("/")}`;
  }

  return {
    status: !prereqMet || mutexConflicts.length > 0 ? "conflict" : semesterWarning ? "warning" : "valid",
    prereqMet,
    missingPrereqGroups: prereqMet ? [] : prereqGroups,
    mutexConflicts,
    semesterWarning,
    unlocks: Array.isArray(detail.requiredBy) ? detail.requiredBy : [],
  };
}

/**
 * Pure calculation of graduation progress metrics (total AU, core AU, ICC AU, and conflict count)
 * across the 8-semester roadmap. Decouples state calculation from DOM rendering.
 */
export function calculateDegreeProgress(plan, summaryByCode, detailsByCode) {
  let totalAu = 0;
  let coreAu = 0;
  let iccAu = 0;
  let conflictCount = 0;

  for (const sem of SEMESTERS) {
    const codes = plan && Array.isArray(plan[sem.id]) ? plan[sem.id] : [];
    for (const code of codes) {
      if (typeof code !== "string") continue;
      const sum =
        summaryByCode && summaryByCode[code]
          ? summaryByCode[code]
          : { code, title: code, au: 3, isIcc: false };
      totalAu += sum.au;
      if (sum.isIcc) {
        iccAu += sum.au;
      } else {
        coreAu += sum.au;
      }
      const check = validateModuleInSlot(code, sem.id, plan, detailsByCode);
      if (check.status === "conflict") {
        conflictCount++;
      }
    }
  }

  return {
    totalAu,
    coreAu,
    iccAu,
    conflictCount,
    percentage: Math.min(100, Math.round((totalAu / 130) * 100)),
  };
}

