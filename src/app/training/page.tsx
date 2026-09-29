'use client';

import { useState } from 'react';
import { GraduationCap, CheckCircle2, XCircle, List, Circle, Check } from 'lucide-react';
import { REAGENTS, hslToHex, hslToName, colorDistance } from '@/lib/reagentDatabase';

interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  reagentId: string;
  actualDrug: string;
  trueColor: { h: number; s: number; l: number };
  difficulty: 'easy' | 'medium' | 'hard';
}

const SCENARIOS: TrainingScenario[] = [
  { id: '1', title: 'Marquis + White Powder', description: 'A white powder sample is tested with Marquis reagent. The reaction turns dark purple within 30 seconds.', reagentId: 'marquis', actualDrug: 'Heroin (Diacetylmorphine)', trueColor: { h: 270, s: 80, l: 25 }, difficulty: 'easy' },
  { id: '2', title: 'Marquis + Crystal', description: 'Small crystals are tested with Marquis. The reaction slowly turns orange-brown.', reagentId: 'marquis', actualDrug: 'Amphetamine', trueColor: { h: 20, s: 90, l: 45 }, difficulty: 'easy' },
  { id: '3', title: 'Scott + Fine Powder', description: 'A fine white powder is tested with Scott reagent. It turns blue in step 1.', reagentId: 'scott', actualDrug: 'Cocaine', trueColor: { h: 210, s: 70, l: 50 }, difficulty: 'medium' },
  { id: '4', title: 'Simons + Crystal Shards', description: 'Transparent crystal shards tested with Simons reagent. Result is blue.', reagentId: 'simons', actualDrug: 'Methamphetamine', trueColor: { h: 220, s: 70, l: 50 }, difficulty: 'medium' },
  { id: '5', title: 'Ehrlich + Blotter Paper', description: 'A small piece of blotter paper tested with Ehrlich. Slow purple colour develops.', reagentId: 'ehrlich', actualDrug: 'LSD', trueColor: { h: 270, s: 60, l: 50 }, difficulty: 'hard' },
  { id: '6', title: 'Mecke + Brown Powder', description: 'Brown powder tested with Mecke reagent. Deep green reaction.', reagentId: 'mecke', actualDrug: 'Heroin (Diacetylmorphine)', trueColor: { h: 120, s: 50, l: 30 }, difficulty: 'hard' },
  { id: '7', title: 'Mandelin + Tablets', description: 'Crushed tablets tested with Mandelin. Dark green colour develops.', reagentId: 'mandelin', actualDrug: 'Amphetamine', trueColor: { h: 120, s: 60, l: 35 }, difficulty: 'hard' },
  { id: '8', title: 'Marquis + Ecstasy Tablet', description: 'A coloured tablet is crushed and tested with Marquis. Dark purple/black reaction.', reagentId: 'marquis', actualDrug: 'MDMA (Ecstasy)', trueColor: { h: 260, s: 60, l: 20 }, difficulty: 'medium' },
];

export default function TrainingPage() {
  const [currentScenario, setCurrentScenario] = useState<TrainingScenario | null>(null);
  const [userGuess, setUserGuess] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  const filteredScenarios = difficulty === 'all' ? SCENARIOS : SCENARIOS.filter(s => s.difficulty === difficulty);

  const startScenario = (scenario: TrainingScenario) => {
    setCurrentScenario(scenario);
    setUserGuess('');
    setShowAnswer(false);
  };

  const submitGuess = () => {
    setShowAnswer(true);
    setTotalAttempts(prev => prev + 1);
    if (currentScenario && userGuess.toLowerCase().includes(currentScenario.actualDrug.split(' ')[0].toLowerCase())) {
      setScore(prev => prev + 1);
    }
    setCompletedIds(prev => new Set(prev).add(currentScenario!.id));
  };

  const reagent = currentScenario ? REAGENTS[currentScenario.reagentId] : null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <GraduationCap size={32} />
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 4px' }}>
          Officer Training Mode
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Practise identifying drug reactions. The app shows you a simulated test result — 
          you guess the substance, then compare your reading with the app&apos;s measurement.
        </p>
      </div>

      {/* Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-value">{score}/{totalAttempts}</div>
          <div className="stat-label">Correct / Attempted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{
            background: totalAttempts > 0 ? (score / totalAttempts >= 0.7 ? 'var(--gradient-success)' : 'var(--gradient-danger)') : 'var(--gradient-accent)',
            backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {totalAttempts > 0 ? `${((score / totalAttempts) * 100).toFixed(0)}%` : '—'}
          </div>
          <div className="stat-label">Accuracy</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{completedIds.size}/{SCENARIOS.length}</div>
          <div className="stat-label">Scenarios Completed</div>
        </div>
      </div>

      {/* Difficulty Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['all', 'easy', 'medium', 'hard'] as const).map(d => (
          <button
            key={d}
            className={difficulty === d ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 16px', fontSize: '13px', textTransform: 'capitalize' }}
            onClick={() => setDifficulty(d)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {d === 'easy' ? <Circle size={14} className="text-emerald-500" /> : 
               d === 'medium' ? <Circle size={14} className="text-yellow-500" /> : 
               d === 'hard' ? <Circle size={14} className="text-red-500" /> : 
               <List size={14} />} {d}
            </div>
          </button>
        ))}
      </div>

      {!currentScenario ? (
        /* Scenario Selection */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredScenarios.map(scenario => (
            <div
              key={scenario.id}
              className="glass-card"
              style={{
                cursor: 'pointer',
                opacity: completedIds.has(scenario.id) ? 0.6 : 1,
                borderColor: completedIds.has(scenario.id) ? 'rgba(16,185,129,0.3)' : 'var(--glass-border)',
              }}
              onClick={() => startScenario(scenario)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>{scenario.title}</h3>
                <span className={`badge ${
                  scenario.difficulty === 'easy' ? 'badge-success' :
                  scenario.difficulty === 'medium' ? 'badge-warning' : 'badge-danger'
                }`}>
                  {scenario.difficulty}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                {scenario.description}
              </p>
              {completedIds.has(scenario.id) && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={14} /> Completed
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Active Scenario */
        <div className="glass-card animate-fade-in">
          <button className="btn-secondary" onClick={() => setCurrentScenario(null)} style={{ marginBottom: '16px', padding: '6px 16px', fontSize: '13px' }}>
            ← Back to Scenarios
          </button>

          <h2 style={{ marginTop: 0 }}>{currentScenario.title}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>{currentScenario.description}</p>

          {/* Simulated Reaction Display */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '24px',
            padding: '24px', background: 'var(--surface-2)', borderRadius: '16px',
            marginBottom: '20px',
          }}>
            <div style={{
              width: '120px', height: '120px', borderRadius: '16px',
              background: hslToHex(currentScenario.trueColor.h, currentScenario.trueColor.s, currentScenario.trueColor.l),
              border: '3px solid var(--glass-border)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                Observed Reaction Colour
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Reagent: <strong>{reagent?.name}</strong>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                App Reading: <strong>{hslToName(currentScenario.trueColor)}</strong>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                H:{currentScenario.trueColor.h} S:{currentScenario.trueColor.s} L:{currentScenario.trueColor.l}
              </div>
            </div>
          </div>

          {/* Reference Chart for this reagent */}
          <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--surface-2)', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {reagent?.name.toUpperCase()} REFERENCE CHART:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px' }}>
              {reagent?.reactions.map(rx => (
                <div key={rx.drugName} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '4px',
                    background: hslToHex(rx.expectedColor.h, rx.expectedColor.s, rx.expectedColor.l),
                    border: '1px solid var(--glass-border)',
                  }} />
                  <span>{rx.drugName}: {rx.colorName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* User Input */}
          {!showAnswer ? (
            <div>
              <label className="input-label">Your Identification</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select className="input-field" value={userGuess} onChange={e => setUserGuess(e.target.value)}>
                  <option value="">Select your answer...</option>
                  {reagent?.reactions.map(rx => (
                    <option key={rx.drugName} value={rx.drugName}>{rx.drugName}</option>
                  ))}
                  <option value="Unknown">Unknown / No Match</option>
                </select>
                <button className="btn-primary" onClick={submitGuess} disabled={!userGuess}>
                  Submit Answer
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '20px', borderRadius: '12px',
              background: userGuess.toLowerCase().includes(currentScenario.actualDrug.split(' ')[0].toLowerCase())
                ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${userGuess.toLowerCase().includes(currentScenario.actualDrug.split(' ')[0].toLowerCase())
                ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {userGuess.toLowerCase().includes(currentScenario.actualDrug.split(' ')[0].toLowerCase()) ? 
                  <><CheckCircle2 className="text-emerald-500" /> Correct!</> : 
                  <><XCircle className="text-red-500" /> Incorrect</>}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <strong>Correct answer:</strong> {currentScenario.actualDrug}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                <strong>Your answer:</strong> {userGuess}
              </div>

              {/* Detailed comparison */}
              <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                The {reagent?.shortName} reagent produces a {hslToName(currentScenario.trueColor)} colour 
                with {currentScenario.actualDrug}. 
                {reagent?.notes}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className="btn-primary" onClick={() => {
                  const nextScenario = filteredScenarios.find(s => !completedIds.has(s.id) && s.id !== currentScenario.id);
                  if (nextScenario) startScenario(nextScenario);
                  else setCurrentScenario(null);
                }}>
                  Next Scenario →
                </button>
                <button className="btn-secondary" onClick={() => setCurrentScenario(null)}>
                  Back to List
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
