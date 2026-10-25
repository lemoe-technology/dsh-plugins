import { describe, expect, it } from 'vitest';

import type { EmbeddedCode, Segment } from '../src/tokenizer.ts';

import { tokenize } from '../src/tokenizer.ts';

const texts = (line: string): string[] => tokenize(line)
  .map((seg) => seg.text);
const prefixes = (line: string): Segment['prefix'][] => tokenize(line)
  .map((seg) => seg.prefix);

describe(tokenize, () => {
  it('keeps a single command whole', () => {
    expect(texts('ls -la'))
      .toStrictEqual(['ls -la']);
    expect(prefixes('ls -la'))
      .toStrictEqual([null]);
  });

  it('splits on semicolons, keeping the separator', () => {
    expect(texts('a; b; c'))
      .toStrictEqual(['a;', 'b;', 'c']);
  });

  it('treats newlines as separators', () => {
    expect(texts('cd /path\ngrep x file\necho done'))
      .toStrictEqual(['cd /path', 'grep x file', 'echo done']);
  });

  it('keeps semicolons inside double quotes', () => {
    expect(texts('echo "a;b"'))
      .toStrictEqual(['echo "a;b"']);
  });

  it('keeps semicolons inside single quotes', () => {
    expect(texts('echo \'a;b\''))
      .toStrictEqual(['echo \'a;b\'']);
  });

  it('escaped quote does not close the string', () => {
    expect(texts('echo "a\\";b"'))
      .toStrictEqual(['echo "a\\";b"']);
  });

  it('keeps escaped semicolons', () => {
    expect(texts('echo a\\;b'))
      .toStrictEqual(['echo a\\;b']);
  });

  it('keeps line continuations', () => {
    expect(texts('echo a \\\n b'))
      .toStrictEqual(['echo a \\\n b']);
  });

  it('splits on && with prefix', () => {
    expect(texts('a && b'))
      .toStrictEqual(['a', 'b']);
    expect(prefixes('a && b'))
      .toStrictEqual([null, '&&']);
  });

  it('splits on | with prefix', () => {
    expect(texts('a | b'))
      .toStrictEqual(['a', 'b']);
    expect(prefixes('a | b'))
      .toStrictEqual([null, '|']);
  });

  it('splits on || with prefix', () => {
    expect(texts('a || b'))
      .toStrictEqual(['a', 'b']);
    expect(prefixes('a || b'))
      .toStrictEqual([null, '||']);
    expect(tokenize('a || b')
      .map((segment) => segment.level))
      .toStrictEqual([0, 1]);
    expect(tokenize('a && b || c')
      .map((segment) => segment.level))
      .toStrictEqual([0, 1, 1]);
  });

  it('keeps redirection pairs', () => {
    expect(texts('cmd 2>&1'))
      .toStrictEqual(['cmd 2>&1']);
    expect(texts('cmd >| file'))
      .toStrictEqual(['cmd >| file']);
  });

  it('segment and prefix sequence', () => {
    const line = 'cd /srv/app && pnpm build; rm -rf tmp; echo done';
    expect(texts(line))
      .toStrictEqual(['cd /srv/app', 'pnpm build;', 'rm -rf tmp;', 'echo done']);
    expect(prefixes(line))
      .toStrictEqual([null, '&&', null, null]);
  });

  it('keeps heredoc body whole', () => {
    const line = 'python3 - <<\'EOF\'\nprint(\'hi\')\nEOF';
    expect(texts(line))
      .toStrictEqual([line]);
  });

  it('heredoc terminator newline separates', () => {
    expect(texts('a <<\'X\'\nbody\nX\nb'))
      .toStrictEqual(['a <<\'X\'\nbody\nX', 'b']);
  });

  it('commands after heredoc are separate segments', () => {
    const line = 'python3 - <<\'EOF\'\nprint(1)\nEOF\nsource ~/.nvm/nvm.sh\nnode x.mjs';
    expect(texts(line))
      .toStrictEqual(['python3 - <<\'EOF\'\nprint(1)\nEOF', 'source ~/.nvm/nvm.sh', 'node x.mjs']);
  });

  it('accepts any delimiter word', () => {
    const line = 'python3 - <<\'PY\'\nprint(1)\nPY\necho after';
    expect(texts(line))
      .toStrictEqual(['python3 - <<\'PY\'\nprint(1)\nPY', 'echo after']);
  });

  it('closing quote stays out of the delimiter', () => {
    const segs = tokenize('a <<\'X\'\nbody\nX\nb');
    expect(segs)
      .toHaveLength(2);
    expect(segs[0]?.text.endsWith('\nX'))
      .toBe(true);
  });

  it('keeps unquoted command substitution whole', () => {
    expect(texts('echo $(ls | wc -l)'))
      .toStrictEqual(['echo $(ls | wc -l)']);
    expect(texts('echo $(dirname $(which node)) && ls -la $(pwd)'))
      .toStrictEqual(['echo $(dirname $(which node))', 'ls -la $(pwd)']);
    expect(prefixes('echo $(dirname $(which node)) && ls -la $(pwd)'))
      .toStrictEqual([null, '&&']);
  });

  it('keeps backtick substitution whole', () => {
    expect(texts('echo `git log --oneline -1 | wc -l`'))
      .toStrictEqual(['echo `git log --oneline -1 | wc -l`']);
  });

  it('keeps compound commands whole', () => {
    expect(texts('if [ -f x ]; then echo y; fi'))
      .toStrictEqual(['if [ -f x ]; then echo y; fi']);
  });

  it('splits background statements and keeps the marker', () => {
    expect(texts('a; b & c'))
      .toStrictEqual(['a;', 'b &', 'c']);
  });

  it('keeps trailing comments in the segment', () => {
    expect(texts('echo a # note'))
      .toStrictEqual(['echo a # note']);
  });

  it('pipe binds tighter than logical operators', () => {
    expect(texts('a && b | c && d'))
      .toStrictEqual(['a', 'b', 'c', 'd']);
    expect(prefixes('a && b | c && d'))
      .toStrictEqual([null, '&&', '|', '&&']);
  });

  it('keeps |& prefix on pipe stages', () => {
    expect(texts('a |& b'))
      .toStrictEqual(['a', 'b']);
    expect(prefixes('a |& b'))
      .toStrictEqual([null, '|&']);
    expect(tokenize('a |& b')[1]?.level)
      .toBe(1);
  });

  it('caps pipe stages at one shared indent level', () => {
    const levels = tokenize('a && cat f | grep x | sort | uniq -c')
      .map((segment) => segment.level);
    expect(levels)
      .toStrictEqual([0, 1, 2, 2, 2]);
  });

  it('segments lose no content', () => {
    const line = 'cd x && pnpm build; echo "a;b" | grep q';
    let rest = line;
    for (const seg of tokenize(line)) {
      const at = rest.indexOf(seg.text);
      expect(at)
        .toBeGreaterThanOrEqual(0);
      rest = rest.slice(at + seg.text.length);
    }
    expect(rest.replace(/[\s;&|]/gu, ''))
      .toBe('');
  });
});

describe('embedded code', () => {
  const codeOf = (line: string, index = 0): EmbeddedCode | undefined =>
    tokenize(line)[index]?.code;

  it('recognizes python heredoc', () => {
    const line = 'python3 - <<\'EOF\'\nimport json\nprint(\'done\')\nEOF';
    const code = codeOf(line);
    expect(code?.language)
      .toBe('python');
    expect(code?.head)
      .toBe('python3 - <<\'EOF\'\n');
    expect(code?.body)
      .toBe('import json\nprint(\'done\')');
    expect(code?.tail)
      .toBe('\nEOF');
  });

  it('infers cat heredoc language from the target extension', () => {
    const line = 'cat > /srv/app/tmp/verify.mjs <<\'EOF\'\nconsole.log(\'hi\')\nEOF';
    const code = codeOf(line);
    expect(code?.language)
      .toBe('javascript');
    expect(code?.head)
      .toBe('cat > /srv/app/tmp/verify.mjs <<\'EOF\'\n');
    expect(code?.body)
      .toBe('console.log(\'hi\')');
    expect(codeOf('cat > out.py <<\'EOF\'\nprint(1)\nEOF')?.language)
      .toBe('python');
    expect(codeOf('cat > config.yaml <<\'EOF\'\nkey: value\nEOF')?.language)
      .toBe('yaml');
    expect(codeOf('cat > main.go <<\'EOF\'\npackage main\nEOF')?.language)
      .toBe('go');
  });

  it('cat heredoc with unknown extension stays plain', () => {
    expect(codeOf('cat > out.txt <<\'EOF\'\nhello\nEOF'))
      .toBeUndefined();
  });

  it('ignores other heredoc commands', () => {
    expect(codeOf('tee <<\'EOF\'\nhello\nEOF'))
      .toBeUndefined();
  });

  it('requires the closing delimiter', () => {
    expect(codeOf('python3 - <<\'EOF\'\nbody'))
      .toBeUndefined();
  });

  it('recognizes node -e single-quoted code', () => {
    const code = codeOf('node -e \'console.log(1)\'');
    expect(code?.language)
      .toBe('typescript');
    expect(code?.head)
      .toBe('node -e \'');
    expect(code?.body)
      .toBe('console.log(1)');
    expect(code?.tail)
      .toBe('\'');
  });

  it('keeps escaped quotes in double-quoted code', () => {
    const code = codeOf('node -e "const s = \\"x\\"; console.log(s)"');
    expect(code?.language)
      .toBe('typescript');
    expect(code?.body)
      .toBe('const s = \\"x\\"; console.log(s)');
  });

  it('allows long flags before -e', () => {
    expect(codeOf('node --import tsx/esm -e "const a = 1;"')?.language)
      .toBe('typescript');
  });

  it('recognizes python3 -c', () => {
    expect(codeOf('python3 -c \'print(1)\'')?.language)
      .toBe('python');
  });

  it('isolates quotes on multiline bodies', () => {
    const code = codeOf('node -e "const a = 1;\nconst b = 2;"');
    expect(code?.body.startsWith('\n'))
      .toBe(true);
    expect(code?.body.endsWith('\n'))
      .toBe(true);
    expect(code?.tail.startsWith('"'))
      .toBe(true);
  });

  it('no duplicate newline after opening quote', () => {
    expect(codeOf('node -e "\nconst a = 1;\n"')?.body)
      .toBe('\nconst a = 1;\n');
  });

  it('keeps single-line bodies inline', () => {
    expect(codeOf('node -e "console.log(1)"')?.body)
      .toBe('console.log(1)');
  });

  it('extracts code on && segments with prefix-free head', () => {
    const code = codeOf('cd x && node -e \'x\'', 1);
    expect(code?.language)
      .toBe('typescript');
    expect(code?.head)
      .toBe('node -e \'');
  });

  it('extracts code after || continuation', () => {
    expect(codeOf('a || node -e \'x\'', 1)?.body)
      .toBe('x');
  });

  it('ignores unknown commands', () => {
    expect(codeOf('perl -e \'print 1\''))
      .toBeUndefined();
  });
});
