/**
 * recommendations-reporter.js
 *
 * Custom Jest reporter that prints a fix recommendation for every failing test.
 * Maps are keyed by substring of the full test name (suite > describe > it).
 * Registered alongside the default reporter in package.json jest.reporters.
 */

'use strict';

// ─── Recommendations map ──────────────────────────────────────────────────────
// Key   : substring that must appear in the full test name (case-insensitive)
// Value : recommendation string shown when the test fails

// Keys are substrings of the lowercased full test name produced by Jest.
// Jest joins: "Suite describe() it description" with spaces (no ">").
const RECOMMENDATIONS = {

  // ── DoctorsService — isDeal ─────────────────────────────────────────────────
  'isdeal() returns true when class is "a"': [
    'isDeal() should return true only when doctor.class === "a" (lowercase).',
    'Check the condition in DoctorsService.isDeal(): src/doctors/doctors.service.ts',
    'Fix: return doctor.class === "a";',
  ],
  'isdeal() returns false for class "a"': [
    'isDeal() should return false for uppercase "A" (Priority, not Deal Priority).',
    'Ensure the comparison is strict: === "a" not === "A".',
  ],

  // ── DoctorsService — getLastVisit ───────────────────────────────────────────
  'getlastvisit() returns null when doctor has no visits': [
    'getLastVisit() must return null (not undefined / 0) when visits array is empty.',
    'Check: if (visits.length === 0) return null;',
    'File: src/doctors/doctors.service.ts — getLastVisit()',
  ],
  'getlastvisit() returns the most recent visit date': [
    'getLastVisit() should pick the visit with the highest visited_at timestamp.',
    'Ensure Math.max(...) is used over all visit timestamps.',
    'File: src/doctors/doctors.service.ts — getLastVisit()',
  ],
  'getlastvisit() handles a single visit': [
    'getLastVisit() should work when there is exactly one visit.',
    'Make sure the array spread Math.max(...arr) handles single-element arrays.',
  ],

  // ── DoctorsService — computeStatus ─────────────────────────────────────────
  'computestatus() returns deal for class "a"': [
    'computeStatus() must check isDeal() first — before checking class "F" or visit dates.',
    'Order of checks: DEAL → F → NEVER → RECENT → NEED_VISIT',
    'File: src/doctors/doctors.service.ts — computeStatus()',
  ],
  'computestatus() returns f for class "f" (lowercase)': [
    'computeStatus() must recognise lowercase "f" as the F (Colleague) class.',
    'Fix: if (doctor.class?.toLowerCase() === "f") return "F";',
  ],
  'computestatus() returns f for class "f" (uppercase)': [
    'computeStatus() must recognise uppercase "F" as the F (Colleague) class.',
    'Fix: if (doctor.class?.toLowerCase() === "f") return "F";',
  ],
  'computestatus() returns never when no visits': [
    'computeStatus() should return "NEVER" when the visits array is empty or undefined.',
    'Add: if (!last) return "NEVER"; after getLastVisit()',
  ],
  'computestatus() returns recent when last visit ≤ 12 days ago': [
    'computeStatus() should return "RECENT" when last visit is ≤ 12 days ago.',
    'Threshold: diffDays <= 12 → RECENT, diffDays > 12 → NEED_VISIT',
    'File: src/doctors/doctors.service.ts — computeStatus()',
  ],
  'computestatus() returns recent on exactly day 12': [
    'The boundary is inclusive: a visit exactly 12 days ago must be RECENT (not NEED_VISIT).',
    'Fix: return diffDays > 12 ? "NEED_VISIT" : "RECENT";  (strict greater-than)',
  ],
  'computestatus() returns need_visit when last visit > 12 days ago': [
    'computeStatus() should return "NEED_VISIT" when last visit is more than 12 days ago.',
    'Fix: return diffDays > 12 ? "NEED_VISIT" : "RECENT";',
  ],
  'computestatus() returns need_visit when last visit is 30 days ago': [
    'Long-overdue doctors (30 days) must still resolve to NEED_VISIT.',
    'Ensure the threshold logic does not have an upper cap.',
  ],

  // ── DoctorsService — classWeight ────────────────────────────────────────────
  'classweight() a (deal priority) has lowest weight': [
    'classWeight("a") must return 0 so Deal Priority doctors sort first.',
    'File: src/doctors/doctors.service.ts — classWeight()',
  ],
  'classweight() a (priority) has second weight': [
    'classWeight("A") must return 1 so Priority doctors sort second.',
  ],
  'classweight() b (normal) has third weight': [
    'classWeight("B") must return 2.',
  ],
  'classweight() f (colleague) has highest weight': [
    'classWeight("F") must return 3 so Colleague doctors sort last.',
  ],
  'classweight() unknown class defaults to b weight': [
    'Custom / unknown classes should fall back to the same weight as "B" (2).',
    'Add a default case in the switch statement: default: return 2;',
  ],

  // ── DoctorsService — findOne ────────────────────────────────────────────────
  'findone() returns a doctor with visits attached': [
    'findOne() must attach the doctor\'s visits array to the returned object.',
    'Ensure both the doctor row and visits are fetched (Promise.all) and merged.',
    'File: src/doctors/doctors.service.ts — findOne()',
  ],
  'findone() throws notfoundexception when doctor does not exist': [
    'findOne() must throw NotFoundException (HTTP 404) when the doctor does not exist.',
    'Check: if (error || !data) throw new NotFoundException(`Doctor ${id} not found`);',
  ],

  // ── DoctorsService — create ─────────────────────────────────────────────────
  'create() inserts and returns the new doctor': [
    'create() should insert the DTO into Supabase and return the created row with visits: [].',
    'Make sure .select("*").single() is chained after .insert() to get the new row back.',
    'File: src/doctors/doctors.service.ts — create()',
  ],
  'create() throws internalservererrorexception on db error': [
    'create() must throw InternalServerErrorException when Supabase returns an error.',
    'Check the error guard after the insert call.',
  ],

  // ── DoctorsService — update ─────────────────────────────────────────────────
  'update() updates and returns the doctor with visits': [
    'update() should return the updated doctor row merged with the latest visits.',
    'Both the update query and visits fetch should run in parallel via Promise.all.',
    'File: src/doctors/doctors.service.ts — update()',
  ],
  'update() throws internalservererrorexception on db error': [
    'update() must throw InternalServerErrorException when Supabase returns an error.',
    'Check the error guard after the update call.',
  ],

  // ── DoctorsService — remove ─────────────────────────────────────────────────
  'remove() resolves without error on success': [
    'remove() should resolve to undefined (void) on success — no return value needed.',
    'File: src/doctors/doctors.service.ts — remove()',
  ],
  'remove() throws internalservererrorexception on db error': [
    'remove() must throw InternalServerErrorException when Supabase returns an error.',
    'Check: if (error) throw new InternalServerErrorException(...)',
  ],

  // ── DoctorsController — findAll ─────────────────────────────────────────────
  'findall() calls service.findall with no filters and returns result': [
    'Controller.findAll() must forward all query params to DoctorsService.findAll().',
    'Default hideF should be true when no query param is provided.',
    'File: src/doctors/doctors.controller.ts — findAll()',
  ],
  'findall() passes area filter to service': [
    'The "area" query param must be passed as-is to service.findAll({ area }).',
  ],
  'findall() passes status filter to service': [
    'The "status" query param must be forwarded to service.findAll({ status }).',
  ],
  'findall() passes day filter to service': [
    'The "day" query param must be forwarded to service.findAll({ day }).',
  ],
  'findall() passes search filter to service': [
    'The "search" query param must be forwarded to service.findAll({ search }).',
  ],
  'findall() sets hidef=false when query param is "false"': [
    'hideF query param "false" (string) must be converted to boolean false.',
    'Fix: hideF: hideF !== "false"',
    'File: src/doctors/doctors.controller.ts — findAll()',
  ],
  'findall() sets hidef=true by default': [
    'When hideF query param is absent, default to true (hide colleague doctors).',
    'Fix: hideF: hideF !== "false"  — undefined !== "false" evaluates to true.',
  ],

  // ── DoctorsController — findOne ─────────────────────────────────────────────
  'findone() returns the doctor from service': [
    'Controller.findOne() must call service.findOne(id) and return the result.',
    'Ensure @Param("id", ParseIntPipe) converts the string param to a number.',
  ],
  'findone() propagates notfoundexception from service': [
    'Controller should not catch NotFoundException — let it propagate so NestJS returns 404.',
  ],

  // ── DoctorsController — create ──────────────────────────────────────────────
  'create() calls service.create with the dto and returns result': [
    'Controller.create() must pass the full validated DTO to service.create().',
    'Check that @Body() is decorated and the DTO is forwarded unchanged.',
  ],
  'create() propagates errors from service': [
    'Controller should not suppress InternalServerErrorException from the service.',
  ],

  // ── DoctorsController — update ──────────────────────────────────────────────
  'update() calls service.update with id + dto and returns result': [
    'Controller.update() must pass both the parsed id and the body DTO to service.update().',
    'Ensure @Param("id", ParseIntPipe) is used — id arrives as string otherwise.',
  ],

  // ── DoctorsController — remove ──────────────────────────────────────────────
  'remove() calls service.remove with the id': [
    'Controller.remove() must call service.remove(id) with the numeric id.',
  ],
  'remove() propagates errors from service': [
    'Controller should not suppress InternalServerErrorException from the service.',
  ],

  // ── VisitsService — recordVisit ─────────────────────────────────────────────
  'recordvisit() returns existing visit without inserting a duplicate': [
    'recordVisit() should check for an existing visit first (maybeSingle) and return it if found.',
    'Do NOT call insert() when a visit already exists for that doctor+date combination.',
    'File: src/visits/visits.service.ts — recordVisit()',
  ],
  'recordvisit() inserts and returns a new visit when none exists': [
    'recordVisit() must call insert() when no existing visit is found for that date.',
    'Chain .select().single() after insert to get the new row back.',
    'File: src/visits/visits.service.ts — recordVisit()',
  ],
  'recordvisit() throws internalservererrorexception when insert fails': [
    'recordVisit() must throw InternalServerErrorException when the Supabase insert errors.',
    'Check: if (error) throw new InternalServerErrorException("Failed to record visit");',
  ],

  // ── VisitsService — visitToday ──────────────────────────────────────────────
  'visittoday() calls recordvisit with today\'s date': [
    'visitToday() must resolve today\'s date and pass it to recordVisit().',
    'Use: new Date().toISOString().split("T")[0] for the date string.',
    'File: src/visits/visits.service.ts — visitToday()',
  ],

  // ── VisitsService — clearVisit ──────────────────────────────────────────────
  'clearvisit() resolves without error on success': [
    'clearVisit() should resolve to undefined (void) on success.',
    'File: src/visits/visits.service.ts — clearVisit()',
  ],
  'clearvisit() throws internalservererrorexception on db error': [
    'clearVisit() must throw InternalServerErrorException when Supabase returns an error.',
  ],

  // ── VisitsService — exportCsv ───────────────────────────────────────────────
  'exportcsv() returns csv with header and one data row': [
    'exportCsv() must include the CSV header (Date,Day,Doctor,...) and one row per visit.',
    'File: src/visits/visits.service.ts — exportCsv()',
  ],
  'exportcsv() returns only header row when there are no visits': [
    'exportCsv() must still return the header line even when there are no visits.',
    'Do not skip the header when the visits array is empty.',
  ],
  'exportcsv() throws internalservererrorexception when visits fetch fails': [
    'exportCsv() must throw InternalServerErrorException when the visits Supabase query errors.',
  ],
  'exportcsv() throws internalservererrorexception when doctors fetch fails': [
    'exportCsv() must throw InternalServerErrorException when the doctors Supabase query errors.',
  ],

  // ── VisitsController — recordVisit ──────────────────────────────────────────
  'recordvisit() calls service.recordvisit with id and date': [
    'Controller.recordVisit() must pass the parsed doctor id and dto.date to the service.',
    'Ensure @Param("id", ParseIntPipe) is used so id is a number, not a string.',
    'File: src/visits/visits.controller.ts — recordVisit()',
  ],

  // ── VisitsController — visitToday ───────────────────────────────────────────
  'visittoday() calls service.visittoday with the doctor id': [
    'Controller.visitToday() must pass the parsed doctor id to service.visitToday().',
    'File: src/visits/visits.controller.ts — visitToday()',
  ],

  // ── VisitsController — clearVisit ───────────────────────────────────────────
  'clearvisit() calls service.clearvisit with the visitid (ignores doctorid)': [
    'clearVisit() uses visitId (not doctorId) to delete the visit row.',
    'Only service.clearVisit(visitId) needs to be called — doctorId is for routing only.',
    'File: src/visits/visits.controller.ts — clearVisit()',
  ],
  'clearvisit() resolves to undefined on success': [
    'clearVisit() is decorated with @HttpCode(204) — it should return nothing (void).',
  ],

  // ── VisitsExportController ──────────────────────────────────────────────────
  'exportcsv() sends csv with content-type text/csv': [
    'exportCsv() must call res.setHeader("Content-Type", "text/csv; charset=utf-8").',
    'File: src/visits/visits-export.controller.ts — exportCsv()',
  ],
  'exportcsv() uses "visits-all.csv" filename when no params given': [
    'When neither date nor month is provided, filename must be "visits-all.csv".',
  ],
  'exportcsv() uses "visits-yyyy-mm-dd.csv" filename when date param given': [
    'When a date param is given, filename must be "visits-YYYY-MM-DD.csv".',
  ],
  'exportcsv() uses "visits-yyyy-mm.csv" filename when month param given': [
    'When a month param is given, filename must be "visits-YYYY-MM.csv".',
  ],
  'exportcsv() passes date param to service.exportcsv': [
    'exportCsv() must forward the date query param as the second argument to service.exportCsv(month, date).',
    'Note the argument order: exportCsv(month, date).',
  ],
  'exportcsv() passes month param to service.exportcsv': [
    'exportCsv() must forward the month query param as the first argument to service.exportCsv(month, date).',
  ],
  'exportcsv() date param takes priority over month param for filename': [
    'When both date and month are present, use date for the filename (date takes priority).',
  ],

  // ── PlansService — getPlan ──────────────────────────────────────────────────
  'getplan() returns the plan when it exists': [
    'getPlan() must return the saved plan row from Supabase.',
    'File: src/plans/plans.service.ts — getPlan()',
  ],
  'getplan() returns an empty plan when none is saved for that date': [
    'getPlan() must return { day, doctor_ids: [] } when maybeSingle returns null.',
    'Fix: return data ?? { day: date, doctor_ids: [] };',
  ],
  'getplan() throws internalservererrorexception on db error': [
    'getPlan() must throw InternalServerErrorException when Supabase errors.',
  ],

  // ── PlansService — getAllPlans ──────────────────────────────────────────────
  'getallplans() returns all saved plans ordered by day': [
    'getAllPlans() must return all plan rows sorted by day ascending.',
    'Chain .order("day", { ascending: true }) on the Supabase query.',
    'File: src/plans/plans.service.ts — getAllPlans()',
  ],
  'getallplans() returns empty array when no plans exist': [
    'getAllPlans() must return an empty array (not null/undefined) when no plans are saved.',
  ],
  'getallplans() throws internalservererrorexception on db error': [
    'getAllPlans() must throw InternalServerErrorException when Supabase errors.',
  ],

  // ── PlansService — getWeekPlans ─────────────────────────────────────────────
  'getweekplans() returns 6 entries (mon–sat) for the given date\'s week': [
    'getWeekPlans() must always return exactly 6 entries — one per day Mon–Sat.',
    'File: src/plans/plans.service.ts — getWeekPlans() + getWeekDates()',
  ],
  'getweekplans() fills empty plans with doctor_ids: [] for days with no saved plan': [
    'Days that have no saved plan must be filled with { day, doctor_ids: [] }.',
    'Use: saved.find(p => p.day === d) ?? { day: d, doctor_ids: [] }',
  ],
  'getweekplans() merges saved plans with empty fallbacks': [
    'Saved plans should be merged in — the day\'s saved doctors replace the empty fallback.',
    'Unsaved days still get doctor_ids: [].',
  ],
  'getweekplans() throws internalservererrorexception on db error': [
    'getWeekPlans() must throw InternalServerErrorException when Supabase errors.',
  ],

  // ── PlansService — setPlan ──────────────────────────────────────────────────
  'setplan() saves plan via upsert and returns it': [
    'setPlan() must upsert { day, doctor_ids } into the plans table and return the saved row.',
    'File: src/plans/plans.service.ts — setPlan()',
  ],
  'setplan() throws internalservererrorexception when upsert fails with a non-42p10 error': [
    'For non-42P10 errors, setPlan() must throw InternalServerErrorException immediately.',
    'Only the 42P10 code triggers the manual select+insert/update fallback.',
  ],
  'setplan() falls back to update when upsert fails with 42p10 and row exists': [
    'When upsert fails with 42P10 (missing UNIQUE constraint) and the row exists, use UPDATE.',
    'Fix: Run ALTER TABLE plans ADD CONSTRAINT plans_day_key UNIQUE (day); to avoid the fallback.',
  ],
  'setplan() falls back to insert when upsert fails with 42p10 and no row exists': [
    'When upsert fails with 42P10 and no row exists, INSERT a new row.',
    'Fix: Run ALTER TABLE plans ADD CONSTRAINT plans_day_key UNIQUE (day); to avoid the fallback.',
  ],

  // ── PlansController ─────────────────────────────────────────────────────────
  'getweekplans() calls service.getweekplans without a date and returns result': [
    'Controller.getWeekPlans() must forward the optional date param to the service.',
    'File: src/plans/plans.controller.ts — getWeekPlans()',
  ],
  'getweekplans() passes date query param to service': [
    'The date query param must be forwarded as-is to service.getWeekPlans(date).',
  ],
  'getallplans() returns all plans from service': [
    'Controller.getAllPlans() must call service.getAllPlans() and return the result.',
  ],
  'getplan() returns the plan for the given date': [
    'Controller.getPlan() must call service.getPlan(date) with the route param.',
  ],
  'setplan() calls service.setplan with date and doctorids': [
    'Controller.setPlan() must pass both the date param and dto.doctorIds to service.setPlan().',
    'File: src/plans/plans.controller.ts — setPlan()',
  ],
  'setplan() saves an empty plan (no doctors)': [
    'An empty doctorIds array is valid — a plan with no doctors should be saved.',
  ],

  // ── StatsService — getStats ─────────────────────────────────────────────────
  'getstats() returns total count of all doctors': [
    'getStats() must count all doctors regardless of class in the "total" field.',
    'File: src/stats/stats.service.ts — getStats()',
  ],
  'getstats() excludes class-f doctors from totalactive': [
    'totalActive must exclude class-F (colleague) doctors.',
    'Fix: doctors.filter(d => d.class?.toLowerCase() !== "f").length',
  ],
  'getstats() counts nevervisited only for non-f doctors with no visits': [
    'neverVisited must count only non-F doctors who have never been visited.',
    'Filter out F doctors before checking for empty visits.',
  ],
  'getstats() counts visitedthismonth correctly': [
    'visitedThisMonth counts doctors who have at least one visit in the current calendar month.',
    'Use the YYYY-MM prefix to filter visits: v.visited_at.startsWith(monthPrefix)',
  ],
  'getstats() counts needvisit (last visit > 12 days ago, non-f)': [
    'needVisit counts non-F doctors whose last visit was more than 12 days ago.',
    'Exclude F doctors and doctors with no visits (they go in neverVisited, not needVisit).',
  ],
  'getstats() groups doctors by area in byarea': [
    'byArea must group non-F doctors by their area field with total and visited counts.',
  ],
  'getstats() throws internalservererrorexception when doctors fetch fails': [
    'getStats() must throw InternalServerErrorException when the doctors Supabase query fails.',
  ],

  // ── StatsService — getHistory ───────────────────────────────────────────────
  'gethistory() returns exactly n months of history': [
    'getHistory(n) must return an array of exactly n items — one per calendar month.',
    'File: src/stats/stats.service.ts — getHistory()',
  ],
  'gethistory() marks the current month as iscurrent=true': [
    'The entry for the current month must have isCurrent: true.',
    'Compare key === YYYY-MM of today\'s date.',
  ],
  'gethistory() calculates coverage percentage correctly': [
    'coverage = Math.round((visited / totalActive) * 100)',
    'visited = number of unique active doctors who had at least one visit that month.',
  ],
  'gethistory() throws internalservererrorexception when db fails': [
    'getHistory() must throw InternalServerErrorException when Supabase errors.',
  ],

  // ── StatsController ─────────────────────────────────────────────────────────
  'getstats() returns stats from service': [
    'Controller.getStats() must call service.getStats() and return the result unchanged.',
    'File: src/stats/stats.controller.ts',
  ],
  'gethistory() calls service.gethistory with default 6 months when no param given': [
    'When no months param is provided, default to 6.',
    'Fix: this.statsService.getHistory(months ? parseInt(months, 10) : 6)',
  ],
  'gethistory() parses the months query param as an integer': [
    'The months query param arrives as a string — parse it with parseInt(months, 10).',
  ],
  'gethistory() returns history array from service': [
    'Controller.getHistory() must return the array from service.getHistory() unchanged.',
  ],
};

// ─── Reporter class ───────────────────────────────────────────────────────────

class RecommendationsReporter {
  constructor(_globalConfig, _options) {}

  onRunComplete(_contexts, results) {
    const failed = [];

    for (const suite of results.testResults) {
      for (const test of suite.testResults) {
        if (test.status === 'failed') {
          const fullName = test.fullName.toLowerCase();
          const rec = this._findRecommendation(fullName);
          failed.push({ fullName: test.fullName, messages: test.failureMessages, rec });
        }
      }
    }

    if (failed.length === 0) return;

    const hr   = '─'.repeat(70);
    const bold = (s) => `\x1b[1m${s}\x1b[0m`;
    const red  = (s) => `\x1b[31m${s}\x1b[0m`;
    const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
    const dim  = (s) => `\x1b[2m${s}\x1b[0m`;

    console.log('\n' + hr);
    console.log(bold(red(`  ✖  ${failed.length} failing test${failed.length > 1 ? 's' : ''} — fix recommendations`)));
    console.log(hr);

    for (const { fullName, messages, rec } of failed) {
      console.log('\n' + red(`  ✕ ${fullName}`));

      // Show trimmed Jest failure message
      const firstMsg = (messages[0] || '').split('\n').slice(0, 6).join('\n');
      console.log(dim('    ' + firstMsg.replace(/\n/g, '\n    ')));

      if (rec) {
        console.log('\n  ' + cyan('💡 Recommendation:'));
        for (const line of rec) {
          console.log('     ' + line);
        }
      } else {
        console.log('\n  ' + cyan('💡 Recommendation:'));
        console.log('     Review the test name above and check the corresponding');
        console.log('     method in src/doctors/. Make sure the return value,');
        console.log('     error handling, and mock expectations are all correct.');
      }
      console.log();
    }

    console.log(hr + '\n');
  }

  _findRecommendation(fullNameLower) {
    for (const [key, lines] of Object.entries(RECOMMENDATIONS)) {
      if (fullNameLower.includes(key)) return lines;
    }
    return null;
  }
}

module.exports = RecommendationsReporter;
