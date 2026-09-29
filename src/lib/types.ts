/**
 * Type definitions for the NarcProof application
 */

import { HashChainLink } from './hashChain';
import { InferenceResult } from './reagentDatabase';

export interface Witness {
  id: string;
  name: string;
  phone: string;
  signatureDataUrl: string; // Base64 PNG of their on-screen signature
  capturedAt: string; // ISO timestamp
  frameTimestamp: number; // Video timestamp when captured
}

export interface OfficerInfo {
  name: string;
  badgeNumber: string;
  rank: string;
  station: string;
  selfieDataUrl?: string;
  selfieTimestamp?: string;
}

export interface ColorSample {
  timestamp: number; // Seconds from video start
  hsl: { h: number; s: number; l: number };
  rgb: { r: number; g: number; b: number };
  hex: string;
  corrected?: boolean; // Whether white-balance was applied
}

export interface BlankControlResult {
  reagentId: string;
  photographDataUrl: string; // Photo of unreacted reagent
  measuredColor: { h: number; s: number; l: number };
  expectedColor: { h: number; s: number; l: number };
  colorDelta: number;
  passed: boolean;
  warning?: string;
  timestamp: string;
}

export interface ReagentTestResult {
  reagentId: string;
  reagentName: string;
  blankControl: BlankControlResult;
  colorCurve: ColorSample[];
  finalColor: { h: number; s: number; l: number };
  readingTimestamp: number;
  autoReading: string; // What the app says it detected
  officerConfirmed: boolean;
  officerReading?: string; // Officer's manual confirmation
}

export interface KitInfo {
  kitId: string;
  kitName: string;
  manufacturer: string;
  barcode: string;
  batchNumber: string;
  expiryDate: string;
  isExpired: boolean;
  reagentsUsed: string[];
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  timestamp: string;
}

export interface TestRecord {
  id: string;
  caseNumber: string;
  firNumber?: string;
  
  // Proof 1: Test actually happened
  officer: OfficerInfo;
  witnesses: Witness[];
  videoBlob?: Blob; // Stored separately due to size
  videoUrl?: string;
  hashChain: HashChainLink[];
  colorCurve: ColorSample[];
  location: GPSLocation;
  
  // Proof 2: Kit was working
  kit: KitInfo;
  blankControls: BlankControlResult[];
  
  // Proof 3: Reading is right
  reagentResults: ReagentTestResult[];
  multiReagentInference: InferenceResult[];
  
  // Proof 4: Court-ready
  bsaCertificateData: BSACertificateData;
  
  // NDPS
  sampleWeight?: number;
  ndpsCategory?: string;
  ndpsSection?: string;
  
  // Metadata
  createdAt: string;
  completedAt?: string;
  status: 'in-progress' | 'completed' | 'exported';
  appVersion: string;
}

export interface BSACertificateData {
  // Pre-filled by app
  deviceDescription: string;
  appVersion: string;
  fileNames: string[];
  fileHashes: { fileName: string; hash: string; algorithm: string }[];
  hashChainFinalHash: string;
  creationDate: string;
  gpsLocation: string;
  
  // Officer fills
  officerName: string;
  officerDesignation: string;
  officerStatement: string;
  
  // Expert fills (blank for signature)
  expertName?: string;
  expertDesignation?: string;
  expertSignature?: string;
}

export interface CalibrationResult {
  phoneModel: string;
  lightCondition: string;
  testColorName: string;
  rawColor: { h: number; s: number; l: number };
  correctedColor: { h: number; s: number; l: number };
  expectedColor: { h: number; s: number; l: number };
  rawDelta: number;
  correctedDelta: number;
  timestamp: string;
}

export interface IntelligenceDataPoint {
  location: GPSLocation;
  drugGroup: string;
  confidence: string;
  date: string;
  district: string;
  state: string;
}

export type TestStep = 
  | 'officer-login'
  | 'kit-scan'
  | 'blank-control'
  | 'video-start'
  | 'reagent-test'
  | 'color-reading'
  | 'witnesses'
  | 'officer-selfie'
  | 'ndps-weight'
  | 'results-review'
  | 'certificate'
  | 'export';
