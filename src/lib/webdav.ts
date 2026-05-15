import { DAV_BASE } from './routes';

export interface DavEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number | null;
  lastModified: string | null;
  contentType: string | null;
}

function parsePropfind(xml: string, requestedPath: string): DavEntry[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const responses = Array.from(doc.getElementsByTagNameNS('DAV:', 'response'));
  const entries: DavEntry[] = [];

  for (const resp of responses) {
    const hrefEl = resp.getElementsByTagNameNS('DAV:', 'href')[0];
    if (!hrefEl) continue;

    const href = decodeURIComponent(hrefEl.textContent?.trim() ?? '');

    // Skip the collection itself (the directory we queried)
    const normalizedRequested = requestedPath.replace(/\/?$/, '/');
    const normalizedHref = href.replace(/\/?$/, '/');
    if (normalizedHref === normalizedRequested) continue;

    const resourcetype = resp.getElementsByTagNameNS('DAV:', 'resourcetype')[0];
    const isDirectory = !!resourcetype?.getElementsByTagNameNS('DAV:', 'collection')[0];

    const getlastmodified = resp.getElementsByTagNameNS('DAV:', 'getlastmodified')[0];
    const getcontentlength = resp.getElementsByTagNameNS('DAV:', 'getcontentlength')[0];
    const getcontenttype = resp.getElementsByTagNameNS('DAV:', 'getcontenttype')[0];

    const rawName = href.replace(/\/$/, '').split('/').pop() ?? href;

    // href from PROPFIND includes the /dav prefix (e.g. /dav/test/).
    // Strip it so entry.path is relative to the WebDAV root (e.g. /test/)
    // and callers can prepend DAV_BASE once when making requests.
    const strippedPath = href.startsWith(DAV_BASE)
      ? href.slice(DAV_BASE.length) || '/'
      : href;

    entries.push({
      name: rawName,
      path: strippedPath,
      isDirectory,
      size: getcontentlength?.textContent ? Number(getcontentlength.textContent) : null,
      lastModified: getlastmodified?.textContent?.trim() ?? null,
      contentType: getcontenttype?.textContent?.trim() ?? null,
    });
  }

  return entries;
}

export async function listDir(path: string): Promise<DavEntry[]> {
  const url = `${DAV_BASE}${path}`;
  const res = await fetch(url, {
    method: 'PROPFIND',
    headers: { Depth: '1', Accept: 'application/xml' },
  });
  if (!res.ok) throw new Error(`PROPFIND failed: ${res.status}`);
  const xml = await res.text();
  return parsePropfind(xml, url);
}

export function downloadUrl(path: string): string {
  return `${DAV_BASE}${path}`;
}

export async function uploadFile(
  dirPath: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${DAV_BASE}${dirPath}${dirPath.endsWith('/') ? '' : '/'}${file.name}`;
    xhr.open('PUT', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`PUT ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.send(file);
  });
}

export async function createFolder(path: string): Promise<void> {
  const res = await fetch(`${DAV_BASE}${path}`, { method: 'MKCOL' });
  if (!res.ok && res.status !== 405) throw new Error(`MKCOL failed: ${res.status}`);
}

export async function deleteEntry(path: string): Promise<void> {
  const res = await fetch(`${DAV_BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE failed: ${res.status}`);
}

export async function moveEntry(fromPath: string, toPath: string): Promise<void> {
  const destination = `${window.location.origin}${DAV_BASE}${toPath}`;
  const res = await fetch(`${DAV_BASE}${fromPath}`, {
    method: 'MOVE',
    headers: { Destination: destination, Overwrite: 'F' },
  });
  if (!res.ok) throw new Error(`MOVE failed: ${res.status}`);
}
