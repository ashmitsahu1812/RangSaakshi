/**
 * BSA Section 63 Certificate Generator
 * 
 * Generates a legal certificate for electronic records as per
 * Bharatiya Sakshya Adhiniyam, 2023, Section 63.
 * 
 * Pre-fills: device info, app version, file names, SHA-256 hashes
 * Leaves blank: expert signature section
 */

import { BSACertificateData, TestRecord } from './types';
import { hashFile, getDeviceInfo } from './hashChain';

const APP_VERSION = '1.0.0-SIH2026';

export function generateCertificateData(record: TestRecord): BSACertificateData {
  return {
    deviceDescription: getDeviceInfo(),
    appVersion: APP_VERSION,
    fileNames: getFileList(record),
    fileHashes: [],  // Will be populated async
    hashChainFinalHash: record.hashChain.length > 0 
      ? record.hashChain[record.hashChain.length - 1].combinedHash 
      : 'N/A',
    creationDate: record.createdAt,
    gpsLocation: record.location 
      ? `${record.location.latitude.toFixed(6)}, ${record.location.longitude.toFixed(6)} (±${record.location.accuracy}m)`
      : 'N/A',
    officerName: record.officer.name,
    officerDesignation: `${record.officer.rank}, ${record.officer.station} (Badge: ${record.officer.badgeNumber})`,
    officerStatement: '',
  };
}

function getFileList(record: TestRecord): string[] {
  const files: string[] = [];
  files.push(`procedure_video_${record.id}.webm`);
  files.push(`hash_chain_${record.id}.json`);
  files.push(`color_curve_${record.id}.json`);
  
  for (const bc of record.blankControls) {
    files.push(`blank_control_${bc.reagentId}_${record.id}.png`);
  }
  
  for (const w of record.witnesses) {
    files.push(`witness_signature_${w.id}.png`);
  }
  
  if (record.officer.selfieDataUrl) {
    files.push(`officer_selfie_${record.id}.png`);
  }
  
  files.push(`inference_results_${record.id}.json`);
  files.push(`bsa_certificate_${record.id}.pdf`);
  
  return files;
}

/**
 * Generate the certificate text following BSA Section 63 form
 */
export function generateCertificateText(data: BSACertificateData): string {
  const divider = '═'.repeat(70);
  
  return `
${divider}
    CERTIFICATE UNDER SECTION 63
    BHARATIYA SAKSHYA ADHINIYAM, 2023
    (Indian Evidence Act, 2023)
${divider}

Certificate No.: NARCPROOF-${Date.now().toString(36).toUpperCase()}
Date of Generation: ${new Date(data.creationDate).toLocaleDateString('en-IN', { 
    day: '2-digit', month: 'long', year: 'numeric' 
  })}

${divider}
  PART I — IDENTIFYING THE ELECTRONIC RECORD
${divider}

1. Description of the electronic record:
   Presumptive drug field test conducted via the NarcProof application,
   comprising a continuous procedure video, real-time colour analysis,
   witness attestations, blank control photographs, and multi-reagent
   inference results.

2. Device used to produce the record:
   ${data.deviceDescription}

3. Application version:
   NarcProof v${data.appVersion}

4. GPS location at time of recording:
   ${data.gpsLocation}

5. Files comprising the electronic record:
${data.fileNames.map((f, i) => `   ${(i + 1).toString().padStart(2, '0')}. ${f}`).join('\n')}

${divider}
  PART II — HASH VALUES AND INTEGRITY
${divider}

6. Hash algorithm used: SHA-256

7. Individual file hash values:
${data.fileHashes.length > 0 
    ? data.fileHashes.map(f => `   File: ${f.fileName}\n   ${f.algorithm}: ${f.hash}`).join('\n\n')
    : '   [To be computed and appended at time of export]'
  }

8. Video hash chain:
   The procedure video is hashed in 1-second segments. Each segment's
   SHA-256 hash incorporates the previous segment's hash, forming a
   cryptographic chain. Removing, replacing, or reordering any segment
   invalidates the chain from that point onward.

   Final chain hash: ${data.hashChainFinalHash}
   Total chain links: [See attached hash_chain JSON file]

${divider}
  PART III — CONDITIONS UNDER SECTION 63(2)
${divider}

I, the undersigned, certify the following conditions:

(a) The electronic record was produced by the above-described device
    during the period in which the device was used regularly for
    law-enforcement field testing activities.

(b) During said period, the device was operating properly; or if not,
    the defect did not affect the electronic record or its accuracy.

(c) The information contained in the electronic record reproduces or
    is derived from information supplied to the device in the ordinary
    course of the field test procedure.

(d) Throughout the procedure, the NarcProof application:
    • Blocked gallery uploads; only live camera input was accepted.
    • Recorded colour samples approximately 4 times per second.
    • Hashed video in 1-second cryptographic chain segments.
    • Captured witness attestations with on-screen signatures.
    • Performed automated blank-control checks on every reagent.
    • Ran multi-reagent cross-inference to identify the substance.

${divider}
  PART IV — OFFICER'S ATTESTATION
${divider}

Name: ${data.officerName || '______________________________'}
Designation: ${data.officerDesignation || '______________________________'}

Statement:
${data.officerStatement || `I confirm that the above electronic record accurately represents
the field drug test procedure I conducted, and that no part of
the record has been altered, edited, or fabricated.`}

Signature: ______________________________
Date: ${new Date().toLocaleDateString('en-IN')}

${divider}
  PART V — EXPERT CERTIFICATION (TO BE FILLED BY FSL EXPERT)
${divider}

I certify that I have examined the electronic record described above
and verified its integrity using the hash values provided.

Name: ${data.expertName || '______________________________'}
Designation: ${data.expertDesignation || '______________________________'}
Organisation: ______________________________

Findings:
________________________________________________________________________
________________________________________________________________________
________________________________________________________________________

Signature: ______________________________
Date: ______________________________

${divider}
  This certificate was generated by NarcProof v${data.appVersion}
  — Four Proofs. One Record. Zero Doubt. —
${divider}
`.trim();
}

/**
 * Generate a formatted HTML version of the certificate for PDF export
 */
export function generateCertificateHTML(data: BSACertificateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap');
  body { font-family: 'Noto Serif', serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.6; }
  h1 { text-align: center; font-size: 18px; border-bottom: 3px double #333; padding-bottom: 10px; }
  h2 { font-size: 14px; background: #f0f0f0; padding: 8px 12px; border-left: 4px solid #1a3a5c; margin-top: 30px; }
  .cert-no { text-align: center; color: #666; font-size: 12px; }
  .field { margin: 8px 0; }
  .field-label { font-weight: bold; }
  .hash { font-family: monospace; font-size: 11px; word-break: break-all; background: #f9f9f9; padding: 4px 8px; border: 1px solid #ddd; }
  .signature-line { border-bottom: 1px solid #333; width: 300px; display: inline-block; margin-top: 30px; }
  .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #888; border-top: 2px solid #333; padding-top: 10px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  td, th { padding: 6px 10px; border: 1px solid #ddd; font-size: 12px; }
  th { background: #f0f4f8; }
  .ashoka { text-align: center; font-size: 24px; margin-bottom: 5px; }
</style>
</head>
<body>
  <div class="ashoka">⚖️</div>
  <h1>CERTIFICATE UNDER SECTION 63<br/>BHARATIYA SAKSHYA ADHINIYAM, 2023</h1>
  <p class="cert-no">Certificate No.: NARCPROOF-${Date.now().toString(36).toUpperCase()}</p>

  <h2>PART I — IDENTIFYING THE ELECTRONIC RECORD</h2>
  <div class="field"><span class="field-label">Device:</span> ${data.deviceDescription}</div>
  <div class="field"><span class="field-label">Application:</span> NarcProof v${data.appVersion}</div>
  <div class="field"><span class="field-label">GPS Location:</span> ${data.gpsLocation}</div>
  <div class="field"><span class="field-label">Date:</span> ${new Date(data.creationDate).toLocaleString('en-IN')}</div>

  <h2>PART II — HASH VALUES AND INTEGRITY</h2>
  <div class="field"><span class="field-label">Algorithm:</span> SHA-256</div>
  <table>
    <tr><th>File</th><th>SHA-256 Hash</th></tr>
    ${data.fileHashes.map(f => `<tr><td>${f.fileName}</td><td class="hash">${f.hash}</td></tr>`).join('')}
  </table>
  <div class="field"><span class="field-label">Video Chain Final Hash:</span></div>
  <div class="hash">${data.hashChainFinalHash}</div>

  <h2>PART III — CONDITIONS UNDER SECTION 63(2)</h2>
  <p>The electronic record was produced by the above-described device during lawful operation. The NarcProof application blocked gallery uploads, recorded colour samples ≈4/second, hashed video in 1-second chain segments, captured witness attestations, performed blank-control checks, and ran multi-reagent cross-inference.</p>

  <h2>PART IV — OFFICER'S ATTESTATION</h2>
  <div class="field"><span class="field-label">Name:</span> ${data.officerName || '______________________'}</div>
  <div class="field"><span class="field-label">Designation:</span> ${data.officerDesignation || '______________________'}</div>
  <p>I confirm that the above electronic record accurately represents the field drug test procedure I conducted.</p>
  <p>Signature: <span class="signature-line">&nbsp;</span></p>

  <h2>PART V — EXPERT CERTIFICATION</h2>
  <p>Name: <span class="signature-line">&nbsp;</span></p>
  <p>Organisation: <span class="signature-line">&nbsp;</span></p>
  <p>Findings: ____________________________________________________________</p>
  <p>Signature: <span class="signature-line">&nbsp;</span></p>

  <div class="footer">Generated by NarcProof v${data.appVersion} — Four Proofs. One Record. Zero Doubt.</div>
</body>
</html>`;
}
