/**
 * Hash Chain Utility for Video Evidence Integrity
 * 
 * Hash the video in 1-second chunks. Each chunk's hash includes
 * the previous chunk's hash, creating a chain. Cutting or editing
 * any part of the video breaks the chain.
 * 
 * Uses Web Crypto API (SHA-256) — built into browsers, no library needed.
 */

export interface HashChainLink {
  chunkIndex: number;
  timestamp: number; // seconds from start
  chunkHash: string; // SHA-256 hex
  previousHash: string; // Previous link's hash (or GENESIS for first)
  combinedHash: string; // SHA-256(chunkHash + previousHash)
  metadata?: {
    gpsLat?: number;
    gpsLng?: number;
    colorSample?: { h: number; s: number; l: number };
    witnessAction?: string;
  };
}

export interface HashChain {
  links: HashChainLink[];
  genesisHash: string;
  finalHash: string;
  videoStartTime: string; // ISO timestamp
  videoEndTime: string;
  deviceInfo: string;
  appVersion: string;
  algorithm: 'SHA-256';
}

const GENESIS = 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Convert an ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SHA-256 hash of a string using Web Crypto API
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return bufferToHex(hashBuffer);
}

/**
 * SHA-256 hash of binary data (ArrayBuffer)
 */
export async function sha256Binary(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Add a new link to the hash chain
 */
export async function addChainLink(
  chain: HashChainLink[],
  chunkData: ArrayBuffer,
  timestamp: number,
  metadata?: HashChainLink['metadata']
): Promise<HashChainLink> {
  const chunkHash = await sha256Binary(chunkData);
  const previousHash = chain.length > 0 ? chain[chain.length - 1].combinedHash : GENESIS;
  const combinedHash = await sha256(chunkHash + previousHash);

  const link: HashChainLink = {
    chunkIndex: chain.length,
    timestamp,
    chunkHash,
    previousHash,
    combinedHash,
    metadata,
  };

  chain.push(link);
  return link;
}

/**
 * Verify the entire hash chain integrity
 */
export async function verifyChain(chain: HashChainLink[]): Promise<{
  valid: boolean;
  brokenAt?: number;
  message: string;
}> {
  if (chain.length === 0) {
    return { valid: false, message: 'Empty chain' };
  }

  // Verify first link points to GENESIS
  if (chain[0].previousHash !== GENESIS) {
    return { valid: false, brokenAt: 0, message: 'First link does not reference GENESIS' };
  }

  for (let i = 0; i < chain.length; i++) {
    const link = chain[i];
    
    // Verify the combined hash
    const expectedCombined = await sha256(link.chunkHash + link.previousHash);
    if (expectedCombined !== link.combinedHash) {
      return {
        valid: false,
        brokenAt: i,
        message: `Chain broken at chunk ${i} (t=${link.timestamp}s): combined hash mismatch`,
      };
    }

    // Verify chain linkage
    if (i > 0 && link.previousHash !== chain[i - 1].combinedHash) {
      return {
        valid: false,
        brokenAt: i,
        message: `Chain broken at chunk ${i} (t=${link.timestamp}s): previous hash doesn't match prior link`,
      };
    }
  }

  return { valid: true, message: `Chain verified: ${chain.length} links, all intact` };
}

/**
 * Generate complete file hash for BSA Section 63 certificate
 */
export async function hashFile(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  return sha256Binary(buffer);
}

/**
 * Get device info string for certificate
 */
export function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  const platform = navigator.platform || 'Unknown';
  return `${platform} | ${ua.substring(0, 100)}`;
}
