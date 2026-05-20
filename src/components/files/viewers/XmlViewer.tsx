function formatNode(node: Node, level: number): string {
  const pad = '  '.repeat(level);

  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').trim();
    return text ? `${pad}${text}\n` : '';
  }
  if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
    const pi = node as ProcessingInstruction;
    return `${pad}<?${pi.target}${pi.data ? ' ' + pi.data : ''}?>\n`;
  }
  if (node.nodeType === Node.COMMENT_NODE) {
    return `${pad}<!--${node.textContent}-->\n`;
  }
  if (node.nodeType === Node.DOCUMENT_NODE) {
    return Array.from(node.childNodes).map((c) => formatNode(c, level)).join('');
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const attrs = Array.from(el.attributes).map((a) => ` ${a.name}="${a.value}"`).join('');
    const children = Array.from(el.childNodes).map((c) => formatNode(c, level + 1)).join('');
    if (!children.trim()) return `${pad}<${el.tagName}${attrs} />\n`;
    return `${pad}<${el.tagName}${attrs}>\n${children}${pad}</${el.tagName}>\n`;
  }
  return '';
}

export function XmlViewer({ raw }: { raw: string }) {
  let pretty = raw;
  let error: string | null = null;
  try {
    const doc = new DOMParser().parseFromString(raw, 'application/xml');
    const parseErr = doc.querySelector('parsererror');
    if (parseErr) {
      error = parseErr.textContent?.trim() ?? 'Invalid XML';
    } else {
      pretty = formatNode(doc, 0).trim();
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Parse error';
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
