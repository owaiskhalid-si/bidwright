// Word-level diff (LCS) between two proposal versions. Proposals are a few hundred
// words, so the O(n·m) table is tiny.
export type DiffPart = { text: string; op: "same" | "add" | "del" };

const tokenize = (s: string) => s.match(/\s+|[^\s]+/g) ?? [];

export function diffWords(before: string, after: string): DiffPart[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const n = a.length;
  const m = b.length;
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const parts: DiffPart[] = [];
  const push = (text: string, op: DiffPart["op"]) => {
    const prev = parts.at(-1);
    if (prev && prev.op === op) prev.text += text;
    else parts.push({ text, op });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) push(a[i++], (j++, "same"));
    else if (dp[i + 1][j] >= dp[i][j + 1]) push(a[i++], "del");
    else push(b[j++], "add");
  }
  while (i < n) push(a[i++], "del");
  while (j < m) push(b[j++], "add");
  return consolidate(parts);
}

/**
 * A rewritten sentence diffs as alternating one-word deletions and insertions, which is
 * unreadable. Changes separated only by whitespace or a single short word are merged
 * into one "before" block followed by one "after" block.
 */
function consolidate(parts: DiffPart[]): DiffPart[] {
  const out: DiffPart[] = [];
  let del = "";
  let add = "";
  const flush = () => {
    if (del) out.push({ text: del, op: "del" });
    if (add) out.push({ text: add, op: "add" });
    del = add = "";
  };
  parts.forEach((p, k) => {
    const inChange = del || add;
    const glue = p.op === "same" && inChange && /^\s*\S{0,3}\s*$/.test(p.text) && parts[k + 1] && parts[k + 1].op !== "same";
    if (p.op === "del") del += p.text;
    else if (p.op === "add") add += p.text;
    else if (glue) {
      del += p.text;
      add += p.text;
    } else {
      flush();
      out.push({ ...p });
    }
  });
  flush();
  return out;
}

export function diffStats(parts: DiffPart[]) {
  const words = (s: string) => (s.match(/\S+/g) ?? []).length;
  return {
    added: parts.filter((p) => p.op === "add").reduce((n, p) => n + words(p.text), 0),
    removed: parts.filter((p) => p.op === "del").reduce((n, p) => n + words(p.text), 0),
  };
}
