import assert from "node:assert/strict";
import {
  getModuleYearLevel,
  normaliseModuleSummary,
  groupCatalogueByYear,
  validateModuleInSlot,
} from "./planner-engine.mjs";

// Real payload snapshots from GET https://ntumods.com/data/api/modules.json and GET https://ntumods.com/api/modules/{code}
const sampleBulkPayload = {
  modules: [
    { code: "SC1003", title: "Introduction To Computational Thinking & Programming", au: "3.0", faculty: "CSC", categories: ["CORE", "MLOAD", "GLOAD"], latestYear: "2025", latestSemester: "2", isCurrentSemester: false },
    { code: "SC1007", title: "Data Structures & Algorithms", au: "3.0", faculty: "CSC", categories: ["CORE", "MLOAD", "GLOAD"], latestYear: "2026", latestSemester: "2", isCurrentSemester: true },
    { code: "MH1812", title: "Discrete Mathematics", au: "3.0", faculty: "MATH", categories: ["CORE", "GLOAD"], latestYear: "2026", latestSemester: "2", isCurrentSemester: true },
    { code: "SC2001", title: "Algorithm Design & Analysis", au: "3.0", faculty: "CSC", categories: ["CORE", "MLOAD", "GLOAD"], latestYear: "2026", latestSemester: "2", isCurrentSemester: true },
    { code: "CZ2001", title: "Algorithms", au: "3.0", faculty: "CSC", categories: ["CORE"], latestYear: "2025", latestSemester: "2", isCurrentSemester: false },
    { code: "SC3000", title: "Artificial Intelligence", au: "3.0", faculty: "CSC", categories: ["CORE", "GLOAD"], latestYear: "2026", latestSemester: "2", isCurrentSemester: true },
    { code: "SC4001", title: "Neural Networks & Deep Learning", au: "3.0", faculty: "CSC", categories: ["CORE", "GLOAD"], latestYear: "2026", latestSemester: "2", isCurrentSemester: true },
    { code: "CC0001", title: "Inquiry & Communication in an Interdisciplinary World", au: "2.0", faculty: "EEE", categories: ["CORE"], latestYear: "2026", latestSemester: "2", isCurrentSemester: true },
    { code: "CC0002", title: "Navigating the Digital World", au: "2.0", faculty: "CSC", categories: ["CORE"], latestYear: "2026", latestSemester: "2", isCurrentSemester: true },
    { code: "CC0003", title: "Ethics & Civics in a Multicultural World", au: "2.0", faculty: "SSM", categories: ["CORE"], latestYear: "2026", latestSemester: "2", isCurrentSemester: true },
    { code: "CC0005", title: "Healthy Living & Wellbeing", au: "3.0", faculty: "EEE", categories: ["CORE"], latestYear: "2026", latestSemester: "2", isCurrentSemester: true },
    { code: "CC0006", title: "Sustainability: Society, Economy & Environment", au: "3.0", faculty: "CSC", categories: ["CORE"], latestYear: "2026", latestSemester: "2", isCurrentSemester: true },
    { code: "CC0007", title: "Science & Technology for Humanity", au: "3.0", faculty: "CSC", categories: ["CORE"], latestYear: "2026", latestSemester: "2", isCurrentSemester: true },
    { code: "ML0004", title: "Career Design & Workplace Readiness in a Dynamic World", au: "2.0", faculty: "SSM", categories: ["CORE"], latestYear: "2026", latestSemester: "2", isCurrentSemester: true },
  ],
};

const detailsByCode = {
  SC1003: {
    code: "SC1003",
    title: "Introduction To Computational Thinking & Programming",
    au: 3,
    school: "CSC",
    prerequisites: [],
    requiredBy: ["SC1007", "SC2002"],
    mutuallyExclusiveWith: ["CZ1003", "CZ1103"],
    latestOffering: { year: "2025", semester: "2" },
    otherSemesters: [{ year: "2025", semester: "1" }],
  },
  SC1007: {
    code: "SC1007",
    title: "Data Structures & Algorithms",
    au: 3,
    school: "CSC",
    prerequisites: [["SC1003"], ["SC1001"]],
    requiredBy: ["SC2001", "SC2002", "SC3000", "SC4001"],
    mutuallyExclusiveWith: ["CZ1007", "CZ1107"],
    latestOffering: { year: "2026", semester: "2" },
    otherSemesters: [{ year: "2026", semester: "1" }],
  },
  SC2001: {
    code: "SC2001",
    title: "Algorithm Design & Analysis",
    au: 3,
    school: "CSC",
    prerequisites: [["MH1812", "SC1007"], ["SC1007", "SC1124"]],
    requiredBy: ["SC3270", "SC4002", "SC4020"],
    mutuallyExclusiveWith: ["CE2001", "CZ2001"],
    latestOffering: { year: "2026", semester: "2" },
    otherSemesters: [{ year: "2026", semester: "1" }],
  },
};

// Test 1: Year level extraction
assert.equal(getModuleYearLevel("SC1003"), 1);
assert.equal(getModuleYearLevel("SC2001"), 2);
assert.equal(getModuleYearLevel("SC3000"), 3);
assert.equal(getModuleYearLevel("SC4001"), 4);
assert.equal(getModuleYearLevel("CC0001"), 0);
console.log("PASS Test 1: getModuleYearLevel handles 1xxx-4xxx and CC000x codes");

// Test 2: Normalising string vs number AU and faculty vs school
const fromBulk = normaliseModuleSummary(sampleBulkPayload.modules.find((m) => m.code === "SC2001"));
const fromDetail = normaliseModuleSummary(detailsByCode.SC2001);
assert.equal(typeof fromBulk.au, "number");
assert.equal(fromBulk.au, 3);
assert.equal(fromDetail.au, 3);
assert.equal(fromBulk.faculty, "CSC");
assert.equal(fromDetail.faculty, "CSC");
console.log("PASS Test 2: normaliseModuleSummary unifies bulk (faculty/string AU) and detail (school/number AU)");

// Test 3: Grouping CSC modules by Year 1-4 and ICC
const cscGroups = groupCatalogueByYear(sampleBulkPayload, "CSC");
assert.ok(cscGroups[1].some((m) => m.code === "SC1003"), "SC1003 (latestYear 2025) must be preserved in Year 1");
assert.ok(cscGroups[1].some((m) => m.code === "SC1007"), "SC1007 must be in Year 1");
assert.ok(cscGroups[2].some((m) => m.code === "SC2001"), "SC2001 must be in Year 2");
assert.ok(!cscGroups[2].some((m) => m.code === "CZ2001"), "Legacy CZ2001 should be filtered out for CSC");
assert.equal(cscGroups.icc.length, 7, "All 7 ICC common core modules must be included across faculties");
console.log("PASS Test 3: groupCatalogueByYear populates Y1-Y4 + 7 ICC modules and excludes legacy CZ duplicates");

// Test 4: Prerequisite validation (2D DNF array)
const invalidPlan = {
  Y1S1: ["SC1003"],
  Y1S2: [],
  Y2S1: ["SC2001"],
};
const resInvalid = validateModuleInSlot("SC2001", "Y2S1", invalidPlan, detailsByCode);
assert.equal(resInvalid.status, "conflict");
assert.equal(resInvalid.prereqMet, false);
console.log("PASS Test 4A: Detects missing DNF prerequisites for SC2001 when SC1007 & MH1812 are missing");

const validPlan = {
  Y1S1: ["SC1003"],
  Y1S2: ["SC1007", "MH1812"],
  Y2S1: ["SC2001"],
};
const resValid = validateModuleInSlot("SC2001", "Y2S1", validPlan, detailsByCode);
assert.equal(resValid.status, "valid");
assert.equal(resValid.prereqMet, true);
assert.ok(resValid.unlocks.includes("SC4002"));
console.log("PASS Test 4B: Validates SC2001 when (MH1812 AND SC1007) are completed in earlier semesters");

const sameSemPlan = {
  Y1S1: ["SC1003"],
  Y1S2: [],
  Y2S1: ["SC1007", "MH1812", "SC2001"],
};
const resSameSem = validateModuleInSlot("SC2001", "Y2S1", sameSemPlan, detailsByCode);
assert.equal(resSameSem.prereqMet, false);
console.log("PASS Test 4C: Rejects prerequisite taken in the same semester rather than an earlier semester");

const mutexPlan = {
  Y1S1: ["SC1003"],
  Y1S2: ["SC1007", "MH1812", "CZ2001"],
  Y2S1: ["SC2001"],
};
const resMutex = validateModuleInSlot("SC2001", "Y2S1", mutexPlan, detailsByCode);
assert.equal(resMutex.status, "conflict");
assert.deepEqual(resMutex.mutexConflicts, ["CZ2001"]);
console.log("PASS Test 4D: Detects mutuallyExclusiveWith conflict (SC2001 vs CZ2001)");

console.log("\nALL TESTS PASSED!");
