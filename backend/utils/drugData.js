// Clinical Drug Database & Drug-Drug Interaction Knowledge Engine
// Curated for Indian & International clinical practice with OpenFDA cross-referencing

const CLINICAL_DRUGS = [
  // --- ANALGESICS & ANTIPYRETICS ---
  {
    name: 'Paracetamol',
    brandNames: ['Crocin', 'Calpol', 'Dolo 650', 'Tylenol'],
    genericName: 'Paracetamol / Acetaminophen',
    category: 'Analgesic & Antipyretic',
    form: 'Tablet',
    availableStrengths: ['500 mg', '650 mg', '1000 mg', '120 mg/5ml Syrup'],
    defaultDosage: '650 mg',
    defaultFrequency: 'Thrice daily',
    defaultDuration: '5 days',
    defaultInstructions: 'After meals with plenty of water. Do not exceed 4g/day.',
    timing: { morning: true, afternoon: true, night: true, withFood: 'After meals' },
    indications: 'Fever, mild-to-moderate pain, headache, post-vaccination fever.',
    warnings: 'Avoid in severe hepatic impairment. Do not take multiple paracetamol-containing formulations.'
  },
  {
    name: 'Ibuprofen',
    brandNames: ['Brufen', 'Advil', 'Motrin'],
    genericName: 'Ibuprofen',
    category: 'NSAID / Anti-inflammatory',
    form: 'Tablet',
    availableStrengths: ['200 mg', '400 mg', '600 mg'],
    defaultDosage: '400 mg',
    defaultFrequency: 'Twice daily',
    defaultDuration: '3-5 days',
    defaultInstructions: 'Strictly after food to prevent gastric irritation.',
    timing: { morning: true, afternoon: false, night: true, withFood: 'After meals' },
    indications: 'Inflammatory pain, arthritis, dental pain, fever.',
    warnings: 'Use caution in peptic ulcer, renal impairment, and hypertension.'
  },
  {
    name: 'Aceclofenac + Paracetamol',
    brandNames: ['Zerodol-P', 'Aceclo Plus', 'Hifenac-P'],
    genericName: 'Aceclofenac 100mg + Paracetamol 325mg',
    category: 'Combination NSAID',
    form: 'Tablet',
    availableStrengths: ['100mg + 325mg'],
    defaultDosage: '1 tablet',
    defaultFrequency: 'Twice daily',
    defaultDuration: '5 days',
    defaultInstructions: 'Take strictly after a full meal.',
    timing: { morning: true, afternoon: false, night: true, withFood: 'After meals' },
    indications: 'Osteoarthritis, rheumatoid arthritis, acute musculoskeletal pain.',
    warnings: 'Gastrotoxic risk; co-prescribe PPI (Pantoprazole) if history of acidity.'
  },
  {
    name: 'Tramadol + Paracetamol',
    brandNames: ['Ultracet', 'Dolzero', 'Tramazac-P'],
    genericName: 'Tramadol 37.5mg + Paracetamol 325mg',
    category: 'Opioid Analgesic Combination',
    form: 'Tablet',
    availableStrengths: ['37.5mg + 325mg'],
    defaultDosage: '1 tablet',
    defaultFrequency: 'Twice daily as needed',
    defaultDuration: '3 days',
    defaultInstructions: 'Take after food. May cause dizziness or drowsiness; avoid driving.',
    timing: { morning: true, afternoon: false, night: true, withFood: 'After meals' },
    indications: 'Moderate to severe acute pain, post-surgical pain.',
    warnings: 'Caution with SSRIs/MAOIs (risk of Serotonin Syndrome). Habit-forming potential.'
  },

  // --- ANTIBIOTICS & ANTI-INFECTIVES ---
  {
    name: 'Amoxicillin + Potassium Clavulanate',
    brandNames: ['Augmentin 625 Duo', 'Clavam 625', 'Moxikind-CV 625'],
    genericName: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
    category: 'Broad-Spectrum Penicillin Antibiotic',
    form: 'Tablet',
    availableStrengths: ['625 mg', '375 mg', '1000 mg (XR)', '228.5 mg/5ml Syrup'],
    defaultDosage: '625 mg',
    defaultFrequency: 'Twice daily',
    defaultDuration: '5-7 days',
    defaultInstructions: 'Take at the start of a meal to enhance absorption and minimize GI upset.',
    timing: { morning: true, afternoon: false, night: true, withFood: 'With food' },
    indications: 'Respiratory tract infections, sinusitis, otitis media, skin & soft tissue infections.',
    warnings: 'Contraindicated in penicillin allergy or prior amoxicillin-clavulanate jaundice.'
  },
  {
    name: 'Azithromycin',
    brandNames: ['Azithral 500', 'Azee 500', 'Zithromax'],
    genericName: 'Azithromycin',
    category: 'Macrolide Antibiotic',
    form: 'Tablet',
    availableStrengths: ['250 mg', '500 mg', '200 mg/5ml Suspension'],
    defaultDosage: '500 mg',
    defaultFrequency: 'Once daily',
    defaultDuration: '3-5 days',
    defaultInstructions: 'Take 1 hour before or 2 hours after food on an empty stomach.',
    timing: { morning: true, afternoon: false, night: false, withFood: 'Before food' },
    indications: 'Atypical pneumonia, pharyngitis, acute bacterial sinusitis, skin infections.',
    warnings: 'Caution in patients with QT prolongation, hypokalemia, or concurrent antiarrhythmics.'
  },
  {
    name: 'Ciprofloxacin',
    brandNames: ['Cifran 500', 'Ciplox 500', 'Cipro'],
    genericName: 'Ciprofloxacin',
    category: 'Fluoroquinolone Antibiotic',
    form: 'Tablet',
    availableStrengths: ['250 mg', '500 mg', '750 mg'],
    defaultDosage: '500 mg',
    defaultFrequency: 'Twice daily',
    defaultDuration: '5-7 days',
    defaultInstructions: 'Drink plenty of water. Do NOT take with dairy products, calcium, or iron pills.',
    timing: { morning: true, afternoon: false, night: true, withFood: 'With plenty of water' },
    indications: 'Complicated urinary tract infections, typhoid/enteric fever, bacterial gastroenteritis.',
    warnings: 'Risk of tendinitis and tendon rupture; photosensitivity.'
  },
  {
    name: 'Cefixime',
    brandNames: ['Zifi 200', 'Taxim-O 200', 'Cefspan'],
    genericName: 'Cefixime',
    category: 'Third-Generation Cephalosporin',
    form: 'Tablet',
    availableStrengths: ['100 mg', '200 mg', '100 mg/5ml Syrup'],
    defaultDosage: '200 mg',
    defaultFrequency: 'Twice daily',
    defaultDuration: '5-7 days',
    defaultInstructions: 'Take with or without food. Complete the full prescribed course.',
    timing: { morning: true, afternoon: false, night: true, withFood: 'With or without food' },
    indications: 'Typhoid fever, uncomplicated UTIs, otitis media, pharyngitis.',
    warnings: 'Cross-allergy risk in patients with severe penicillin anaphylaxis.'
  },
  {
    name: 'Metronidazole',
    brandNames: ['Flagyl 400', 'Metrogyl 400'],
    genericName: 'Metronidazole',
    category: 'Antiprotozoal & Nitroimidazole Antibiotic',
    form: 'Tablet',
    availableStrengths: ['200 mg', '400 mg'],
    defaultDosage: '400 mg',
    defaultFrequency: 'Thrice daily',
    defaultDuration: '5-7 days',
    defaultInstructions: 'Take strictly after meals. AVOID ALL ALCOHOL during and 48 hours after course.',
    timing: { morning: true, afternoon: true, night: true, withFood: 'After meals' },
    indications: 'Amebiasis, giardiasis, trichomoniasis, anaerobic dental & abdominal infections.',
    warnings: 'Disulfiram-like reaction with alcohol (severe vomiting, flushing, tachycardia).'
  },
  {
    name: 'Doxycycline',
    brandNames: ['Doxicip 100', 'Doxt-SL', 'Vibramycin'],
    genericName: 'Doxycycline',
    category: 'Tetracycline Antibiotic',
    form: 'Capsule',
    availableStrengths: ['100 mg'],
    defaultDosage: '100 mg',
    defaultFrequency: 'Twice daily on day 1, then once or twice daily',
    defaultDuration: '7-10 days',
    defaultInstructions: 'Take with a full glass of water and stay upright for 30 minutes to prevent esophageal ulcers.',
    timing: { morning: true, afternoon: false, night: true, withFood: 'With large glass of water' },
    indications: 'Acne vulgaris, scrub typhus, Lyme disease, pelvic inflammatory disease, malaria prophylaxis.',
    warnings: 'Contraindicated in pregnancy and children under 8 (teeth staining & bone growth restriction).'
  },

  // --- GASTROINTESTINAL & ACIDITY ---
  {
    name: 'Pantoprazole',
    brandNames: ['Pan 40', 'Pantocid 40', 'Protonix'],
    genericName: 'Pantoprazole Sodium',
    category: 'Proton Pump Inhibitor (PPI)',
    form: 'Tablet',
    availableStrengths: ['20 mg', '40 mg'],
    defaultDosage: '40 mg',
    defaultFrequency: 'Once daily',
    defaultDuration: '14-28 days',
    defaultInstructions: 'Take in the morning 30-60 minutes before breakfast.',
    timing: { morning: true, afternoon: false, night: false, withFood: '30 mins before breakfast' },
    indications: 'Gastroesophageal reflux disease (GERD), gastric & duodenal ulcers, NSAID prophylaxis.',
    warnings: 'Long-term use may cause hypomagnesemia, vitamin B12 deficiency, or osteoporosis.'
  },
  {
    name: 'Pantoprazole + Domperidone',
    brandNames: ['Pan-D', 'Pantocid-DSR', 'Dompan'],
    genericName: 'Pantoprazole 40mg + Domperidone 30mg SR',
    category: 'PPI + Prokinetic Combination',
    form: 'Capsule',
    availableStrengths: ['40mg + 30mg SR'],
    defaultDosage: '1 capsule',
    defaultFrequency: 'Once daily',
    defaultDuration: '10-14 days',
    defaultInstructions: 'Take strictly on empty stomach, 30 minutes before the first meal of the day.',
    timing: { morning: true, afternoon: false, night: false, withFood: 'Empty stomach (morning)' },
    indications: 'GERD with nausea/vomiting, functional dyspepsia, diabetic gastroparesis.',
    warnings: 'Caution in cardiac arrhythmia; avoid co-administration with QT-prolonging drugs.'
  },
  {
    name: 'Ondansetron',
    brandNames: ['Emeset 4', 'Zofran 4', 'Vomikind 4'],
    genericName: 'Ondansetron',
    category: '5-HT3 Receptor Antagonist / Antiemetic',
    form: 'Tablet',
    availableStrengths: ['4 mg', '8 mg', '2 mg/5ml Syrup'],
    defaultDosage: '4 mg',
    defaultFrequency: 'Twice or Thrice daily as needed',
    defaultDuration: '3 days',
    defaultInstructions: 'Dissolve or swallow 30 minutes before meals or when feeling nauseous.',
    timing: { morning: true, afternoon: false, night: true, withFood: 'Before meals' },
    indications: 'Prevention and treatment of nausea and vomiting from gastroenteritis or chemotherapy.',
    warnings: 'May cause mild constipation or headache.'
  },
  {
    name: 'Oral Rehydration Salts (ORS)',
    brandNames: ['Electral', 'W.H.O. ORS', 'Enerzal'],
    genericName: 'WHO Standard Oral Rehydration Salts',
    category: 'Electrolyte Replenisher',
    form: 'Sachet/Powder',
    availableStrengths: ['21.8g Sachet (for 1L water)'],
    defaultDosage: '1 sachet dissolved in 1 liter clean drinking water',
    defaultFrequency: 'Sip continuously throughout the day',
    defaultDuration: '2-3 days',
    defaultInstructions: 'Mix entire sachet in 1000ml boiled and cooled water. Discard unused portion after 24 hours.',
    timing: { morning: true, afternoon: true, night: true, withFood: 'Throughout day' },
    indications: 'Dehydration secondary to acute diarrhea, vomiting, or excessive heat exposure.',
    warnings: 'Use caution in patients with oliguria/anuria or severe heart failure.'
  },

  // --- CARDIOVASCULAR & ANTIHYPERTENSIVE ---
  {
    name: 'Telmisartan',
    brandNames: ['Telma 40', 'Micardis', 'Telmikind 40'],
    genericName: 'Telmisartan',
    category: 'Angiotensin II Receptor Blocker (ARB)',
    form: 'Tablet',
    availableStrengths: ['20 mg', '40 mg', '80 mg'],
    defaultDosage: '40 mg',
    defaultFrequency: 'Once daily',
    defaultDuration: '30 days (Chronic)',
    defaultInstructions: 'Take at the same time each morning with or without food. Monitor blood pressure regularly.',
    timing: { morning: true, afternoon: false, night: false, withFood: 'With or without food' },
    indications: 'Essential hypertension, cardiovascular risk reduction.',
    warnings: 'Contraindicated in pregnancy (teratogenic). Monitor serum potassium and creatinine.'
  },
  {
    name: 'Telmisartan + Amlodipine',
    brandNames: ['Telma-AM', 'Amlokind-T', 'Twynsta'],
    genericName: 'Telmisartan 40mg + Amlodipine 5mg',
    category: 'Antihypertensive Combination',
    form: 'Tablet',
    availableStrengths: ['40mg + 5mg', '80mg + 5mg'],
    defaultDosage: '1 tablet',
    defaultFrequency: 'Once daily',
    defaultDuration: '30 days (Chronic)',
    defaultInstructions: 'Take once daily in the morning.',
    timing: { morning: true, afternoon: false, night: false, withFood: 'Morning after food' },
    indications: 'Hypertension not adequately controlled with monotherapy.',
    warnings: 'Watch for ankle edema (from amlodipine component).'
  },
  {
    name: 'Amlodipine',
    brandNames: ['Amlong 5', 'Norvasc', 'Stamlo 5'],
    genericName: 'Amlodipine Besylate',
    category: 'Calcium Channel Blocker (Dihydropyridine)',
    form: 'Tablet',
    availableStrengths: ['2.5 mg', '5 mg', '10 mg'],
    defaultDosage: '5 mg',
    defaultFrequency: 'Once daily',
    defaultDuration: '30 days (Chronic)',
    defaultInstructions: 'Take at the same time daily. Report any swelling of ankles or lower legs.',
    timing: { morning: true, afternoon: false, night: false, withFood: 'With or without food' },
    indications: 'Hypertension, chronic stable angina, vasospastic angina.',
    warnings: 'Peripheral edema, flushing, palpitations.'
  },
  {
    name: 'Atorvastatin',
    brandNames: ['Atorva 20', 'Lipitor', 'Storvas 10'],
    genericName: 'Atorvastatin Calcium',
    category: 'HMG-CoA Reductase Inhibitor (Statin)',
    form: 'Tablet',
    availableStrengths: ['10 mg', '20 mg', '40 mg', '80 mg'],
    defaultDosage: '20 mg',
    defaultFrequency: 'Once daily at bedtime',
    defaultDuration: '30 days (Chronic)',
    defaultInstructions: 'Take at night before bed. Periodic lipid profile and liver function tests recommended.',
    timing: { morning: false, afternoon: false, night: true, withFood: 'At bedtime' },
    indications: 'Hypercholesterolemia, primary prevention of cardiovascular events, post-myocardial infarction.',
    warnings: 'Report unexplained muscle pain or weakness (risk of myopathy/rhabdomyolysis).'
  },
  {
    name: 'Aspirin (Low Dose)',
    brandNames: ['Ecosprin 75', 'Ecosprin 150', 'Bayer Aspirin'],
    genericName: 'Aspirin (Acetylsalicylic Acid)',
    category: 'Antiplatelet Agent',
    form: 'Tablet (Enteric Coated)',
    availableStrengths: ['75 mg', '150 mg'],
    defaultDosage: '75 mg',
    defaultFrequency: 'Once daily',
    defaultDuration: '30 days (Chronic)',
    defaultInstructions: 'Take immediately after lunch or dinner with water. Do not crush.',
    timing: { morning: false, afternoon: true, night: false, withFood: 'After lunch' },
    indications: 'Secondary prevention of acute coronary syndrome, ischemic stroke, or TIA.',
    warnings: 'Increased risk of gastrointestinal bleeding; avoid combining with other NSAIDs without gastroprotection.'
  },
  {
    name: 'Clopidogrel',
    brandNames: ['Deplatt 75', 'Plavix', 'Clopilet 75'],
    genericName: 'Clopidogrel Bisulfate',
    category: 'P2Y12 Platelet Inhibitor',
    form: 'Tablet',
    availableStrengths: ['75 mg'],
    defaultDosage: '75 mg',
    defaultFrequency: 'Once daily',
    defaultDuration: '30 days (Chronic)',
    defaultInstructions: 'Take at the same time each day with or without meals.',
    timing: { morning: true, afternoon: false, night: false, withFood: 'With or without food' },
    indications: 'Recent MI, ischemic stroke, acute coronary syndrome, peripheral arterial disease.',
    warnings: 'Avoid omeprazole/esomeprazole as they reduce clopidogrel antiplatelet activity (use pantoprazole instead).'
  },

  // --- ENDOCRINE & DIABETES ---
  {
    name: 'Metformin',
    brandNames: ['Glycomet 500 SR', 'Glucophage', 'Obimet 500'],
    genericName: 'Metformin Hydrochloride (Sustained Release)',
    category: 'Biguanide Antidiabetic',
    form: 'Tablet',
    availableStrengths: ['500 mg', '850 mg', '1000 mg SR'],
    defaultDosage: '500 mg SR',
    defaultFrequency: 'Twice daily',
    defaultDuration: '30 days (Chronic)',
    defaultInstructions: 'Take strictly with or immediately after meals to reduce stomach upset.',
    timing: { morning: true, afternoon: false, night: true, withFood: 'With meals' },
    indications: 'Type 2 Diabetes Mellitus, insulin resistance, polycystic ovarian syndrome (PCOS).',
    warnings: 'Contraindicated in severe renal impairment (eGFR < 30 mL/min). Risk of lactic acidosis.'
  },
  {
    name: 'Glimepiride',
    brandNames: ['Amaryl 1mg', 'Glimestar 1', 'Zoryl 1'],
    genericName: 'Glimepiride',
    category: 'Second-Generation Sulfonylurea',
    form: 'Tablet',
    availableStrengths: ['1 mg', '2 mg', '3 mg', '4 mg'],
    defaultDosage: '1 mg',
    defaultFrequency: 'Once daily',
    defaultDuration: '30 days (Chronic)',
    defaultInstructions: 'Take immediately before or with the first main meal (breakfast). Never skip meals.',
    timing: { morning: true, afternoon: false, night: false, withFood: 'With breakfast' },
    indications: 'Type 2 Diabetes Mellitus as monotherapy or adjunct to Metformin.',
    warnings: 'Risk of hypoglycemia. Educate patient on recognizing signs: sweating, shakiness, dizziness.'
  },
  {
    name: 'Metformin + Glimepiride',
    brandNames: ['Glycomet-GP 1', 'Amaryl-M 1', 'Glimestar-M 1'],
    genericName: 'Metformin 500mg SR + Glimepiride 1mg',
    category: 'Antidiabetic Combination',
    form: 'Tablet',
    availableStrengths: ['500mg + 1mg', '500mg + 2mg'],
    defaultDosage: '1 tablet',
    defaultFrequency: 'Once or twice daily',
    defaultDuration: '30 days (Chronic)',
    defaultInstructions: 'Take with breakfast or dinner. Always keep fast-acting sugar/glucose handy.',
    timing: { morning: true, afternoon: false, night: false, withFood: 'With breakfast' },
    indications: 'Dual-therapy management of Type 2 Diabetes.',
    warnings: 'Hypoglycemia risk and lactic acidosis warning.'
  },
  {
    name: 'Dapagliflozin',
    brandNames: ['Forxiga 10', 'Daphne 10', 'Oxra 10'],
    genericName: 'Dapagliflozin',
    category: 'SGLT2 Inhibitor',
    form: 'Tablet',
    availableStrengths: ['5 mg', '10 mg'],
    defaultDosage: '10 mg',
    defaultFrequency: 'Once daily',
    defaultDuration: '30 days (Chronic)',
    defaultInstructions: 'Take in the morning with a full glass of water. Maintain adequate hydration.',
    timing: { morning: true, afternoon: false, night: false, withFood: 'In morning' },
    indications: 'Type 2 Diabetes, Heart Failure with reduced ejection fraction, Chronic Kidney Disease.',
    warnings: 'Increased risk of mycotic genital infections, UTIs, and euglycemic ketoacidosis.'
  },

  // --- RESPIRATORY & ANTIALLERGIC ---
  {
    name: 'Levocetirizine',
    brandNames: ['Levocet 5', 'Xyzal', 'Vozet 5'],
    genericName: 'Levocetirizine Dihydrochloride',
    category: 'Second-Generation Antihistamine',
    form: 'Tablet',
    availableStrengths: ['5 mg', '2.5 mg/5ml Syrup'],
    defaultDosage: '5 mg',
    defaultFrequency: 'Once daily at bedtime',
    defaultDuration: '5-7 days',
    defaultInstructions: 'Take at night before sleep. May cause mild drowsiness.',
    timing: { morning: false, afternoon: false, night: true, withFood: 'At bedtime' },
    indications: 'Allergic rhinitis, sneezing, runny nose, chronic idiopathic urticaria.',
    warnings: 'Avoid combining with alcohol or central nervous system depressants.'
  },
  {
    name: 'Montelukast + Levocetirizine',
    brandNames: ['Montair-LC', 'Telekast-L', 'Montek-LC'],
    genericName: 'Montelukast 10mg + Levocetirizine 5mg',
    category: 'Leukotriene Receptor Antagonist + Antihistamine',
    form: 'Tablet',
    availableStrengths: ['10mg + 5mg'],
    defaultDosage: '1 tablet',
    defaultFrequency: 'Once daily at bedtime',
    defaultDuration: '10-14 days',
    defaultInstructions: 'Take once daily in the evening/night with water.',
    timing: { morning: false, afternoon: false, night: true, withFood: 'At night' },
    indications: 'Bronchial asthma with allergic rhinitis, seasonal allergies, persistent cough.',
    warnings: 'Rare neuropsychiatric symptoms (agitation, sleep disturbances, depression) reported with montelukast.'
  },
  {
    name: 'Salbutamol / Albuterol Inhaler',
    brandNames: ['Asthalin Inhaler', 'Ventolin', 'Aerolin'],
    genericName: 'Salbutamol 100mcg/actuation',
    category: 'Short-Acting Beta-2 Agonist (SABA) Bronchodilator',
    form: 'Inhaler / MDI',
    availableStrengths: ['100 mcg per puff'],
    defaultDosage: '1 to 2 puffs',
    defaultFrequency: 'Every 4-6 hours as needed for wheezing or breathlessness',
    defaultDuration: 'As needed (1 canister)',
    defaultInstructions: 'Shake well before each puff. Use spacer if recommended. Rinse mouth after use.',
    timing: { morning: false, afternoon: false, night: false, withFood: 'SOS (As needed)' },
    indications: 'Acute bronchospasm, asthma attacks, exercise-induced asthma, COPD exacerbation.',
    warnings: 'May cause fine skeletal muscle tremors and mild tachycardia. If relief is not felt, seek urgent care.'
  },
  {
    name: 'Budesonide + Formoterol Inhaler',
    brandNames: ['Budecort / Foracort 200', 'Symbicort', 'Seroflo'],
    genericName: 'Budesonide 200mcg + Formoterol 6mcg',
    category: 'Inhaled Corticosteroid + LABA',
    form: 'Inhaler / DPI / Rotacaps',
    availableStrengths: ['200mcg + 6mcg', '400mcg + 6mcg'],
    defaultDosage: '1 inhalation',
    defaultFrequency: 'Twice daily',
    defaultDuration: '30 days (Maintenance)',
    defaultInstructions: 'Inhale twice daily. Rinsing mouth and gargling with water after each use is mandatory to prevent oral thrush.',
    timing: { morning: true, afternoon: false, night: true, withFood: 'Morning and Night' },
    indications: 'Maintenance treatment of persistent asthma and moderate-to-severe COPD.',
    warnings: 'Not for acute rescue therapy alone. Always rinse mouth.'
  },

  // --- VITAMINS, MINERALS & NUTRACEUTICALS ---
  {
    name: 'Cholecalciferol (Vitamin D3)',
    brandNames: ['Uprise-D3 60K', 'Calcirol 60K', 'D-Rise 60K'],
    genericName: 'Cholecalciferol 60,000 IU',
    category: 'Fat-Soluble Vitamin D',
    form: 'Capsule / Sachet',
    availableStrengths: ['60,000 IU'],
    defaultDosage: '60,000 IU (1 capsule)',
    defaultFrequency: 'Once weekly for 8 weeks',
    defaultDuration: '8 weeks',
    defaultInstructions: 'Take once every week with a meal containing fats (such as milk or breakfast) for best absorption.',
    timing: { morning: true, afternoon: false, night: false, withFood: 'Once weekly with milk' },
    indications: 'Vitamin D deficiency, osteoporosis, hypocalcemia, bone mineralization.',
    warnings: 'Do not overdose; excessive doses can lead to hypercalcemia and renal stones.'
  },
  {
    name: 'Methylcobalamin + Alpha Lipoic Acid',
    brandNames: ['Neurobion Forte', 'Nurokind-Plus', 'Cobadex Forte'],
    genericName: 'Vitamin B12 + B-Complex + Antioxidant',
    category: 'Neurotropic Vitamin Complex',
    form: 'Capsule',
    availableStrengths: ['1500 mcg B12 + Multi-B'],
    defaultDosage: '1 capsule',
    defaultFrequency: 'Once daily',
    defaultDuration: '30 days',
    defaultInstructions: 'Take in the morning after breakfast.',
    timing: { morning: true, afternoon: false, night: false, withFood: 'After breakfast' },
    indications: 'Diabetic neuropathy, generalized peripheral neuropathy, Vitamin B12 deficiency.',
    warnings: 'Urine may turn bright yellow due to Riboflavin (harmless).'
  }
];

// Clinically Significant Drug-Drug Interactions
const DRUG_INTERACTIONS = [
  {
    drugs: ['Warfarin', 'Aspirin'],
    severity: 'Severe',
    title: 'High Risk of Life-Threatening Hemorrhage',
    description: 'Concurrent use of Warfarin with Aspirin or other antiplatelets/NSAIDs drastically multiplies gastrointestinal and intracranial bleeding risk.',
    recommendation: 'Avoid combination unless specifically indicated in mechanical heart valves. Monitor INR closely and prescribe gastroprotection (PPI).'
  },
  {
    drugs: ['Warfarin', 'Ibuprofen'],
    severity: 'Severe',
    title: 'Severe Bleeding Hazard & Gastric Erosion',
    description: 'NSAIDs displace warfarin from albumin, inhibit platelets, and erode gastric mucosa, triggering acute upper GI bleeding.',
    recommendation: 'Use Paracetamol for pain or fever instead of NSAIDs in anticoagulated patients.'
  },
  {
    drugs: ['Metformin', 'Contrast Agent'],
    severity: 'Severe',
    title: 'Risk of Contrast-Induced Lactic Acidosis',
    description: 'Iodinated radiocontrast can cause acute renal failure, leading to massive toxic accumulation of Metformin and fatal lactic acidosis.',
    recommendation: 'Withhold Metformin 48 hours before and after intravenous contrast procedures. Resume only after verifying renal function.'
  },
  {
    drugs: ['Clopidogrel', 'Omeprazole'],
    severity: 'Moderate',
    title: 'Reduced Antiplatelet Efficacy via CYP2C19 Inhibition',
    description: 'Omeprazole and Esomeprazole competitively inhibit CYP2C19, preventing metabolic bio-activation of Clopidogrel and increasing stent thrombosis risk.',
    recommendation: 'Substitute Omeprazole with Pantoprazole or Rabeprazole, which exhibit negligible CYP2C19 inhibition.'
  },
  {
    drugs: ['Ciprofloxacin', 'Calcium Carbonate'],
    severity: 'Moderate',
    title: 'Chelation and Decreased Antibiotic Absorption',
    description: 'Divalent and trivalent cations (Calcium, Iron, Magnesium, Antacids) bind Ciprofloxacin in the gut lumen, reducing bioavailability by up to 80%.',
    recommendation: 'Separate intake: take Ciprofloxacin 2 hours before or 4-6 hours after any dairy or mineral supplements.'
  },
  {
    drugs: ['Telmisartan', 'Aspirin'],
    severity: 'Moderate',
    title: 'Attenuated Antihypertensive Effect & Renal Strain',
    description: 'NSAIDs inhibit renal vasodilatory prostaglandins, blunting the blood-pressure lowering action of ARBs/ACEIs and worsening renal perfusion.',
    recommendation: 'Monitor blood pressure and serum creatinine if NSAID is used for more than 3 consecutive days.'
  },
  {
    drugs: ['Atorvastatin', 'Azithromycin'],
    severity: 'Moderate',
    title: 'Potential Statin Accumulation & Myopathy',
    description: 'Macrolides can inhibit hepatic CYP3A4-mediated statin clearance, increasing risk of muscle toxicity and elevated CK levels.',
    recommendation: 'Educate patient to report any unexplained muscle tenderness or dark urine immediately.'
  },
  {
    drugs: ['Tramadol', 'Levocetirizine'],
    severity: 'Moderate',
    title: 'Additive Central Nervous System Depression',
    description: 'Co-administration produces enhanced sedation, drowsiness, and psychomotor impairment.',
    recommendation: 'Warn patient against driving or operating machinery. Consider reducing sedative dosage.'
  },
  {
    drugs: ['Glimepiride', 'Ciprofloxacin'],
    severity: 'Moderate',
    title: 'Risk of Severe Hypoglycemia',
    description: 'Fluoroquinolones potentiate insulin release from pancreatic beta cells when co-administered with sulfonylureas.',
    recommendation: 'Advise rigorous blood glucose monitoring and educate on hypoglycemia awareness.'
  }
];

// Common Clinical Regimen Templates for instant one-click prescribing
const CLINICAL_TEMPLATES = [
  {
    id: 'uri-cold-flu',
    name: 'Upper Respiratory Infection / Viral Cold & Cough',
    category: 'General Medicine / ENT',
    diagnosis: 'Acute Upper Respiratory Tract Infection (Common Cold / Viral Bronchitis)',
    notes: 'Rest, warm saline gargles thrice daily, hydration, steam inhalation twice daily for 5 minutes. Return if fever persists beyond 3 days or breathlessness occurs.',
    medications: [
      {
        name: 'Paracetamol',
        dosage: '650 mg',
        frequency: 'Thrice daily',
        duration: '5 days',
        instructions: 'After meals. Take for fever or body ache.'
      },
      {
        name: 'Montelukast + Levocetirizine',
        dosage: '10mg + 5mg',
        frequency: 'Once daily at bedtime',
        duration: '7 days',
        instructions: 'Take 1 tablet at night for sneezing and nasal congestion.'
      },
      {
        name: 'Pantoprazole',
        dosage: '40 mg',
        frequency: 'Once daily',
        duration: '5 days',
        instructions: 'Take 30 mins before breakfast.'
      }
    ]
  },
  {
    id: 'hypertension-essential',
    name: 'Essential Hypertension (Stage 1/2)',
    category: 'Cardiology',
    diagnosis: 'Primary Essential Hypertension (Uncomplicated)',
    notes: 'Low salt diet (< 5g/day), 30 minutes daily brisk walking, avoid smoking/alcohol. Maintain home BP log twice weekly.',
    medications: [
      {
        name: 'Telmisartan',
        dosage: '40 mg',
        frequency: 'Once daily',
        duration: '30 days',
        instructions: 'Take every morning at 8:00 AM with or without breakfast.'
      },
      {
        name: 'Amlodipine',
        dosage: '5 mg',
        frequency: 'Once daily',
        duration: '30 days',
        instructions: 'Take once daily in the morning.'
      }
    ]
  },
  {
    id: 'type2-diabetes',
    name: 'Type 2 Diabetes Mellitus Care',
    category: 'Endocrinology',
    diagnosis: 'Type 2 Diabetes Mellitus (HbA1c > 7.5%)',
    notes: 'Diabetic diet: avoid refined sugars, processed carbs. Regular foot inspection. HbA1c repeat in 3 months. Fasting & Post-prandial blood sugar check weekly.',
    medications: [
      {
        name: 'Metformin',
        dosage: '500 mg SR',
        frequency: 'Twice daily',
        duration: '30 days',
        instructions: 'Strictly with or immediately after breakfast and dinner.'
      },
      {
        name: 'Glimepiride',
        dosage: '1 mg',
        frequency: 'Once daily',
        duration: '30 days',
        instructions: 'Take with the first bite of breakfast. Do NOT skip meals.'
      }
    ]
  },
  {
    id: 'acid-peptic-gerd',
    name: 'Acid Peptic Disease / GERD / Gastritis',
    category: 'Gastroenterology',
    diagnosis: 'Gastroesophageal Reflux Disease (GERD) with Acute Dyspepsia',
    notes: 'Avoid spicy/oily food, late night dinners, coffee, and carbonated beverages. Elevate head of bed by 15-20 cm while sleeping.',
    medications: [
      {
        name: 'Pantoprazole + Domperidone',
        dosage: '40mg + 30mg SR',
        frequency: 'Once daily',
        duration: '14 days',
        instructions: 'Take strictly on empty stomach, 30 minutes before breakfast.'
      },
      {
        name: 'Oral Rehydration Salts (ORS)',
        dosage: '1 sachet in 1L water',
        frequency: 'Throughout day',
        duration: '3 days',
        instructions: 'Sip throughout the day for optimal gut hydration.'
      }
    ]
  },
  {
    id: 'acute-bacterial-tonsillitis',
    name: 'Acute Bacterial Pharyngitis / Tonsillitis',
    category: 'ENT / Infectious Disease',
    diagnosis: 'Acute Bacterial Pharyngotonsillitis',
    notes: 'Complete full 5-day antibiotic course even if feeling better. Warm water gargles with salt every 4 hours.',
    medications: [
      {
        name: 'Amoxicillin + Potassium Clavulanate',
        dosage: '625 mg',
        frequency: 'Twice daily',
        duration: '5 days',
        instructions: 'Take with food to prevent stomach upset.'
      },
      {
        name: 'Paracetamol',
        dosage: '650 mg',
        frequency: 'Thrice daily',
        duration: '3 days',
        instructions: 'Take for throat pain and fever after meals.'
      },
      {
        name: 'Pantoprazole',
        dosage: '40 mg',
        frequency: 'Once daily',
        duration: '5 days',
        instructions: 'Before breakfast.'
      }
    ]
  },
  {
    id: 'acute-gastroenteritis',
    name: 'Acute Gastroenteritis / Diarrhea & Dehydration',
    category: 'Infectious Disease',
    diagnosis: 'Acute Infective Gastroenteritis with Mild-to-Moderate Dehydration',
    notes: 'Strict liquid and soft bland diet (Khichdi, curd, banana). Continue ORS vigorously until loose stools cease.',
    medications: [
      {
        name: 'Oral Rehydration Salts (ORS)',
        dosage: '1 sachet / 1000ml water',
        frequency: 'Sip continuously throughout the day',
        duration: '3 days',
        instructions: 'Consume at least 2 liters of reconstituted ORS daily.'
      },
      {
        name: 'Ondansetron',
        dosage: '4 mg',
        frequency: 'Twice daily as needed',
        duration: '3 days',
        instructions: 'Take 30 minutes before food if nausea or vomiting is present.'
      },
      {
        name: 'Ciprofloxacin',
        dosage: '500 mg',
        frequency: 'Twice daily',
        duration: '5 days',
        instructions: 'Take with plenty of water. Do NOT take with milk or antacids.'
      }
    ]
  }
];

module.exports = {
  CLINICAL_DRUGS,
  DRUG_INTERACTIONS,
  CLINICAL_TEMPLATES
};
