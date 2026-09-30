'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { rgbToHsl, hslToHex, hslToName, sampleColorFromCanvas, colorDistance, applyWhiteBalance } from '@/lib/reagentDatabase';

interface CalibrationSample {
  id: string;
  label: string;
  lightCondition: string;
  rawRGB: { r: number; g: number; b: number };
  rawHSL: { h: number; s: number; l: number };
  correctedRGB: { r: number; g: number; b: number };
  correctedHSL: { h: number; s: number; l: number };
  referenceWhite: { r: number; g: number; b: number };
  timestamp: string;
}

const LIGHT_CONDITIONS = [
  'Bright Daylight (Outdoor)',
  'Fluorescent (Indoor)',
  'Warm Tungsten (Yellow Light)',
];

const REFERENCE_COLORS = [
  { name: 'Deep Purple (Heroin/Marquis)', hsl: { h: 270, s: 80, l: 25 } },
  { name: 'Orange-Brown (Amphetamine/Marquis)', hsl: { h: 20, s: 90, l: 45 } },
  { name: 'Blue (Meth/Simons)', hsl: { h: 220, s: 70, l: 50 } },
  { name: 'Green (Heroin/Mecke)', hsl: { h: 120, s: 50, l: 30 } },
];

export default function CalibrationPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [samples, setSamples] = useState<CalibrationSample[]>([]);
  const [currentLight, setCurrentLight] = useState(LIGHT_CONDITIONS[0]);
  const [currentLabel, setCurrentLabel] = useState('');
  const [whiteRef, setWhiteRef] = useState<{ r: number; g: number; b: number } | null>(null);
  const [liveColor, setLiveColor] = useState<{ h: number; s: number; l: number; r: number; g: number; b: number } | null>(null);
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
    }
  }, []);

  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current && videoRef.current.srcObject !== cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.error(e));

      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);

        const color = sampleColorFromCanvas(ctx,
          Math.floor(canvas.width * 0.35), Math.floor(canvas.height * 0.35),
          Math.floor(canvas.width * 0.3), Math.floor(canvas.height * 0.3)
        );
        setLiveColor(color);
      }, 200);
    }
  }, [cameraActive, cameraStream]);

  useEffect(() => {
    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    };
  }, []);

  const captureWhiteRef = useCallback(() => {
    if (!liveColor) return;
    setWhiteRef({ r: liveColor.r, g: liveColor.g, b: liveColor.b });
  }, [liveColor]);

  const captureSample = useCallback(() => {
    if (!liveColor) return;

    const rawRGB = { r: liveColor.r, g: liveColor.g, b: liveColor.b };
    const rawHSL = { h: liveColor.h, s: liveColor.s, l: liveColor.l };

    let correctedRGB = rawRGB;
    let correctedHSL = rawHSL;

    if (whiteRef) {
      correctedRGB = applyWhiteBalance(rawRGB, whiteRef);
      correctedHSL = rgbToHsl(correctedRGB.r, correctedRGB.g, correctedRGB.b);
    }

    const sample: CalibrationSample = {
      id: Date.now().toString(),
      label: currentLabel || `Sample ${samples.length + 1}`,
      lightCondition: currentLight,
      rawRGB,
      rawHSL,
      correctedRGB,
      correctedHSL,
      referenceWhite: whiteRef || { r: 255, g: 255, b: 255 },
      timestamp: new Date().toISOString(),
    };

    setSamples(prev => [...prev, sample]);
  }, [liveColor, whiteRef, currentLight, currentLabel, samples.length]);

  // Calculate cross-phone/cross-light analysis
  const analysisGroups = samples.reduce((acc, s) => {
    const key = s.label;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {} as Record<string, CalibrationSample[]>);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 4px' }}>
          ◎ Measured Calibration Chart
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          <span className="badge badge-info" style={{ marginRight: '8px' }}>PROOF 3</span>
          Photograph the same colour-change test under different lights. 
          Chart how far apart the readings are before and after white-balance correction.
        </p>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Camera Panel */}
        <div className="glass-card">
          <h3 style={{ marginTop: 0 }}>Camera</h3>

          {!cameraActive ? (
            <button className="btn-primary" onClick={startCamera} style={{ width: '100%' }}>
               Start Camera
            </button>
          ) : (
            <div>
              <div className="camera-viewfinder" style={{ marginBottom: '12px' }}>
                <video ref={videoRef} style={{ width: '100%', borderRadius: '12px' }} autoPlay playsInline muted />
                <div className="sample-region" style={{ left: '35%', top: '35%', width: '30%', height: '30%' }} />

                {liveColor && (
                  <div style={{
                    position: 'absolute', bottom: '12px', left: '12px', right: '12px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(0,0,0,0.7)', padding: '8px 12px', borderRadius: '10px',
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: hslToHex(liveColor.h, liveColor.s, liveColor.l),
                      border: '2px solid white',
                    }} />
                    <div style={{ fontSize: '11px', color: 'white' }}>
                      <div>{hslToName(liveColor)}</div>
                      <div style={{ opacity: 0.7 }}>H:{liveColor.h} S:{liveColor.s} L:{liveColor.l}</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                <div>
                  <label className="input-label">Light Condition</label>
                  <select className="input-field" value={currentLight} onChange={e => setCurrentLight(e.target.value)}>
                    {LIGHT_CONDITIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Sample Label</label>
                  <input className="input-field" placeholder="e.g., Purple Marquis Test" value={currentLabel} onChange={e => setCurrentLabel(e.target.value)} />
                </div>
                
                <button className="btn-secondary" onClick={captureWhiteRef}>
                  ☐ Capture White Reference {whiteRef && '✓'}
                </button>
                <button className="btn-primary" onClick={captureSample}>
                   Capture Colour Sample
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reference Colours Panel */}
        <div className="glass-card">
          <h3 style={{ marginTop: 0 }}>Reference Colours</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Expected colours for key drug/reagent combinations. Compare your readings against these.
          </p>
          <div style={{ display: 'grid', gap: '8px' }}>
            {REFERENCE_COLORS.map(ref => (
              <div key={ref.name} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px', background: 'var(--surface-2)', borderRadius: '10px',
              }}>
                <div className="color-swatch" style={{
                  background: hslToHex(ref.hsl.h, ref.hsl.s, ref.hsl.l),
                }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{ref.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    H:{ref.hsl.h} S:{ref.hsl.s} L:{ref.hsl.l}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {whiteRef && (
            <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--success)', marginBottom: '4px' }}>✓ White Reference Set</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                R:{whiteRef.r} G:{whiteRef.g} B:{whiteRef.b}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Captured Samples */}
      {samples.length > 0 && (
        <div className="glass-card" style={{ marginTop: '16px' }}>
          <h3 style={{ marginTop: 0 }}>Captured Samples ({samples.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  {['Label', 'Light', 'Raw', 'Raw HSL', 'Corrected', 'Corrected HSL', 'Δ'].map(h => (
                    <th key={h} style={{
                      padding: '8px', textAlign: 'left', fontSize: '11px',
                      fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {samples.map(s => {
                  const delta = colorDistance(s.rawHSL, s.correctedHSL);
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '8px', fontSize: '13px', fontWeight: '600' }}>{s.label}</td>
                      <td style={{ padding: '8px', fontSize: '11px' }}>{s.lightCondition.split('(')[0]}</td>
                      <td style={{ padding: '8px' }}>
                        <div className="color-swatch" style={{
                          width: '28px', height: '28px', borderRadius: '6px',
                          background: hslToHex(s.rawHSL.h, s.rawHSL.s, s.rawHSL.l),
                        }} />
                      </td>
                      <td style={{ padding: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono' }}>
                        {s.rawHSL.h}/{s.rawHSL.s}/{s.rawHSL.l}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <div className="color-swatch" style={{
                          width: '28px', height: '28px', borderRadius: '6px',
                          background: hslToHex(s.correctedHSL.h, s.correctedHSL.s, s.correctedHSL.l),
                        }} />
                      </td>
                      <td style={{ padding: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono' }}>
                        {s.correctedHSL.h}/{s.correctedHSL.s}/{s.correctedHSL.l}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span className={`badge ${delta < 10 ? 'badge-success' : delta < 25 ? 'badge-warning' : 'badge-danger'}`}>
                          Δ{delta.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cross-Condition Analysis */}
      {Object.keys(analysisGroups).length > 0 && Object.values(analysisGroups).some(g => g.length > 1) && (
        <div className="glass-card" style={{ marginTop: '16px' }}>
          <h3 style={{ marginTop: 0 }}>ılı Cross-Condition Analysis</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            How much does the same colour shift across different lighting conditions?
          </p>

          {Object.entries(analysisGroups).filter(([, g]) => g.length > 1).map(([label, group]) => {
            const deltas: number[] = [];
            for (let i = 0; i < group.length; i++) {
              for (let j = i + 1; j < group.length; j++) {
                deltas.push(colorDistance(group[i].correctedHSL, group[j].correctedHSL));
              }
            }
            const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
            const maxDelta = Math.max(...deltas);

            // Compare raw deltas
            const rawDeltas: number[] = [];
            for (let i = 0; i < group.length; i++) {
              for (let j = i + 1; j < group.length; j++) {
                rawDeltas.push(colorDistance(group[i].rawHSL, group[j].rawHSL));
              }
            }
            const avgRawDelta = rawDeltas.reduce((a, b) => a + b, 0) / rawDeltas.length;

            const improvement = ((avgRawDelta - avgDelta) / avgRawDelta * 100).toFixed(1);

            return (
              <div key={label} style={{
                padding: '16px', background: 'var(--surface-2)', borderRadius: '12px',
                marginBottom: '12px',
              }}>
                <div style={{ fontWeight: '700', marginBottom: '8px' }}>{label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Raw Avg Δ</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--danger)' }}>
                      {avgRawDelta.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Corrected Avg Δ</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--success)' }}>
                      {avgDelta.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Improvement</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent)' }}>
                      {improvement}%
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                  {group.map(s => (
                    <div key={s.id} style={{
                      flex: 1, textAlign: 'center', padding: '8px',
                      background: 'var(--surface-1)', borderRadius: '8px',
                    }}>
                      <div className="color-swatch" style={{
                        width: '32px', height: '32px', borderRadius: '8px', margin: '0 auto 4px',
                        background: hslToHex(s.correctedHSL.h, s.correctedHSL.s, s.correctedHSL.l),
                      }} />
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {s.lightCondition.split('(')[0].trim()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
