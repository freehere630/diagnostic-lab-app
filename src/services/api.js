import { supabase } from "../supabaseClient";

// ==========================================
// 1. MASTER DEPARTMENTS
// ==========================================
export const DEFAULT_DEPARTMENTS = [
  { id: "DEP-HEM", name: "Hematology & Coagulation", icon: "🩸" },
  { id: "DEP-BIO", name: "Clinical Biochemistry", icon: "🧪" },
  { id: "DEP-RAD", name: "Radiology & X-Ray", icon: "🩻" },
  { id: "DEP-USG", name: "Ultrasonography (USG)", icon: "📡" },
  { id: "DEP-CTMRI", name: "CT Scan & MRI Imaging", icon: "🧠" },
  { id: "DEP-CARD", name: "Cardiology (ECG & Echo)", icon: "💓" },
  { id: "DEP-MIC", name: "Microbiology & Serology", icon: "🔬" },
  { id: "DEP-PAT", name: "Clinical Pathology & Urine", icon: "🧫" },
  { id: "DEP-HISTO", name: "Histopathology & Cytology", icon: "🔬" }
];

// ==========================================
// 2. STANDARD CLINICAL PARAMETER MODELS
// ==========================================

export const MASTER_CBC_PARAMETERS = [
  { name: "Hemoglobin (Hb)", unit: "g/dL", min: 11.5, max: 16.5, type: "numeric", defaultRef: "Adult Men: 13.0 - 17.5, Women: 11.5 - 15.5" },
  { name: "Total Red Blood Cell Count (RBC)", unit: "10^12/L", min: 3.8, max: 5.8, type: "numeric", defaultRef: "Men: 4.5 - 5.8, Women: 3.8 - 5.2" },
  { name: "Packed Cell Volume (PCV / Hematocrit)", unit: "%", min: 36.0, max: 50.0, type: "numeric", defaultRef: "Men: 40 - 50, Women: 36 - 46" },
  { name: "ESR (Westergren Method)", unit: "mm/1st hr", min: 0.0, max: 20.0, type: "numeric", defaultRef: "Men: 0 - 10, Women: 0 - 20" },
  { name: "Mean Corpuscular Volume (MCV)", unit: "fL", min: 78.0, max: 98.0, type: "numeric", defaultRef: "78.0 - 98.0" },
  { name: "Mean Corpuscular Hemoglobin (MCH)", unit: "pg", min: 27.0, max: 32.0, type: "numeric", defaultRef: "27.0 - 32.0" },
  { name: "Mean Corpuscular Hb Concentration (MCHC)", unit: "g/dL", min: 31.0, max: 36.0, type: "numeric", defaultRef: "31.0 - 36.0" },
  { name: "RDW-CV", unit: "%", min: 11.5, max: 15.0, type: "numeric", defaultRef: "11.5 - 15.0" },
  { name: "RDW-SD", unit: "fL", min: 35.0, max: 56.0, type: "numeric", defaultRef: "35.0 - 56.0" },
  { name: "Total Leucocyte Count (WBC)", unit: "/cumm", min: 4000, max: 11000, type: "numeric", defaultRef: "4,000 - 11,000" },
  { name: "Granulocytes (Machine Gran%)", unit: "%", min: 40.0, max: 75.0, type: "numeric", defaultRef: "40.0 - 75.0 (Machine Analyzed)" },
  { name: "Lymphocytes (Machine Lymph%)", unit: "%", min: 20.0, max: 45.0, type: "numeric", defaultRef: "20.0 - 45.0 (Machine Analyzed)" },
  { name: "Mid-cells (Machine Mid%)", unit: "%", min: 2.0, max: 15.0, type: "numeric", defaultRef: "2.0 - 15.0 (Machine Analyzed)" },
  { name: "Neutrophils", unit: "%", min: 40.0, max: 75.0, type: "numeric", defaultRef: "40 - 75" },
  { name: "Lymphocytes", unit: "%", min: 20.0, max: 45.0, type: "numeric", defaultRef: "20 - 45" },
  { name: "Monocytes", unit: "%", min: 2.0, max: 10.0, type: "numeric", defaultRef: "2 - 10" },
  { name: "Eosinophils", unit: "%", min: 1.0, max: 6.0, type: "numeric", defaultRef: "1 - 6" },
  { name: "Basophils", unit: "%", min: 0.0, max: 1.0, type: "numeric", defaultRef: "0 - 1" },
  { name: "Total Circulating Eosinophils (AEC)", unit: "/cumm", min: 50, max: 500, type: "numeric", defaultRef: "50 - 500" },
  { name: "Total Platelet Count", unit: "/cumm", min: 150000, max: 450000, type: "numeric", defaultRef: "1,50,000 - 4,50,000" },
  { name: "Mean Platelet Volume (MPV)", unit: "fL", min: 7.4, max: 11.5, type: "numeric", defaultRef: "7.4 - 11.5" },
  { name: "Platelet Distribution Width (PDW)", unit: "%", min: 10.0, max: 18.0, type: "numeric", defaultRef: "10.0 - 18.0" }
];

export const MASTER_URINE_PARAMETERS = [
  { name: "Color", unit: "", min: null, max: null, type: "text", defaultRef: "Straw / Pale Yellow" },
  { name: "Appearance / Clarity", unit: "", min: null, max: null, type: "text", defaultRef: "Clear" },
  { name: "Specific Gravity", unit: "", min: 1.005, max: 1.030, type: "numeric", defaultRef: "1.005 – 1.030" },
  { name: "Reaction / pH", unit: "", min: 5.0, max: 8.0, type: "text", defaultRef: "Acidic (5.5 – 7.0)" },
  { name: "Sediment", unit: "", min: null, max: null, type: "text", defaultRef: "Nil" },
  { name: "Albumin / Protein", unit: "", min: null, max: null, type: "qualitative", defaultRef: "Nil" },
  { name: "Sugar / Glucose", unit: "", min: null, max: null, type: "qualitative", defaultRef: "Nil" },
  { name: "Ketone Bodies", unit: "", min: null, max: null, type: "qualitative", defaultRef: "Negative / Nil" },
  { name: "Bilirubin", unit: "", min: null, max: null, type: "qualitative", defaultRef: "Negative" },
  { name: "Urobilinogen", unit: "", min: null, max: null, type: "text", defaultRef: "Normal (< 1 mg/dL)" },
  { name: "Nitrite", unit: "", min: null, max: null, type: "qualitative", defaultRef: "Negative" },
  { name: "Leukocyte Esterase", unit: "", min: null, max: null, type: "qualitative", defaultRef: "Negative" },
  { name: "Bile Salt", unit: "", min: null, max: null, type: "qualitative", defaultRef: "Negative" },
  { name: "Bile Pigment", unit: "", min: null, max: null, type: "qualitative", defaultRef: "Negative" },
  { name: "Pus Cells (WBC)", unit: "/HPF", min: 0, max: 4, type: "text", defaultRef: "0 – 4 /HPF" },
  { name: "Epithelial Cells", unit: "/HPF", min: 1, max: 5, type: "text", defaultRef: "1 – 5 /HPF" },
  { name: "Red Blood Cells (RBC)", unit: "/HPF", min: 0, max: 2, type: "text", defaultRef: "Nil (Occasional)" },
  { name: "Casts", unit: "/LPF", min: null, max: null, type: "text", defaultRef: "Nil" },
  { name: "Crystals", unit: "/HPF", min: null, max: null, type: "text", defaultRef: "Nil" },
  { name: "Calcium Oxalate", unit: "", min: null, max: null, type: "text", defaultRef: "Nil" },
  { name: "Amorphous Urates / Phosphates", unit: "", min: null, max: null, type: "text", defaultRef: "Nil" },
  { name: "Bacteria", unit: "", min: null, max: null, type: "text", defaultRef: "Nil / Not Found" },
  { name: "Yeast Cells / Fungi", unit: "", min: null, max: null, type: "text", defaultRef: "Nil" },
  { name: "Trichomonas Vaginalis", unit: "", min: null, max: null, type: "text", defaultRef: "Nil" }
];

export const MASTER_STOOL_PARAMETERS = [
  { name: "Color", unit: "", min: null, max: null, type: "text", defaultRef: "Yellowish Brown" },
  { name: "Consistency", unit: "", min: null, max: null, type: "text", defaultRef: "Soft / Formed" },
  { name: "Mucus", unit: "", min: null, max: null, type: "text", defaultRef: "Nil" },
  { name: "Blood", unit: "", min: null, max: null, type: "text", defaultRef: "Nil" },
  { name: "Reaction / pH", unit: "", min: null, max: null, type: "text", defaultRef: "Neutral / Alkaline" },
  { name: "Occult Blood Test (OBT)", unit: "", min: null, max: null, type: "qualitative", defaultRef: "Negative" },
  { name: "Reducing Substance", unit: "", min: null, max: null, type: "qualitative", defaultRef: "Negative / Nil" },
  { name: "Pus Cells", unit: "/HPF", min: 0, max: 2, type: "text", defaultRef: "0 - 2 /HPF" },
  { name: "Red Blood Cells (RBC)", unit: "/HPF", min: 0, max: 0, type: "text", defaultRef: "Nil" },
  { name: "Protozoa / Cysts", unit: "", min: null, max: null, type: "text", defaultRef: "Not Found / Nil" },
  { name: "Ova of Helminths", unit: "", min: null, max: null, type: "text", defaultRef: "Not Found / Nil" },
  { name: "Yeast Cells / Fungi", unit: "", min: null, max: null, type: "text", defaultRef: "Nil" },
  { name: "Macrophages", unit: "", min: null, max: null, type: "text", defaultRef: "Nil" }
];

export const MASTER_WIDAL_PARAMETERS = [
  { name: "S. typhi 'O' (TO Titer)", unit: "Titer", min: null, max: null, type: "text", defaultRef: "< 1:80 (Negative)" },
  { name: "S. typhi 'H' (TH Titer)", unit: "Titer", min: null, max: null, type: "text", defaultRef: "< 1:80 (Negative)" },
  { name: "S. paratyphi 'AH' (AH Titer)", unit: "Titer", min: null, max: null, type: "text", defaultRef: "< 1:80 (Negative)" },
  { name: "S. paratyphi 'BH' (BH Titer)", unit: "Titer", min: null, max: null, type: "text", defaultRef: "< 1:80 (Negative)" },
  { name: "Widal Test Impression", unit: "Report", min: null, max: null, type: "text", defaultRef: "Insignificant antibody titer (< 1:80)" }
];

export const MASTER_LIPID_PARAMETERS = [
  { name: "Total Cholesterol", unit: "mg/dL", min: 120, max: 200, type: "numeric", defaultRef: "< 200 (Desirable)" },
  { name: "Triglycerides", unit: "mg/dL", min: 50, max: 150, type: "numeric", defaultRef: "< 150 (Normal)" },
  { name: "HDL Cholesterol", unit: "mg/dL", min: 40, max: 60, type: "numeric", defaultRef: "> 40 (Optimal)" },
  { name: "LDL Cholesterol (Calculated)", unit: "mg/dL", min: 60, max: 100, type: "numeric", defaultRef: "< 100 (Optimal)" },
  { name: "VLDL Cholesterol (Calculated)", unit: "mg/dL", min: 10, max: 30, type: "numeric", defaultRef: "< 30 (Normal)" },
  { name: "Total Chol / HDL Ratio", unit: "", min: 2.5, max: 4.5, type: "numeric", defaultRef: "< 4.5 (Low Risk)" }
];

export const MASTER_LFT_PARAMETERS = [
  { name: "Total Bilirubin", unit: "mg/dL", min: 0.2, max: 1.2, type: "numeric", defaultRef: "0.2 - 1.2" },
  { name: "Direct (Conjugated) Bilirubin", unit: "mg/dL", min: 0.0, max: 0.3, type: "numeric", defaultRef: "0.0 - 0.3" },
  { name: "Indirect (Unconjugated) Bilirubin", unit: "mg/dL", min: 0.1, max: 0.9, type: "numeric", defaultRef: "0.1 - 0.9" },
  { name: "SGPT (ALT)", unit: "U/L", min: 5, max: 45, type: "numeric", defaultRef: "Men: < 45, Women: < 34" },
  { name: "SGOT (AST)", unit: "U/L", min: 5, max: 40, type: "numeric", defaultRef: "Men: < 40, Women: < 32" },
  { name: "Alkaline Phosphatase (ALP)", unit: "U/L", min: 35, max: 130, type: "numeric", defaultRef: "35 - 130" },
  { name: "Total Protein", unit: "g/dL", min: 6.0, max: 8.3, type: "numeric", defaultRef: "6.0 - 8.3" },
  { name: "Serum Albumin", unit: "g/dL", min: 3.5, max: 5.2, type: "numeric", defaultRef: "3.5 - 5.2" },
  { name: "Serum Globulin", unit: "g/dL", min: 2.0, max: 3.5, type: "numeric", defaultRef: "2.0 - 3.5" },
  { name: "A / G Ratio", unit: "", min: 1.1, max: 2.2, type: "numeric", defaultRef: "1.1 - 2.2" }
];

export const MASTER_ELECTROLYTE_PARAMETERS = [
  { name: "Serum Sodium (Na+)", unit: "mmol/L", min: 135.0, max: 145.0, type: "numeric", defaultRef: "135.0 - 145.0" },
  { name: "Serum Potassium (K+)", unit: "mmol/L", min: 3.5, max: 5.1, type: "numeric", defaultRef: "3.5 - 5.1" },
  { name: "Serum Chloride (Cl-)", unit: "mmol/L", min: 96.0, max: 106.0, type: "numeric", defaultRef: "96.0 - 106.0" },
  { name: "Serum Bicarbonate (HCO3-)", unit: "mmol/L", min: 22.0, max: 29.0, type: "numeric", defaultRef: "22.0 - 29.0" }
];

export const MASTER_SEMEN_PARAMETERS = [
  { name: "Period of Abstinence", unit: "Days", min: 3, max: 7, type: "text", defaultRef: "3 - 5 Days" },
  { name: "Volume", unit: "mL", min: 1.5, max: 5.0, type: "numeric", defaultRef: "≥ 1.5 mL" },
  { name: "Color & Appearance", unit: "", min: null, max: null, type: "text", defaultRef: "Greyish White / Opalescent" },
  { name: "Liquefaction Time", unit: "Minutes", min: 15, max: 30, type: "text", defaultRef: "< 30 Minutes" },
  { name: "Viscosity", unit: "", min: null, max: null, type: "text", defaultRef: "Normal / Moderate" },
  { name: "Reaction / pH", unit: "", min: 7.2, max: 8.0, type: "numeric", defaultRef: "7.2 – 8.0 (Alkaline)" },
  { name: "Total Sperm Count", unit: "million/mL", min: 15.0, max: 200.0, type: "numeric", defaultRef: "≥ 15.0 million/mL" },
  { name: "Rapid Progressive Motility (Grade A)", unit: "%", min: 25, max: 100, type: "numeric", defaultRef: "≥ 25%" },
  { name: "Slow Progressive Motility (Grade B)", unit: "%", min: 10, max: 50, type: "numeric", defaultRef: "Grade A + B ≥ 32%" },
  { name: "Non-Progressive Motility (Grade C)", unit: "%", min: 0, max: 20, type: "numeric", defaultRef: "< 15%" },
  { name: "Immotile Sperm (Grade D)", unit: "%", min: 0, max: 40, type: "numeric", defaultRef: "< 40%" },
  { name: "Normal Sperm Morphology", unit: "%", min: 4, max: 100, type: "numeric", defaultRef: "≥ 4% (Strict Kruger Criteria)" },
  { name: "Pus Cells (WBC)", unit: "/HPF", min: 0, max: 5, type: "text", defaultRef: "< 1 million/mL or 0 - 4 /HPF" }
];

// ==========================================
// 3. DESCRIPTIVE NARRATIVE MASTER TEMPLATES
// ==========================================
export const DESCRIPTIVE_STANDARD_TEMPLATES = {
  radiologyChest: 
`CLINICAL INDICATION: Routine health screening / Respiratory evaluation.
TECHNIQUE: Standard digital chest radiograph (P/A projection).

FINDINGS:
- The bony thorax, thoracic spine, and rib cage appear intact with no fracture.
- Both lung fields are clear with normal vascular markings. No focal consolidation, pneumothorax, or mass lesion detected.
- Cardiac silhouette is normal in shape and transverse diameter (Cardio-thoracic ratio < 0.50).
- Both costophrenic and cardiophrenic angles are sharp and clear.
- Bilateral hemidiaphragms are normal in contour and position.
- Trachea is centrally placed in the midline.

IMPRESSION:
Normal chest radiograph (No acute cardiopulmonary abnormality detected).`,

  usgAbdomen: 
`CLINICAL INDICATION: Abdominal pain / General health assessment.
TECHNIQUE: Real-time high-resolution abdominal sonography with 3.5 MHz curvilinear probe.

FINDINGS:
- LIVER: Normal in size (13.5 cm), smooth surface margin, and homogeneous parenchymal echotexture. No focal solid or cystic space-occupying lesion seen. Intrahepatic biliary radicals are not dilated.
- GALLBLADDER: Normal in size and luminal distension. Wall thickness is normal (< 3 mm). Lumen is clear with no calculus or polyp.
- COMMON BILE DUCT (CBD): Normal in caliber (4.2 mm).
- PANCREAS: Normal size and parenchymal echotexture. Main pancreatic duct is not dilated.
- SPLEEN: Normal in size (9.2 cm) with homogeneous echotexture. No splenomegaly.
- KIDNEYS: Both kidneys are normal in size, shape, position, and cortical thickness. Corticomedullary differentiation is well-maintained. No calculus, hydronephrosis, or space-occupying lesion detected.
- URINARY BLADDER: Well-distended with thin, smooth wall. Lumen is clear.
- PROSTATE / PELVIC ORGANS: Normal anatomical limits for age.
- PERITONEAL CAVITY: No ascites or enlarged retroperitoneal lymphadenopathy seen.

IMPRESSION:
Normal ultrasonographic study of whole abdomen.`,

  histopathology: 
`SPECIMEN: Punch Biopsy / Excisional Tissue Specimen.
CLINICAL HISTORY & SITE: Suspected lesion / Routine biopsy evaluation.

GROSS EXAMINATION:
Received a formalin-fixed tissue biopsy measuring 1.2 x 0.8 x 0.4 cm, greyish-white in color and firm in consistency. Cut surface shows homogeneous tissue. Entire specimen processed in a single cassette.

MICROSCOPIC EXAMINATION:
Sections show tissue fragments lined by stratified squamous epithelium showing unremarkable maturation. The underlying subepithelial stroma shows dense fibrocollagenous tissue with minimal chronic inflammatory infiltrate comprising lymphocytes and plasma cells. No cellular atypia, dysplasia, granuloma, or invasive malignancy identified.

DIAGNOSIS / IMPRESSION:
Benign fibro-epithelial tissue fragments. Negative for malignancy.`,

  fnacCytology: 
`SPECIMEN / SITE: Fine Needle Aspiration Cytology (FNAC) of palpable swelling.
CLINICAL HISTORY: Palpable painless nodule, duration 3 months.

ASPIRATION NOTES:
Using 23G needle, 0.4 ml of greyish aspirate obtained. Multiple smears prepared, air-dried, and stained with MGG and Pap stains.

MICROSCOPIC EXAMINATION:
Smears are cellular and show cohesive clusters and sheets of benign epithelial / follicular cells against a clean background containing colloid and occasional bare nuclei. The cells exhibit uniform round-to-oval nuclei, fine chromatin, and moderate cytoplasm. No atypical, dysplastic, or malignant cells seen.

CYTOLOGICAL OPINION:
Features consistent with benign nodule / hyperplasia. No evidence of malignant cytology.`,

  ecg12Lead: 
`CLINICAL INDICATION: Chest discomfort / Pre-operative evaluation.
TECHNIQUE: Standard 12-lead resting electrocardiogram (25 mm/sec, 10 mm/mV).

FINDINGS:
- Rhythm: Regular Sinus Rhythm
- Heart Rate: 72 beats per minute
- P Wave: Normal duration and morphology (0.08 sec)
- P-R Interval: 0.16 seconds (Normal: 0.12 - 0.20 sec)
- QRS Complex: 0.08 seconds (Normal: 0.06 - 0.10 sec)
- Axis: Normal QRS electrical axis (+45°)
- ST Segment: Isoelectric across all limb and precordial leads
- T Wave: Normal orientation and amplitude
- QTc Interval: 410 ms (Normal: < 440 ms)

IMPRESSION:
Normal 12-Lead Electrocardiogram. No ischemic ST-T changes or arrhythmias detected.`
};

// ==========================================
// 4. SILENT SEEDERS & MASTER DATA
// ==========================================

async function ensureSilentSeedProfile(testId, code, name, deptId, price, sampleType, tubeColor, paramList, existingTests = [], reportType = "tabular") {
  const existing = existingTests.find(
    (t) => t.id === testId || (t.code || "").toUpperCase() === code.toUpperCase() || (t.name || "").toLowerCase() === name.toLowerCase()
  );

  const existingParams = existing ? (existing.test_parameters || existing.parameters || []) : [];
  if (existing && existingParams.length >= paramList.length) {
    return existingTests;
  }

  const targetId = existing?.id || testId;

  try {
    await supabase.from("tests").upsert({
      id: targetId,
      code: code,
      name: name,
      dept_id: deptId,
      price: price,
      sample_type: sampleType,
      tube_color: tubeColor,
      is_profile: reportType === "tabular",
      report_type: reportType,
      is_available: true
    });

    if (existingParams.length < paramList.length) {
      await supabase.from("test_parameters").delete().eq("test_id", targetId);
    }

    const paramRows = paramList.map((p, idx) => ({
      id: `P-${code}-${String(idx + 1).padStart(2, "0")}`,
      test_id: targetId,
      name: p.name,
      param_type: p.type === "qualitative" ? "qualitative" : (p.type === "text" ? "text" : "numeric"),
      unit: p.unit || "",
      min_range: p.min !== null && p.min !== undefined ? p.min : null,
      max_range: p.max !== null && p.max !== undefined ? p.max : null,
      reference_text: p.defaultRef || p.template_text || null
    }));

    await supabase.from("test_parameters").insert(paramRows);

    const { data: updated } = await supabase.from("tests").select("*, test_parameters(*)").eq("id", targetId).single();
    if (updated) {
      return [updated, ...existingTests.filter((t) => t.id !== targetId)];
    }
  } catch (err) {
    console.warn(`Silent seeder notice for ${code}:`, err.message);
  }

  const inMemory = {
    id: targetId,
    code: code,
    name: name,
    dept_id: deptId,
    price: price,
    sample_type: sampleType,
    tube_color: tubeColor,
    is_profile: reportType === "tabular",
    report_type: reportType,
    is_available: true,
    test_parameters: paramList.map((p, idx) => ({
      id: `P-${code}-${String(idx + 1).padStart(2, "0")}`,
      test_id: targetId,
      name: p.name,
      param_type: p.type,
      unit: p.unit || "",
      min_range: p.min,
      max_range: p.max,
      reference_text: p.defaultRef || p.template_text || null
    }))
  };

  return [inMemory, ...existingTests.filter((t) => (t.code || "").toUpperCase() !== code.toUpperCase())];
}

export async function getMasterData() {
  try {
    const { data: departments } = await supabase.from("departments").select("*");
    const { data: tests } = await supabase.from("tests").select("*, test_parameters(*)").order("name");

    let finalDepts = departments && departments.length > 0 ? departments : [...DEFAULT_DEPARTMENTS];
    DEFAULT_DEPARTMENTS.forEach((defDept) => {
      if (!finalDepts.some((d) => d.id === defDept.id)) finalDepts.push(defDept);
    });

    let currentTests = tests || [];

    // Quantitative Profiles
    currentTests = await ensureSilentSeedProfile(
      "T-CBC-5PART", "CBC", "Complete Blood Count (CBC) with 5-Part Differential",
      "DEP-HEM", 400, "Whole Blood", "Purple / Lavender (EDTA)", MASTER_CBC_PARAMETERS, currentTests, "tabular"
    );

    currentTests = await ensureSilentSeedProfile(
      "T-URINE-RME", "URINE-RME", "Urine Routine & Microscopic Examination (R/M/E)",
      "DEP-PAT", 250, "Clean Catch Urine", "Sterile Urine Cup", MASTER_URINE_PARAMETERS, currentTests, "tabular"
    );

    currentTests = await ensureSilentSeedProfile(
      "T-STOOL-RE", "STOOL-RE", "Stool Routine Examination (R/E)",
      "DEP-PAT", 250, "Fresh Stool", "Sterile Urine Cup", MASTER_STOOL_PARAMETERS, currentTests, "tabular"
    );

    currentTests = await ensureSilentSeedProfile(
      "T-WIDAL", "WIDAL", "Widal Test (Typhoid Serology)",
      "DEP-MIC", 350, "Serum", "Red / Yellow (SST / Plain Clot)", MASTER_WIDAL_PARAMETERS, currentTests, "tabular"
    );

    currentTests = await ensureSilentSeedProfile(
      "T-LIPID", "LIPID", "Lipid Profile (Full Fasting Panel)",
      "DEP-BIO", 900, "Serum", "Red / Yellow (SST / Plain Clot)", MASTER_LIPID_PARAMETERS, currentTests, "tabular"
    );

    currentTests = await ensureSilentSeedProfile(
      "T-LFT", "LFT", "Liver Function Test (LFT Panel)",
      "DEP-BIO", 1000, "Serum", "Red / Yellow (SST / Plain Clot)", MASTER_LFT_PARAMETERS, currentTests, "tabular"
    );

    currentTests = await ensureSilentSeedProfile(
      "T-ELECTROLYTES", "ELECTROLYTES", "Serum Electrolytes (Na+, K+, Cl-, HCO3-)",
      "DEP-BIO", 800, "Serum", "Red / Yellow (SST / Plain Clot)", MASTER_ELECTROLYTE_PARAMETERS, currentTests, "tabular"
    );

    currentTests = await ensureSilentSeedProfile(
      "T-SEMEN", "SEMEN-RE", "Semen Routine & Morphological Analysis",
      "DEP-PAT", 600, "Fresh Specimen", "Sterile Urine Cup", MASTER_SEMEN_PARAMETERS, currentTests, "tabular"
    );

    // Descriptive Investigations (With built-in narrative templates)
    currentTests = await ensureSilentSeedProfile(
      "T-XRAY-CHEST", "XRAY-CHEST", "X-Ray Chest (P/A View)",
      "DEP-RAD", 500, "Radiological Study", "No Specimen (Imaging)",
      [{ name: "Chest Radiography Findings", type: "text", unit: "Report", defaultRef: DESCRIPTIVE_STANDARD_TEMPLATES.radiologyChest }],
      currentTests, "descriptive"
    );

    currentTests = await ensureSilentSeedProfile(
      "T-USG-ABD", "USG-ABD", "USG of Whole Abdomen",
      "DEP-USG", 1500, "Ultrasound Protocol", "No Specimen (Imaging)",
      [{ name: "Abdominal Sonography Findings", type: "text", unit: "Report", defaultRef: DESCRIPTIVE_STANDARD_TEMPLATES.usgAbdomen }],
      currentTests, "descriptive"
    );

    currentTests = await ensureSilentSeedProfile(
      "T-ECG-12", "ECG-12", "12-Lead Electrocardiogram (ECG)",
      "DEP-CARD", 350, "12-Lead Tracing", "No Specimen (Imaging)",
      [{ name: "Electrocardiogram Findings", type: "text", unit: "Tracing", defaultRef: DESCRIPTIVE_STANDARD_TEMPLATES.ecg12Lead }],
      currentTests, "descriptive"
    );

    currentTests = await ensureSilentSeedProfile(
      "T-HISTO-BX", "HISTO-BX", "Histopathology (Biopsy Examination)",
      "DEP-HISTO", 1800, "Biopsy Specimen", "Sterile Container with 10% Formalin",
      [{ name: "Histopathological Examination Findings", type: "text", unit: "Report", defaultRef: DESCRIPTIVE_STANDARD_TEMPLATES.histopathology }],
      currentTests, "descriptive"
    );

    currentTests = await ensureSilentSeedProfile(
      "T-FNAC", "FNAC", "Fine Needle Aspiration Cytology (FNAC)",
      "DEP-HISTO", 1200, "Aspiration Smear", "Fixed Glass Slides",
      [{ name: "Cytological Examination Findings", type: "text", unit: "Report", defaultRef: DESCRIPTIVE_STANDARD_TEMPLATES.fnacCytology }],
      currentTests, "descriptive"
    );

    return { 
      departments: finalDepts, 
      tests: currentTests || [] 
    };
  } catch (err) {
    console.error("Master data fetch error:", err);
    return { departments: DEFAULT_DEPARTMENTS, tests: [] };
  }
}

// 1-Click Seed Standard Radiology & Modality Catalog
export async function seedRadiologyCatalog() {
  const radiologyDepts = [
    { id: "DEP-RAD", name: "Radiology & X-Ray", icon: "🩻" },
    { id: "DEP-USG", name: "Ultrasonography (USG)", icon: "📡" },
    { id: "DEP-CTMRI", name: "CT Scan & MRI Imaging", icon: "🧠" },
    { id: "DEP-CARD", name: "Cardiology (ECG & Echo)", icon: "💓" }
  ];

  for (const dept of radiologyDepts) {
    try {
      await supabase.from("departments").upsert(dept);
    } catch (e) {}
  }

  const radiologyTests = [
    {
      code: "XRAY-CHEST",
      name: "X-Ray Chest (P/A View)",
      deptId: "DEP-RAD",
      price: "500",
      sampleType: "Radiological Study",
      tubeColor: "No Specimen (Imaging)",
      isProfile: false,
      reportType: "descriptive",
      parameters: [{ name: "Chest Radiography Findings", param_type: "text", unit: "Report", reference_text: DESCRIPTIVE_STANDARD_TEMPLATES.radiologyChest }]
    },
    {
      code: "USG-ABD",
      name: "USG of Whole Abdomen",
      deptId: "DEP-USG",
      price: "1500",
      sampleType: "Ultrasound Protocol",
      tubeColor: "No Specimen (Imaging)",
      isProfile: false,
      reportType: "descriptive",
      parameters: [{ name: "Abdominal Sonography Findings", param_type: "text", unit: "Report", reference_text: DESCRIPTIVE_STANDARD_TEMPLATES.usgAbdomen }]
    },
    {
      code: "CT-BRAIN",
      name: "CT Scan of Brain",
      deptId: "DEP-CTMRI",
      price: "4500",
      sampleType: "Non-Contrast CT Head",
      tubeColor: "No Specimen (Imaging)",
      isProfile: false,
      reportType: "descriptive",
      parameters: [{ name: "Cranial CT Observations", param_type: "text", unit: "Report", reference_text: "CLINICAL INDICATION: Headache / Neurological deficit.\nTECHNIQUE: Axial non-contrast CT sections.\n\nFINDINGS:\n- Normal parenchymal density across cerebral and cerebellar hemispheres.\n- Ventricles and sulci are normal for age.\n- No evidence of acute hemorrhage, territorial infarct, or mass effect.\n\nIMPRESSION:\nNormal Brain CT Scan." }]
    },
    {
      code: "ECG-12",
      name: "12-Lead Electrocardiogram (ECG)",
      deptId: "DEP-CARD",
      price: "350",
      sampleType: "12-Lead Tracing",
      tubeColor: "No Specimen (Imaging)",
      isProfile: false,
      reportType: "descriptive",
      parameters: [{ name: "Electrocardiogram Findings", param_type: "text", unit: "Tracing", reference_text: DESCRIPTIVE_STANDARD_TEMPLATES.ecg12Lead }]
    }
  ];

  const addedTests = [];
  for (const t of radiologyTests) {
    try {
      const created = await createNewTestWithParameters(t);
      if (created) addedTests.push(created);
    } catch (e) {}
  }

  return addedTests;
}

// ==========================================
// 5. DOCTOR MANAGEMENT
// ==========================================
export async function getDoctorsList() {
  try {
    const { data, error } = await supabase.from("doctors").select("*").order("name");
    if (!error && data && data.length > 0) {
      try { localStorage.setItem("apex_local_doctors", JSON.stringify(data)); } catch (e) {}
      return data;
    }
  } catch (e) {}

  try {
    const local = JSON.parse(localStorage.getItem("apex_local_doctors") || "[]");
    if (local.length > 0) return local;
  } catch (e) {}

  const defaultDoctors = [
    { id: "DOC-001", name: "Prof. Dr. M. A. Rahman", degrees: "MBBS, FCPS (Medicine)", chamber: "Dhaka Medical College Hospital", phone: "01711000001" },
    { id: "DOC-002", name: "Dr. Farhana Yasmin", degrees: "MBBS, DGO, MCPS (Gyne & Obs)", chamber: "Popular Diagnostic Center", phone: "01819000002" },
    { id: "DOC-003", name: "Dr. K. S. Hossain", degrees: "MBBS, MD (Cardiology)", chamber: "National Heart Foundation", phone: "01912000003" }
  ];
  try { localStorage.setItem("apex_local_doctors", JSON.stringify(defaultDoctors)); } catch (e) {}
  return defaultDoctors;
}

export async function createOrUpdateDoctor(docData) {
  const docId = docData.id || `DOC-${Math.floor(100 + Math.random() * 900)}`;
  const row = {
    id: docId,
    name: docData.name,
    degrees: docData.degrees || "",
    designation: docData.designation || "",
    chamber: docData.chamber || "",
    phone: docData.phone || "",
    email: docData.email || ""
  };

  try { await supabase.from("doctors").upsert(row); } catch (e) {}
  try {
    const local = JSON.parse(localStorage.getItem("apex_local_doctors") || "[]");
    const updated = [row, ...local.filter((d) => d.id !== docId)];
    localStorage.setItem("apex_local_doctors", JSON.stringify(updated));
  } catch (e) {}

  return row;
}

export async function deleteDoctor(docId) {
  try { await supabase.from("doctors").delete().eq("id", docId); } catch (e) {}
  try {
    const local = JSON.parse(localStorage.getItem("apex_local_doctors") || "[]");
    localStorage.setItem("apex_local_doctors", JSON.stringify(local.filter((d) => d.id !== docId)));
  } catch (e) {}
}

// ==========================================
// 6. PATIENT SEARCH & HISTORY
// ==========================================
export async function searchPatients(query) {
  if (!query || query.trim().length < 2) return [];
  const cleanQ = query.trim().toLowerCase();
  
  try {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .or(`id.ilike.%${cleanQ}%,phone.ilike.%${cleanQ}%,name.ilike.%${cleanQ}%`)
      .limit(10);
    if (!error && data) return data;
  } catch (err) {}

  try {
    const local = JSON.parse(localStorage.getItem("apex_local_patients") || "[]");
    return local.filter((p) => 
      (p.id && p.id.toLowerCase().includes(cleanQ)) ||
      (p.phone && p.phone.includes(cleanQ)) ||
      (p.name && p.name.toLowerCase().includes(cleanQ))
    );
  } catch (e) {
    return [];
  }
}

export async function getPatientHistory(patientId) {
  if (!patientId) return [];
  try {
    const { data, error } = await supabase
      .from("orders")
      .select(`*, order_tests(*, test:tests(*, test_parameters(*))), results(*)`)
      .eq("patient_id", patientId)
      .order("order_date", { ascending: false });
    if (!error && data) return data;
  } catch (err) {}

  try {
    const local = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
    return local.filter((o) => o.patient_id === patientId || o.patient?.id === patientId);
  } catch (e) {
    return [];
  }
}

// ==========================================
// 7. PAGINATED ORDERS QUERY
// ==========================================
export async function getOrdersPaginated({ page = 1, pageSize = 20, dateFrom = "", dateTo = "", searchQuery = "" }) {
  const fromIndex = (page - 1) * pageSize;
  const toIndex = fromIndex + pageSize - 1;

  try {
    let query = supabase.from("orders").select(`
      *,
      patient:patients(*),
      order_tests(*, test:tests(*, test_parameters(*))),
      results(*)
    `, { count: "exact" });

    if (dateFrom && dateTo) {
      if (dateFrom === dateTo) query = query.eq("order_date", dateFrom);
      else query = query.gte("order_date", dateFrom).lte("order_date", dateTo);
    } else if (dateFrom) query = query.gte("order_date", dateFrom);
    else if (dateTo) query = query.lte("order_date", dateTo);

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      query = query.or(`barcode.ilike.%${q}%,patient_id.ilike.%${q}%,id.ilike.%${q}%`);
    }

    query = query
      .order("order_date", { ascending: false })
      .order("id", { ascending: false })
      .range(fromIndex, toIndex);

    const { data, count, error } = await query;

    if (!error && data) {
      return { orders: data, totalCount: count || 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
    }
  } catch (err) {
    console.warn("Paginated orders fetch notice:", err.message);
  }

  try {
    let fallback = supabase.from("orders").select("*, patient:patients(*)", { count: "exact" });
    if (dateFrom) fallback = fallback.gte("order_date", dateFrom);
    if (dateTo) fallback = fallback.lte("order_date", dateTo);

    const { data, count } = await fallback
      .order("order_date", { ascending: false })
      .order("id", { ascending: false })
      .range(fromIndex, toIndex);

    return {
      orders: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (e) {
    return { orders: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 1 };
  }
}

export async function getAllOrders() {
  let ordersList = [];

  try {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        patient:patients(*),
        order_tests(*, test:tests(*, test_parameters(*))),
        results(*)
      `)
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("order_date", { ascending: false });

    if (!error && data && data.length > 0) {
      ordersList = data;
    }
  } catch (e) {}

  try {
    const localCached = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
    if (localCached.length > 0) {
      const existingIds = new Set(ordersList.map((o) => o.id || o.orderId));
      const unmerged = localCached.filter((lo) => !existingIds.has(lo.id || lo.orderId));
      ordersList = [...unmerged, ...ordersList];
    }
  } catch (e) {}

  return ordersList.sort((a, b) => {
    const timeA = new Date(a.created_at || a.createdAt || a.order_date || a.date).getTime() || 0;
    const timeB = new Date(b.created_at || b.createdAt || b.order_date || b.date).getTime() || 0;
    return timeB - timeA;
  });
}

// ==========================================
// 8. ORDER CREATION WITH MULTI-VIALS
// ==========================================
export async function createNewOrder({ patientData, testIds, discount, netPayable, paidAmount, dueAmount, testCatalog = [] }) {
  const patientId = patientData.id && patientData.id.trim() 
    ? patientData.id.trim() 
    : `P-${Math.floor(1000 + Math.random() * 9000)}`;

  const selectedTests = testCatalog.filter((t) => testIds.includes(t.id));

  const departmentVials = [];
  selectedTests.forEach((t) => {
    let deptId = (t.dept_id || t.deptId || "").toUpperCase();
    const code = (t.code || "").toUpperCase();
    const name = (t.name || "").toUpperCase();

    if (!deptId || deptId === "DEP-GEN") {
      if (code.includes("CBC") || name.includes("BLOOD COUNT")) deptId = "DEP-HEM";
      else if (code.includes("XRAY") || name.includes("X-RAY")) deptId = "DEP-RAD";
      else if (code.includes("USG") || name.includes("ULTRASO")) deptId = "DEP-USG";
      else if (code.includes("ECG")) deptId = "DEP-CARD";
      else if (code.includes("URINE") || code.includes("STOOL")) deptId = "DEP-PAT";
      else if (code.includes("HISTO") || code.includes("FNAC") || code.includes("BX")) deptId = "DEP-HISTO";
      else deptId = "DEP-BIO";
    }

    const deptCode = deptId.replace("DEP-", "").replace("-CBC", "");
    let tubeColor = (t.tube_color || t.tubeColor || "Standard").trim();
    if (tubeColor === "Standard") {
      if (deptCode.includes("HEM")) tubeColor = "Purple / Lavender (EDTA)";
      else if (deptCode.includes("RAD") || deptCode.includes("USG") || deptCode.includes("CARD")) tubeColor = "Imaging Requisition";
      else if (deptCode.includes("HISTO")) tubeColor = "Formalin Container";
      else if (deptCode.includes("PAT") && name.includes("URINE")) tubeColor = "Sterile Urine Cup";
      else tubeColor = "Red / Yellow (SST / Plain Clot)";
    }
    const tubeShort = tubeColor.split(" ")[0];
    const key = `${deptCode}-${tubeShort}`;

    if (!departmentVials.some((v) => v.key === key)) {
      departmentVials.push({ 
        key, 
        deptId: deptId, 
        deptCode: deptCode, 
        tubeColor: tubeColor, 
        testIds: [t.id, t.code, t.name],
        testNames: [t.code || t.name]
      });
    } else {
      const existing = departmentVials.find((v) => v.key === key);
      existing.testIds.push(t.id, t.code, t.name);
      existing.testNames.push(t.code || t.name);
    }
  });

  const vialsCount = Math.max(1, departmentVials.length);
  const assignedBarcodes = await getNextSequentialBarcode(vialsCount);
  const barcodeList = Array.isArray(assignedBarcodes) ? assignedBarcodes : [assignedBarcodes];

  departmentVials.forEach((v, i) => {
    v.barcode = barcodeList[i];
    v.testBarcode = barcodeList[i];
  });

  const primaryBarcode = barcodeList[0];
  const now = new Date();
  const nowIso = now.toISOString();
  const todayDate = nowIso.slice(0, 10);
  const todayCompact = todayDate.replace(/-/g, "");
  
  const orderId = `ORD-${todayCompact.slice(2)}-${primaryBarcode.slice(-4)}`;
  const receiptNo = `RCP-${todayCompact.slice(4)}-${primaryBarcode.slice(-4)}`;
  const referringDoctor = (patientData.doctor && patientData.doctor.trim()) ? patientData.doctor.trim() : "Self";

  const patientRow = {
    id: patientId,
    name: patientData.name,
    age: parseInt(patientData.age) || 0,
    gender: patientData.gender || "Other",
    phone: patientData.phone || "N/A",
    address: `Ref: ${referringDoctor}`
  };
  try { await supabase.from("patients").upsert(patientRow); } catch (e) {}

  const subTotal = selectedTests.reduce((acc, t) => acc + parseFloat(t.price || 0), 0);
  const finalDiscountPercent = discount || 0;
  const calculatedNet = subTotal - (subTotal * finalDiscountPercent) / 100;
  const finalNet = netPayable !== undefined ? parseFloat(netPayable) : calculatedNet;
  const finalPaid = paidAmount !== undefined ? parseFloat(paidAmount) : finalNet;
  const finalDue = dueAmount !== undefined ? parseFloat(dueAmount) : Math.max(0, finalNet - finalPaid);

  const orderRow = {
    id: orderId,
    patient_id: patientId,
    barcode: primaryBarcode,
    order_date: todayDate,
    created_at: nowIso,
    subtotal: subTotal,
    discount_percent: finalDiscountPercent,
    net_payable: finalNet,
    paid_amount: finalPaid,
    due_amount: finalDue,
    sample_status: "Order Created",
    qc_status: "Pending",
    is_locked: false
  };
  try { await supabase.from("orders").insert(orderRow); } catch (e) {}

  if (testIds && testIds.length > 0) {
    const orderTestRows = testIds.map((tid) => ({ order_id: orderId, test_id: tid }));
    try { await supabase.from("order_tests").insert(orderTestRows); } catch (e) {}
  }

  const completeOrder = {
    ...orderRow,
    orderId: orderId,
    date: todayDate,
    createdAt: nowIso,
    created_at: nowIso,
    barcode: primaryBarcode,
    doctor: referringDoctor,
    receiptNo: receiptNo,
    patient: {
      id: patientId,
      name: patientData.name,
      age: patientData.age,
      gender: patientData.gender,
      phone: patientData.phone,
      doctor: referringDoctor,
      address: `Ref: ${referringDoctor}`
    },
    tests: selectedTests,
    vials: departmentVials,
    order_tests: selectedTests.map((t) => ({ test_id: t.id, test: t })),
    billing: { subTotal, discount: finalDiscountPercent, netPayable: finalNet, paid: finalPaid, due: finalDue },
    results: {},
    qcStatus: "Pending",
    isLocked: false,
    verifierRemarks: ""
  };

  try {
    const local = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
    localStorage.setItem("apex_local_orders", JSON.stringify([completeOrder, ...local.filter(o => o.orderId !== orderId && o.id !== orderId)]));
  } catch (e) {}

  return completeOrder;
}

// ==========================================
// 9. SETTLE DUE & RESULT ENTRY
// ==========================================
export async function settleOrderDue(orderId, collectedAmount) {
  const amountToClear = parseFloat(collectedAmount) || 0;
  const { data: currentOrd } = await supabase.from("orders").select("paid_amount, due_amount").eq("id", orderId).single();

  let newPaid = amountToClear;
  let newDue = 0;
  if (currentOrd) {
    const prevPaid = parseFloat(currentOrd.paid_amount) || 0;
    const prevDue = parseFloat(currentOrd.due_amount) || 0;
    newPaid = prevPaid + Math.min(amountToClear, prevDue);
    newDue = Math.max(0, prevDue - amountToClear);
  }

  await supabase.from("orders").update({ paid_amount: newPaid, due_amount: newDue }).eq("id", orderId);
  return { newPaid, newDue };
}

export async function saveTestResult(orderId, parameterId, resultValue, statusFlag = "ENTERED") {
  if (!orderId || !parameterId || String(parameterId).trim() === "" || parameterId === "undefined") {
    return null;
  }

  const cleanValue = (
    resultValue === undefined || 
    resultValue === null || 
    String(resultValue).trim() === "undefined" || 
    String(resultValue).trim() === "null"
  ) ? "" : String(resultValue).trim();

  const { data, error } = await supabase
    .from("results")
    .upsert({ 
      order_id: orderId, 
      parameter_id: String(parameterId).trim(), 
      result_value: cleanValue, 
      status_flag: statusFlag 
    }, { onConflict: "order_id,parameter_id" });

  if (error) throw error;
  return data;
}

export async function verifyAndLockOrder(orderId, verifierRemarks, verifiedByName) {
  const { data, error } = await supabase
    .from("orders")
    .update({ 
      qc_status: "Verified", 
      sample_status: "Verified", 
      is_locked: true, 
      verifier_remarks: verifierRemarks, 
      verified_at: new Date().toISOString() 
    })
    .eq("id", orderId);
  if (error) throw error;
  return data;
}

// ==========================================
// 10. REJECTION & RECOLLECTION WORKFLOW
// ==========================================
export async function requestSampleRecollection(orderId, reason = "Hemolyzed Specimen", remarks = "") {
  const fullRemarks = `[RECOLLECTION REQUIRED: ${reason}] ${remarks}`.trim();
  const targetId = String(orderId || "").trim();

  try {
    const { error } = await supabase
      .from("orders")
      .update({
        sample_status: "Repeat Collection Required",
        qc_status: "Pending",
        verifier_remarks: fullRemarks
      })
      .eq("id", targetId);

    if (error) {
      await supabase.from("orders").update({ verifier_remarks: fullRemarks }).eq("id", targetId);
    }
  } catch (err) {
    console.warn("Supabase notice on reject:", err);
  }

  try {
    const local = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
    const updated = local.map((o) =>
      (o.id === targetId || o.orderId === targetId || o.barcode === targetId)
        ? {
            ...o,
            sample_status: "Repeat Collection Required",
            sampleStatus: "Repeat Collection Required",
            qc_status: "Pending",
            qcStatus: "Pending",
            verifier_remarks: fullRemarks,
            verifierRemarks: fullRemarks
          }
        : o
    );
    localStorage.setItem("apex_local_orders", JSON.stringify(updated));
  } catch (e) {}

  return { fullRemarks };
}

export async function markSampleRecollected(orderId) {
  const cleanRemarks = "New sample recollected. Clinically correlated and verified with quality control standards.";
  const targetId = String(orderId || "").trim();

  try {
    const { error } = await supabase
      .from("orders")
      .update({
        sample_status: "Sample Recollected",
        verifier_remarks: cleanRemarks
      })
      .eq("id", targetId);

    if (error) {
      await supabase.from("orders").update({ verifier_remarks: cleanRemarks }).eq("id", targetId);
    }
  } catch (err) {
    console.warn("Supabase notice for recollection:", err);
  }

  try {
    const local = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
    const updated = local.map((o) =>
      (o.id === targetId || o.orderId === targetId || o.barcode === targetId)
        ? {
            ...o,
            sample_status: "Sample Recollected",
            sampleStatus: "Sample Recollected",
            verifierRemarks: cleanRemarks,
            verifier_remarks: cleanRemarks
          }
        : o
    );
    localStorage.setItem("apex_local_orders", JSON.stringify(updated));
  } catch (e) {}

  return { cleanRemarks };
}

// ==========================================
// 11. TEST CATALOG CRUD & TEMPLATE SUPPORT
// ==========================================
export async function toggleTestAvailability(testId, isAvailable) {
  const { data, error } = await supabase
    .from("tests")
    .update({ is_available: isAvailable })
    .eq("id", testId);

  if (error) throw error;
  return data;
}

export async function createNewTestWithParameters(testData) {
  const testId = `T-${testData.code.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

  const isDescriptive = testData.reportType === "descriptive" || 
    (testData.parameters || []).some(p => p.param_type === "text" || p.param_type === "descriptive");

  const testPayload = {
    id: testId,
    code: testData.code.trim().toUpperCase(),
    name: testData.name.trim(),
    dept_id: testData.deptId || testData.dept_id || "DEP-BIO",
    price: parseFloat(testData.price) || 0,
    sample_type: testData.sampleType || testData.sample_type || "Serum",
    tube_color: testData.tubeColor || testData.tube_color || "Red / Yellow (SST / Plain Clot)",
    is_profile: isDescriptive ? false : Boolean(testData.isProfile || testData.is_profile),
    is_available: testData.is_available !== undefined ? testData.is_available : true
  };

  let test = null;
  try {
    const { data, error: tErr } = await supabase.from("tests").insert({ ...testPayload, report_type: isDescriptive ? "descriptive" : "tabular" }).select().single();
    if (!tErr) test = data;
    else throw tErr;
  } catch (e) {
    const { data: fallbackData } = await supabase.from("tests").insert(testPayload).select().single();
    test = fallbackData || testPayload;
  }

  if (testData.parameters && testData.parameters.length > 0) {
    const paramRows = testData.parameters
      .filter((p) => p.name && p.name.trim() !== "")
      .map((p, idx) => {
        const minVal = p.min !== "" && p.min !== null && p.min !== undefined && !isNaN(parseFloat(p.min)) ? parseFloat(p.min) : null;
        const maxVal = p.max !== "" && p.max !== null && p.max !== undefined && !isNaN(parseFloat(p.max)) ? parseFloat(p.max) : null;
        const refText = (p.reference_text || p.ref_text || p.default_template || p.template_text || "").trim();

        let safeType = p.param_type || "numeric";
        if (safeType === "multirange") safeType = "numeric";
        if (safeType === "descriptive") safeType = "text";

        return {
          id: `P-${testId}-${idx + 1}`,
          test_id: testId,
          name: p.name.trim(),
          param_type: safeType,
          unit: (p.unit || "").trim(),
          min_range: minVal,
          max_range: maxVal,
          reference_text: refText || null
        };
      });

    if (paramRows.length > 0) {
      const { error: insErr } = await supabase.from("test_parameters").insert(paramRows);
      if (insErr) {
        const safeRows = paramRows.map(({ reference_text, ...rest }) => rest);
        await supabase.from("test_parameters").insert(safeRows);
      }
    }
  }

  return test;
}

export async function updateExistingTest(testId, testData) {
  const isDescriptive = testData.reportType === "descriptive" || 
    (testData.parameters || []).some(p => p.param_type === "text" || p.param_type === "descriptive");

  const testPayload = {
    code: testData.code.trim().toUpperCase(),
    name: testData.name.trim(),
    dept_id: testData.deptId || testData.dept_id || "DEP-BIO",
    price: parseFloat(testData.price) || 0,
    sample_type: testData.sampleType || testData.sample_type || "Serum",
    tube_color: testData.tubeColor || testData.tube_color || "Red / Yellow (SST / Plain Clot)",
    is_profile: isDescriptive ? false : Boolean(testData.isProfile || testData.is_profile),
    is_available: testData.is_available !== undefined ? testData.is_available : true
  };

  try {
    await supabase.from("tests").update({ ...testPayload, report_type: isDescriptive ? "descriptive" : "tabular" }).eq("id", testId);
  } catch (e) {
    await supabase.from("tests").update(testPayload).eq("id", testId);
  }

  const validParams = (testData.parameters || []).filter((p) => p.name && p.name.trim() !== "");

  if (validParams.length > 0) {
    const paramRows = validParams.map((p, idx) => {
      const rawMin = p.min !== undefined && p.min !== "" ? p.min : p.min_range;
      const rawMax = p.max !== undefined && p.max !== "" ? p.max : p.max_range;
      const minVal = rawMin !== "" && rawMin !== null && rawMin !== undefined && !isNaN(parseFloat(rawMin)) ? parseFloat(rawMin) : null;
      const maxVal = rawMax !== "" && rawMax !== null && rawMax !== undefined && !isNaN(parseFloat(rawMax)) ? parseFloat(rawMax) : null;
      const refText = (p.reference_text || p.ref_text || p.default_template || p.template_text || "").trim();

      const existingId = p.id && String(p.id).startsWith("P-") ? p.id : `P-${testId}-${idx + 1}-${Date.now().toString().slice(-4)}`;

      let safeType = p.param_type || "numeric";
      if (safeType === "multirange") safeType = "numeric";
      if (safeType === "descriptive") safeType = "text";

      return {
        id: existingId,
        test_id: testId,
        name: p.name.trim(),
        param_type: safeType,
        unit: (p.unit || "").trim(),
        min_range: minVal,
        max_range: maxVal,
        reference_text: refText || null
      };
    });

    await supabase.from("test_parameters").delete().eq("test_id", testId);
    const { error: insErr } = await supabase.from("test_parameters").insert(paramRows);
    if (insErr) {
      const safeRows = paramRows.map(({ reference_text, ...rest }) => rest);
      await supabase.from("test_parameters").insert(safeRows);
    }
  }
}

export async function deleteTest(testId) {
  await supabase.from("order_tests").delete().eq("test_id", testId);
  await supabase.from("test_parameters").delete().eq("test_id", testId);
  await supabase.from("tests").delete().eq("id", testId);
}

// ==========================================
// 12. STAFF & LAB SETTINGS
// ==========================================
export async function getStaffUsers() {
  try {
    const { data } = await supabase.from("users").select("*").order("created_at");
    if (data && data.length > 0) {
      try { localStorage.setItem("apex_local_staff", JSON.stringify(data)); } catch (e) {}
      return data;
    }
  } catch (e) {}

  try {
    const local = JSON.parse(localStorage.getItem("apex_local_staff") || "[]");
    if (local.length > 0) return local;
  } catch (e) {}
  return [];
}

export async function registerStaffUser(userData) {
  const staffRow = {
    full_name: userData.fullName,
    email: userData.email,
    password: userData.password,
    role: userData.role,
    designation: userData.designation,
    signature_data: userData.signatureData || userData.fullName,
    is_active: true
  };
  const { data } = await supabase.from("users").insert(staffRow).select().single();
  
  try {
    const local = JSON.parse(localStorage.getItem("apex_local_staff") || "[]");
    localStorage.setItem("apex_local_staff", JSON.stringify([data || staffRow, ...local]));
  } catch (e) {}

  return data;
}

export async function deleteStaffUser(userId) {
  await supabase.from("users").delete().eq("id", userId);
}

export const DEFAULT_LAB_SETTINGS = {
  id: "MAIN_SETTINGS",
  lab_name: "AL FATTAH DIAGNOSTIC & CONSULTATION CENTER",
  tagline: "With Al-Fattah on the Journey to Wellness",
  address: "Solmaid Purbo Para, Panir pump, Vatara, Dhaka 1212",
  phone: "01723854472, 01624787444",
  email: "alfattahdiagnostic@gmail.com",
  website: "www.alfattahlab.com",
  logo_data: "",
  header_bg: "#20122e",
  header_color: "#ffffff",
  receipt_footer: "Please scan the QR code to check real-time report status & download results.",
  report_footer: "",
  report_layout: null
};

export function getLocalReportLayout() {
  try {
    const raw = localStorage.getItem("apex_report_layout");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.header?.elements && parsed?.footer?.elements) {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

export async function getLabSettings() {
  const localLayout = getLocalReportLayout();

  try {
    const { data, error } = await supabase
      .from("lab_settings")
      .select("*")
      .eq("id", "MAIN_SETTINGS")
      .maybeSingle();

    if (!error && data && data.lab_name) {
      const resolvedLayout = data.report_layout || localLayout || DEFAULT_LAB_SETTINGS.report_layout;
      const mergedData = { ...data, report_layout: resolvedLayout };

      try {
        localStorage.setItem("apex_lab_settings", JSON.stringify(mergedData));
        if (resolvedLayout) {
          localStorage.setItem("apex_report_layout", JSON.stringify(resolvedLayout));
        }
      } catch (e) {}

      return mergedData;
    }
  } catch (err) {
    console.warn("Lab settings cloud fetch notice:", err);
  }

  try {
    const local = JSON.parse(localStorage.getItem("apex_lab_settings") || "null");
    if (local && local.lab_name) {
      if (!local.report_layout && localLayout) {
        local.report_layout = localLayout;
      }
      return local;
    }
  } catch (e) {}

  return {
    ...DEFAULT_LAB_SETTINGS,
    report_layout: localLayout || DEFAULT_LAB_SETTINGS.report_layout
  };
}

export async function saveLabSettings(settingsData) {
  const layoutObj = settingsData.report_layout !== undefined
    ? settingsData.report_layout
    : (getLocalReportLayout() || DEFAULT_LAB_SETTINGS.report_layout);

  try {
    if (layoutObj) {
      localStorage.setItem("apex_report_layout", JSON.stringify(layoutObj));
    }
  } catch (e) {}

  const payload = {
    id: "MAIN_SETTINGS",
    lab_name: settingsData.lab_name || settingsData.labName || DEFAULT_LAB_SETTINGS.lab_name,
    tagline: settingsData.tagline || DEFAULT_LAB_SETTINGS.tagline,
    address: settingsData.address || DEFAULT_LAB_SETTINGS.address,
    phone: settingsData.phone || DEFAULT_LAB_SETTINGS.phone,
    email: settingsData.email || DEFAULT_LAB_SETTINGS.email,
    website: settingsData.website || DEFAULT_LAB_SETTINGS.website,
    logo_data: settingsData.logo_data || settingsData.logoData || "",
    header_bg: settingsData.header_bg || settingsData.headerBg || "#20122e",
    header_color: settingsData.header_color || settingsData.headerColor || "#ffffff",
    receipt_footer: settingsData.receipt_footer || settingsData.receiptFooter || DEFAULT_LAB_SETTINGS.receipt_footer,
    report_footer: settingsData.report_footer || settingsData.reportFooter || DEFAULT_LAB_SETTINGS.report_footer,
    report_layout: layoutObj
  };

  try {
    localStorage.setItem("apex_lab_settings", JSON.stringify(payload));
  } catch (e) {}

  try {
    const { data, error } = await supabase.from("lab_settings").upsert(payload).select().single();
    if (!error && data) {
      data.report_layout = data.report_layout || layoutObj;
      localStorage.setItem("apex_lab_settings", JSON.stringify(data));
      return data;
    }

    if (error) {
      const { report_layout, ...safePayload } = payload;
      const { data: safeData } = await supabase.from("lab_settings").upsert(safePayload).select().single();
      const combined = { ...(safeData || payload), report_layout: layoutObj };
      localStorage.setItem("apex_lab_settings", JSON.stringify(combined));
      return combined;
    }
  } catch (err) {
    console.warn("Cloud save notice for lab settings:", err.message);
  }

  return payload;
}

export async function getNextSequentialBarcode(count = 1) {
  const yearPrefix = String(new Date().getFullYear());
  let maxFoundSeq = 0;

  try {
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("barcode, created_at")
      .ilike("barcode", `${yearPrefix}%`)
      .order("created_at", { ascending: false })
      .limit(30);

    if (recentOrders && recentOrders.length > 0) {
      for (const ord of recentOrders) {
        const rawDigits = String(ord.barcode || "").replace(/\D/g, "");
        if (rawDigits.startsWith(yearPrefix)) {
          const num = parseInt(rawDigits.slice(yearPrefix.length), 10);
          if (!isNaN(num) && num > maxFoundSeq) {
            maxFoundSeq = num;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Sequence lookup warning:", err);
  }

  try {
    const localLast = parseInt(localStorage.getItem("apex_last_barcode_seq") || "0", 10);
    if (localLast > maxFoundSeq) {
      maxFoundSeq = localLast;
    }
  } catch (e) {}

  const startSeq = maxFoundSeq + 1;
  const generatedBarcodes = [];

  for (let i = 0; i < count; i++) {
    const seqStr = String(startSeq + i).padStart(5, "0");
    generatedBarcodes.push(`${yearPrefix}${seqStr}`);
  }

  try {
    localStorage.setItem("apex_last_barcode_seq", String(startSeq + count - 1));
  } catch (e) {}

  return count === 1 ? generatedBarcodes[0] : generatedBarcodes;
}