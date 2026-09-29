'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart, Map as MapIcon, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';

// Mock data for demonstration
const MOCK_TESTS = [
  { id: '1', drug: 'Heroin', group: 'Opioids', confidence: 'confirmed', lat: 28.6139, lng: 77.2090, district: 'New Delhi', state: 'Delhi', date: '2026-09-28', kit: 'BATCH-2026-041', labMatch: true },
  { id: '2', drug: 'Cocaine', group: 'Stimulants', confidence: 'probable', lat: 19.0760, lng: 72.8777, district: 'Mumbai', state: 'Maharashtra', date: '2026-09-27', kit: 'BATCH-2026-041', labMatch: true },
  { id: '3', drug: 'MDMA', group: 'Amphetamines', confidence: 'confirmed', lat: 12.9716, lng: 77.5946, district: 'Bangalore', state: 'Karnataka', date: '2026-09-26', kit: 'BATCH-2026-039', labMatch: false },
  { id: '4', drug: 'Cannabis', group: 'Cannabinoids', confidence: 'confirmed', lat: 22.5726, lng: 88.3639, district: 'Kolkata', state: 'West Bengal', date: '2026-09-25', kit: 'BATCH-2026-040', labMatch: true },
  { id: '5', drug: 'Methamphetamine', group: 'Amphetamines', confidence: 'confirmed', lat: 26.9124, lng: 75.7873, district: 'Jaipur', state: 'Rajasthan', date: '2026-09-24', kit: 'BATCH-2026-038', labMatch: true },
  { id: '6', drug: 'Unknown Profile', group: 'Unknown', confidence: 'possible', lat: 23.0225, lng: 72.5714, district: 'Ahmedabad', state: 'Gujarat', date: '2026-09-23', kit: 'BATCH-2026-042', labMatch: false },
  { id: '7', drug: 'Heroin', group: 'Opioids', confidence: 'confirmed', lat: 30.7333, lng: 76.7794, district: 'Chandigarh', state: 'Chandigarh', date: '2026-09-22', kit: 'BATCH-2026-039', labMatch: false },
  { id: '8', drug: 'Amphetamine', group: 'Amphetamines', confidence: 'probable', lat: 17.3850, lng: 78.4867, district: 'Hyderabad', state: 'Telangana', date: '2026-09-21', kit: 'BATCH-2026-037', labMatch: true },
  { id: '9', drug: 'Heroin', group: 'Opioids', confidence: 'confirmed', lat: 28.4595, lng: 77.0266, district: 'Gurugram', state: 'Haryana', date: '2026-09-20', kit: 'BATCH-2026-041', labMatch: false },
  { id: '10', drug: 'Cocaine', group: 'Stimulants', confidence: 'confirmed', lat: 15.2993, lng: 74.1240, district: 'Panaji', state: 'Goa', date: '2026-09-19', kit: 'BATCH-2026-038', labMatch: true },
  { id: '11', drug: 'LSD', group: 'Psychedelics', confidence: 'probable', lat: 18.5204, lng: 73.8567, district: 'Pune', state: 'Maharashtra', date: '2026-09-18', kit: 'BATCH-2026-040', labMatch: true },
  { id: '12', drug: 'Unknown Profile', group: 'Unknown', confidence: 'possible', lat: 25.3176, lng: 82.9739, district: 'Varanasi', state: 'Uttar Pradesh', date: '2026-09-17', kit: 'BATCH-2026-042', labMatch: false },
];

const DRUG_COLORS: Record<string, string> = {
  Opioids: '#ef4444',
  Stimulants: '#3b82f6',
  Amphetamines: '#f59e0b',
  Cannabinoids: '#10b981',
  Psychedelics: '#8b5cf6',
  Unknown: '#ec4899',
};

// Dynamically import the map to avoid SSR issues with Leaflet
const IntelligenceMap = dynamic(() => import('@/components/IntelligenceMap'), {
  ssr: false,
  loading: () => <div style={{ height: '500px', background: 'var(--surface-2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading Map...</div>,
});

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'batches'>('overview');
  const [selectedDrugGroup, setSelectedDrugGroup] = useState<string>('all');
  const [dateRange, setDateRange] = useState(30);

  const filteredTests = useMemo(() => {
    return MOCK_TESTS.filter(t => {
      if (selectedDrugGroup !== 'all' && t.group !== selectedDrugGroup) return false;
      return true;
    });
  }, [selectedDrugGroup]);

  // Bad batch analysis
  const batchAnalysis = useMemo(() => {
    const batches: Record<string, { total: number; mismatches: number; tests: typeof MOCK_TESTS }> = {};
    for (const test of MOCK_TESTS) {
      if (!batches[test.kit]) batches[test.kit] = { total: 0, mismatches: 0, tests: [] };
      batches[test.kit].total++;
      if (!test.labMatch) batches[test.kit].mismatches++;
      batches[test.kit].tests.push(test);
    }
    return Object.entries(batches).map(([batch, data]) => ({
      batch,
      ...data,
      mismatchRate: ((data.mismatches / data.total) * 100).toFixed(1),
      flagged: (data.mismatches / data.total) > 0.3,
    })).sort((a, b) => parseFloat(b.mismatchRate) - parseFloat(a.mismatchRate));
  }, []);

  // Drug group stats
  const drugStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const test of MOCK_TESTS) {
      stats[test.group] = (stats[test.group] || 0) + 1;
    }
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, []);

  // Unknown profiles
  const unknownProfiles = MOCK_TESTS.filter(t => t.group === 'Unknown');

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 4px' }}>
            Intelligence Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Real-time drug testing analytics and intelligence mapping
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {['overview', 'map', 'batches'].map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '12px 24px', fontSize: '16px', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
              onClick={() => setActiveTab(tab as typeof activeTab)}
            >
              {tab === 'overview' && <BarChart size={18} />}
              {tab === 'map' && <MapIcon size={18} />}
              {tab === 'batches' && <AlertTriangle size={18} />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Overview Tab ─── */}
      {activeTab === 'overview' && (
        <div className="animate-fade-in">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <div className="stat-card">
              <div className="stat-value">{MOCK_TESTS.length}</div>
              <div className="stat-label">Total Tests</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{MOCK_TESTS.filter(t => t.confidence === 'confirmed').length}</div>
              <div className="stat-label">Confirmed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ background: 'var(--gradient-success)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {((MOCK_TESTS.filter(t => t.labMatch).length / MOCK_TESTS.length) * 100).toFixed(0)}%
              </div>
              <div className="stat-label">Lab Match Rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ background: 'var(--gradient-danger)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {batchAnalysis.filter(b => b.flagged).length}
              </div>
              <div className="stat-label">Flagged Batches</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {unknownProfiles.length}
              </div>
              <div className="stat-label">Unknown Profiles</div>
            </div>
          </div>

          {/* Drug Group Breakdown & Recent Tests */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Drug Groups */}
            <div className="glass-card">
              <h3 style={{ marginTop: 0, fontSize: '16px' }}>Drug Groups</h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {drugStats.map(([group, count]) => (
                  <div key={group} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '10px',
                    borderLeft: `4px solid ${DRUG_COLORS[group] || '#666'}`,
                  }}>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{group}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: `${(count / MOCK_TESTS.length) * 100}px`,
                        height: '6px',
                        background: DRUG_COLORS[group] || '#666',
                        borderRadius: '3px',
                      }} />
                      <span style={{ fontSize: '14px', fontWeight: '700', color: DRUG_COLORS[group] }}>{count}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Unknown Profile Alert */}
              {unknownProfiles.length > 0 && (
                <div style={{
                  marginTop: '16px', padding: '12px', background: 'rgba(236,72,153,0.1)',
                  border: '1px solid rgba(236,72,153,0.3)', borderRadius: '10px',
                }}>
                  <div style={{ fontWeight: '700', color: '#ec4899', fontSize: '14px', marginBottom: '4px' }}>
                    ⚠ New Synthetic Drug Alert
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {unknownProfiles.length} test(s) show colour reactions matching no known drug profile. 
                    These may indicate new synthetic compounds.
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Locations: {unknownProfiles.map(p => p.district).join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* Recent Tests Table */}
            <div className="glass-card">
              <h3 style={{ marginTop: 0, fontSize: '16px' }}>Recent Tests</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      {['Date', 'Drug', 'Confidence', 'District', 'Batch', 'Lab Match'].map(h => (
                        <th key={h} style={{
                          padding: '8px 12px', textAlign: 'left', fontSize: '12px',
                          fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_TESTS.map(test => (
                      <tr key={test.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '10px 12px', fontSize: '13px' }}>{test.date}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '8px', height: '8px', borderRadius: '50%',
                              background: DRUG_COLORS[test.group] || '#666',
                            }} />
                            <span style={{ fontSize: '13px', fontWeight: '600' }}>{test.drug}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`badge ${
                            test.confidence === 'confirmed' ? 'badge-success' :
                            test.confidence === 'probable' ? 'badge-info' : 'badge-warning'
                          }`}>
                            {test.confidence}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '13px' }}>{test.district}</td>
                        <td style={{ padding: '10px 12px', fontSize: '11px', fontFamily: 'JetBrains Mono' }}>{test.kit}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {test.labMatch ? (
                            <span className="badge badge-success">✓ Match</span>
                          ) : (
                            <span className="badge badge-danger">✗ Mismatch</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Map Tab ─── */}
      {activeTab === 'map' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              className={selectedDrugGroup === 'all' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 16px', fontSize: '13px' }}
              onClick={() => setSelectedDrugGroup('all')}
            >
              All Groups
            </button>
            {Object.entries(DRUG_COLORS).map(([group, color]) => (
              <button
                key={group}
                className={selectedDrugGroup === group ? 'btn-primary' : 'btn-secondary'}
                style={{
                  padding: '6px 16px', fontSize: '13px',
                  borderLeft: `3px solid ${color}`,
                }}
                onClick={() => setSelectedDrugGroup(group)}
              >
                {group}
              </button>
            ))}
          </div>

          <IntelligenceMap tests={filteredTests} drugColors={DRUG_COLORS} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Hotspot Analysis */}
            <div className="glass-card">
              <h3 style={{ marginTop: 0, fontSize: '16px' }}>⚡ Hotspots</h3>
              {Object.entries(
                filteredTests.reduce((acc, t) => {
                  acc[t.district] = (acc[t.district] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1]).map(([district, count], i) => (
                <div key={district} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', background: i === 0 ? 'rgba(239,68,68,0.1)' : 'var(--surface-2)',
                  borderRadius: '8px', marginBottom: '6px',
                }}>
                  <span style={{ fontSize: '14px' }}>{district}</span>
                  <span className={`badge ${i === 0 ? 'badge-danger' : 'badge-info'}`}>{count} tests</span>
                </div>
              ))}
            </div>

            {/* Spike Detection */}
            <div className="glass-card">
              <h3 style={{ marginTop: 0, fontSize: '16px' }}>↗ Trend Analysis</h3>
              <div style={{ padding: '16px', background: 'rgba(245,158,11,0.1)', borderRadius: '10px', marginBottom: '12px', border: '1px solid rgba(245,158,11,0.3)' }}>
                <div style={{ fontWeight: '700', color: 'var(--warning)', marginBottom: '4px' }}>
                  ⚡ Opioid spike detected
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  3× increase in heroin-positive tests in Delhi NCR region over the past 2 weeks
                </div>
              </div>
              <div style={{ padding: '16px', background: 'rgba(236,72,153,0.1)', borderRadius: '10px', border: '1px solid rgba(236,72,153,0.3)' }}>
                <div style={{ fontWeight: '700', color: '#ec4899', marginBottom: '4px' }}>
                  ⚗ Novel compound flagged
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  2 tests in Gujarat & UP show unrecognized colour profiles. Possible new synthetic cathinone.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Batches Tab ─── */}
      {activeTab === 'batches' && (
        <div className="animate-fade-in">
          <div className="glass-card" style={{ marginBottom: '16px' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px' }}>⚠ Bad-Batch Alerts</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Kit batches where field and lab results disagree at an unusually high rate.
              A high mismatch rate may indicate degraded reagents or manufacturing defects.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {batchAnalysis.map(batch => (
              <div key={batch.batch} className="glass-card" style={{
                borderLeft: `4px solid ${batch.flagged ? 'var(--danger)' : 'var(--success)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '16px', fontFamily: 'JetBrains Mono' }}>
                      {batch.batch}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {batch.total} tests · {batch.mismatches} mismatches
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${batch.flagged ? 'badge-danger' : 'badge-success'}`} style={{
                      fontSize: '14px', padding: '6px 16px',
                    }}>
                      {batch.flagged ? '⚠ FLAGGED' : '✓ OK'} — {batch.mismatchRate}% mismatch
                    </span>
                  </div>
                </div>

                {batch.flagged && (
                  <div style={{
                    marginTop: '12px', padding: '12px',
                    background: 'rgba(239,68,68,0.08)', borderRadius: '8px',
                    fontSize: '13px', color: 'var(--text-secondary)',
                  }}>
                    <strong style={{ color: 'var(--danger)' }}>Recommendation:</strong> Quarantine remaining kits from this batch. 
                    Notify manufacturer and conduct enhanced testing with confirmed reference samples.
                  </div>
                )}

                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {batch.tests.map(test => (
                    <div key={test.id} style={{
                      padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                      background: test.labMatch ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: test.labMatch ? 'var(--success)' : 'var(--danger)',
                      border: `1px solid ${test.labMatch ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    }}>
                      {test.drug} @ {test.district} — {test.labMatch ? '✓' : '✗'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
