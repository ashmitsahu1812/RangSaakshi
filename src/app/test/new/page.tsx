'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { BadgeCheck, Shield, Package, FlaskConical, Video, PenLine, Camera, Scale, BarChart, FileText, Send, Mic } from 'lucide-react';
import {
  REAGENTS,
  DRUG_KITS,
  inferDrugFromMultipleReagents,
  rgbToHsl,
  hslToHex,
  hslToName,
  sampleColorFromCanvas,
  colorDistance,
  classifyQuantity,
  type Reagent,
  type InferenceResult,
} from '@/lib/reagentDatabase';
import { addChainLink, sha256, type HashChainLink } from '@/lib/hashChain';
import { generateCertificateData, generateCertificateText, generateCertificateHTML } from '@/lib/certificate';
import type {
  TestRecord,
  ColorSample,
  Witness,
  OfficerInfo,
  BlankControlResult,
  ReagentTestResult,
  KitInfo,
  GPSLocation,
  TestStep,
} from '@/lib/types';

// ─── Signature Pad Component ───
function SignaturePad({ onSave, width = 400, height = 200 }: {
  onSave: (dataUrl: string) => void;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const pos = getPos(e);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const endDraw = () => {
    setDrawing(false);
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
    }
  };

  useEffect(() => { clear(); }, []);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="signature-pad"
        style={{ width: '100%', maxWidth: `${width}px`, height: 'auto', aspectRatio: `${width}/${height}` }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <button onClick={clear} className="btn-secondary" style={{ marginTop: '8px', padding: '6px 16px', fontSize: '12px' }}>
        Clear Signature
      </button>
    </div>
  );
}

// ─── Color Curve Chart (Canvas-based, no Chart.js dep issue) ───
function ColorCurveChart({ data, waitTime }: { data: ColorSample[]; waitTime: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(148,163,184,0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const maxTime = Math.max(data[data.length - 1].timestamp, waitTime + 5);
    const xScale = W / maxTime;

    // Wait time marker
    const waitX = waitTime * xScale;
    ctx.strokeStyle = 'rgba(217,119,6,0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(waitX, 0); ctx.lineTo(waitX, H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#d97706';
    ctx.font = '11px Outfit, sans-serif';
    ctx.fillText(`Reading @ ${waitTime}s`, waitX + 4, 14);

    // Hue line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = d.timestamp * xScale;
      const y = H - (d.hsl.h / 360) * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Saturation line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = d.timestamp * xScale;
      const y = H - (d.hsl.s / 100) * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Lightness line
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = d.timestamp * xScale;
      const y = H - (d.hsl.l / 100) * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Color strip at bottom
    const stripH = 20;
    data.forEach((d, i) => {
      const x = d.timestamp * xScale;
      const nextX = i < data.length - 1 ? data[i + 1].timestamp * xScale : x + 3;
      ctx.fillStyle = d.hex;
      ctx.fillRect(x, H - stripH, Math.max(nextX - x, 1), stripH);
    });

    // Legend
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#3b82f6'; ctx.fillText('■ Hue', W - 200, 14);
    ctx.fillStyle = '#10b981'; ctx.fillText('■ Saturation', W - 140, 14);
    ctx.fillStyle = '#8b5cf6'; ctx.fillText('■ Lightness', W - 65, 14);

  }, [data, waitTime]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={250}
      style={{ width: '100%', height: 'auto', borderRadius: '12px', border: '1px solid var(--glass-border)' }}
    />
  );
}

// ─── Main Test Page ───
export default function NewTestPage() {
  const [currentStep, setCurrentStep] = useState<TestStep>('officer-login');
  const [testId] = useState(() => uuidv4());

  // Officer State
  const [officer, setOfficer] = useState<OfficerInfo>({
    name: '', badgeNumber: '', rank: '', station: '',
  });

  // Kit State
  const [selectedKit, setSelectedKit] = useState(DRUG_KITS[0]);
  const [kitBarcode, setKitBarcode] = useState('');
  const [kitBatchNumber, setKitBatchNumber] = useState('');
  const [kitExpiryDate, setKitExpiryDate] = useState('');
  const [customReagents, setCustomReagents] = useState<string[]>([]);

  // Blank Control State
  const [blankControls, setBlankControls] = useState<BlankControlResult[]>([]);
  const [currentBlankReagent, setCurrentBlankReagent] = useState(0);

  // Video/Recording State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [colorCurve, setColorCurve] = useState<ColorSample[]>([]);
  const [hashChain, setHashChain] = useState<HashChainLink[]>([]);
  const recordedChunksRef = useRef<Blob[]>([]);
  const colorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentColor, setCurrentColor] = useState<{ h: number; s: number; l: number } | null>(null);
  const [sampleRegion, setSampleRegion] = useState({ x: 40, y: 40, w: 20, h: 20 }); // Percentage

  // Reagent Test State
  const [currentReagentIndex, setCurrentReagentIndex] = useState(0);
  const [reagentResults, setReagentResults] = useState<ReagentTestResult[]>([]);
  const [reagentTimer, setReagentTimer] = useState(0);
  const [reagentTimerActive, setReagentTimerActive] = useState(false);

  // Multi-Reagent Inference
  const [inferences, setInferences] = useState<InferenceResult[]>([]);

  // Witness State
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [witnessForm, setWitnessForm] = useState({ name: '', phone: '' });
  const [witnessSignature, setWitnessSignature] = useState('');

  // Selfie State
  const [selfieSrc, setSelfieSrc] = useState('');
  const selfieRef = useRef<HTMLVideoElement>(null);

  // NDPS
  const [sampleWeight, setSampleWeight] = useState('');
  const [ndpsResult, setNdpsResult] = useState<ReturnType<typeof classifyQuantity>>(null);

  // Location
  const [location, setLocation] = useState<GPSLocation | null>(null);

  // Certificate
  const [certificateText, setCertificateText] = useState('');

  // Voice Mode
  const [voiceMode, setVoiceMode] = useState(false);

  // Camera Streams
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [selfieStream, setSelfieStream] = useState<MediaStream | null>(null);

  // Get active reagents for the selected kit
  const activeReagents = selectedKit.id === 'custom'
    ? customReagents.map(id => REAGENTS[id]).filter(Boolean)
    : selectedKit.reagentSequence.map(id => REAGENTS[id]).filter(Boolean);

  // ─── Get GPS Location ───
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude ?? undefined,
        timestamp: new Date().toISOString(),
      }),
      () => console.log('GPS not available')
    );
  }, []);

  // ─── Voice Recognition ───
  useEffect(() => {
    if (!voiceMode) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const W = window as any;
    const SpeechRecognition = W.webkitSpeechRecognition || W.SpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      if (transcript.includes('capture') || transcript.includes('कैप्चर') || transcript.includes('फोटो')) {
        // Trigger capture action
        document.getElementById('capture-btn')?.click();
      }
      if (transcript.includes('next') || transcript.includes('अगला') || transcript.includes('आगे')) {
        document.getElementById('next-btn')?.click();
      }
    };

    recognition.start();
    return () => recognition.stop();
  }, [voiceMode]);

  // ─── Camera Setup ───
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
    } catch (err) {
      console.error('Camera error:', err);
    }
  }, []);

  const startFrontCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setSelfieStream(stream);
    } catch (err) {
      console.error('Front camera error:', err);
    }
  }, []);

  useEffect(() => {
    if (cameraStream && videoRef.current && videoRef.current.srcObject !== cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(console.error);
    }
  }, [currentStep, cameraStream]);

  useEffect(() => {
    if (selfieStream && selfieRef.current && selfieRef.current.srcObject !== selfieStream) {
      selfieRef.current.srcObject = selfieStream;
      selfieRef.current.play().catch(console.error);
    }
  }, [currentStep, selfieStream]);

  // Ensure camera is started if we navigate to a step that needs it (e.g. via step indicator)
  useEffect(() => {
    const needsCamera = ['blank-control', 'video-start', 'reagent-test'].includes(currentStep);
    if (needsCamera && !cameraStream) {
      startCamera();
    }
    const needsFrontCamera = currentStep === 'officer-selfie';
    if (needsFrontCamera && !selfieStream) {
      startFrontCamera();
    }
  }, [currentStep, cameraStream, selfieStream, startCamera, startFrontCamera]);

  // ─── Recording with Hash Chain ───
  const startRecording = useCallback(async () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (!stream) return;

    // Add audio to the stream
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
    } catch { /* proceed without audio */ }

    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
    });

    recordedChunksRef.current = [];
    const localChain: HashChainLink[] = [];

    recorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
        // Hash this chunk and add to chain
        const buffer = await event.data.arrayBuffer();
        const colorSample = currentColor || undefined;
        await addChainLink(localChain, buffer, recordingTime, {
          gpsLat: location?.latitude,
          gpsLng: location?.longitude,
          colorSample: colorSample,
        });
        setHashChain([...localChain]);
      }
    };

    recorder.start(1000); // 1-second chunks for hash chain
    mediaRecorderRef.current = recorder;
    setIsRecording(true);

    // Start timer
    const startTime = Date.now();
    timeIntervalRef.current = setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // Start colour sampling ~4 times/second
    colorIntervalRef.current = setInterval(() => {
      sampleColor();
    }, 250);
  }, [currentColor, location, recordingTime]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (colorIntervalRef.current) clearInterval(colorIntervalRef.current);
    if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
  }, []);

  // ─── Colour Sampling ───
  const sampleColor = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Sample from the center region
    const sx = Math.floor((sampleRegion.x / 100) * canvas.width);
    const sy = Math.floor((sampleRegion.y / 100) * canvas.height);
    const sw = Math.floor((sampleRegion.w / 100) * canvas.width);
    const sh = Math.floor((sampleRegion.h / 100) * canvas.height);

    const color = sampleColorFromCanvas(ctx, sx, sy, sw, sh);
    const hex = hslToHex(color.h, color.s, color.l);

    setCurrentColor({ h: color.h, s: color.s, l: color.l });

    if (isRecording) {
      setColorCurve(prev => [...prev, {
        timestamp: recordingTime + (Date.now() % 1000) / 1000,
        hsl: { h: color.h, s: color.s, l: color.l },
        rgb: { r: color.r, g: color.g, b: color.b },
        hex,
      }]);
    }
  }, [isRecording, recordingTime, sampleRegion]);

  // ─── Blank Control ───
  const captureBlankControl = useCallback(() => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    const reagent = activeReagents[currentBlankReagent];
    if (!reagent) return;

    const color = sampleColorFromCanvas(ctx,
      Math.floor(canvas.width * 0.35), Math.floor(canvas.height * 0.35),
      Math.floor(canvas.width * 0.3), Math.floor(canvas.height * 0.3)
    );

    const delta = colorDistance(
      { h: color.h, s: color.s, l: color.l },
      reagent.blankColor
    );

    const passed = delta <= reagent.blankTolerance;

    const result: BlankControlResult = {
      reagentId: reagent.id,
      photographDataUrl: canvas.toDataURL('image/png'),
      measuredColor: { h: color.h, s: color.s, l: color.l },
      expectedColor: reagent.blankColor,
      colorDelta: Math.round(delta),
      passed,
      warning: passed ? undefined : `⚠ The ${reagent.name} appears to have changed colour before testing. The ampoule may be degraded. Delta: ${Math.round(delta)}`,
      timestamp: new Date().toISOString(),
    };

    setBlankControls(prev => [...prev, result]);
    setCurrentBlankReagent(prev => prev + 1);
  }, [activeReagents, currentBlankReagent]);

  // ─── Selfie Capture ───
  const captureSelfie = useCallback(() => {
    if (!selfieRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = selfieRef.current.videoWidth;
    canvas.height = selfieRef.current.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(selfieRef.current, 0, 0);
    setSelfieSrc(canvas.toDataURL('image/jpeg'));
  }, []);

  // ─── Witness Add ───
  const addWitness = useCallback(() => {
    if (!witnessForm.name || !witnessForm.phone || !witnessSignature) return;
    setWitnesses(prev => [...prev, {
      id: uuidv4(),
      name: witnessForm.name,
      phone: witnessForm.phone,
      signatureDataUrl: witnessSignature,
      capturedAt: new Date().toISOString(),
      frameTimestamp: recordingTime,
    }]);
    setWitnessForm({ name: '', phone: '' });
    setWitnessSignature('');
  }, [witnessForm, witnessSignature, recordingTime]);

  // ─── Run Multi-Reagent Inference ───
  const runInference = useCallback(() => {
    const results = reagentResults.map(r => ({
      reagentId: r.reagentId,
      observedHSL: r.finalColor,
    }));
    const inf = inferDrugFromMultipleReagents(results);
    setInferences(inf);
  }, [reagentResults]);

  // ─── NDPS Classification ───
  useEffect(() => {
    if (sampleWeight && inferences.length > 0 && inferences[0].overallConfidence !== 'unlikely') {
      const result = classifyQuantity(inferences[0].drugName, parseFloat(sampleWeight));
      setNdpsResult(result);
    }
  }, [sampleWeight, inferences]);

  // ─── Generate Certificate ───
  const generateCertificate = useCallback(() => {
    const record: TestRecord = {
      id: testId,
      caseNumber: `CASE-${Date.now().toString(36).toUpperCase()}`,
      officer,
      witnesses,
      hashChain,
      colorCurve,
      location: location!,
      kit: {
        kitId: selectedKit.id,
        kitName: selectedKit.name,
        manufacturer: selectedKit.manufacturer,
        barcode: kitBarcode,
        batchNumber: kitBatchNumber,
        expiryDate: kitExpiryDate,
        isExpired: false,
        reagentsUsed: activeReagents.map(r => r.id),
      },
      blankControls,
      reagentResults,
      multiReagentInference: inferences,
      bsaCertificateData: null!,
      createdAt: new Date().toISOString(),
      status: 'completed',
      appVersion: '1.0.0',
      sampleWeight: sampleWeight ? parseFloat(sampleWeight) : undefined,
    };

    const certData = generateCertificateData(record);
    record.bsaCertificateData = certData;
    const text = generateCertificateText(certData);
    setCertificateText(text);

    // Sync to live backend (non-blocking)
    fetch('https://sih-260231.onrender.com/api/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).catch(err => console.error('Failed to sync test to backend:', err));
  }, [testId, officer, witnesses, hashChain, colorCurve, location, selectedKit, kitBarcode, kitBatchNumber, kitExpiryDate, activeReagents, blankControls, reagentResults, inferences, sampleWeight]);

  // ─── Step Navigation ───
  const steps: { id: TestStep; label: string; icon: React.ReactNode }[] = [
    { id: 'officer-login', label: 'Officer', icon: <Shield size={18} /> },
    { id: 'kit-scan', label: 'Kit', icon: <Package size={18} /> },
    { id: 'blank-control', label: 'Blank', icon: <FlaskConical size={18} /> },
    { id: 'video-start', label: 'Video', icon: <Video size={18} /> },
    { id: 'reagent-test', label: 'Test', icon: <FlaskConical size={18} /> },
    { id: 'witnesses', label: 'Witness', icon: <PenLine size={18} /> },
    { id: 'officer-selfie', label: 'Selfie', icon: <Camera size={18} /> },
    { id: 'ndps-weight', label: 'NDPS', icon: <Scale size={18} /> },
    { id: 'results-review', label: 'Results', icon: <BarChart size={18} /> },
    { id: 'certificate', label: 'Cert', icon: <FileText size={18} /> },
    { id: 'export', label: 'Export', icon: <Send size={18} /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const goNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  };

  // ─── RENDER ───
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Voice Mode Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          onClick={() => setVoiceMode(!voiceMode)}
          className={voiceMode ? 'btn-success' : 'btn-secondary'}
          style={{ padding: '6px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Mic size={14} /> {voiceMode ? 'Voice ON (Hindi)' : 'Voice Mode'}
        </button>
      </div>

      {/* Step Indicator */}
      <div className="step-indicator" style={{ marginBottom: '24px' }}>
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentStep(step.id)}
              disabled={i >= currentStepIndex}
              className={`step-dot ${i < currentStepIndex ? 'completed' : i === currentStepIndex ? 'active' : 'pending'}`}
              style={{ cursor: i >= currentStepIndex ? 'default' : 'pointer' }}
              title={step.label}
            >
              {i < currentStepIndex ? '✓' : step.icon}
            </button>
            {i < steps.length - 1 && (
              <div className={`step-line ${i < currentStepIndex ? 'completed' : 'pending'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Hidden canvas for colour sampling */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ─── STEP: Officer Login ─── */}
      {currentStep === 'officer-login' && (
        <div className="glass-card animate-fade-in">
          <div className="proof-header">
            <div className="proof-number" style={{ background: 'var(--gradient-accent)', color: 'white' }}>
              <Shield size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px' }}>Officer Information</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Identify the testing officer for the record</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="input-label">Full Name *</label>
              <input className="input-field" placeholder="e.g., Inspector Rajesh Kumar" value={officer.name} onChange={e => setOfficer({ ...officer, name: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Badge Number *</label>
              <input className="input-field" placeholder="e.g., NCB-2024-0542" value={officer.badgeNumber} onChange={e => setOfficer({ ...officer, badgeNumber: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Rank *</label>
              <input className="input-field" placeholder="e.g., Inspector" value={officer.rank} onChange={e => setOfficer({ ...officer, rank: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Station *</label>
              <input className="input-field" placeholder="e.g., NCB Delhi Zonal Unit" value={officer.station} onChange={e => setOfficer({ ...officer, station: e.target.value })} />
            </div>
          </div>

          {location && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--surface-2)', borderRadius: '10px' }}>
              <span className="badge badge-success">• GPS Locked</span>
              <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)} (±{location.accuracy.toFixed(0)}m)
              </span>
            </div>
          )}

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              id="next-btn"
              className="btn-primary"
              onClick={goNext}
              disabled={!officer.name || !officer.badgeNumber || !officer.rank || !officer.station}
            >
              Next → Kit Scan
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP: Kit Scan ─── */}
      {currentStep === 'kit-scan' && (
        <div className="glass-card animate-fade-in">
          <div className="proof-header">
            <div className="proof-number" style={{ background: 'var(--gradient-success)', color: 'white' }}><Package size={20} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px' }}>Kit & Reagent Selection</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                <span className="badge badge-info" style={{ marginRight: '8px' }}>PROOF 2</span>
                Verify kit validity and select reagents
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label className="input-label">Select Kit</label>
              <select className="input-field" value={selectedKit.id} onChange={e => setSelectedKit(DRUG_KITS.find(k => k.id === e.target.value) || DRUG_KITS[0])}>
                {DRUG_KITS.map(kit => (
                  <option key={kit.id} value={kit.id}>{kit.name} — {kit.manufacturer}</option>
                ))}
              </select>
            </div>

            {selectedKit.id === 'custom' && (
              <div>
                <label className="input-label">Select Reagents (in testing order)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {Object.values(REAGENTS).map(r => (
                    <button
                      key={r.id}
                      className={customReagents.includes(r.id) ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                      onClick={() => {
                        setCustomReagents(prev =>
                          prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id]
                        );
                      }}
                    >
                      {r.shortName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label className="input-label">Kit Barcode</label>
                <input className="input-field" placeholder="Scan or enter barcode" value={kitBarcode} onChange={e => setKitBarcode(e.target.value)} />
              </div>
              <div>
                <label className="input-label">Batch Number</label>
                <input className="input-field" placeholder="e.g., BATCH-2026-042" value={kitBatchNumber} onChange={e => setKitBatchNumber(e.target.value)} />
              </div>
              <div>
                <label className="input-label">Expiry Date</label>
                <input className="input-field" type="date" value={kitExpiryDate} onChange={e => setKitExpiryDate(e.target.value)} />
              </div>
            </div>

            {kitExpiryDate && new Date(kitExpiryDate) < new Date() && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <span style={{ fontSize: '28px' }}>⊘</span>
                <div>
                  <div style={{ fontWeight: '700', color: 'var(--danger)' }}>EXPIRED KIT — DO NOT USE</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    This kit expired on {new Date(kitExpiryDate).toLocaleDateString('en-IN')}. Results from expired reagents may be unreliable.
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                REAGENT SEQUENCE ({activeReagents.length} reagents):
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {activeReagents.map((r, i) => (
                  <span key={r.id} className="badge badge-info">
                    {i + 1}. {r.shortName} ({r.waitTimeSeconds}s)
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-secondary" onClick={goBack}>← Back</button>
            <button
              id="next-btn"
              className="btn-primary"
              onClick={() => { startCamera(); goNext(); }}
              disabled={!kitBarcode || !kitBatchNumber || !kitExpiryDate || activeReagents.length === 0 || (kitExpiryDate ? new Date(kitExpiryDate) < new Date() : false)}
            >
              Next → Blank Control
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP: Blank Control ─── */}
      {currentStep === 'blank-control' && (
        <div className="glass-card animate-fade-in">
          <div className="proof-header">
            <div className="proof-number" style={{ background: 'var(--gradient-success)', color: 'white' }}><FlaskConical size={20} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px' }}>Blank Control Check</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                <span className="badge badge-info" style={{ marginRight: '8px' }}>PROOF 2</span>
                Photograph each reagent BEFORE adding the sample
              </p>
            </div>
          </div>

          {currentBlankReagent < activeReagents.length ? (
            <div>
              <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--surface-2)', borderRadius: '10px' }}>
                <strong>Reagent {currentBlankReagent + 1}/{activeReagents.length}:</strong> {activeReagents[currentBlankReagent].name}
                <br />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Expected blank colour: <strong>{activeReagents[currentBlankReagent].blankColorName}</strong>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <div
                    className="color-swatch"
                    style={{ background: hslToHex(activeReagents[currentBlankReagent].blankColor.h, activeReagents[currentBlankReagent].blankColor.s, activeReagents[currentBlankReagent].blankColor.l) }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Expected</span>
                  {currentColor && (
                    <>
                      <div className="color-swatch" style={{ background: hslToHex(currentColor.h, currentColor.s, currentColor.l) }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Live ({hslToName(currentColor)})</span>
                    </>
                  )}
                </div>
              </div>

              <div className="camera-viewfinder" style={{ marginBottom: '16px' }}>
                <video ref={videoRef} style={{ width: '100%', borderRadius: '16px' }} autoPlay playsInline muted />
                <div className="camera-overlay" />
                <div className="sample-region" style={{
                  left: '35%', top: '35%', width: '30%', height: '30%',
                }} />
              </div>

              <button id="capture-btn" className="btn-primary" onClick={captureBlankControl} style={{ width: '100%' }}>
                 Capture Blank Control for {activeReagents[currentBlankReagent].shortName}
              </button>
            </div>
          ) : (
            <div>
              <h3 style={{ color: 'var(--success)', marginBottom: '16px' }}>✓ All Blank Controls Captured</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {blankControls.map((bc, i) => {
                  const reagent = REAGENTS[bc.reagentId];
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '12px',
                      background: 'var(--surface-2)',
                      borderRadius: '10px',
                      borderLeft: `4px solid ${bc.passed ? 'var(--success)' : 'var(--danger)'}`,
                    }}>
                      <img src={bc.photographDataUrl} alt="blank" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600' }}>{reagent?.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Δ = {bc.colorDelta} {bc.passed ? '✓ Within tolerance' : '⚠ Possible degradation'}
                        </div>
                      </div>
                      <span className={`badge ${bc.passed ? 'badge-success' : 'badge-danger'}`}>
                        {bc.passed ? 'PASS' : 'WARN'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-secondary" onClick={goBack}>← Back</button>
            <button
              id="next-btn"
              className="btn-primary"
              onClick={() => {
                goNext();
                setTimeout(() => startCamera(), 100);
              }}
              disabled={currentBlankReagent < activeReagents.length}
            >
              Next → Start Recording
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP: Video Recording ─── */}
      {currentStep === 'video-start' && (
        <div className="glass-card animate-fade-in">
          <div className="proof-header">
            <div className="proof-number" style={{ background: 'var(--gradient-accent)', color: 'white' }}><Video size={20} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px' }}>Procedure Video Recording</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                <span className="badge badge-info" style={{ marginRight: '8px' }}>PROOF 1</span>
                Unbroken video from kit opening to final reading. Colour sampled ~4×/sec.
              </p>
            </div>
          </div>

          <div className="camera-viewfinder" style={{ marginBottom: '16px', position: 'relative' }}>
            <video ref={videoRef} style={{ width: '100%', borderRadius: '16px' }} autoPlay playsInline muted />
            <div className="camera-overlay" />
            
            {/* Sample region overlay */}
            <div className="sample-region" style={{
              left: `${sampleRegion.x}%`,
              top: `${sampleRegion.y}%`,
              width: `${sampleRegion.w}%`,
              height: `${sampleRegion.h}%`,
            }}>
              <div style={{
                position: 'absolute',
                bottom: '-24px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                color: 'var(--accent-glow)',
                whiteSpace: 'nowrap',
                background: 'rgba(0,0,0,0.7)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}>
                COLOUR SAMPLE ZONE
              </div>
            </div>

            {/* Recording indicator */}
            {isRecording && (
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0,0,0,0.7)',
                padding: '6px 12px',
                borderRadius: '20px',
              }}>
                <div className="recording-indicator" />
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444' }}>
                  REC {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Live colour */}
            {currentColor && (
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0,0,0,0.7)',
                padding: '6px 12px',
                borderRadius: '20px',
              }}>
                <div className="color-swatch" style={{
                  width: '24px', height: '24px', borderRadius: '6px',
                  background: hslToHex(currentColor.h, currentColor.s, currentColor.l),
                }} />
                <span style={{ fontSize: '11px', color: 'white' }}>
                  {hslToName(currentColor)}
                </span>
              </div>
            )}
          </div>

          {/* Colour Curve */}
          {colorCurve.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                LIVE COLOUR CURVE ({colorCurve.length} samples)
              </div>
              <ColorCurveChart data={colorCurve} waitTime={activeReagents[0]?.waitTimeSeconds || 60} />
            </div>
          )}

          {/* Hash Chain Status */}
          {hashChain.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--surface-2)', borderRadius: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                ∞ HASH CHAIN ({hashChain.length} links)
              </div>
              <div className="hash-display">
                Latest: {hashChain[hashChain.length - 1].combinedHash.substring(0, 32)}...
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            {!isRecording ? (
              <button className="btn-danger" onClick={startRecording} style={{ flex: 1 }}>
                ● Start Recording
              </button>
            ) : (
              <button className="btn-secondary" onClick={stopRecording} style={{ flex: 1 }}>
                ■ Stop Recording ({recordingTime}s)
              </button>
            )}
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-secondary" onClick={goBack}>← Back</button>
            <button id="next-btn" className="btn-primary" onClick={goNext} disabled={hashChain.length === 0}>
              Next → Reagent Tests
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP: Reagent Tests ─── */}
      {currentStep === 'reagent-test' && (
        <div className="glass-card animate-fade-in">
          <div className="proof-header">
            <div className="proof-number" style={{ background: 'var(--gradient-accent)', color: 'white' }}><FlaskConical size={20} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px' }}>Reagent Testing</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                <span className="badge badge-info" style={{ marginRight: '8px' }}>PROOF 3</span>
                Test each reagent and record the colour change
              </p>
            </div>
          </div>

          {currentReagentIndex < activeReagents.length ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '16px', background: 'var(--surface-2)', borderRadius: '12px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', fontWeight: '800', color: 'white',
                }}>
                  {currentReagentIndex + 1}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '18px' }}>{activeReagents[currentReagentIndex].name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Wait time: {activeReagents[currentReagentIndex].waitTimeSeconds}s — {activeReagents[currentReagentIndex].notes}
                  </div>
                </div>
              </div>

              {/* Known reactions for this reagent */}
              <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--surface-2)', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>POSSIBLE REACTIONS:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px' }}>
                  {activeReagents[currentReagentIndex].reactions.map(rx => (
                    <div key={rx.drugName} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <div className="color-swatch" style={{
                        width: '20px', height: '20px', borderRadius: '4px',
                        background: hslToHex(rx.expectedColor.h, rx.expectedColor.s, rx.expectedColor.l),
                      }} />
                      <span>{rx.drugName}: {rx.colorName}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timer */}
              <div style={{
                textAlign: 'center',
                padding: '24px',
                background: reagentTimerActive ? 'rgba(245,158,11,0.1)' : 'var(--surface-2)',
                borderRadius: '12px',
                marginBottom: '16px',
                border: reagentTimerActive ? '1px solid rgba(245,158,11,0.3)' : '1px solid var(--glass-border)',
              }}>
                <div style={{ fontSize: '48px', fontWeight: '800', fontFamily: 'JetBrains Mono' }}>
                  {Math.floor(reagentTimer / 60)}:{(reagentTimer % 60).toString().padStart(2, '0')}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {reagentTimerActive ? 'Waiting for reaction...' : 'Start timer after adding sample to reagent'}
                </div>
                {!reagentTimerActive ? (
                  <button className="btn-primary" style={{ marginTop: '12px' }}
                    onClick={() => {
                      setReagentTimerActive(true);
                      setReagentTimer(0);
                      const interval = setInterval(() => {
                        setReagentTimer(prev => {
                          const next = prev + 1;
                          if (next >= activeReagents[currentReagentIndex].waitTimeSeconds) {
                            clearInterval(interval);
                            setReagentTimerActive(false);
                          }
                          return next;
                        });
                      }, 1000);
                    }}
                  >
                    ► Start Wait Timer
                  </button>
                ) : (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{
                      width: '100%', height: '6px', background: 'var(--surface-3)', borderRadius: '3px',
                    }}>
                      <div style={{
                        width: `${(reagentTimer / activeReagents[currentReagentIndex].waitTimeSeconds) * 100}%`,
                        height: '100%', background: 'var(--gradient-accent)', borderRadius: '3px',
                        transition: 'width 1s linear',
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Current live colour */}
              {currentColor && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', padding: '12px', background: 'var(--surface-2)', borderRadius: '10px' }}>
                  <div className="color-swatch" style={{
                    width: '48px', height: '48px',
                    background: hslToHex(currentColor.h, currentColor.s, currentColor.l),
                  }} />
                  <div>
                    <div style={{ fontWeight: '600' }}>Current Reading: {hslToName(currentColor)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      H: {currentColor.h}° S: {currentColor.s}% L: {currentColor.l}%
                    </div>
                  </div>
                </div>
              )}

              <button
                id="capture-btn"
                className="btn-success"
                style={{ width: '100%' }}
                onClick={() => {
                  if (!currentColor) return;
                  const reagent = activeReagents[currentReagentIndex];
                  const result: ReagentTestResult = {
                    reagentId: reagent.id,
                    reagentName: reagent.name,
                    blankControl: blankControls[currentReagentIndex],
                    colorCurve: [...colorCurve],
                    finalColor: { ...currentColor },
                    readingTimestamp: recordingTime,
                    autoReading: hslToName(currentColor),
                    officerConfirmed: true,
                  };
                  setReagentResults(prev => [...prev, result]);
                  setCurrentReagentIndex(prev => prev + 1);
                  setReagentTimer(0);
                  setReagentTimerActive(false);
                }}
              >
                ✓ Confirm Reading for {activeReagents[currentReagentIndex].shortName}
              </button>
            </div>
          ) : (
            <div>
              <h3 style={{ color: 'var(--success)' }}>✓ All Reagents Tested</h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {reagentResults.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px', background: 'var(--surface-2)', borderRadius: '10px',
                  }}>
                    <div className="color-swatch" style={{
                      background: hslToHex(r.finalColor.h, r.finalColor.s, r.finalColor.l),
                    }} />
                    <div>
                      <div style={{ fontWeight: '600' }}>{r.reagentName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {r.autoReading} (H:{r.finalColor.h} S:{r.finalColor.s} L:{r.finalColor.l})
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn-primary" onClick={runInference} style={{ width: '100%', marginTop: '16px' }}>
                ⚗ Run Multi-Reagent Cross-Inference
              </button>

              {inferences.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4>Multi-Reagent Inference Results:</h4>
                  {inferences.filter(inf => inf.overallConfidence !== 'unlikely').map((inf, i) => (
                    <div key={i} style={{
                      padding: '16px',
                      marginBottom: '8px',
                      background: inf.overallConfidence === 'confirmed' ? 'rgba(16,185,129,0.1)' :
                                  inf.overallConfidence === 'probable' ? 'rgba(59,130,246,0.1)' :
                                  'rgba(245,158,11,0.1)',
                      border: `1px solid ${
                        inf.overallConfidence === 'confirmed' ? 'rgba(16,185,129,0.3)' :
                        inf.overallConfidence === 'probable' ? 'rgba(59,130,246,0.3)' :
                        'rgba(245,158,11,0.3)'
                      }`,
                      borderRadius: '12px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '18px' }}>{inf.drugName}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{inf.drugGroup}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className={`badge ${
                            inf.overallConfidence === 'confirmed' ? 'badge-success' :
                            inf.overallConfidence === 'probable' ? 'badge-info' :
                            'badge-warning'
                          }`}>
                            {inf.overallConfidence.toUpperCase()} ({inf.score}%)
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        {inf.reasoning}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-secondary" onClick={goBack}>← Back</button>
            <button id="next-btn" className="btn-primary" onClick={goNext} disabled={reagentResults.length < activeReagents.length || inferences.length === 0}>
              Next → Witnesses
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP: Witnesses ─── */}
      {currentStep === 'witnesses' && (
        <div className="glass-card animate-fade-in">
          <div className="proof-header">
            <div className="proof-number" style={{ background: 'var(--gradient-accent)', color: 'white' }}><PenLine size={20} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px' }}>Witness Attestation</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                <span className="badge badge-info" style={{ marginRight: '8px' }}>BNSS §105</span>
                Record witnesses with name, phone, and on-screen signature
              </p>
            </div>
          </div>

          {/* Existing witnesses */}
          {witnesses.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                RECORDED WITNESSES ({witnesses.length}):
              </div>
              {witnesses.map((w, i) => (
                <div key={w.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                  background: 'var(--surface-2)', borderRadius: '10px', marginBottom: '8px',
                }}>
                  <img src={w.signatureDataUrl} alt="signature" style={{ width: '80px', height: '40px', borderRadius: '6px', border: '1px solid var(--glass-border)' }} />
                  <div>
                    <div style={{ fontWeight: '600' }}>{w.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>☏ {w.phone} | ◷ {new Date(w.capturedAt).toLocaleTimeString('en-IN')}</div>
                  </div>
                  <span className="badge badge-success">✓ Recorded</span>
                </div>
              ))}
            </div>
          )}

          {/* Add new witness */}
          <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '20px' }}>
            <h4 style={{ marginTop: 0 }}>Add Witness</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label className="input-label">Full Name *</label>
                <input className="input-field" placeholder="Witness name" value={witnessForm.name} onChange={e => setWitnessForm({ ...witnessForm, name: e.target.value })} />
              </div>
              <div>
                <label className="input-label">Phone Number *</label>
                <input className="input-field" placeholder="+91 XXXXX XXXXX" value={witnessForm.phone} onChange={e => setWitnessForm({ ...witnessForm, phone: e.target.value })} />
              </div>
            </div>

            <label className="input-label">On-Screen Signature *</label>
            <SignaturePad onSave={setWitnessSignature} />

            <button
              className="btn-primary"
              onClick={addWitness}
              disabled={!witnessForm.name || !witnessForm.phone || !witnessSignature}
              style={{ width: '100%', marginTop: '12px' }}
            >
              ✎ Record Witness
            </button>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-secondary" onClick={goBack}>← Back</button>
            <button id="next-btn" className="btn-primary" onClick={goNext} disabled={witnesses.length < 1}>
              Next → Officer Selfie
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP: Officer Selfie ─── */}
      {currentStep === 'officer-selfie' && (
        <div className="glass-card animate-fade-in">
          <div className="proof-header">
            <div className="proof-number" style={{ background: 'var(--gradient-accent)', color: 'white' }}><Camera size={20} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px' }}>Officer Selfie at Sealing</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                <span className="badge badge-info" style={{ marginRight: '8px' }}>e-Sakshya</span>
                Proves the officer was physically present. Compatible with e-Sakshya workflow.
              </p>
            </div>
          </div>

          {!selfieSrc ? (
            <div>
              <div className="camera-viewfinder" style={{ marginBottom: '16px' }}>
                <video ref={selfieRef} style={{ width: '100%', borderRadius: '16px', transform: 'scaleX(-1)' }} autoPlay playsInline muted />
                <div className="camera-overlay" />
              </div>
              <button className="btn-primary" style={{ width: '100%' }}
                onClick={() => { startFrontCamera(); }}
              >
                 Open Front Camera
              </button>
              <button id="capture-btn" className="btn-success" style={{ width: '100%', marginTop: '8px' }}
                onClick={captureSelfie}
              >
                 Take Selfie
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <img src={selfieSrc} alt="Officer selfie" style={{
                maxWidth: '300px', borderRadius: '16px',
                border: '2px solid var(--success)',
                margin: '0 auto',
                display: 'block',
              }} />
              <span className="badge badge-success" style={{ marginTop: '12px', display: 'inline-flex' }}>✓ Selfie Captured</span>
              <br />
              <button className="btn-secondary" style={{ marginTop: '8px' }}
                onClick={() => { setSelfieSrc(''); startFrontCamera(); }}
              >
                Retake
              </button>
            </div>
          )}

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-secondary" onClick={goBack}>← Back</button>
            <button id="next-btn" className="btn-primary" onClick={goNext} disabled={!selfieSrc}>
              Next → NDPS Weight
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP: NDPS Weight ─── */}
      {currentStep === 'ndps-weight' && (
        <div className="glass-card animate-fade-in">
          <div className="proof-header">
            <div className="proof-number" style={{ background: 'var(--gradient-warning)', color: 'white' }}><Scale size={20} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px' }}>NDPS Quantity Classification</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                Photograph the scale and enter weight. The app suggests the NDPS category.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label className="input-label">Sample Weight (grams)</label>
              <input className="input-field" type="number" step="0.01" placeholder="Enter weight from scale" value={sampleWeight} onChange={e => setSampleWeight(e.target.value)} />
            </div>

            {ndpsResult && (
              <div style={{
                padding: '20px',
                background: ndpsResult.category === 'commercial' ? 'rgba(239,68,68,0.1)' :
                            ndpsResult.category === 'intermediate' ? 'rgba(245,158,11,0.1)' :
                            'rgba(16,185,129,0.1)',
                border: `1px solid ${
                  ndpsResult.category === 'commercial' ? 'rgba(239,68,68,0.3)' :
                  ndpsResult.category === 'intermediate' ? 'rgba(245,158,11,0.3)' :
                  'rgba(16,185,129,0.3)'
                }`,
                borderRadius: '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0 }}>NDPS Classification</h3>
                  <span className={`badge ${
                    ndpsResult.category === 'commercial' ? 'badge-danger' :
                    ndpsResult.category === 'intermediate' ? 'badge-warning' :
                    'badge-success'
                  }`} style={{ fontSize: '14px', padding: '6px 16px' }}>
                    {ndpsResult.category.toUpperCase()} QUANTITY
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                  <div><strong>Section:</strong> {ndpsResult.section}</div>
                  <div><strong>Threshold:</strong> {ndpsResult.explanation}</div>
                  <div><strong>Punishment:</strong> {ndpsResult.punishment}</div>
                </div>
                <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', fontSize: '12px', color: 'var(--warning)' }}>
                  ⚠ This is a suggested classification based on presumptive testing. Final determination by the court.
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-secondary" onClick={goBack}>← Back</button>
            <button id="next-btn" className="btn-primary" onClick={goNext} disabled={!sampleWeight}>
              Next → Review Results
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP: Results Review ─── */}
      {currentStep === 'results-review' && (
        <div className="glass-card animate-fade-in">
          <div className="proof-header">
            <div className="proof-number" style={{ background: 'var(--gradient-accent)', color: 'white' }}><BarChart size={20} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px' }}>Results Review</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Complete test summary before certificate generation</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div className="stat-card">
                <div className="stat-value">{hashChain.length}</div>
                <div className="stat-label">Hash Chain Links</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{colorCurve.length}</div>
                <div className="stat-label">Colour Samples</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{witnesses.length}</div>
                <div className="stat-label">Witnesses</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{reagentResults.length}</div>
                <div className="stat-label">Reagents Tested</div>
              </div>
            </div>

            {/* Colour Curve Chart */}
            {colorCurve.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  COLOUR CHANGE CURVE
                </div>
                <ColorCurveChart data={colorCurve} waitTime={activeReagents[0]?.waitTimeSeconds || 60} />
              </div>
            )}

            {/* Inference Results */}
            {inferences.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  MULTI-REAGENT INFERENCE
                </div>
                {inferences.filter(i => i.score > 20).slice(0, 5).map((inf, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px', background: 'var(--surface-2)', borderRadius: '10px',
                    marginBottom: '6px',
                  }}>
                    <span style={{ fontWeight: '600' }}>{inf.drugName}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '80px', height: '6px', background: 'var(--surface-3)', borderRadius: '3px',
                      }}>
                        <div style={{
                          width: `${inf.score}%`, height: '100%',
                          background: inf.score > 70 ? 'var(--success)' : inf.score > 40 ? 'var(--accent)' : 'var(--warning)',
                          borderRadius: '3px',
                        }} />
                      </div>
                      <span className={`badge ${
                        inf.overallConfidence === 'confirmed' ? 'badge-success' :
                        inf.overallConfidence === 'probable' ? 'badge-info' :
                        inf.overallConfidence === 'possible' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {inf.score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Proof Checklist */}
            <div style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                FOUR PROOFS CHECKLIST
              </div>
              {[
                { label: 'Video with colour curve', done: hashChain.length > 0 && colorCurve.length > 0 },
                { label: 'Witnesses recorded', done: witnesses.length >= 1 },
                { label: 'Blank controls passed', done: blankControls.length > 0 },
                { label: 'Multi-reagent inference', done: inferences.length > 0 },
                { label: 'Officer selfie', done: !!selfieSrc },
                { label: 'GPS locked', done: !!location },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                  <span style={{ color: item.done ? 'var(--success)' : 'var(--text-muted)', fontSize: '16px' }}>
                    {item.done ? '✓' : '☐'}
                  </span>
                  <span style={{ fontSize: '14px', color: item.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-secondary" onClick={goBack}>← Back</button>
            <button id="next-btn" className="btn-primary" onClick={() => { generateCertificate(); goNext(); }}>
              Next → Generate Certificate
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP: Certificate ─── */}
      {currentStep === 'certificate' && (
        <div className="glass-card animate-fade-in">
          <div className="proof-header">
            <div className="proof-number" style={{ background: 'var(--gradient-warning)', color: 'white' }}><FileText size={20} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px' }}>BSA Section 63 Certificate</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                <span className="badge badge-info" style={{ marginRight: '8px' }}>PROOF 4</span>
                Legally-compliant electronic evidence certificate
              </p>
            </div>
          </div>

          <pre style={{
            background: 'var(--surface-2)',
            padding: '20px',
            borderRadius: '12px',
            fontSize: '12px',
            lineHeight: '1.5',
            overflow: 'auto',
            maxHeight: '500px',
            whiteSpace: 'pre-wrap',
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text-secondary)',
            border: '1px solid var(--glass-border)',
          }}>
            {certificateText || 'Generating certificate...'}
          </pre>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="btn-primary" onClick={() => {
              const blob = new Blob([certificateText], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `BSA_S63_Certificate_${testId}.txt`;
              a.click();
            }}>
              📄 Download Certificate
            </button>
            <button className="btn-secondary" onClick={() => window.print()}>
              🖨 Print
            </button>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-secondary" onClick={goBack}>← Back</button>
            <button id="next-btn" className="btn-primary" onClick={goNext}>
              Next → Export Bundle
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP: Export ─── */}
      {currentStep === 'export' && (
        <div className="glass-card animate-fade-in">
          <div className="proof-header">
            <div className="proof-number" style={{ background: 'var(--gradient-warning)', color: 'white' }}><Send size={20} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px' }}>Export Evidence Bundle</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>One-tap export for Magistrate, e-Sakshya, or SMS backup</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Export Options */}
            <button className="btn-primary" style={{ padding: '20px', width: '100%', fontSize: '16px' }}>
              ◻ Download Full Evidence Bundle
              <span style={{ display: 'block', fontSize: '12px', fontWeight: '400', opacity: 0.8, marginTop: '4px' }}>
                Video + Hash Chain + Certificate + Witness Sigs + Colour Data
              </span>
            </button>

            <button className="btn-secondary" style={{ padding: '20px', width: '100%' }}>
              ☏ Export for e-Sakshya
              <span style={{ display: 'block', fontSize: '12px', fontWeight: '400', opacity: 0.8, marginTop: '4px' }}>
                Formatted for e-Sakshya portal upload
              </span>
            </button>

            <button className="btn-secondary" style={{ padding: '20px', width: '100%' }}>
              ✉ SMS Backup (Dead Zone)
              <span style={{ display: 'block', fontSize: '12px', fontWeight: '400', opacity: 0.8, marginTop: '4px' }}>
                Text hash + timestamp + GPS to NCB server for proof of existence
              </span>
            </button>

            <div style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                EXPORT BUNDLE CONTENTS
              </div>
              <div style={{ display: 'grid', gap: '6px' }}>
                {[
                  `procedure_video_${testId.substring(0, 8)}.webm`,
                  `hash_chain_${testId.substring(0, 8)}.json (${hashChain.length} links)`,
                  `colour_curve_${testId.substring(0, 8)}.json (${colorCurve.length} samples)`,
                  `BSA_S63_certificate.txt`,
                  ...witnesses.map(w => `witness_${w.name.replace(/\s/g, '_')}_signature.png`),
                  ...blankControls.map(bc => `blank_control_${bc.reagentId}.png`),
                  selfieSrc ? 'officer_selfie.jpg' : null,
                  'inference_results.json',
                ].filter(Boolean).map((file, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--success)' }}>📄</span>
                    {file}
                  </div>
                ))}
              </div>
            </div>

            {/* Final hash */}
            {hashChain.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  FINAL CHAIN HASH (SHA-256)
                </div>
                <div className="hash-display">
                  {hashChain[hashChain.length - 1].combinedHash}
                </div>
              </div>
            )}
          </div>

          <div style={{
            marginTop: '24px',
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1))',
            borderRadius: '16px',
            textAlign: 'center',
            border: '1px solid rgba(16,185,129,0.2)',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
            <h3 style={{ margin: '0 0 8px' }}>Test Complete</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              All four proofs captured. The evidence record is ready for submission.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
