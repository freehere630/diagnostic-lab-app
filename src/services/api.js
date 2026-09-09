import { supabase } from "../supabaseClient";

// ==========================================
// 1. FETCH MASTER DATA (TESTS & DEPARTMENTS)
// ==========================================
export async function getMasterData() {
  const { data: departments, error: dErr } = await supabase.from("departments").select("*");
  const { data: tests, error: tErr } = await supabase.from("tests").select("*, test_parameters(*)").order("name");

  if (dErr) console.error("Dept Error:", dErr.message);
  if (tErr) console.error("Tests Error:", tErr.message);
  
  return { departments: departments || [], tests: tests || [] };
}

// ==========================================
// 2. FETCH ALL ORDERS & PATIENTS
// ==========================================
export async function getAllOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      patient:patients(*),
      specimens(*),
      order_tests(test:tests(*, test_parameters(*))),
      results(*)
    `)
    .order("order_date", { ascending: false });

  if (error) {
    console.error("Orders Error:", error.message);
    return [];
  }
  return data || [];
}

// ==========================================
// 3. CREATE ORDER & SPECIMENS (POS)
// ==========================================
export async function createNewOrder({ patientData, testIds, discount, netPayable, paidAmount, specimens }) {
  const patientId = patientData.id || `PT-${Math.floor(10000 + Math.random() * 90000)}`;
  
  const { data: patient, error: pErr } = await supabase
    .from("patients")
    .upsert({
      id: patientId,
      name: patientData.name,
      age: parseInt(patientData.age) || 0,
      gender: patientData.gender,
      phone: patientData.phone,
      address: patientData.address,
    })
    .select()
    .single();

  if (pErr) throw pErr;

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const barcode = `LAB-${today}-${Math.floor(100000 + Math.random() * 900000)}`;
  const orderId = `ORD-${today}-${Math.floor(100 + Math.random() * 900)}`;

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .insert({
      id: orderId,
      patient_id: patient.id,
      barcode: barcode,
      order_date: new Date().toISOString().slice(0, 10),
      subtotal: netPayable + (netPayable * (discount / 100)),
      discount_percent: discount,
      net_payable: netPayable,
      paid_amount: paidAmount,
      due_amount: netPayable - paidAmount,
      sample_status: "Order Created",
      qc_status: "Pending"
    })
    .select()
    .single();

  if (oErr) throw oErr;

  if (testIds && testIds.length > 0) {
    const orderTestRows = testIds.map(testId => ({ order_id: order.id, test_id: testId }));
    await supabase.from("order_tests").insert(orderTestRows);
  }

  if (specimens && specimens.length > 0) {
    const specimenRows = specimens.map((sp, idx) => ({
      id: `SP-${order.id}-${idx + 1}`,
      order_id: order.id,
      specimen_type: sp.type,
      tube_color: sp.tube,
      status: "Accepted"
    }));
    await supabase.from("specimens").insert(specimenRows);
  }

  return { order, patient, barcode };
}

// ==========================================
// 4. SAVE LAB RESULTS (TECHNOLOGIST)
// ==========================================
export async function saveTestResult(orderId, parameterId, resultValue, statusFlag) {
  const { data, error } = await supabase
    .from("results")
    .upsert(
      {
        order_id: orderId,
        parameter_id: parameterId,
        result_value: resultValue,
        status_flag: statusFlag,
        updated_at: new Date().toISOString()
      },
      { onConflict: "order_id,parameter_id" }
    );

  if (error) throw error;
  return data;
}

// ==========================================
// 5. VERIFY REPORT (BIOCHEMIST)
// ==========================================
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
// 6. CREATE TEST (WITH IS_PROFILE)
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
    })
    .select()
    .single();

  if (tErr) throw tErr;

  if (testData.parameters && testData.parameters.length > 0) {
    const paramRows = testData.parameters
      .filter(p => p.name && p.name.trim() !== "")
      .map((p, idx) => ({
        id: `P-${testId}-${idx + 1}`,
        test_id: testId,
        name: p.name,
        param_type: p.param_type || "numeric",
        unit: p.unit || "",
        min_range: p.min ? parseFloat(p.min) : null,
        max_range: p.max ? parseFloat(p.max) : null,
        critical_low: p.critLow ? parseFloat(p.critLow) : null,
        critical_high: p.critHigh ? parseFloat(p.critHigh) : null
      }));

    if (paramRows.length > 0) {
      await supabase.from("test_parameters").insert(paramRows);
    }
  }

  return test;
}

// ==========================================
// 7. UPDATE TEST & PARAMETERS (ROBUST SYNC)
// ==========================================
export async function updateExistingTest(testId, testData) {
  // 1. Update master test details
  const { error: tErr } = await supabase
    .from("tests")
    .update({
      code: testData.code,
      name: testData.name,
      dept_id: testData.deptId || testData.dept_id,
      price: parseFloat(testData.price) || 0,
      sample_type: testData.sampleType || testData.sample_type,
      tube_color: testData.tubeColor || testData.tube_color,
      is_profile: testData.isProfile !== undefined ? testData.isProfile : (testData.is_profile || false)
    })
    .eq("id", testId);

  if (tErr) throw tErr;

  // 2. Delete old parameters for this test
  await supabase.from("test_parameters").delete().eq("test_id", testId);

  // 3. Insert fresh updated parameters
  if (testData.parameters && testData.parameters.length > 0) {
    const paramRows = testData.parameters
      .filter(p => p.name && p.name.trim() !== "")
      .map((p, idx) => ({
        id: `P-${testId}-${idx + 1}-${Date.now().toString().slice(-4)}`,
        test_id: testId,
        name: p.name,
        param_type: p.param_type || "numeric",
        unit: p.unit || "",
        min_range: p.min_range !== undefined && p.min_range !== "" ? parseFloat(p.min_range) : (p.min ? parseFloat(p.min) : null),
        max_range: p.max_range !== undefined && p.max_range !== "" ? parseFloat(p.max_range) : (p.max ? parseFloat(p.max) : null),
        critical_low: p.critical_low ? parseFloat(p.critical_low) : (p.critLow ? parseFloat(p.critLow) : null),
        critical_high: p.critical_high ? parseFloat(p.critical_high) : (p.critHigh ? parseFloat(p.critHigh) : null)
      }));

    if (paramRows.length > 0) {
      const { error: pErr } = await supabase.from("test_parameters").insert(paramRows);
      if (pErr) throw pErr;
    }
  }
}

// ==========================================
// 8. DELETE TEST (CLEAN CASCADE)
// ==========================================
export async function deleteTest(testId) {
  // Clean children first to ensure zero foreign key collisions
  await supabase.from("order_tests").delete().eq("test_id", testId);
  await supabase.from("test_parameters").delete().eq("test_id", testId);
  const { error } = await supabase.from("tests").delete().eq("id", testId);
  if (error) throw error;
}

// ==========================================
// 9. STAFF USER & SIGNATURE MANAGEMENT
// ==========================================
export async function getStaffUsers() {
  const { data, error } = await supabase.from("users").select("*").order("created_at");
  if (error) {
    console.error("Error fetching staff:", error.message);
    return [];
  }
  return data || [];
}

export async function registerStaffUser(userData) {
  const { data, error } = await supabase
    .from("users")
    .insert({
      full_name: userData.fullName,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      designation: userData.designation,
      signature_data: userData.signatureData || userData.fullName,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStaffUser(userId, userData) {
  const { data, error } = await supabase
    .from("users")
    .update({
      full_name: userData.fullName || userData.full_name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      designation: userData.designation,
      signature_data: userData.signatureData || userData.signature_data
    })
    .eq("id", userId);

  if (error) throw error;
  return data;
}

export async function deleteStaffUser(userId) {
  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) throw error;
}

// ==========================================
// 10. LAB BRANDING & FULL CUSTOM DESIGN API
// ==========================================
export async function getLabSettings() {
  try {
    const { data, error } = await supabase
      .from("lab_settings")
      .select("*")
      .eq("id", "MAIN_SETTINGS")
      .maybeSingle();

    if (error && error.code !== "PGRST116") console.warn("Settings notice:", error.message);
    return data || null;
  } catch (err) {
    return null;
  }
}

export async function saveLabSettings(settingsData) {
  const { data, error } = await supabase
    .from("lab_settings")
    .upsert({
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
      receipt_design: settingsData.receiptDesign || settingsData.receipt_design || {},
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}