/**
 * Comprehensive Reagent Database for Drug Field Testing
 * 
 * Each reagent has:
 * - Expected unreacted (blank) color for control check
 * - Color reactions for each drug class
 * - Wait time for reading
 * - Cross-reagent inference rules for multi-reagent combination
 */

export interface ReagentReaction {
  drugName: string;
  drugGroup: string;
  expectedColor: { h: number; s: number; l: number }; // HSL
  colorName: string;
  confidence: 'high' | 'medium' | 'low';
  toleranceRadius: number; // How far in HSL space is still a match
}

export interface Reagent {
  id: string;
  name: string;
  shortName: string;
  blankColor: { h: number; s: number; l: number };
  blankColorName: string;
  blankTolerance: number;
  waitTimeSeconds: number;
  reactions: ReagentReaction[];
  notes: string;
}

export interface DrugKit {
  id: string;
  name: string;
  manufacturer: string;
  reagentSequence: string[]; // Reagent IDs in order
  barcodePrefix: string;
  expiryMonths: number;
}

export interface NDPSCategory {
  drug: string;
  smallQuantityGrams: number;
  commercialQuantityGrams: number;
  intermediateDesc: string;
  section: string;
  punishment: string;
}

// ----- REAGENT DEFINITIONS -----

export const REAGENTS: Record<string, Reagent> = {
  marquis: {
    id: 'marquis',
    name: 'Marquis Reagent',
    shortName: 'Marquis',
    blankColor: { h: 0, s: 0, l: 100 }, // Colorless
    blankColorName: 'Colorless / Very Pale Yellow',
    blankTolerance: 25,
    waitTimeSeconds: 60,
    reactions: [
      { drugName: 'Heroin (Diacetylmorphine)', drugGroup: 'Opioids', expectedColor: { h: 270, s: 80, l: 25 }, colorName: 'Deep Purple → Black', confidence: 'high', toleranceRadius: 30 },
      { drugName: 'Morphine', drugGroup: 'Opioids', expectedColor: { h: 270, s: 75, l: 30 }, colorName: 'Purple → Dark Purple', confidence: 'high', toleranceRadius: 30 },
      { drugName: 'Codeine', drugGroup: 'Opioids', expectedColor: { h: 265, s: 70, l: 35 }, colorName: 'Purple', confidence: 'medium', toleranceRadius: 30 },
      { drugName: 'MDMA (Ecstasy)', drugGroup: 'Amphetamines', expectedColor: { h: 260, s: 60, l: 20 }, colorName: 'Dark Purple / Black', confidence: 'high', toleranceRadius: 25 },
      { drugName: 'Amphetamine', drugGroup: 'Amphetamines', expectedColor: { h: 20, s: 90, l: 45 }, colorName: 'Orange → Brown', confidence: 'medium', toleranceRadius: 25 },
      { drugName: 'Methamphetamine', drugGroup: 'Amphetamines', expectedColor: { h: 25, s: 85, l: 40 }, colorName: 'Orange → Dark Brown', confidence: 'medium', toleranceRadius: 25 },
      { drugName: 'Cocaine', drugGroup: 'Stimulants', expectedColor: { h: 50, s: 20, l: 80 }, colorName: 'No reaction / Faint Yellow', confidence: 'low', toleranceRadius: 15 },
      { drugName: 'Aspirin', drugGroup: 'OTC', expectedColor: { h: 0, s: 80, l: 45 }, colorName: 'Red → Maroon', confidence: 'medium', toleranceRadius: 20 },
      { drugName: 'Sugar', drugGroup: 'Diluent', expectedColor: { h: 55, s: 70, l: 50 }, colorName: 'Yellow → Brown', confidence: 'medium', toleranceRadius: 20 },
    ],
    notes: 'Most widely used presumptive test. Formaldehyde + concentrated sulfuric acid.',
  },

  mecke: {
    id: 'mecke',
    name: 'Mecke Reagent',
    shortName: 'Mecke',
    blankColor: { h: 55, s: 40, l: 70 },
    blankColorName: 'Pale Yellow',
    blankTolerance: 20,
    waitTimeSeconds: 60,
    reactions: [
      { drugName: 'Heroin (Diacetylmorphine)', drugGroup: 'Opioids', expectedColor: { h: 120, s: 50, l: 30 }, colorName: 'Deep Green → Blue-Green', confidence: 'high', toleranceRadius: 25 },
      { drugName: 'Morphine', drugGroup: 'Opioids', expectedColor: { h: 130, s: 55, l: 25 }, colorName: 'Dark Green', confidence: 'high', toleranceRadius: 25 },
      { drugName: 'MDMA (Ecstasy)', drugGroup: 'Amphetamines', expectedColor: { h: 240, s: 40, l: 20 }, colorName: 'Dark Blue → Black', confidence: 'high', toleranceRadius: 25 },
      { drugName: 'Cocaine', drugGroup: 'Stimulants', expectedColor: { h: 120, s: 40, l: 60 }, colorName: 'Pale Olive / Light Green', confidence: 'medium', toleranceRadius: 20 },
      { drugName: 'Amphetamine', drugGroup: 'Amphetamines', expectedColor: { h: 120, s: 30, l: 40 }, colorName: 'Green → Dark Green', confidence: 'medium', toleranceRadius: 25 },
    ],
    notes: 'Selenious acid + sulfuric acid. Good for distinguishing opioids from amphetamines.',
  },

  mandelin: {
    id: 'mandelin',
    name: 'Mandelin Reagent',
    shortName: 'Mandelin',
    blankColor: { h: 45, s: 60, l: 55 },
    blankColorName: 'Yellow-Orange',
    blankTolerance: 20,
    waitTimeSeconds: 60,
    reactions: [
      { drugName: 'Amphetamine', drugGroup: 'Amphetamines', expectedColor: { h: 120, s: 60, l: 35 }, colorName: 'Dark Green', confidence: 'high', toleranceRadius: 25 },
      { drugName: 'Methamphetamine', drugGroup: 'Amphetamines', expectedColor: { h: 125, s: 55, l: 30 }, colorName: 'Dark Green', confidence: 'high', toleranceRadius: 25 },
      { drugName: 'MDMA (Ecstasy)', drugGroup: 'Amphetamines', expectedColor: { h: 260, s: 30, l: 20 }, colorName: 'Dark Brown / Black', confidence: 'medium', toleranceRadius: 25 },
      { drugName: 'Cocaine', drugGroup: 'Stimulants', expectedColor: { h: 30, s: 70, l: 40 }, colorName: 'Orange', confidence: 'medium', toleranceRadius: 20 },
      { drugName: 'Ketamine', drugGroup: 'Dissociatives', expectedColor: { h: 25, s: 80, l: 50 }, colorName: 'Orange', confidence: 'medium', toleranceRadius: 20 },
      { drugName: 'Heroin (Diacetylmorphine)', drugGroup: 'Opioids', expectedColor: { h: 20, s: 50, l: 30 }, colorName: 'Brown', confidence: 'medium', toleranceRadius: 25 },
    ],
    notes: 'Ammonium vanadate + sulfuric acid. Good for amphetamines.',
  },

  simons: {
    id: 'simons',
    name: "Simon's Reagent",
    shortName: "Simon's",
    blankColor: { h: 0, s: 0, l: 95 },
    blankColorName: 'Colorless',
    blankTolerance: 15,
    waitTimeSeconds: 30,
    reactions: [
      { drugName: 'Methamphetamine', drugGroup: 'Amphetamines', expectedColor: { h: 220, s: 70, l: 50 }, colorName: 'Blue', confidence: 'high', toleranceRadius: 25 },
      { drugName: 'MDMA (Ecstasy)', drugGroup: 'Amphetamines', expectedColor: { h: 220, s: 65, l: 45 }, colorName: 'Blue', confidence: 'high', toleranceRadius: 25 },
      { drugName: 'Amphetamine', drugGroup: 'Amphetamines', expectedColor: { h: 0, s: 0, l: 95 }, colorName: 'No reaction (remains colorless)', confidence: 'high', toleranceRadius: 10 },
    ],
    notes: "Distinguishes secondary amines (meth, MDMA) from primary amines (amphetamine). Simon's A + Simon's B (two-part reagent).",
  },

  scott: {
    id: 'scott',
    name: 'Scott Reagent (Modified)',
    shortName: 'Scott',
    blankColor: { h: 340, s: 30, l: 60 },
    blankColorName: 'Pink',
    blankTolerance: 20,
    waitTimeSeconds: 30,
    reactions: [
      { drugName: 'Cocaine', drugGroup: 'Stimulants', expectedColor: { h: 210, s: 70, l: 50 }, colorName: 'Blue', confidence: 'high', toleranceRadius: 25 },
      { drugName: 'Lidocaine', drugGroup: 'Adulterant', expectedColor: { h: 340, s: 25, l: 55 }, colorName: 'No significant change (stays pink)', confidence: 'medium', toleranceRadius: 15 },
    ],
    notes: 'Cobalt thiocyanate-based. Three-step test: blue in step 1 → pink in step 2 → blue in step 3 confirms cocaine.',
  },

  duquenois: {
    id: 'duquenois',
    name: 'Duquenois-Levine Reagent',
    shortName: 'D-L',
    blankColor: { h: 0, s: 0, l: 95 },
    blankColorName: 'Colorless',
    blankTolerance: 15,
    waitTimeSeconds: 120,
    reactions: [
      { drugName: 'Cannabis (THC)', drugGroup: 'Cannabinoids', expectedColor: { h: 275, s: 50, l: 40 }, colorName: 'Purple (transfers to chloroform layer)', confidence: 'high', toleranceRadius: 25 },
    ],
    notes: 'Vanillin + acetaldehyde + HCl, then chloroform. Purple in chloroform layer = cannabis.',
  },

  ehrlich: {
    id: 'ehrlich',
    name: 'Ehrlich Reagent',
    shortName: 'Ehrlich',
    blankColor: { h: 50, s: 40, l: 85 },
    blankColorName: 'Pale Yellow',
    blankTolerance: 15,
    waitTimeSeconds: 120,
    reactions: [
      { drugName: 'LSD', drugGroup: 'Psychedelics', expectedColor: { h: 270, s: 60, l: 50 }, colorName: 'Purple / Violet', confidence: 'high', toleranceRadius: 25 },
      { drugName: 'Psilocybin (Mushrooms)', drugGroup: 'Psychedelics', expectedColor: { h: 270, s: 55, l: 55 }, colorName: 'Purple', confidence: 'high', toleranceRadius: 25 },
      { drugName: 'DMT', drugGroup: 'Psychedelics', expectedColor: { h: 275, s: 50, l: 45 }, colorName: 'Purple / Pink-Purple', confidence: 'high', toleranceRadius: 25 },
    ],
    notes: 'p-Dimethylaminobenzaldehyde + HCl. Reacts with indole compounds.',
  },

  robadope: {
    id: 'robadope',
    name: 'Robadope Reagent',
    shortName: 'Robadope',
    blankColor: { h: 0, s: 0, l: 95 },
    blankColorName: 'Colorless',
    blankTolerance: 15,
    waitTimeSeconds: 30,
    reactions: [
      { drugName: 'MDA', drugGroup: 'Amphetamines', expectedColor: { h: 350, s: 60, l: 50 }, colorName: 'Red-Purple', confidence: 'high', toleranceRadius: 25 },
      { drugName: 'Amphetamine', drugGroup: 'Amphetamines', expectedColor: { h: 350, s: 55, l: 55 }, colorName: 'Pink-Red', confidence: 'medium', toleranceRadius: 25 },
      { drugName: 'MDMA (Ecstasy)', drugGroup: 'Amphetamines', expectedColor: { h: 0, s: 0, l: 95 }, colorName: 'No reaction', confidence: 'high', toleranceRadius: 10 },
    ],
    notes: 'Distinguishes primary amines. MDA reacts; MDMA does not.',
  },
};

// ----- DRUG KITS -----

export const DRUG_KITS: DrugKit[] = [
  {
    id: 'nij-5',
    name: 'NIJ Standard 5-Reagent Kit',
    manufacturer: 'Standard Field Kit',
    reagentSequence: ['marquis', 'mecke', 'mandelin', 'simons', 'scott'],
    barcodePrefix: 'NIJ5',
    expiryMonths: 12,
  },
  {
    id: 'nark-ii',
    name: 'NARK II Presumptive Kit',
    manufacturer: 'Sirchie',
    reagentSequence: ['marquis', 'scott', 'duquenois', 'ehrlich'],
    barcodePrefix: 'NARK',
    expiryMonths: 18,
  },
  {
    id: 'nik-full',
    name: 'NIK Full Spectrum Kit',
    manufacturer: 'Safariland',
    reagentSequence: ['marquis', 'mecke', 'mandelin', 'simons', 'scott', 'duquenois', 'ehrlich'],
    barcodePrefix: 'NIK',
    expiryMonths: 12,
  },
  {
    id: 'custom',
    name: 'Custom Kit (Select Reagents)',
    manufacturer: 'Custom',
    reagentSequence: [],
    barcodePrefix: 'CUST',
    expiryMonths: 12,
  },
];

// ----- MULTI-REAGENT INFERENCE ENGINE -----

export interface InferenceResult {
  drugName: string;
  drugGroup: string;
  overallConfidence: 'confirmed' | 'probable' | 'possible' | 'unlikely';
  score: number; // 0–100
  reagentMatches: {
    reagentId: string;
    reagentName: string;
    matched: boolean;
    colorDelta: number;
    expectedColor: string;
    observedColor: string;
  }[];
  reasoning: string;
}

/**
 * Core inference: combine results from multiple reagents
 * This is what no other team does — cross-referencing all reagent results
 */
export function inferDrugFromMultipleReagents(
  results: { reagentId: string; observedHSL: { h: number; s: number; l: number } }[]
): InferenceResult[] {
  // Collect all unique drugs across all reagents
  const allDrugs = new Set<string>();
  for (const r of results) {
    const reagent = REAGENTS[r.reagentId];
    if (reagent) {
      for (const reaction of reagent.reactions) {
        allDrugs.add(reaction.drugName);
      }
    }
  }

  const inferences: InferenceResult[] = [];

  for (const drugName of allDrugs) {
    let totalScore = 0;
    let maxPossibleScore = 0;
    const matches: InferenceResult['reagentMatches'] = [];
    const reasoningParts: string[] = [];

    for (const r of results) {
      const reagent = REAGENTS[r.reagentId];
      if (!reagent) continue;

      const reaction = reagent.reactions.find(rx => rx.drugName === drugName);
      if (reaction) {
        maxPossibleScore += 100;
        const delta = colorDistance(r.observedHSL, reaction.expectedColor);
        const matchScore = Math.max(0, 100 - (delta / reaction.toleranceRadius) * 100);
        const matched = delta <= reaction.toleranceRadius;

        totalScore += matchScore;
        matches.push({
          reagentId: r.reagentId,
          reagentName: reagent.name,
          matched,
          colorDelta: Math.round(delta),
          expectedColor: reaction.colorName,
          observedColor: hslToName(r.observedHSL),
        });

        if (matched) {
          reasoningParts.push(`${reagent.shortName}: ✓ ${reaction.colorName} (Δ${Math.round(delta)})`);
        } else {
          reasoningParts.push(`${reagent.shortName}: ✗ Expected ${reaction.colorName}, got ${hslToName(r.observedHSL)} (Δ${Math.round(delta)})`);
        }
      } else {
        // Reagent has no known reaction for this drug — no reaction expected
        // Check if we observed no reaction (close to blank)
        const blankDelta = colorDistance(r.observedHSL, reagent.blankColor);
        if (blankDelta <= reagent.blankTolerance) {
          // No reaction observed = consistent with this drug
          matches.push({
            reagentId: r.reagentId,
            reagentName: reagent.name,
            matched: true,
            colorDelta: 0,
            expectedColor: 'No reaction',
            observedColor: hslToName(r.observedHSL),
          });
          reasoningParts.push(`${reagent.shortName}: ✓ No reaction expected, none observed`);
        }
      }
    }

    const normalizedScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    const matchedCount = matches.filter(m => m.matched).length;
    const totalReagentsUsed = results.length;

    let confidence: InferenceResult['overallConfidence'];
    if (normalizedScore >= 75 && matchedCount >= 2) {
      confidence = 'confirmed';
    } else if (normalizedScore >= 55 && matchedCount >= 1) {
      confidence = 'probable';
    } else if (normalizedScore >= 30) {
      confidence = 'possible';
    } else {
      confidence = 'unlikely';
    }

    inferences.push({
      drugName,
      drugGroup: REAGENTS[results[0].reagentId]?.reactions.find(rx => rx.drugName === drugName)?.drugGroup || 'Unknown',
      overallConfidence: confidence,
      score: Math.round(normalizedScore),
      reagentMatches: matches,
      reasoning: `${matchedCount}/${totalReagentsUsed} reagents matched. ${reasoningParts.join('; ')}`,
    });
  }

  // Sort by score descending
  inferences.sort((a, b) => b.score - a.score);
  return inferences;
}

// ----- NDPS QUANTITY TABLE -----

export const NDPS_TABLE: NDPSCategory[] = [
  { drug: 'Heroin (Diacetylmorphine)', smallQuantityGrams: 5, commercialQuantityGrams: 250, intermediateDesc: '5g < x < 250g', section: 'Section 21(b)', punishment: '10-20 years RI + ₹1-2 lakh fine' },
  { drug: 'Morphine', smallQuantityGrams: 5, commercialQuantityGrams: 250, intermediateDesc: '5g < x < 250g', section: 'Section 21(b)', punishment: '10-20 years RI + ₹1-2 lakh fine' },
  { drug: 'Cocaine', smallQuantityGrams: 2, commercialQuantityGrams: 100, intermediateDesc: '2g < x < 100g', section: 'Section 21(b)', punishment: '10-20 years RI + ₹1-2 lakh fine' },
  { drug: 'Cannabis (Ganja)', smallQuantityGrams: 1000, commercialQuantityGrams: 20000, intermediateDesc: '1kg < x < 20kg', section: 'Section 20(b)(ii)', punishment: '10-20 years RI + ₹1-2 lakh fine' },
  { drug: 'Charas (Cannabis Resin)', smallQuantityGrams: 100, commercialQuantityGrams: 1000, intermediateDesc: '100g < x < 1kg', section: 'Section 20(b)(ii)', punishment: '10-20 years RI + ₹1-2 lakh fine' },
  { drug: 'MDMA (Ecstasy)', smallQuantityGrams: 0.5, commercialQuantityGrams: 10, intermediateDesc: '0.5g < x < 10g', section: 'Section 21(b)', punishment: '10-20 years RI + ₹1-2 lakh fine' },
  { drug: 'Amphetamine', smallQuantityGrams: 2, commercialQuantityGrams: 50, intermediateDesc: '2g < x < 50g', section: 'Section 21(b)', punishment: '10-20 years RI + ₹1-2 lakh fine' },
  { drug: 'Methamphetamine', smallQuantityGrams: 2, commercialQuantityGrams: 50, intermediateDesc: '2g < x < 50g', section: 'Section 21(b)', punishment: '10-20 years RI + ₹1-2 lakh fine' },
  { drug: 'LSD', smallQuantityGrams: 0.002, commercialQuantityGrams: 0.1, intermediateDesc: '2mg < x < 100mg', section: 'Section 22(b)', punishment: '10-20 years RI + ₹1-2 lakh fine' },
  { drug: 'Ketamine', smallQuantityGrams: 10, commercialQuantityGrams: 500, intermediateDesc: '10g < x < 500g', section: 'Section 22(b)', punishment: '10-20 years RI + ₹1-2 lakh fine' },
  { drug: 'Opium', smallQuantityGrams: 25, commercialQuantityGrams: 2500, intermediateDesc: '25g < x < 2.5kg', section: 'Section 18(b)', punishment: '10-20 years RI + ₹1-2 lakh fine' },
];

export function classifyQuantity(drugName: string, weightGrams: number): {
  category: 'small' | 'intermediate' | 'commercial';
  section: string;
  punishment: string;
  explanation: string;
} | null {
  const entry = NDPS_TABLE.find(d => drugName.toLowerCase().includes(d.drug.toLowerCase().split(' ')[0]));
  if (!entry) return null;

  if (weightGrams <= entry.smallQuantityGrams) {
    return {
      category: 'small',
      section: entry.section.replace('(b)', '(a)'),
      punishment: 'Up to 1 year RI or ₹10,000 fine or both',
      explanation: `${weightGrams}g ≤ ${entry.smallQuantityGrams}g (small quantity threshold for ${entry.drug})`,
    };
  } else if (weightGrams >= entry.commercialQuantityGrams) {
    return {
      category: 'commercial',
      section: entry.section.replace('(b)', '(c)'),
      punishment: entry.punishment,
      explanation: `${weightGrams}g ≥ ${entry.commercialQuantityGrams}g (commercial quantity threshold for ${entry.drug})`,
    };
  } else {
    return {
      category: 'intermediate',
      section: entry.section,
      punishment: 'Up to 10 years RI + ₹1 lakh fine',
      explanation: `${entry.intermediateDesc} for ${entry.drug}`,
    };
  }
}

// ----- COLOR UTILITIES -----

export function colorDistance(a: { h: number; s: number; l: number }, b: { h: number; s: number; l: number }): number {
  // Weighted HSL distance — hue wraps around 360
  const hueDiff = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h));
  const satDiff = Math.abs(a.s - b.s);
  const lightDiff = Math.abs(a.l - b.l);
  return Math.sqrt(hueDiff * hueDiff * 0.5 + satDiff * satDiff * 0.3 + lightDiff * lightDiff * 0.2);
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function hslToName(hsl: { h: number; s: number; l: number }): string {
  if (hsl.s < 10) {
    if (hsl.l > 90) return 'White/Colorless';
    if (hsl.l > 60) return 'Light Gray';
    if (hsl.l > 30) return 'Gray';
    if (hsl.l > 10) return 'Dark Gray';
    return 'Black';
  }
  
  const hueNames: [number, string][] = [
    [15, 'Red'], [35, 'Orange'], [55, 'Yellow'], [80, 'Yellow-Green'],
    [140, 'Green'], [175, 'Teal'], [210, 'Blue'], [250, 'Indigo'],
    [290, 'Purple'], [330, 'Pink'], [360, 'Red'],
  ];

  let name = 'Unknown';
  for (const [limit, n] of hueNames) {
    if (hsl.h <= limit) { name = n; break; }
  }

  if (hsl.l < 25) return `Dark ${name}`;
  if (hsl.l > 75) return `Light ${name}`;
  return name;
}

/**
 * Sample the average color from a specific region of a video frame
 * drawn to a canvas context. Returns HSL.
 */
export function sampleColorFromCanvas(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  width: number, height: number
): { h: number; s: number; l: number; r: number; g: number; b: number } {
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;
  let totalR = 0, totalG = 0, totalB = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    totalR += data[i];
    totalG += data[i + 1];
    totalB += data[i + 2];
  }

  const r = Math.round(totalR / pixelCount);
  const g = Math.round(totalG / pixelCount);
  const b = Math.round(totalB / pixelCount);
  const hsl = rgbToHsl(r, g, b);

  return { ...hsl, r, g, b };
}

/**
 * Apply white-balance correction based on a reference white patch
 * This helps normalize colors across different lighting/phones
 */
export function applyWhiteBalance(
  color: { r: number; g: number; b: number },
  referenceWhite: { r: number; g: number; b: number }
): { r: number; g: number; b: number } {
  const scaleR = 255 / referenceWhite.r;
  const scaleG = 255 / referenceWhite.g;
  const scaleB = 255 / referenceWhite.b;

  return {
    r: Math.min(255, Math.round(color.r * scaleR)),
    g: Math.min(255, Math.round(color.g * scaleG)),
    b: Math.min(255, Math.round(color.b * scaleB)),
  };
}
