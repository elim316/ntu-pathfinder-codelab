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

/**
 * Extracts the study year (1 to 4) from an NTU module code (e.g. "SC2001" -> 2, "CC0001" -> 0).
 */
export function getModuleYearLevel(code) {
  const match = String(code || "").match(/^[A-Z]+(\d)/);
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
  return {
    code: raw.code,
    title: raw.title,
    au: parseFloat(String(raw.au ?? 0)) || 0,
    faculty: raw.faculty || raw.school || "",
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    latestYear: Number(raw.latestYear || raw.latestOffering?.year || 0),
    latestSemester: String(raw.latestSemester || raw.latestOffering?.semester || ""),
    yearLevel: getModuleYearLevel(raw.code),
    isIcc: ICC_CORE_CODES.includes(raw.code),
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
    const mod = normaliseModuleSummary(raw);
    if (mod.isIcc) {
      groups.icc.push(mod);
      continue;
    }
    if (mod.latestYear < 2025) continue;
    if (mod.faculty !== facultyCode) continue;
    // Skip legacy CZ codes in CSC when modern SC equivalents exist
    if (facultyCode === "CSC" && mod.code.startsWith("CZ")) continue;
    if (mod.yearLevel >= 1 && mod.yearLevel <= 4) {
      groups[mod.yearLevel].push(mod);
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
  const targetIndex = SEMESTERS.findIndex((s) => s.id === targetSemId);
  const targetSemObj = SEMESTERS[targetIndex];
  const earlierCodes = new Set();
  const allPlannedCodes = new Set();

  SEMESTERS.forEach((sem, idx) => {
    const codesInSem = plan[sem.id] || [];
    for (const c of codesInSem) {
      if (c !== code) allPlannedCodes.add(c);
      if (idx < targetIndex) earlierCodes.add(c);
    }
  });

  const detail = detailsByCode[code];
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
      (andGroup) => Array.isArray(andGroup) && andGroup.every((reqCode) => earlierCodes.has(reqCode))
    );
  }

  // 2. Check mutual exclusions across the entire 8-semester plan
  const mutexList = Array.isArray(detail.mutuallyExclusiveWith) ? detail.mutuallyExclusiveWith : [];
  const mutexConflicts = mutexList.filter((mCode) => allPlannedCodes.has(mCode));

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
