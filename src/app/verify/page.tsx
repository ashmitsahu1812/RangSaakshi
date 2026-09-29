'use client';

import { useState, useRef } from 'react';
import { verifyChain, sha256Binary, type HashChainLink } from '@/lib/hashChain';

export default function VerifyPage() {
  const [mode, setMode] = useState<'hash' | 'chain' | 'sms'>('hash');
  const [fileHash, setFileHash] = useState('');
  const [fileName, setFileName] = useState('');
  const [isHashing, setIsHashing] = useState(false);
  const [chainData, setChainData] = useState<HashChainLink[] | null>(null);
  const [chainResult, setChainResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [knownHash, setKnownHash] = useState('');
  const [hashMatch, setHashMatch] = useState<boolean | null>(null);
  const [smsHash, setSmsHash] = useState('');
  const [smsTime, setSmsTime] = useState('');
  const [smsGps, setSmsGps] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chainInputRef = useRef<HTMLInputElement>(null);

  const handleFileHash = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsHashing(true);
    setFileHash('');
    setHashMatch(null);

    try {
      const buffer = await file.arrayBuffer();
      const hash = await sha256Binary(buffer);
      setFileHash(hash);

      if (knownHash) {
        setHashMatch(hash.toLowerCase() === knownHash.toLowerCase().trim());
      }
    } catch (err) {
      console.error('Hashing error:', err);
    } finally {
      setIsHashing(false);
    }
  };

  const handleChainVerify = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsVerifying(true);
    setChainResult(null);

    try {
      const text = await file.text();
      const chain: HashChainLink[] = JSON.parse(text);
      setChainData(chain);
      const result = await verifyChain(chain);
      setChainResult(result);
    } catch (err) {
      setChainResult({ valid: false, message: `Error parsing chain file: ${err}` });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 4px' }}>
          ✓ Evidence Verification Portal
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Verify the integrity of RangSaakshi evidence files. Check file hashes, 
          validate video chain integrity, or verify SMS backup proofs.
        </p>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { id: 'hash' as const, icon: '#️⃣', label: 'File Hash' },
          { id: 'chain' as const, icon: '∞', label: 'Chain Verify' },
          { id: 'sms' as const, icon: '✉', label: 'SMS Proof' },
        ].map(tab => (
          <button
            key={tab.id}
            className={mode === tab.id ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setMode(tab.id)}
            style={{ flex: 1 }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* File Hash Mode */}
      {mode === 'hash' && (
        <div className="glass-card animate-fade-in">
          <h2 style={{ marginTop: 0 }}>SHA-256 File Hash Verification</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Upload any evidence file to compute its SHA-256 hash. Compare it against the hash 
            recorded in the BSA Section 63 certificate.
          </p>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label className="input-label">Expected Hash (from certificate)</label>
              <input 
                className="input-field" 
                placeholder="Paste the SHA-256 hash from the certificate..." 
                value={knownHash} 
                onChange={e => {
                  setKnownHash(e.target.value);
                  if (fileHash) {
                    setHashMatch(fileHash.toLowerCase() === e.target.value.toLowerCase().trim());
                  }
                }} 
                style={{ fontFamily: 'JetBrains Mono', fontSize: '13px' }}
              />
            </div>

            <div>
              <label className="input-label">Upload File to Verify</label>
              <input 
                ref={fileInputRef}
                type="file" 
                onChange={handleFileHash}
                style={{ display: 'none' }}
              />
              <button 
                className="btn-secondary" 
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%' }}
              >
                📁 Select File
              </button>
            </div>

            {isHashing && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                Computing SHA-256 hash...
              </div>
            )}

            {fileName && (
              <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: '10px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  📄 {fileName}
                </div>
              </div>
            )}

            {fileHash && (
              <div>
                <label className="input-label">Computed Hash</label>
                <div className="hash-display">{fileHash}</div>
              </div>
            )}

            {hashMatch !== null && (
              <div style={{
                padding: '20px', borderRadius: '12px', textAlign: 'center',
                background: hashMatch ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${hashMatch ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>
                  {hashMatch ? '✓' : '✗'}
                </div>
                <div style={{ 
                  fontWeight: '700', fontSize: '18px',
                  color: hashMatch ? 'var(--success)' : 'var(--danger)',
                }}>
                  {hashMatch ? 'HASH MATCH — File is intact' : 'HASH MISMATCH — File has been altered'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {hashMatch 
                    ? 'The file has not been modified since the certificate was generated.'
                    : 'The file does not match the hash in the certificate. It may have been tampered with.'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chain Verify Mode */}
      {mode === 'chain' && (
        <div className="glass-card animate-fade-in">
          <h2 style={{ marginTop: 0 }}>∞ Video Hash Chain Verification</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Upload the hash_chain JSON file exported with the evidence bundle. 
            The verifier checks that every link in the chain is valid and no segments have been removed or reordered.
          </p>

          <input 
            ref={chainInputRef}
            type="file" 
            accept=".json"
            onChange={handleChainVerify}
            style={{ display: 'none' }}
          />
          <button 
            className="btn-secondary" 
            onClick={() => chainInputRef.current?.click()}
            style={{ width: '100%', marginBottom: '16px' }}
          >
            📁 Upload Hash Chain JSON
          </button>

          {isVerifying && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
              Verifying chain integrity...
            </div>
          )}

          {chainResult && (
            <div>
              <div style={{
                padding: '20px', borderRadius: '12px', textAlign: 'center', marginBottom: '16px',
                background: chainResult.valid ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${chainResult.valid ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>
                  {chainResult.valid ? '∞✓' : '∞✗'}
                </div>
                <div style={{
                  fontWeight: '700', fontSize: '18px',
                  color: chainResult.valid ? 'var(--success)' : 'var(--danger)',
                }}>
                  {chainResult.valid ? 'CHAIN INTACT' : 'CHAIN BROKEN'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {chainResult.message}
                </div>
              </div>

              {chainData && (
                <div style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    CHAIN DETAILS ({chainData.length} links)
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {chainData.slice(0, 20).map((link, i) => (
                      <div key={i} style={{
                        padding: '8px', marginBottom: '4px',
                        background: 'var(--surface-1)', borderRadius: '8px',
                        fontSize: '11px', fontFamily: 'JetBrains Mono',
                      }}>
                        <div style={{ color: 'var(--accent)' }}>
                          Link #{link.chunkIndex} @ {link.timestamp}s
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Hash: {link.combinedHash.substring(0, 40)}...
                        </div>
                      </div>
                    ))}
                    {chainData.length > 20 && (
                      <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        ... and {chainData.length - 20} more links
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SMS Proof Mode */}
      {mode === 'sms' && (
        <div className="glass-card animate-fade-in">
          <h2 style={{ marginTop: 0 }}>✉ SMS Backup Verification</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            In dead zones, RangSaakshi texts the record&apos;s hash, time, and GPS to an NCB number. 
            The server&apos;s receipt time proves the record existed at that moment.
          </p>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label className="input-label">SMS Hash Value</label>
              <input className="input-field" placeholder="Hash from SMS message" value={smsHash} onChange={e => setSmsHash(e.target.value)} style={{ fontFamily: 'JetBrains Mono', fontSize: '13px' }} />
            </div>
            <div>
              <label className="input-label">SMS Timestamp</label>
              <input className="input-field" type="datetime-local" value={smsTime} onChange={e => setSmsTime(e.target.value)} />
            </div>
            <div>
              <label className="input-label">GPS from SMS</label>
              <input className="input-field" placeholder="e.g., 28.6139, 77.2090" value={smsGps} onChange={e => setSmsGps(e.target.value)} />
            </div>

            <button className="btn-primary" style={{ width: '100%' }}>
              ⌕ Verify Against Server Records
            </button>

            <div style={{
              padding: '16px', background: 'rgba(59,130,246,0.1)', borderRadius: '12px',
              border: '1px solid rgba(59,130,246,0.3)',
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent)', marginBottom: '8px' }}>
                How SMS Backup Works
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                1. When the test completes, the app computes the final chain hash.<br />
                2. If there&apos;s no internet, it sends an SMS: <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>RANGSAAKSHI|[hash]|[timestamp]|[lat,lng]</code><br />
                3. The NCB server logs the receipt time — this is a trusted third-party timestamp.<br />
                4. Even without internet, the hash proves the record existed at the SMS time.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
