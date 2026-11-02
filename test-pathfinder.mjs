import assert from "node:assert/strict";
import {
  getModuleYearLevel,
  normaliseModuleSummary,
  groupCatalogueByYear,
  validateModuleInSlot,
  escapeHtml,
  isValidModuleCode,
  ICC_CORE_SET,
  ICC_CORE_CODES,
  VALID_SEMESTER_IDS,
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

// Test 5: Cyber Security - HTML Escaping & XSS Sanitisation
assert.equal(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
assert.equal(escapeHtml('"><img src=x onerror=alert(1)>'), '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
assert.equal(escapeHtml("' onfocus='alert(1)"), '&#39; onfocus=&#39;alert(1)');
assert.equal(escapeHtml("Ben & Jerry's"), "Ben &amp; Jerry&#39;s");
assert.equal(escapeHtml(null), "");
assert.equal(escapeHtml(undefined), "");
assert.equal(escapeHtml(123), "123");
console.log("PASS Test 5: escapeHtml safely neutralises script injection, quotes, ampersands, and handles edge cases");

// Test 6: Cyber Security - Course Code Validation & Path Traversal Prevention
assert.equal(isValidModuleCode("SC2001"), true);
assert.equal(isValidModuleCode("CC0001"), true);
assert.equal(isValidModuleCode("MH1812"), true);
assert.equal(isValidModuleCode("ML0004"), true);
assert.equal(isValidModuleCode("../../etc/passwd"), false, "Path traversal via ../ must be rejected");
assert.equal(isValidModuleCode("SC1003<script>"), false, "XSS markup in module code must be rejected");
assert.equal(isValidModuleCode("SC2001; DROP TABLE"), false, "SQL/Command injection characters must be rejected");
assert.equal(isValidModuleCode(""), false);
assert.equal(isValidModuleCode(null), false);
assert.equal(isValidModuleCode(undefined), false);
assert.equal(isValidModuleCode(12345), false);
console.log("PASS Test 6: isValidModuleCode blocks path traversal, injection vectors, and malformed inputs");

// Test 7: Concurrency & Boundary Guards - Semester Validation
const invalidSemRes = validateModuleInSlot("SC2001", "INVALID_SEM_ID", validPlan, detailsByCode);
assert.equal(invalidSemRes.status, "unverified");
assert.equal(invalidSemRes.prereqMet, false);
assert.ok(invalidSemRes.semesterWarning?.includes("Invalid semester"));

const protoSemRes = validateModuleInSlot("SC2001", "__proto__", validPlan, detailsByCode);
assert.equal(protoSemRes.status, "unverified");
assert.equal(protoSemRes.prereqMet, false);

const unhydratedRes = validateModuleInSlot("UNKNOWN9999", "Y1S1", validPlan, detailsByCode);
assert.equal(unhydratedRes.status, "unverified");
assert.equal(unhydratedRes.prereqMet, true);

const emptyPlanRes = validateModuleInSlot("SC1003", "Y1S1", {}, detailsByCode);
assert.equal(emptyPlanRes.status, "valid");
assert.equal(emptyPlanRes.prereqMet, true);
console.log("PASS Test 7: validateModuleInSlot handles invalid semester IDs, prototype injection, and unhydrated modules cleanly");

// Test 8: Performance & Optimisation - O(1) ICC Set and Catalogue Grouping
assert.equal(ICC_CORE_SET.size, 7);
assert.ok(ICC_CORE_SET.has("CC0001"));
assert.ok(ICC_CORE_SET.has("ML0004"));
assert.ok(!ICC_CORE_SET.has("SC1003"));
assert.equal(VALID_SEMESTER_IDS.size, 8);
assert.ok(VALID_SEMESTER_IDS.has("Y1S1"));
assert.ok(VALID_SEMESTER_IDS.has("Y4S2"));

// Benchmark catalogue grouping
const t0 = performance.now();
for (let i = 0; i < 100; i++) {
  groupCatalogueByYear(sampleBulkPayload, "CSC");
}
const elapsed = performance.now() - t0;
assert.ok(elapsed < 200, `Grouping 100 runs must be fast (took ${elapsed.toFixed(2)}ms)`);
console.log(`PASS Test 8: Performance verification - O(1) sets and 100 iterations completed in ${elapsed.toFixed(2)}ms`);

console.log("\nALL TESTS PASSED!");
