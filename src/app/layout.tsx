import type { Metadata } from "next";
import { FlaskConical, LayoutDashboard, GraduationCap, Target, ShieldCheck } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "NarcProof — Four Proofs. One Record. Zero Doubt.",
  description: "Forensic-grade drug field testing with cryptographic video evidence, multi-reagent inference, and BSA Section 63 certification.",
  keywords: "drug testing, forensic evidence, NDPS, field test, narcotics, SIH 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }} className="navbar-brand">
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: '800',
                color: 'white',
              }}>N</div>
              <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Narc<span style={{ color: 'var(--accent)' }}>Proof</span>
              </span>
            </a>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <a href="/test/new" className="btn-primary">
                <FlaskConical size={16} /> New Test
              </a>
              <a href="/dashboard" className="btn-secondary">
                <LayoutDashboard size={16} /> Dashboard
              </a>
              <a href="/training" className="btn-secondary">
                <GraduationCap size={16} /> Training
              </a>
              <a href="/calibration" className="btn-secondary">
                <Target size={16} /> Calibrate
              </a>
              <a href="/verify" className="btn-secondary">
                <ShieldCheck size={16} /> Verify
              </a>
              <a href="/" className="btn-secondary" style={{ marginLeft: '8px' }}>
                About
              </a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
