'use client';

import { useState, useEffect } from 'react';
import { Video, FlaskConical, Search, Scale, Map, Mic, GraduationCap, LayoutDashboard, BadgeCheck } from 'lucide-react';

const proofs = [
  {
    number: '01',
    title: 'Proof the Test Actually Happened',
    color: '#334155',
    gradient: '#334155',
    icon: <Video size={28} />,
    features: [
      'Unbroken procedure video from kit opening to final colour',
      'Colour-change curve sampled ~4 times/second',
      'SHA-256 hash chain — 1-second chunks, each linked to the previous',
      'BNSS Section 105 witnesses with on-screen signatures',
      'Officer selfie at sealing (e-Sakshya compatible)',
      'Gallery uploads blocked — live camera only',
    ],
  },
  {
    number: '02',
    title: 'Proof the Kit Was Working',
    color: '#334155',
    gradient: '#334155',
    icon: <FlaskConical size={28} />,
    features: [
      'Blank control check — photograph the unreacted reagent',
      'Compare against expected colour before adding sample',
      'Degraded ampoule warning if colour has already shifted',
      'Barcode scan with expiry lock — refuses expired batches',
      'Bad-batch alerts on dashboard (field vs. lab result disagreement)',
    ],
  },
  {
    number: '03',
    title: 'Proof the Reading Is Right',
    color: '#334155',
    gradient: '#334155',
    icon: <Search size={28} />,
    features: [
      'Multi-reagent combination inference — not just one reagent alone',
      'Cross-references all reagents: "consistent with X; also possible Y"',
      'Measured calibration chart — real photos across 3 lights, 2 phones',
      'White-balance correction to normalize for different lighting',
      'Automatic reading at the kit\'s stated wait time',
    ],
  },
  {
    number: '04',
    title: 'Proof It Holds Up in Court',
    color: '#334155',
    gradient: '#334155',
    icon: <Scale size={28} />,
    features: [
      'BSA Section 63 certificate — hash values, algorithm, officer attestation',
      'One-tap export bundle for Magistrate or e-Sakshya',
      'SMS backup in dead zones — hash + time + GPS texted to NCB server',
      'RFC 3161 trusted timestamps when online',
      'Fake GPS and rooted device detection (native app)',
    ],
  },
];

const bonusFeatures = [
  { icon: <Scale size={36} />, title: 'NDPS Quantity Helper', desc: 'Photograph the scale, enter weight → app suggests quantity category from the official NDPS table' },
  { icon: <Map size={36} />, title: 'Intelligence Map', desc: 'Heat map of presumptive positives by drug group and district. Flags unknown synthetic drug profiles' },
  { icon: <Mic size={36} />, title: 'Hands-Free Voice Mode', desc: 'Hindi & regional language spoken steps. "Capture" and "Next" voice commands for gloved officers' },
  { icon: <GraduationCap size={36} />, title: 'Officer Training Mode', desc: 'Practise on recorded test videos. App compares your eye-reading with its own measurement' },
];

export default function LandingPage() {
  const [activeProof, setActiveProof] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setActiveProof(p => (p + 1) % 4);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <section style={{
        background: 'var(--gradient-hero)',
        position: 'relative',
        overflow: 'hidden',
        padding: '80px 24px 100px',
      }}>
        {/* Animated Grid Background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }} />

        {/* Floating Orbs */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.08), transparent 70%)',
          animation: 'float 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          right: '15%',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)',
          animation: 'float 8s ease-in-out infinite 2s',
        }} />

        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 1s ease-out',
        }}>


          <h1 style={{
            fontSize: 'clamp(40px, 6vw, 72px)',
            fontWeight: '900',
            lineHeight: '1.1',
            marginBottom: '20px',
            letterSpacing: '-2px',
          }}>
            Four Proofs.{' '}
            <span style={{ color: 'var(--text-primary)' }}>One Record.</span>
            <br />Zero Doubt.
          </h1>

          <p style={{
            fontSize: '20px',
            color: 'var(--text-secondary)',
            maxWidth: '700px',
            margin: '0 auto 40px',
            lineHeight: '1.6',
          }}>
            Forensic-grade drug field testing with cryptographic video evidence,
            multi-reagent inference, and legally-compliant BSA Section 63 certification.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/test/new" className="btn-primary" style={{ padding: '16px 36px', fontSize: '17px' }}>
              ⚗ Start New Test
            </a>
            <a href="/" className="btn-secondary" style={{ padding: '16px 36px', fontSize: '17px' }}>
              <LayoutDashboard size={20} className="inline mr-2" /> View Dashboard
            </a>
          </div>
        </div>
      </section>

      {/* Four Proofs Section */}
      <section style={{ maxWidth: '1200px', margin: '-60px auto 0', padding: '0 24px', position: 'relative', zIndex: 2 }}>
        {/* Proof Selector Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {proofs.map((proof, i) => (
            <button
              key={i}
              onClick={() => setActiveProof(i)}
              style={{
                background: activeProof === i ? proof.gradient : 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${activeProof === i ? proof.color : 'var(--glass-border)'}`,
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.4s ease',
                color: 'var(--text-primary)',
                transform: activeProof === i ? 'scale(1.02)' : 'scale(1)',
                boxShadow: activeProof === i ? `0 8px 30px ${proof.color}40` : 'none',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{proof.icon}</div>
              <div style={{
                fontSize: '12px',
                fontWeight: '800',
                color: activeProof === i ? 'rgba(255,255,255,0.8)' : proof.color,
                marginBottom: '4px',
                letterSpacing: '1px',
              }}>
                PROOF {proof.number}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                lineHeight: '1.3',
                color: activeProof === i ? 'white' : 'var(--text-primary)',
              }}>
                {proof.title}
              </div>
            </button>
          ))}
        </div>

        {/* Active Proof Detail Card */}
        <div className="glass-card" style={{
          animation: 'fadeIn 0.4s ease-out',
          borderColor: `${proofs[activeProof].color}30`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: proofs[activeProof].gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}>
              {proofs[activeProof].icon}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: proofs[activeProof].color, letterSpacing: '1px' }}>
                PROOF {proofs[activeProof].number}
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>
                {proofs[activeProof].title}
              </h2>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '12px',
          }}>
            {proofs[activeProof].features.map((feature, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                background: 'var(--surface-2)',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                animation: `fadeIn 0.4s ease-out ${i * 0.1}s both`,
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: `${proofs[activeProof].color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  color: proofs[activeProof].color,
                  flexShrink: 0,
                  marginTop: '1px',
                }}>
                  ✓
                </div>
                <span style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bonus Features */}
      <section style={{ maxWidth: '1200px', margin: '60px auto', padding: '0 24px' }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '32px',
          fontWeight: '800',
          marginBottom: '12px',
        }}>
          Beyond Testing — <span style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Intelligence & Training</span>
        </h2>
        <p style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '16px',
          marginBottom: '40px',
        }}>
          Features the NCB would actually value in the field
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {bonusFeatures.map((feat, i) => (
            <div key={i} className="glass-card" style={{
              animation: `slideUp 0.6s ease-out ${i * 0.15}s both`,
            }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>{feat.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>{feat.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Legal Compliance Banner */}
      <section style={{
        maxWidth: '1200px',
        margin: '60px auto',
        padding: '0 24px',
      }}>
        <div className="glass-card" style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
          borderColor: 'rgba(59,130,246,0.2)',
          textAlign: 'center',
          padding: '48px 24px',
        }}>
          <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '16px' }}>
            Built for Indian Law
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '800px', margin: '0 auto 24px', lineHeight: '1.7' }}>
            Every feature maps to a legal requirement. BNSS Section 105 for recorded search & seizure.
            BSA Section 63 for electronic evidence certification. NDPS Act quantity tables for charge classification.
            e-Sakshya compatibility for existing police workflows.
          </p>
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {['BNSS §105', 'BSA §63', 'NDPS Act', 'e-Sakshya', 'RFC 3161'].map(tag => (
              <span key={tag} className="badge badge-info" style={{ fontSize: '14px', padding: '8px 20px' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--glass-border)',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '13px',
      }}>
        NarcProof v1.0.0 — Smart India Hackathon 2026 — PS SIH1765
        <br />Four Proofs. One Record. Zero Doubt.
      </footer>
    </div>
  );
}
