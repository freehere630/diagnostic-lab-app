import { supabase } from "../supabaseClient";

// ==========================================
// 1. FETCH MASTER DATA (TESTS & DEPARTMENTS)
// ==========================================
export async function getMasterData() {
  try {
    const { data: departments, error: dErr } = await supabase
      .from("departments")
      .select("*");

    const { data: tests, error: tErr } = await supabase
      .from("tests")
      .select("*, test_parameters(*)")
      .order("name");

    if (dErr) console.warn("Dept fetch notice:", dErr.message);
    if (tErr) console.warn("Tests fetch notice:", tErr.message);

    return { 
      departments: departments || [], 
      tests: tests || [] 
    };
  } catch (err) {
    console.error("Master data fetch failed:", err);
    return { departments: [], tests: [] };
  }
}

// ==========================================
// 2. PATIENT SEARCH & HISTORY LOOKUP
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

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Patient search fallback to local:", err.message);
    try {
      const local = JSON.parse(localStorage.getItem("apex_local_patients") || "[]");
      return local.filter(p => 
        (p.id && p.id.toLowerCase().includes(cleanQ)) ||
        (p.phone && p.phone.includes(cleanQ)) ||
        (p.name && p.name.toLowerCase().includes(cleanQ))
      );
    } catch (e) {
      return [];
    }
  }
}

export async function getPatientHistory(patientId) {
  if (!patientId) return [];
  try {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_tests(*, test:tests(*, test_parameters(*))),
        results(*)
      `)
      .eq("patient_id", patientId)
      .order("order_date", { ascending: false });

    if (!error && data) return data;
  } catch (err) {
    console.warn("History fetch notice:", err.message);
  }

  // Fallback to local cache
  try {
    const local = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
    return local.filter(o => o.patient_id === patientId || o.patient?.id === patientId);
  } catch (e) {
    return [];
  }
}

// ==========================================
// 3. FETCH ALL ORDERS (FAIL-SAFE DUAL STRATEGY)
// ==========================================
export async function getAllOrders() {
  let ordersList = [];

  // Strategy A: Try relational PostgREST join
  try {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        patient:patients(*),
        order_tests(*, test:tests(*, test_parameters(*))),
        results(*)
      `)
      .order("order_date", { ascending: false });

    if (!error && data && data.length > 0) {
      ordersList = data;
    }
  } catch (e) {
    console.warn("Relational query fallback triggered:", e);
  }

  // Strategy B: If relational query returned empty or failed due to foreign key alias naming,
  // query tables directly and stitch in memory (100% immune to PostgREST relationship schema cache failures)
  if (!ordersList || ordersList.length === 0) {
    try {
      const { data: rawOrders } = await supabase.from("orders").select("*").order("order_date", { ascending: false });
      
      if (rawOrders && rawOrders.length > 0) {
        const [patientsRes, orderTestsRes, testsRes, paramsRes, resultsRes] = await Promise.all([
          supabase.from("patients").select("*"),
          supabase.from("order_tests").select("*"),
          supabase.from("tests").select("*"),
          supabase.from("test_parameters").select("*"),
          supabase.from("results").select("*")
        ]);

        const patients = patientsRes.data || [];
        const orderTests = orderTestsRes.data || [];
        const tests = testsRes.data || [];
        const params = paramsRes.data || [];
        const results = resultsRes.data || [];

        // Attach parameters to tests
        const testsWithParams = tests.map(t => ({
          ...t,
          test_parameters: params.filter(p => p.test_id === t.id)
        }));

        // Stitch orders together
        ordersList = rawOrders.map(ord => {
          const matchedPatient = patients.find(p => p.id === ord.patient_id) || null;
          const matchedOrderTests = orderTests
            .filter(ot => ot.order_id === ord.id)
            .map(ot => ({
              ...ot,
              test: testsWithParams.find(t => t.id === ot.test_id) || null
            }));
          const matchedResults = results.filter(r => r.order_id === ord.id);

          return {
            ...ord,
            patient: matchedPatient,
            order_tests: matchedOrderTests,
            results: matchedResults
          };
        });
      }
    } catch (fallbackErr) {
      console.error("Discrete fetch error:", fallbackErr);
    }
  }

  // Strategy C: Merge with local emergency cache
  try {
    const localCached = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
    if (localCached.length > 0) {
      const existingIds = new Set(ordersList.map(o => o.id || o.orderId));
      const unmerged = localCached.filter(lo => !existingIds.has(lo.id || lo.orderId));
      ordersList = [...unmerged, ...ordersList];
    }
  } catch (e) {}

  return ordersList;
}

// ==========================================
// 4. CREATE ORDER & SPECIMENS (POS)
// ==========================================
export async function createNewOrder({ patientData, testIds, discount, netPayable, paidAmount, dueAmount, specimens, testCatalog = [] }) {
  const patientId = patientData.id || `PID-${Math.floor(10000 + Math.random() * 90000)}`;
  const todayDate = new Date().toISOString().slice(0, 10);
  const todayCompact = todayDate.replace(/-/g, "");
  const barcode = `LAB-${todayCompact}-${Math.floor(100000 + Math.random() * 900000)}`;
  const orderId = `ORD-${todayCompact}-${Math.floor(100 + Math.random() * 900)}`;

  const finalDue = dueAmount !== undefined ? parseFloat(dueAmount) : Math.max(0, netPayable - paidAmount);

  // 1. Insert or Upsert Patient
  const patientRow = {
    id: patientId,
    name: patientData.name,
    age: parseInt(patientData.age) || 0,
    gender: patientData.gender || "Other",
    phone: patientData.phone || "N/A",
    address: patientData.doctor ? `Ref: ${patientData.doctor}` : ""
  };

  const { error: pErr } = await supabase.from("patients").upsert(patientRow);
  if (pErr) console.warn("Notice inserting patient into Supabase:", pErr.message);

  // Save to local patient directory
  try {
    const localP = JSON.parse(localStorage.getItem("apex_local_patients") || "[]");
    const filteredP = localP.filter(p => p.id !== patientId);
    localStorage.setItem("apex_local_patients", JSON.stringify([patientRow, ...filteredP]));
  } catch (e) {}

  // 2. Insert Order
  const subTotal = netPayable + (netPayable * (discount / 100));
  const orderRow = {
    id: orderId,
    patient_id: patientId,
    barcode: barcode,
    order_date: todayDate,
    subtotal: subTotal,
    discount_percent: discount || 0,
    net_payable: netPayable,
    paid_amount: paidAmount,
    due_amount: finalDue,
    sample_status: "Order Created",
    qc_status: "Pending",
    is_locked: false
  };

  const { error: oErr } = await supabase.from("orders").insert(orderRow);
  if (oErr) {
    console.error("Error inserting order to Supabase:", oErr.message);
    throw new Error(oErr.message);
  }

  // 3. Insert Order Test Items
  if (testIds && testIds.length > 0) {
    const orderTestRows = testIds.map((tid) => ({
      order_id: orderId,
      test_id: tid
    }));

    const { error: otErr } = await supabase.from("order_tests").insert(orderTestRows);
    if (otErr) console.warn("Notice inserting order_tests:", otErr.message);
  }

  // 4. Build Complete In-Memory Return Object
  const selectedTests = testCatalog.filter(t => testIds.includes(t.id));
  const completeOrder = {
    ...orderRow,
    orderId: orderId,
    date: todayDate,
    barcode: barcode,
    receiptNo: `RCP-${todayCompact.slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`,
    patient: {
      id: patientId,
      name: patientData.name,
      age: patientData.age,
      gender: patientData.gender,
      phone: patientData.phone,
      doctor: patientData.doctor || "Self"
    },
    tests: selectedTests,
    order_tests: selectedTests.map(t => ({ test_id: t.id, test: t })),
    billing: {
      subTotal: subTotal,
      discount: discount || 0,
      netPayable: netPayable,
      paid: paidAmount,
      due: finalDue
    },
    results: {},
    qcStatus: "Pending",
    isLocked: false,
    verifierRemarks: ""
  };

  // 5. Store in local emergency cache
  try {
    const local = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
    localStorage.setItem("apex_local_orders", JSON.stringify([completeOrder, ...local]));
  } catch (e) {}

  return completeOrder;
}

// ==========================================
// 5. SETTLE DUE AMOUNT (REPORT COLLECTION)
// ==========================================
export async function settleOrderDue(orderId, collectedAmount) {
  const amountToClear = parseFloat(collectedAmount) || 0;

  // 1. Fetch current order billing from Supabase
  const { data: currentOrd, error: fErr } = await supabase
    .from("orders")
    .select("paid_amount, due_amount, net_payable")
    .eq("id", orderId)
    .single();

  let newPaid = amountToClear;
  let newDue = 0;

  if (!fErr && currentOrd) {
    const prevPaid = parseFloat(currentOrd.paid_amount) || 0;
    const prevDue = parseFloat(currentOrd.due_amount) || 0;
    newPaid = prevPaid + Math.min(amountToClear, prevDue);
    newDue = Math.max(0, prevDue - amountToClear);
  }

  // 2. Update Supabase orders table (ONLY columns that exist in the schema: paid_amount and due_amount)
  const { data, error } = await supabase
    .from("orders")
    .update({
      paid_amount: newPaid,
      due_amount: newDue
    })
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    console.error("Supabase due settlement error:", error.message);
    throw error;
  }

  // 3. Update local emergency cache
  try {
    const local = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
    const updatedLocal = local.map(o => {
      if (o.id === orderId || o.orderId === orderId) {
        return {
          ...o,
          paid_amount: newPaid,
          due_amount: newDue,
          billing: {
            ...o.billing,
            paid: newPaid,
            due: newDue
          }
        };
      }
      return o;
    });
    localStorage.setItem("apex_local_orders", JSON.stringify(updatedLocal));
  } catch (e) {}

  return { newPaid, newDue };
}

// ==========================================
// 6. SAVE LAB RESULTS
// ==========================================
export async function saveTestResult(orderId, parameterId, resultValue, statusFlag) {
  const { data, error } = await supabase
    .from("results")
    .upsert(
      {
        order_id: orderId,
        parameter_id: parameterId,
        result_value: resultValue,
        status_flag: statusFlag
      },
      { onConflict: "order_id,parameter_id" }
    );

  if (error) throw error;
  return data;
}

// ==========================================
// 7. VERIFY REPORT
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
// 8. CREATE TEST
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
        max_range: p.max ? parseFloat(p.max) : null
      }));

    if (paramRows.length > 0) {
      await supabase.from("test_parameters").insert(paramRows);
    }
  }

  return test;
}

// ==========================================
// 9. UPDATE TEST
// ==========================================
export async function updateExistingTest(testId, testData) {
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

  await supabase.from("test_parameters").delete().eq("test_id", testId);

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
        max_range: p.max_range !== undefined && p.max_range !== "" ? parseFloat(p.max_range) : (p.max ? parseFloat(p.max) : null)
      }));

    if (paramRows.length > 0) {
      await supabase.from("test_parameters").insert(paramRows);
    }
  }
}

// ==========================================
// 10. DELETE TEST
// ==========================================
export async function deleteTest(testId) {
  await supabase.from("order_tests").delete().eq("test_id", testId);
  await supabase.from("test_parameters").delete().eq("test_id", testId);
  const { error } = await supabase.from("tests").delete().eq("id", testId);
  if (error) throw error;
}

// ==========================================
// 11. STAFF USERS
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

export async function deleteStaffUser(userId) {
  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) throw error;
}

// ==========================================
// 12. LAB SETTINGS
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
      receipt_design: settingsData.receiptDesign || settingsData.receipt_design || {}
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==========================================
// ON-DEMAND SERVER-SIDE PAGINATED QUERY
// ==========================================
export async function getOrdersPaginated({ 
  page = 1, 
  pageSize = 20, 
  dateFrom = "", 
  dateTo = "", 
  searchQuery = "" 
}) {
  const fromIndex = (page - 1) * pageSize;
  const toIndex = fromIndex + pageSize - 1;

  try {
    let query = supabase
      .from("orders")
      .select(`
        *,
        patient:patients(*),
        order_tests(*, test:tests(*, test_parameters(*))),
        results(*)
      `, { count: "exact" });

    // 1. Date Range Filtering directly on database
    if (dateFrom && dateTo) {
      if (dateFrom === dateTo) {
        query = query.eq("order_date", dateFrom);
      } else {
        query = query.gte("order_date", dateFrom).lte("order_date", dateTo);
      }
    } else if (dateFrom) {
      query = query.gte("order_date", dateFrom);
    } else if (dateTo) {
      query = query.lte("order_date", dateTo);
    }

    // 2. Universal Search Filtering on database
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      query = query.or(`barcode.ilike.%${q}%,patient_id.ilike.%${q}%,id.ilike.%${q}%`);
    }

    // 3. Paginated Slice & Order
    query = query.order("order_date", { ascending: false }).range(fromIndex, toIndex);

    const { data, count, error } = await query;

    if (!error && data) {
      return {
        orders: data,
        totalCount: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    }
  } catch (err) {
    console.warn("Paginated query notice:", err.message);
  }

  // Fallback if relational joins fail: simple range query
  try {
    let fallback = supabase.from("orders").select("*, patient:patients(*)", { count: "exact" });
    if (dateFrom) fallback = fallback.gte("order_date", dateFrom);
    if (dateTo) fallback = fallback.lte("order_date", dateTo);

    const { data, count } = await fallback.order("order_date", { ascending: false }).range(fromIndex, toIndex);
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