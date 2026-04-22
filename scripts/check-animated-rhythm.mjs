import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, 'src', 'components');
const SHOULD_FIX = process.argv.includes('--fix');

const VARIANT_DEFAULT_RHYTHM = {
  content: 'body',
  title: 'title',
  text: 'body',
  media: 'list',
  control: 'actions',
  modal: 'overlay',
  nav: 'list',
  sidebar: 'shell',
};

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      if (entry.isFile() && fullPath.endsWith('.vue')) return [fullPath];
      return [];
    }),
  );
  return files.flat();
}

function lineOfIndex(source, index) {
  return source.slice(0, index).split('\n').length;
}

function inferRhythm(tag) {
  const variantMatch = tag.match(/\bvariant\s*=\s*["']([^"']+)["']/);
  const variant = variantMatch?.[1];
  if (!variant) return 'body';
  return VARIANT_DEFAULT_RHYTHM[variant] || 'body';
}

function injectRhythm(tag) {
  if (/\brhythm\s*=\s*["'][^"']+["']/.test(tag)) return tag;
  const rhythm = inferRhythm(tag);

  // Prefer inserting right after variant attribute to keep style consistent.
  const withVariant = tag.replace(
    /(\bvariant\s*=\s*["'][^"']+["'])/,
    `$1 rhythm="${rhythm}"`,
  );

  if (withVariant !== tag) return withVariant;

  // Fallback: append before tag close.
  return tag.replace(/\s*\/?>$/, (end) => ` rhythm="${rhythm}"${end}`);
}

function analyzeFile(filePath, source) {
  const issues = [];
  const tagRegex = /<AnimatedAppear\b[\s\S]*?>/g;

  for (const match of source.matchAll(tagRegex)) {
    const tag = match[0];
    const idx = match.index ?? 0;

    const hasVariant = /\bvariant\s*=\s*["'][^"']+["']/.test(tag);
    if (!hasVariant) continue;

    const hasRhythm = /\brhythm\s*=\s*["'][^"']+["']/.test(tag);
    if (hasRhythm) continue;

    issues.push({
      filePath,
      line: lineOfIndex(source, idx),
      tag: tag.replace(/\s+/g, ' ').trim(),
    });
  }

  return issues;
}

function fixSource(source) {
  const tagRegex = /<AnimatedAppear\b[\s\S]*?>/g;
  return source.replace(tagRegex, (tag) => {
    const hasVariant = /\bvariant\s*=\s*["'][^"']+["']/.test(tag);
    if (!hasVariant) return tag;
    return injectRhythm(tag);
  });
}

async function main() {
  const files = await walk(TARGET_DIR);
  let fixedFiles = 0;

  if (SHOULD_FIX) {
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      const fixed = fixSource(source);
      if (fixed !== source) {
        await writeFile(file, fixed, 'utf8');
        fixedFiles += 1;
      }
    }
    console.log(`🛠️  Auto-fix complete. Updated ${fixedFiles} file(s).`);
  }

  const allIssues = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    allIssues.push(...analyzeFile(path.relative(ROOT, file), source));
  }

  if (!allIssues.length) {
    console.log('✅ AnimatedAppear rhythm check passed: no missing rhythm attributes.');
    return;
  }

  console.error('❌ AnimatedAppear rhythm check failed. Missing `rhythm` on the following tags:\n');
  for (const issue of allIssues) {
    console.error(`- ${issue.filePath}:${issue.line}`);
    console.error(`  ${issue.tag}`);
  }

  process.exitCode = 1;
}

main().catch((err) => {
  console.error('❌ Failed to run rhythm check:', err);
  process.exitCode = 1;
});
