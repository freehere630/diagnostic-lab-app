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

// Inside src/services/api.js -> in MASTER_CBC_PARAMETERS:

const MASTER_CBC_PARAMETERS = [
  // --- PRIMARY COUNTS & MACHINE DIFFERENTIALS ---
  { name: "Total Leucocyte Count (WBC)", unit: "10^9/L", min: 4.0, max: 11.0, type: "numeric" },
  { name: "Hemoglobin (Hb)", unit: "g/dL", min: 11.5, max: 16.5, type: "numeric" },
  { name: "ESR (Westergren Method)", unit: "mm/1st hr", min: 0.0, max: 20.0, type: "numeric" },
  
  // 3-PART ANALYZER MACHINE INPUTS (Type your screen numbers here):
  { name: "Granulocytes (Gran%)", unit: "%", min: 40.0, max: 75.0, type: "numeric" },
  { name: "Lymphocytes (Lymph%)", unit: "%", min: 20.0, max: 45.0, type: "numeric" },
  { name: "Mid-cells (Mid%)", unit: "%", min: 2.0, max: 15.0, type: "numeric" }, // <-- YOUR MID% INPUT BOX

  // AUTO-CALCULATED 5-PART DIFFERENTIAL (Calculates live when you type Mid% and Gran%):
  { name: "Neutrophils", unit: "%", min: 40.0, max: 75.0, type: "numeric" },
  { name: "Lymphocytes", unit: "%", min: 20.0, max: 45.0, type: "numeric" },
  { name: "Monocytes", unit: "%", min: 2.0, max: 10.0, type: "numeric" },
  { name: "Eosinophils", unit: "%", min: 1.0, max: 6.0, type: "numeric" },
  { name: "Basophils", unit: "%", min: 0.0, max: 1.0, type: "numeric" },
  { name: "TOTAL CIR. EOSIONOPHIL COUNT", unit: "/cumm", min: 40.0, max: 450.0, type: "numeric" },

  // --- RED BLOOD CELL & INDICES ---
  { name: "Total Red Blood Cell Count (RBC)", unit: "10^12/L", min: 3.8, max: 5.8, type: "numeric" },
  { name: "Packed Cell Volume (PCV / Hematocrit)", unit: "%", min: 36.0, max: 50.0, type: "numeric" },
  { name: "Mean Corpuscular Volume (MCV)", unit: "fL", min: 78.0, max: 98.0, type: "numeric" },
  { name: "Mean Corpuscular Hemoglobin (MCH)", unit: "pg", min: 27.0, max: 32.0, type: "numeric" },
  { name: "Mean Corpuscular Hb Concentration (MCHC)", unit: "g/dL", min: 31.0, max: 36.0, type: "numeric" },
  { name: "RDW-SD", unit: "fL", min: 35.0, max: 56.0, type: "numeric" },
  { name: "RDW-CV", unit: "%", min: 11.5, max: 15.0, type: "numeric" },

  // --- PLATELET INDICES ---
  { name: "Total Platelet Count", unit: "10^9/L", min: 150.0, max: 450.0, type: "numeric" },
  { name: "Mean Platelet Volume (MPV)", unit: "fL", min: 7.4, max: 11.5, type: "numeric" },
  { name: "Platelet Distribution Width (PDW)", unit: "%", min: 10.0, max: 18.0, type: "numeric" },
  { name: "Plateletcrit (PCT)", unit: "%", min: 0.10, max: 0.28, type: "numeric" },
  { name: "Platelet Large Cell Ratio (P-LCR)", unit: "%", min: 9.0, max: 45.0, type: "numeric" },
  { name: "Platelet Large Cell Count (P-LCC)", unit: "10^9/L", min: 13.0, max: 129.0, type: "numeric" }
];
// SILENT AUTO-SEEDER (Runs automatically without user clicks)
async function ensureSilent5PartCBC(existingTests = []) {
  const cbcTestId = "T-CBC-5PART";
  const existingCbc = existingTests.find(
    (t) =>
      t.id === cbcTestId ||
      (t.code || "").toUpperCase() === "CBC" ||
      (t.name || "").toLowerCase().includes("blood count")
  );

  const existingParams = existingCbc ? (existingCbc.test_parameters || existingCbc.parameters || []) : [];

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
      is_profile: true,
      is_available: true
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

  // Fallback in-memory object
  const inMemoryCbc = {
    id: cbcTestId,
    code: "CBC",
    name: "Complete Blood Count (CBC) with 5-Part Differential",
    dept_id: "DEP-HEM",
    price: 400,
    sample_type: "Whole Blood",
    tube_color: "Purple / Lavender (EDTA)",
    is_profile: true,
    is_available: true,
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

// In src/services/api.js -> replace createNewOrder:

// In src/services/api.js -> replace createNewOrder:

export async function createNewOrder({ patientData, testIds, discount, netPayable, paidAmount, dueAmount, testCatalog = [] }) {
  const patientId = patientData.id && patientData.id.trim() 
    ? patientData.id.trim() 
    : `P-${Math.floor(1000 + Math.random() * 9000)}`;

  const selectedTests = testCatalog.filter((t) => testIds.includes(t.id));

  // 1. DEPARTMENT-LEVEL PHYSICAL VIAL GROUPING (1 Tube per Department, Excludes Imaging & ECG)
  const departmentVials = [];
  selectedTests.forEach((t) => {
    const d = (t.dept_id || t.deptId || "").toUpperCase();
    const s = (t.sample_type || "").toLowerCase();
    const c = (t.code || "").toUpperCase();
    const isImaging = d.includes("RAD") || d.includes("USG") || d.includes("CT") || d.includes("MRI") || d.includes("CARD") ||
                      s.includes("no specimen") || s.includes("imaging") || s.includes("tracing") || c.includes("ECG") || c.includes("XRAY");
    if (isImaging) return; // Skip specimen-less tests!

    const deptId = t.dept_id || t.deptId || "DEP-GEN";
    const deptCode = deptId.replace("DEP-", "");
    const tubeColor = (t.tube_color || "Standard").split(" ")[0]; // "Red", "Purple", "Grey"
    
    // GROUP BY DEPARTMENT + TUBE COLOR (Every department gets its own vial!)
    const key = `${deptCode}-${tubeColor}`;

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

  // 2. RESERVE EXACT NUMBER OF SEQUENTIAL BARCODES (One for each department)
  const assignedBarcodes = await getNextSequentialBarcode(vialsCount);
  const barcodeList = Array.isArray(assignedBarcodes) ? assignedBarcodes : [assignedBarcodes];

  // Assign barcodes to each department vial
  departmentVials.forEach((v, i) => {
    v.barcode = barcodeList[i];
  });

  const primaryBarcode = barcodeList[0];
  const lastBarcode = barcodeList[barcodeList.length - 1];

  const now = new Date();
  const nowIso = now.toISOString();
  const todayDate = nowIso.slice(0, 10);
  const todayCompact = todayDate.replace(/-/g, "");
  
  const orderId = `ORD-${todayCompact.slice(2)}-${primaryBarcode.slice(-4)}`;
  const receiptNo = `RCP-${todayCompact.slice(4)}-${primaryBarcode.slice(-4)}`;
  const referringDoctor = (patientData.doctor && patientData.doctor.trim()) ? patientData.doctor.trim() : "Self";

  // 3. Save Patient
  const patientRow = {
    id: patientId,
    name: patientData.name,
    age: parseInt(patientData.age) || 0,
    gender: patientData.gender || "Other",
    phone: patientData.phone || "N/A",
    address: `Ref: ${referringDoctor}`
  };
  try { await supabase.from("patients").upsert(patientRow); } catch (e) {}

  // 4. Save Order (Save lastBarcode to database so next order never collides!)
  const subTotal = selectedTests.reduce((acc, t) => acc + parseFloat(t.price || 0), 0);
  const finalDiscountPercent = discount || 0;
  const calculatedNet = subTotal - (subTotal * finalDiscountPercent) / 100;
  const finalNet = netPayable !== undefined ? parseFloat(netPayable) : calculatedNet;
  const finalPaid = paidAmount !== undefined ? parseFloat(paidAmount) : finalNet;
  const finalDue = dueAmount !== undefined ? parseFloat(dueAmount) : Math.max(0, finalNet - finalPaid);

  const orderRow = {
    id: orderId,
    patient_id: patientId,
    barcode: lastBarcode, // Stored to guarantee next order starts on the next number!
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
    vials: departmentVials, // Each department has its own barcode
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
// 9. SAMPLE REJECTION & RECOLLECTION WORKFLOW
// ==========================================
export async function requestSampleRecollection(orderId, reason = "Hemolyzed Specimen", remarks = "") {
  const fullRemarks = `[RECOLLECTION REQUIRED: ${reason}] ${remarks}`.trim();
  const { data, error } = await supabase
    .from("orders")
    .update({
      sample_status: "Repeat Collection Required",
      qc_status: "Pending",
      verifier_remarks: fullRemarks
    })
    .eq("id", orderId);

  if (error) throw error;

  try {
    const local = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
    const updated = local.map((o) =>
      (o.id === orderId || o.orderId === orderId)
        ? { ...o, sample_status: "Repeat Collection Required", verifierRemarks: fullRemarks }
        : o
    );
    localStorage.setItem("apex_local_orders", JSON.stringify(updated));
  } catch (e) {}

  return data;
}

export async function markSampleRecollected(orderId) {
  // Clears the flag from BOTH sample_status AND verifier_remarks
  const { data, error } = await supabase
    .from("orders")
    .update({
      sample_status: "Sample Recollected",
      verifier_remarks: "New sample recollected. In laboratory analysis."
    })
    .eq("id", orderId);

  if (error) throw error;

  try {
    const local = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
    const updated = local.map((o) =>
      (o.id === orderId || o.orderId === orderId)
        ? { 
            ...o, 
            sample_status: "Sample Recollected", 
            verifierRemarks: "New sample recollected. In laboratory analysis." 
          }
        : o
    );
    localStorage.setItem("apex_local_orders", JSON.stringify(updated));
  } catch (e) {}

  return data;
}

// ==========================================
// 10. TEST CATALOG CRUD & REAGENT AVAILABILITY
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

  const { data: test, error: tErr } = await supabase
    .from("tests")
    .insert({
      id: testId,
      code: testData.code.trim().toUpperCase(),
      name: testData.name.trim(),
      dept_id: testData.deptId || testData.dept_id || "DEP-BIO",
      price: parseFloat(testData.price) || 0,
      sample_type: testData.sampleType || testData.sample_type || "Serum",
      tube_color: testData.tubeColor || testData.tube_color || "Red / Yellow (SST / Plain Clot)",
      is_profile: Boolean(testData.isProfile || testData.is_profile),
      is_available: testData.is_available !== undefined ? testData.is_available : true
    })
    .select()
    .single();

  if (tErr) throw new Error("Failed to create test: " + tErr.message);

  if (testData.parameters && testData.parameters.length > 0) {
    const paramRows = testData.parameters
      .filter((p) => p.name && p.name.trim() !== "")
      .map((p, idx) => {
        const minVal = p.min !== "" && p.min !== null && p.min !== undefined && !isNaN(parseFloat(p.min)) ? parseFloat(p.min) : null;
        const maxVal = p.max !== "" && p.max !== null && p.max !== undefined && !isNaN(parseFloat(p.max)) ? parseFloat(p.max) : null;
        const refText = (p.reference_text || p.ref_text || "").trim();

        // Postgres check constraint safety: only 'numeric', 'qualitative', 'text'
        let safeType = p.param_type || "numeric";
        if (safeType === "multirange") safeType = "numeric";

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
        // Fallback retry without reference_text if column not created yet
        const safeRows = paramRows.map(({ reference_text, ...rest }) => rest);
        const { error: retryErr } = await supabase.from("test_parameters").insert(safeRows);
        if (retryErr) throw new Error("Failed to save parameters: " + retryErr.message);
      }
    }
  }

  return test;
}

export async function updateExistingTest(testId, testData) {
  // 1. Update Test Master Record
  const { error: tErr } = await supabase
    .from("tests")
    .update({
      code: testData.code.trim().toUpperCase(),
      name: testData.name.trim(),
      dept_id: testData.deptId || testData.dept_id || "DEP-BIO",
      price: parseFloat(testData.price) || 0,
      sample_type: testData.sampleType || testData.sample_type || "Serum",
      tube_color: testData.tubeColor || testData.tube_color || "Red / Yellow (SST / Plain Clot)",
      is_profile: Boolean(testData.isProfile || testData.is_profile),
      is_available: testData.is_available !== undefined ? testData.is_available : true
    })
    .eq("id", testId);

  if (tErr) throw new Error("Failed to update test details: " + tErr.message);

  // 2. Prepare Clean Parameters (Never NaN)
  const validParams = (testData.parameters || []).filter((p) => p.name && p.name.trim() !== "");

  if (validParams.length > 0) {
    const paramRows = validParams.map((p, idx) => {
      const rawMin = p.min !== undefined && p.min !== "" ? p.min : p.min_range;
      const rawMax = p.max !== undefined && p.max !== "" ? p.max : p.max_range;
      const minVal = rawMin !== "" && rawMin !== null && rawMin !== undefined && !isNaN(parseFloat(rawMin)) ? parseFloat(rawMin) : null;
      const maxVal = rawMax !== "" && rawMax !== null && rawMax !== undefined && !isNaN(parseFloat(rawMax)) ? parseFloat(rawMax) : null;
      const refText = (p.reference_text || p.ref_text || "").trim();

      const existingId = p.id && String(p.id).startsWith("P-") ? p.id : `P-${testId}-${idx + 1}-${Date.now().toString().slice(-4)}`;

      let safeType = p.param_type || "numeric";
      if (safeType === "multirange") safeType = "numeric";

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
      console.warn("Insert with reference_text failed, retrying safe insert:", insErr.message);
      const safeRows = paramRows.map(({ reference_text, ...rest }) => rest);
      const { error: retryErr } = await supabase.from("test_parameters").insert(safeRows);
      if (retryErr) throw new Error("Failed to save parameters: " + retryErr.message);
    }
  }
}

export async function deleteTest(testId) {
  await supabase.from("order_tests").delete().eq("test_id", testId);
  await supabase.from("test_parameters").delete().eq("test_id", testId);
  await supabase.from("tests").delete().eq("id", testId);
}

// ==========================================
// 11. STAFF USERS
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
// 12. HOSPITAL BRANDING & SETTINGS
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
export async function getNextSequentialBarcode(count = 1) {
  const yearPrefix = String(new Date().getFullYear()); // "2026"
  let maxFoundSeq = 0;

  try {
    // 1. Fetch recent orders from Supabase to find the absolute highest barcode used
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

  // 2. Check local storage cache counter
  try {
    const localLast = parseInt(localStorage.getItem("apex_last_barcode_seq") || "0", 10);
    if (localLast > maxFoundSeq) {
      maxFoundSeq = localLast;
    }
  } catch (e) {}

  const startSeq = maxFoundSeq + 1;
  const generatedBarcodes = [];

  for (let i = 0; i < count; i++) {
    const seqStr = String(startSeq + i).padStart(5, "0"); // 5-digit sequence (00001, 00002...)
    generatedBarcodes.push(`${yearPrefix}${seqStr}`);
  }

  // Save the highest reserved sequence to prevent any other order from taking it
  try {
    localStorage.setItem("apex_last_barcode_seq", String(startSeq + count - 1));
  } catch (e) {}

  return count === 1 ? generatedBarcodes[0] : generatedBarcodes;
}
