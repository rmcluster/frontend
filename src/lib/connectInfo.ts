import type { ConnectInfo } from '../types/ui';

function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '[::1]'
  ) {
    return true;
  }

  return normalized.startsWith('127.');
}

function browserVisibleHost(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const host = window.location.hostname.trim();
  if (!host || isLoopbackHost(host)) {
    return null;
  }

  return host;
}

function isLikelyIPv4(host: string): boolean {
  const parts = host.split('.');
  return parts.length === 4 && parts.every((part) => /^\d+$/.test(part));
}

function extractIPv4Candidates(text: string): string[] {
  return Array.from(text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g), (match) => match[0]);
}

function isPrivateOrLocalIPv4(ip: string): boolean {
  if (!isLikelyIPv4(ip)) {
    return false;
  }

  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('127.')) {
    return true;
  }

  const secondOctet = Number(ip.split('.')[1] ?? '');
  return ip.startsWith('172.') && secondOctet >= 16 && secondOctet <= 31;
}

let lanIPv4Promise: Promise<string | null> | null = null;

async function detectLanIPv4(): Promise<string | null> {
  if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
    return null;
  }

  const pc = new RTCPeerConnection({ iceServers: [] });
  const seen = new Set<string>();

  try {
    pc.createDataChannel('rmcluster-lan-discovery');

    const found = new Promise<string | null>((resolve) => {
      const finish = (value: string | null) => resolve(value);
      const timeout = window.setTimeout(() => finish(null), 1500);

      const inspect = (text: string) => {
        for (const candidate of extractIPv4Candidates(text)) {
          if (seen.has(candidate)) {
            continue;
          }
          seen.add(candidate);
          if (isPrivateOrLocalIPv4(candidate) && !candidate.startsWith('127.')) {
            window.clearTimeout(timeout);
            finish(candidate);
            return true;
          }
        }
        return false;
      };

      pc.onicecandidate = (event) => {
        const candidate = event.candidate?.candidate ?? '';
        if (candidate) {
          inspect(candidate);
          return;
        }
        window.clearTimeout(timeout);
        finish(null);
      };

      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          window.clearTimeout(timeout);
          finish(null);
        }
      };

      void pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          const sdp = pc.localDescription?.sdp ?? '';
          inspect(sdp);
        })
        .catch(() => {
          window.clearTimeout(timeout);
          finish(null);
        });
    });

    return await found;
  } finally {
    pc.close();
  }
}

export async function preferredConnectHost(host: string): Promise<string> {
  const browserHost = browserVisibleHost();
  if (!browserHost) {
    if (!lanIPv4Promise) {
      lanIPv4Promise = detectLanIPv4();
    }
    return (await lanIPv4Promise) ?? host;
  }

  return browserHost;
}

export async function normalizeConnectInfo(info: ConnectInfo): Promise<ConnectInfo> {
  const host = await preferredConnectHost(info.host);
  if (host === info.host) {
    return info;
  }

  let connectUri = info.connect_uri;
  try {
    const url = new URL(info.connect_uri);
    url.searchParams.set('url', host);
    connectUri = url.toString();
  } catch {
    // Keep the server-provided URI if parsing fails unexpectedly.
  }

  return {
    ...info,
    host,
    connect_uri: connectUri,
  };
}
