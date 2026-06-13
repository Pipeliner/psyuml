#!/usr/bin/env node
// SDD harness checker — zero-dependency (Node >=18, ESM).
//
// Enforces the Spec-Driven Development discipline for this repo:
//   1. Every tracked directory has an IMPACT.md (impact-analysis doc).
//   2. Every file in a tracked directory is documented (mentioned in backticks)
//      in that directory's IMPACT.md.
//   3. sdd/traceability.json is well-formed and its references resolve
//      (spec sources exist; milestones are known; statuses are valid; and any
//      requirement marked in-progress/implemented points at real impl paths).
//
// Run:  node sdd/check.mjs   (exits non-zero on any violation)
//
// "Tracked" excludes dot-directories (.git, .github, ...) and build/vendor dirs.
// The lowercase template `sdd/templates/impact.md` is a regular file, NOT a
// directory impact doc — only files named exactly `IMPACT.md` are parsed as such.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', '.next', '.turbo', 'coverage', 'test-results',
]);
const STATUSES = new Set(['planned', 'in-progress', 'implemented', 'deprecated']);
const IMPACT = 'IMPACT.md';

const errors = [];
const warnings = [];
let dirCount = 0;
let fileCount = 0;

const isIgnoredDir = (name) => name.startsWith('.') || IGNORE_DIRS.has(name);
const rel = (p) => (p === '' ? '.' : p);

function extractMentions(text) {
  // collect every `backtick token` plus its basename, so `sdd/check.mjs`
  // also satisfies a file named `check.mjs`.
  const set = new Set();
  const re = /`([^`\n]+)`/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const tok = m[1].trim();
    if (!tok) continue;
    set.add(tok);
    set.add(path.basename(tok));
  }
  return set;
}

function extractCovers(text) {
  // `<!-- sdd:cover: *.svg, *.psyuml -->` declares globs whose matching files count
  // as documented in bulk — for generated artifacts / fixtures that don't each need
  // a per-file row. Source files should still be enumerated.
  const covers = [];
  const re = /<!--\s*sdd:cover:\s*([^>]+?)\s*-->/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    for (const g of m[1].split(',')) {
      const t = g.trim();
      if (t) covers.push(t);
    }
  }
  return covers;
}

function matchesCover(file, covers) {
  return covers.some((g) => {
    if (g.startsWith('*.')) return file.endsWith(g.slice(1));
    if (g.endsWith('*')) return file.startsWith(g.slice(0, -1));
    return g === file;
  });
}

function walk(absDir, relDir) {
  dirCount++;
  const impactAbs = path.join(absDir, IMPACT);
  const hasImpact = existsSync(impactAbs);
  if (!hasImpact) {
    errors.push(`missing ${IMPACT} in directory: ${rel(relDir)}/`);
  }
  const impactText = hasImpact ? readFileSync(impactAbs, 'utf8') : '';
  const mentions = extractMentions(impactText);
  const covers = extractCovers(impactText);

  const files = [];
  const subdirs = [];
  for (const e of readdirSync(absDir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!isIgnoredDir(e.name)) subdirs.push(e.name);
    } else if (e.isFile() && e.name !== IMPACT) {
      files.push(e.name);
    }
  }

  for (const f of files) {
    fileCount++;
    if (!(mentions.has(f) || mentions.has(path.basename(f)) || matchesCover(f, covers))) {
      errors.push(`undocumented file (not mentioned in ${rel(relDir)}/${IMPACT}): ${rel(relDir)}/${f}`);
    }
  }

  for (const d of subdirs.sort()) {
    walk(path.join(absDir, d), relDir === '' ? d : `${relDir}/${d}`);
  }
}

function pathForGlob(glob) {
  if (glob.endsWith('/**')) return glob.slice(0, -3);
  if (glob.endsWith('/*')) return glob.slice(0, -2);
  return glob;
}

function checkTraceability() {
  const tRel = 'sdd/traceability.json';
  const tAbs = path.join(repoRoot, tRel);
  if (!existsSync(tAbs)) {
    errors.push(`missing ${tRel}`);
    return { milestones: 0, requirements: 0 };
  }
  let data;
  try {
    data = JSON.parse(readFileSync(tAbs, 'utf8'));
  } catch (e) {
    errors.push(`${tRel}: invalid JSON — ${e.message}`);
    return { milestones: 0, requirements: 0 };
  }

  const milestones = Array.isArray(data.milestones) ? data.milestones : [];
  const requirements = Array.isArray(data.requirements) ? data.requirements : [];
  if (!milestones.length) errors.push(`${tRel}: milestones[] is empty or missing`);
  if (!requirements.length) errors.push(`${tRel}: requirements[] is empty or missing`);

  const mIds = new Set();
  for (const m of milestones) {
    if (!m.id) { errors.push(`${tRel}: a milestone is missing "id"`); continue; }
    if (mIds.has(m.id)) errors.push(`${tRel}: duplicate milestone id "${m.id}"`);
    mIds.add(m.id);
  }

  const rIds = new Set();
  for (const r of requirements) {
    const id = r.id || '(unnamed requirement)';
    if (!r.id) errors.push(`${tRel}: a requirement is missing "id"`);
    else if (rIds.has(r.id)) errors.push(`${tRel}: duplicate requirement id "${r.id}"`);
    rIds.add(id);

    if (!r.title) warnings.push(`${id}: missing "title"`);
    if (!Array.isArray(r.spec) || r.spec.length === 0) {
      errors.push(`${id}: "spec" must be a non-empty array of section refs`);
    }
    if (!r.milestone || !mIds.has(r.milestone)) {
      errors.push(`${id}: milestone "${r.milestone}" is not declared in milestones[]`);
    }
    if (!STATUSES.has(r.status)) {
      errors.push(`${id}: invalid status "${r.status}" (use ${[...STATUSES].join(' | ')})`);
    }
    if (r.source && !existsSync(path.join(repoRoot, r.source))) {
      errors.push(`${id}: source file not found — ${r.source}`);
    }
    if (r.status === 'in-progress' || r.status === 'implemented') {
      const impl = Array.isArray(r.impl) ? r.impl : [];
      if (!impl.length) errors.push(`${id}: status "${r.status}" requires at least one impl path`);
      for (const g of impl) {
        if (!existsSync(path.join(repoRoot, pathForGlob(g)))) {
          errors.push(`${id}: impl path not found — ${g}`);
        }
      }
    }
  }
  return { milestones: milestones.length, requirements: requirements.length };
}

// ---- run ----------------------------------------------------------------
walk(repoRoot, '');
const trace = checkTraceability();

console.log('SDD harness check');
console.log(`  repo root        : ${repoRoot}`);
console.log(`  directories      : ${dirCount}`);
console.log(`  files documented : ${fileCount}`);
console.log(`  milestones       : ${trace.milestones}`);
console.log(`  requirements     : ${trace.requirements}`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}

if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error(`  ✖ ${e}`);
  console.error('\nSDD check FAILED.');
  process.exit(1);
}

console.log('\n✔ SDD check passed.');
