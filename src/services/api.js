import { supabase } from "../supabaseClient";

// ==========================================
// 1. MASTER DEPARTMENTS & DATA
// ==========================================
export const DEFAULT_DEPARTMENTS = [
  { id: "DEP-HEM", name: "Hematology & Coagulation", icon: "🩸" },
  { id: "DEP-BIO", name: "Clinical Biochemistry", icon: "🧪" },
  { id: "DEP-RAD", name: "Radiology & X-Ray", icon: "🩻" },
  { id: "DEP-USG", name: "Ultrasonography (USG)", icon: "📡" },
  { id: "DEP-CTMRI", name: "CT Scan & MRI Imaging", icon: "🧠" },
  { id: "DEP-CARD", name: "Cardiology (ECG & Echo)", icon: "💓" },
  { id: "DEP-MIC", name: "Microbiology & Serology", icon: "🔬" },
  { id: "DEP-PAT", name: "Clinical Pathology & Urine", icon: "🧫" }
];

// ==========================================
// 24-PARAMETER 5-PART CBC PROFILE DEFINITION
// ==========================================
const MASTER_CBC_PARAMETERS = [
  // --- PRIMARY COUNTS ---
  { name: "Total Leucocyte Count (WBC)", unit: "10^9/L", min: 4.0, max: 11.0, type: "numeric" },
  { name: "Total Red Blood Cell Count (RBC)", unit: "10^12/L", min: 3.8, max: 5.8, type: "numeric" },
  { name: "Hemoglobin (Hb)", unit: "g/dL", min: 11.5, max: 16.5, type: "numeric" },
  { name: "Packed Cell Volume (PCV / Hematocrit)", unit: "%", min: 36.0, max: 50.0, type: "numeric" },

  // --- 5-PART DIFFERENTIAL LEUCOCYTE COUNT (%) ---
  { name: "Neutrophils", unit: "%", min: 40.0, max: 75.0, type: "numeric" },
  { name: "Lymphocytes", unit: "%", min: 20.0, max: 45.0, type: "numeric" },
  { name: "Monocytes", unit: "%", min: 2.0, max: 8.0, type: "numeric" },
  { name: "Eosinophils", unit: "%", min: 1.0, max: 6.0, type: "numeric" },
  { name: "Basophils", unit: "%", min: 0.0, max: 1.0, type: "numeric" },

  // --- ABSOLUTE LEUCOCYTE COUNTS (#) ---
  { name: "Absolute Neutrophil Count (ANC)", unit: "10^9/L", min: 2.0, max: 7.5, type: "numeric" },
  { name: "Absolute Lymphocyte Count (ALC)", unit: "10^9/L", min: 1.0, max: 4.0, type: "numeric" },
  { name: "Absolute Monocyte Count (AMC)", unit: "10^9/L", min: 0.2, max: 0.8, type: "numeric" },
  { name: "Absolute Eosinophil Count (AEC)", unit: "10^9/L", min: 0.04, max: 0.4, type: "numeric" },
  { name: "Absolute Basophil Count (ABC)", unit: "10^9/L", min: 0.01, max: 0.1, type: "numeric" },

  // --- RBC INDICES ---
  { name: "Mean Corpuscular Volume (MCV)", unit: "fL", min: 78.0, max: 98.0, type: "numeric" },
  { name: "Mean Corpuscular Hemoglobin (MCH)", unit: "pg", min: 27.0, max: 32.0, type: "numeric" },
  { name: "Mean Corpuscular Hb Concentration (MCHC)", unit: "g/dL", min: 31.0, max: 36.0, type: "numeric" },
  { name: "RDW-CV", unit: "%", min: 11.5, max: 15.0, type: "numeric" },
  { name: "RDW-SD", unit: "fL", min: 35.0, max: 56.0, type: "numeric" },

  // --- PLATELET INDICES ---
  { name: "Total Platelet Count", unit: "10^9/L", min: 150.0, max: 450.0, type: "numeric" },
  { name: "Mean Platelet Volume (MPV)", unit: "fL", min: 7.4, max: 11.5, type: "numeric" },
  { name: "Platelet Distribution Width (PDW)", unit: "fL", min: 9.0, max: 17.0, type: "numeric" },
  { name: "Plateletcrit (PCT)", unit: "%", min: 0.15, max: 0.50, type: "numeric" },
  { name: "Platelet Large Cell Ratio (P-LCR)", unit: "%", min: 13.0, max: 43.0, type: "numeric" }
];

// SILENT AUTO-SEEDER (Runs automatically without buttons)
async function ensureSilent5PartCBC(existingTests = []) {
  const cbcTestId = "T-CBC-5PART";
  const existingCbc = existingTests.find(
    (t) =>
      t.id === cbcTestId ||
      (t.code || "").toUpperCase() === "CBC" ||
      (t.name || "").toLowerCase().includes("blood count")
  );

  const existingParams = existingCbc ? (existingCbc.test_parameters || existingCbc.parameters || []) : [];

  // If already full 24 parameters, return immediately
  if (existingCbc && existingParams.length >= 20) {
    return existingTests;
  }

  try {
    await supabase.from("departments").upsert({
      id: "DEP-HEM",
      name: "Hematology & Coagulation",
      icon: "🩸"
    });

    const targetId = existingCbc?.id || cbcTestId;

    await supabase.from("tests").upsert({
      id: targetId,
      code: "CBC",
      name: "Complete Blood Count (CBC) with 5-Part Differential",
      dept_id: "DEP-HEM",
      price: 400,
      sample_type: "Whole Blood",
      tube_color: "Purple / Lavender (EDTA)",
      is_profile: true
    });

    if (existingParams.length < 20) {
      await supabase.from("test_parameters").delete().eq("test_id", targetId);
    }

    const paramRows = MASTER_CBC_PARAMETERS.map((p, idx) => ({
      id: `P-CBC-${String(idx + 1).padStart(2, "0")}`,
      test_id: targetId,
      name: p.name,
      param_type: p.type,
      unit: p.unit,
      min_range: p.min,
      max_range: p.max
    }));

    await supabase.from("test_parameters").insert(paramRows);

    const { data: updatedCbc } = await supabase
      .from("tests")
      .select("*, test_parameters(*)")
      .eq("id", targetId)
      .single();

    if (updatedCbc) {
      return [updatedCbc, ...existingTests.filter((t) => t.id !== targetId)];
    }
  } catch (err) {
    console.warn("Silent CBC verification notice:", err.message);
  }

  // Guaranteed in-memory fallback
  const inMemoryCbc = {
    id: cbcTestId,
    code: "CBC",
    name: "Complete Blood Count (CBC) with 5-Part Differential",
    dept_id: "DEP-HEM",
    price: 400,
    sample_type: "Whole Blood",
    tube_color: "Purple / Lavender (EDTA)",
    is_profile: true,
    test_parameters: MASTER_CBC_PARAMETERS.map((p, idx) => ({
      id: `P-CBC-${String(idx + 1).padStart(2, "0")}`,
      test_id: cbcTestId,
      name: p.name,
      param_type: p.type,
      unit: p.unit,
      min_range: p.min,
      max_range: p.max
    }))
  };

  return [inMemoryCbc, ...existingTests.filter((t) => (t.code || "").toUpperCase() !== "CBC")];
}

export async function getMasterData() {
  try {
    const { data: departments } = await supabase.from("departments").select("*");
    const { data: tests } = await supabase.from("tests").select("*, test_parameters(*)").order("name");

    let finalDepts = departments && departments.length > 0 ? departments : [...DEFAULT_DEPARTMENTS];
    DEFAULT_DEPARTMENTS.forEach((defDept) => {
      if (!finalDepts.some((d) => d.id === defDept.id)) finalDepts.push(defDept);
    });

    const updatedTests = await ensureSilent5PartCBC(tests || []);

    return { 
      departments: finalDepts, 
      tests: updatedTests || [] 
    };
  } catch (err) {
    console.error("Master data fetch error:", err);
    return { departments: DEFAULT_DEPARTMENTS, tests: [] };
  }
}

// 1-Click Seed Standard Radiology & Imaging Catalog
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
      parameters: [{ name: "Chest Radiography Findings", param_type: "text", unit: "Report", min: "", max: "" }]
    },
    {
      code: "USG-ABD",
      name: "USG of Whole Abdomen",
      deptId: "DEP-USG",
      price: "1500",
      sampleType: "Ultrasound Protocol",
      tubeColor: "No Specimen (Imaging)",
      isProfile: false,
      parameters: [{ name: "Abdominal Sonography Findings", param_type: "text", unit: "Report", min: "", max: "" }]
    },
    {
      code: "CT-BRAIN",
      name: "CT Scan of Brain",
      deptId: "DEP-CTMRI",
      price: "4500",
      sampleType: "Non-Contrast CT Head",
      tubeColor: "No Specimen (Imaging)",
      isProfile: false,
      parameters: [{ name: "Cranial CT Observations", param_type: "text", unit: "Report", min: "", max: "" }]
    },
    {
      code: "MRI-BRAIN",
      name: "MRI of Brain with Contrast",
      deptId: "DEP-CTMRI",
      price: "8500",
      sampleType: "Multi-Sequence MRI",
      tubeColor: "No Specimen (Imaging)",
      isProfile: false,
      parameters: [{ name: "Neuro MRI Protocol Findings", param_type: "text", unit: "Report", min: "", max: "" }]
    },
    {
      code: "ECG-12",
      name: "12-Lead Electrocardiogram (ECG)",
      deptId: "DEP-CARD",
      price: "350",
      sampleType: "12-Lead Tracing",
      tubeColor: "No Specimen (Imaging)",
      isProfile: false,
      parameters: [{ name: "Electrocardiogram Findings", param_type: "text", unit: "Tracing", min: "", max: "" }]
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
// 2. DOCTOR MANAGEMENT API
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
// 3. PATIENT SEARCH & HISTORY
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
// 4. ON-DEMAND SERVER-SIDE PAGINATED QUERY
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

  // Fallback
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

// ==========================================
// 5. FETCH ALL ORDERS
// ==========================================
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

// Inside createNewOrder in src/services/api.js:

export async function createNewOrder({ patientData, testIds, discount, netPayable, paidAmount, dueAmount, testCatalog = [] }) {
  // 1. SHORT PATIENT ID (e.g. P-1024)
  const patientId = patientData.id && patientData.id.trim() 
    ? patientData.id.trim() 
    : `P-${Math.floor(1000 + Math.random() * 9000)}`;

  // 2. STRICTLY PURE 9-DIGIT NUMERIC SAMPLE BARCODE (e.g. 482910385)
  // Zero letters, zero hyphens, zero symbols - perfect for Maglumi & KT-44 scanners
  const barcode = String(Math.floor(100000000 + Math.random() * 900000000));

  const now = new Date();
  const nowIso = now.toISOString();
  const todayDate = nowIso.slice(0, 10);
  const todayCompact = todayDate.replace(/-/g, "");
  const timeCompact = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
  
  // Clean short Order ID & Receipt No
  const orderId = `ORD-${todayCompact.slice(2)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const receiptNo = `RCP-${todayCompact.slice(4)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const referringDoctor = (patientData.doctor && patientData.doctor.trim()) ? patientData.doctor.trim() : "Self";

  // Save Patient
  const patientRow = {
    id: patientId,
    name: patientData.name,
    age: parseInt(patientData.age) || 0,
    gender: patientData.gender || "Other",
    phone: patientData.phone || "N/A",
    address: `Ref: ${referringDoctor}`
  };
  try { await supabase.from("patients").upsert(patientRow); } catch (e) {}

  // Calculate Billing
  const selectedTests = testCatalog.filter((t) => testIds.includes(t.id));
  const subTotal = selectedTests.reduce((acc, t) => acc + parseFloat(t.price || 0), 0);
  const finalDiscountPercent = discount || 0;
  const calculatedNet = subTotal - (subTotal * finalDiscountPercent) / 100;
  const finalNet = netPayable !== undefined ? parseFloat(netPayable) : calculatedNet;
  const finalPaid = paidAmount !== undefined ? parseFloat(paidAmount) : finalNet;
  const finalDue = dueAmount !== undefined ? parseFloat(dueAmount) : Math.max(0, finalNet - finalPaid);

  const orderRow = {
    id: orderId,
    patient_id: patientId,
    barcode: barcode,
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

  // Link Tests
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
    barcode: barcode,
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
    order_tests: selectedTests.map((t) => ({ test_id: t.id, test: t })),
    billing: { subTotal, discount: finalDiscountPercent, netPayable: finalNet, paid: finalPaid, due: finalDue },
    results: {},
    qcStatus: "Pending",
    isLocked: false,
    verifierRemarks: ""
  };

  try {
    const local = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
    localStorage.setItem("apex_local_orders", JSON.stringify([completeOrder, ...local]));
  } catch (e) {}

  return completeOrder;
}
// ==========================================
// 7. SETTLE DUE AMOUNT
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

// ==========================================
// 8. TEST RESULT ENTRY & VERIFICATION
// ==========================================
export async function saveTestResult(orderId, parameterId, resultValue, statusFlag = "ENTERED") {
  const { data, error } = await supabase
    .from("results")
    .upsert({ 
      order_id: orderId, 
      parameter_id: parameterId, 
      result_value: String(resultValue).trim(), 
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
// 9. TEST CATALOG CRUD MANAGEMENT
// ==========================================
export async function createNewTestWithParameters(testData) {
  const testId = `T-${testData.code.toUpperCase().replace(/\s+/g, "")}-${Math.floor(100 + Math.random() * 900)}`;
  const { data: test, error: tErr } = await supabase
    .from("tests")
    .insert({
      id: testId,
      code: testData.code,
      name: testData.name,
      dept_id: testData.deptId,
      price: parseFloat(testData.price) || 0,
      sample_type: testData.sampleType,
      tube_color: testData.tubeColor,
      is_profile: testData.isProfile || false
    }).select().single();
  if (tErr) throw tErr;

  if (testData.parameters && testData.parameters.length > 0) {
    const paramRows = testData.parameters.filter((p) => p.name?.trim()).map((p, idx) => ({
      id: `P-${testId}-${idx + 1}`,
      test_id: testId,
      name: p.name,
      param_type: p.param_type || "numeric",
      unit: p.unit || "",
      min_range: p.min ? parseFloat(p.min) : null,
      max_range: p.max ? parseFloat(p.max) : null
    }));
    if (paramRows.length > 0) await supabase.from("test_parameters").insert(paramRows);
  }
  return test;
}

export async function updateExistingTest(testId, testData) {
  await supabase.from("tests").update({
    code: testData.code,
    name: testData.name,
    dept_id: testData.deptId || testData.dept_id,
    price: parseFloat(testData.price) || 0,
    sample_type: testData.sampleType || testData.sample_type,
    tube_color: testData.tubeColor || testData.tube_color,
    is_profile: testData.isProfile !== undefined ? testData.isProfile : (testData.is_profile || false)
  }).eq("id", testId);

  await supabase.from("test_parameters").delete().eq("test_id", testId);
  if (testData.parameters && testData.parameters.length > 0) {
    const paramRows = testData.parameters.filter((p) => p.name?.trim()).map((p, idx) => ({
      id: `P-${testId}-${idx + 1}-${Date.now().toString().slice(-4)}`,
      test_id: testId,
      name: p.name,
      param_type: p.param_type || "numeric",
      unit: p.unit || "",
      min_range: p.min_range !== undefined && p.min_range !== "" ? parseFloat(p.min_range) : (p.min ? parseFloat(p.min) : null),
      max_range: p.max_range !== undefined && p.max_range !== "" ? parseFloat(p.max_range) : (p.max ? parseFloat(p.max) : null)
    }));
    if (paramRows.length > 0) await supabase.from("test_parameters").insert(paramRows);
  }
}

export async function deleteTest(testId) {
  await supabase.from("order_tests").delete().eq("test_id", testId);
  await supabase.from("test_parameters").delete().eq("test_id", testId);
  await supabase.from("tests").delete().eq("id", testId);
}

// ==========================================
// 10. STAFF USERS
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

// ==========================================
// 11. HOSPITAL BRANDING & SETTINGS
// ==========================================
export async function getLabSettings() {
  try {
    const { data } = await supabase.from("lab_settings").select("*").eq("id", "MAIN_SETTINGS").maybeSingle();
    return data || null;
  } catch (err) {
    return null;
  }
}

export async function saveLabSettings(settingsData) {
  const { data } = await supabase.from("lab_settings").upsert({
    id: "MAIN_SETTINGS",
    lab_name: settingsData.labName || settingsData.lab_name,
    tagline: settingsData.tagline,
    address: settingsData.address,
    phone: settingsData.phone,
    email: settingsData.email,
    website: settingsData.website,
    logo_data: settingsData.logoData || settingsData.logo_data,
    receipt_footer: settingsData.receiptFooter || settingsData.receipt_footer,
    report_footer: settingsData.reportFooter || settingsData.report_footer,
    report_design: settingsData.reportDesign || settingsData.report_design || {},
    receipt_design: settingsData.receiptDesign || settingsData.receipt_design || {}
  }).select().single();
  return data;
}