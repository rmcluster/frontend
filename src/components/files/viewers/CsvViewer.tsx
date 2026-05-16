function parseCsv(raw: string): string[][] {
  return raw
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((line) => {
      const cols: string[] = [];
      let cur = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else inQ = !inQ;
        } else if (ch === ',' && !inQ) {
          cols.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      cols.push(cur);
      return cols;
    });
}

export function CsvViewer({ raw }: { raw: string }) {
  const rows = parseCsv(raw);
  if (rows.length === 0)
    return <p className="text-sm text-[var(--text-muted)]">Empty CSV</p>;
  const [header, ...body] = rows;
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[var(--bg-elevated)] text-[var(--text-muted)] text-xs uppercase tracking-wide">
            {header.map((h, i) => (
              <th
                key={i}
                className="text-left px-3 py-2 font-semibold border-b border-[var(--border)] whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 text-[var(--text-primary)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
