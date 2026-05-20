export function JsonViewer({ raw }: { raw: string }) {
  let pretty: string;
  let error: string | null = null;
  try {
    pretty = JSON.stringify(JSON.parse(raw), null, 2);
  } catch (e) {
    pretty = raw;
    error = e instanceof Error ? e.message : 'Invalid JSON';
  }
  return (
    <div>
      {error && (
        <div className="mb-2 px-3 py-1.5 rounded-md bg-(--danger,#ef4444)/10 text-(--danger,#ef4444) text-xs font-mono">
          {error}
        </div>
      )}
      <pre className="overflow-auto text-(--text-primary) text-sm font-mono p-6 leading-relaxed whitespace-pre-wrap wrap-break-word">
        {pretty}
      </pre>
    </div>
  );
}
