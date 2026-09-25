import React, { useState, useEffect, useMemo } from "react";
import { 
  getMasterData, getOrdersPaginated, createNewOrder, saveTestResult, 
  verifyAndLockOrder, createNewTestWithParameters, updateExistingTest, 
  deleteTest, toggleTestAvailability, getStaffUsers, registerStaffUser, deleteStaffUser,
  getLabSettings, saveLabSettings, settleOrderDue,
  getDoctorsList, createOrUpdateDoctor, deleteDoctor, seedRadiologyCatalog
} from "./services/api";
import { supabase } from "./supabaseClient";

import { 
  printMoneyReceiptA5, 
  printSpecificVialBarcode, 
  printDepartmentA4Report,
  getAllOrderVials,
  isImagingOrRadiologyInvestigation 
} from "./utils/printHelpers";

import Login from "./components/Login";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import ReceptionPOS from "./components/ReceptionPOS";
import SampleTracking from "./components/SampleTracking";
import Worklists from "./components/Worklists";
import VerificationQC from "./components/VerificationQC";
import ReportsPrint from "./components/ReportsPrint";
import TestManager from "./components/TestManager";
import UserManagement from "./components/UserManagement";
import LabSettings from "./components/LabSettings";
import PatientLivePortal from "./components/PatientLivePortal";
import DoctorManagement from "./components/DoctorManagement";

const MASTER_SAMPLE_TYPES = [
  "Whole Blood", "Serum", "Plasma (Fluoride)", "Plasma (Citrate)", 
  "Clean Catch Urine", "Fresh Stool", "Swab (Throat / Nasal)", 
  "Radiological Study", "Ultrasound Protocol", "Non-Contrast CT Head", "12-Lead Tracing"
];

const MASTER_TUBE_COLORS = [
  "Purple / Lavender (EDTA)", "Red / Yellow (SST / Plain Clot)", 
  "Grey (Fluoride Oxalate)", "Light Blue (Citrate)", "Sterile Urine Cup", "No Specimen (Imaging)"
];

export default function App() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ state: "idle", message: "" });

  // Core Master States
  const [departments, setDepartments] = useState([]);
  const [testCatalog, setTestCatalog] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [labSettings, setLabSettings] = useState(null);

  // Orders & Pagination
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Date Filter Defaults
  const [activePreset, setActivePreset] = useState("TODAY");
  const [dateRange, setDateRange] = useState({ from: todayStr, to: todayStr });
  const [dashboardSearch, setDashboardSearch] = useState("");

  // Patient Tracking Portal
  const [patientTrackingOrder, setPatientTrackingOrder] = useState(null);
  const [isVerifyingPublicUrl, setIsVerifyingPublicUrl] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  // POS Form
  const [selectedTestIds, setSelectedTestIds] = useState([]);
  const [discountVal, setDiscountVal] = useState(0);
  const [paidVal, setPaidVal] = useState(undefined);
  const [patientForm, setPatientForm] = useState({ id: "", name: "", age: "", gender: "Male", phone: "", doctor: "Self" });

  // Test Manager States
  const [editingTest, setEditingTest] = useState(null);
  const [newTestForm, setNewTestForm] = useState({ 
    name: "", code: "", deptId: "DEP-BIO", price: "", sampleType: "Serum", 
    tubeColor: "Red / Yellow (SST / Plain Clot)", isProfile: false, 
    parameters: [{ id: "1", name: "", param_type: "numeric", unit: "U/L", min: "", max: "", reference_text: "" }] 
  });

  // 1. Check Public QR Scan Link
  useEffect(() => {
    const checkPublicQrScan = async () => {
      const params = new URLSearchParams(window.location.search);
      const trackId = params.get("track") || params.get("verify");
      const barcode = params.get("bc");
      if (!trackId && !barcode) return;

      setIsVerifyingPublicUrl(true);
      try {
        const settings = await getLabSettings();
        if (settings) setLabSettings(settings);

        const staff = await getStaffUsers();
        if (staff && staff.length > 0) setStaffList(staff);

        let query = supabase.from("orders").select(`
          *,
          patient:patients(*),
          order_tests(*, test:tests(*, test_parameters(*))),
          results(*)
        `);

        if (trackId) query = query.eq("id", trackId);
        else if (barcode) query = query.eq("barcode", barcode);

        const { data, error } = await query.maybeSingle();

        if (error || !data) {
          const local = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
          const matched = local.find(o => o.id === trackId || o.orderId === trackId || o.barcode === barcode);
          if (matched) setPatientTrackingOrder(matched);
          else setVerificationError("Report record not found or invalid certificate.");
        } else {
          const matchedTests = (data.order_tests || []).map(ot => ot.test || ot.tests || ot).filter(Boolean);
          const resolvedDoc = data.patient?.address?.startsWith("Ref: ") 
            ? data.patient.address.replace("Ref: ", "") 
            : (data.patient?.doctor || "Self");

          setPatientTrackingOrder({
            orderId: data.id,
            receiptNo: `RCP-${(data.order_date || "").replace(/-/g, "").slice(4)}-${data.id.slice(-4)}`,
            date: data.order_date,
            createdAt: data.created_at || data.order_date,
            barcode: data.barcode,
            doctor: resolvedDoc,
            patient: { 
              ...(data.patient || {}), 
              id: data.patient_id, 
              name: data.patient?.name || "Patient", 
              doctor: resolvedDoc 
            },
            tests: matchedTests,
            billing: { paid: data.paid_amount || 0, due: data.due_amount || 0, netPayable: data.net_payable || 0 },
            results: (data.results || []).reduce((acc, r) => ({ ...acc, [r.parameter_id]: { value: r.result_value } }), {}),
            qcStatus: data.qc_status || "Pending",
            isLocked: data.is_locked || false,
            verifierRemarks: data.verifier_remarks || ""
          });
        }
      } catch (err) {
        setVerificationError("Failed to load patient report: " + err.message);
      } finally {
        setIsVerifyingPublicUrl(false);
      }
    };

    checkPublicQrScan();
  }, []);

  // 2. Fetch Master Data
  useEffect(() => {
    if (!currentUser) return;
    const fetchMaster = async () => {
      try {
        const { departments: depts, tests } = await getMasterData();
        setDepartments(depts || []);
        setTestCatalog(tests || []);
        setStaffList((await getStaffUsers()) || []);
        setDoctorsList((await getDoctorsList()) || []);
        setLabSettings(await getLabSettings());
      } catch (e) {
        console.warn("Master fetch warning:", e);
      }
    };
    fetchMaster();
  }, [currentUser]);

const fetchPaginatedOrders = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const res = await getOrdersPaginated({
        page: currentPage,
        pageSize: 20,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        searchQuery: dashboardSearch
      });

      const localOrders = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");

      const formatted = (res.orders || []).map((o, idx) => {
        // Hydrate tests from testCatalog so department/tube_color is never lost
        const matchedTests = (o.order_tests || []).map(ot => {
          const rawTest = ot.test || ot.tests || {};
          const testId = ot.test_id || rawTest.id || ot.id;
          const fromCat = (testCatalog || []).find(t => t.id === testId || (t.code && t.code === rawTest.code)) || {};

          return {
            ...fromCat,
            ...rawTest,
            id: testId,
            name: rawTest.name || fromCat.name || "Investigation",
            code: rawTest.code || fromCat.code || "",
            dept_id: rawTest.dept_id || fromCat.dept_id || rawTest.deptId || fromCat.deptId || "DEP-BIO",
            deptId: rawTest.dept_id || fromCat.dept_id || rawTest.deptId || fromCat.deptId || "DEP-BIO",
            tube_color: rawTest.tube_color || fromCat.tube_color || rawTest.tubeColor || fromCat.tubeColor || "Red / Yellow (SST / Plain Clot)",
            sample_type: rawTest.sample_type || fromCat.sample_type || "Blood"
          };
        }).filter(Boolean);

        const resolvedDoctor = 
          (o.patient?.address && o.patient.address.startsWith("Ref: ")) 
            ? o.patient.address.replace("Ref: ", "") 
            : (o.patient?.doctor || o.doctor || "Self");

        const localMatch = localOrders.find(lo => (lo.orderId || lo.id) === (o.id || o.orderId));
        const resolvedVials = (Array.isArray(o.vials) && o.vials.length > 0)
          ? o.vials
          : (localMatch?.vials && localMatch.vials.length > 0)
            ? localMatch.vials
            : [];

        return {
          orderId: o.id || o.orderId,
          receiptNo: o.receiptNo || `RCP-${(o.order_date || "").replace(/-/g, "").slice(4)}-${String(1001 + idx)}`,
          date: o.order_date || o.date || todayStr,
          createdAt: o.created_at || o.createdAt || o.order_date || todayStr,
          barcode: o.barcode,
          doctor: resolvedDoctor,
          patient: {
            ...(o.patient || {}),
            id: o.patient_id || `P-${1000 + idx}`,
            name: o.patient?.name || "Patient",
            phone: o.patient?.phone || "N/A",
            age: o.patient?.age || 0,
            gender: o.patient?.gender || "Other",
            doctor: resolvedDoctor
          },
          tests: matchedTests.length > 0 ? matchedTests : (o.tests || []),
          vials: resolvedVials,
          billing: o.billing || { 
            subTotal: parseFloat(o.subtotal) || 0, 
            discount: parseFloat(o.discount_percent) || 0, 
            netPayable: parseFloat(o.net_payable) || 0, 
            paid: parseFloat(o.paid_amount) || 0, 
            due: parseFloat(o.due_amount) || 0 
          },
          results: Array.isArray(o.results) 
            ? o.results.reduce((acc, r) => ({ ...acc, [r.parameter_id]: { value: r.result_value } }), {}) 
            : (o.results || {}),
          qcStatus: o.qc_status || o.qcStatus || "Pending", 
          isLocked: o.is_locked || o.isLocked || false, 
          verifierRemarks: o.verifier_remarks || o.verifierRemarks || ""
        };
      });

      formatted.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date).getTime() || 0;
        const timeB = new Date(b.createdAt || b.date).getTime() || 0;
        return timeB - timeA;
      });

      setOrders(formatted);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount || 0);

      if (formatted.length > 0 && !selectedOrderId) {
        setSelectedOrderId(formatted[0].orderId);
      }
    } catch (err) {
      console.error("Pagination load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaginatedOrders();
  }, [currentUser, currentPage, dateRange, dashboardSearch]);

  const handlePresetSwitch = (preset) => {
    setActivePreset(preset);
    setCurrentPage(1);
    const today = new Date();

    if (preset === "TODAY") {
      setDateRange({ from: todayStr, to: todayStr });
    } else if (preset === "YESTERDAY") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setDateRange({ from: yStr, to: yStr });
    } else if (preset === "LAST_7") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setDateRange({ from: d.toISOString().slice(0, 10), to: todayStr });
    } else if (preset === "THIS_MONTH") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      setDateRange({ from: startOfMonth, to: todayStr });
    } else if (preset === "ALL") {
      setDateRange({ from: "", to: "" });
    }
  };

  const activeOrder = useMemo(() => orders.find((o) => o.orderId === selectedOrderId) || orders[0] || null, [orders, selectedOrderId]);

const departmentalVials = useMemo(() => {
    if (!activeOrder?.tests) return [];
    
    // Pass testCatalog so department IDs and tube colors are accurately resolved
    const resolvedVials = getAllOrderVials(activeOrder, testCatalog);
    
    return resolvedVials.map((v) => ({
      deptCode: v.deptCode || "GEN",
      testBarcode: v.barcode || v.testBarcode || activeOrder.barcode,
      patientId: activeOrder.patient?.id || "P-1001",
      patientName: activeOrder.patient?.name || "Patient",
      tubeColor: v.tubeColor || "Standard",
      testNames: v.testNames && v.testNames.length > 0 
        ? v.testNames 
        : (activeOrder.tests || [])
            .filter(t => (t.dept_id || t.deptId || "").replace("DEP-", "") === v.deptCode)
            .map(t => t.code || t.name)
    }));
  }, [activeOrder, testCatalog]);

  const departmentGroupedReports = useMemo(() => {
    if (!activeOrder?.tests) return [];
    const grouped = {};

    activeOrder.tests.forEach((test) => {
      const code = (test.code || "").toUpperCase();
      const name = (test.name || "").toUpperCase();
      const baseDeptId = test.dept_id || test.deptId || "DEP-GEN";

      let groupKey = baseDeptId;
      let groupName = null;
      let groupIcon = null;

      if (code.includes("CBC") || name.includes("COMPLETE BLOOD COUNT")) {
        groupKey = "DEP-HEM-CBC";
        groupName = "Hematology & Coagulation";
        groupIcon = "🩸";
      }

      if (!grouped[groupKey]) {
        const baseDept = departments.find((d) => d.id === baseDeptId) || { id: baseDeptId, name: "General Pathology", icon: "🔬" };
        grouped[groupKey] = {
          dept: {
            id: groupKey,
            name: groupName || baseDept.name,
            icon: groupIcon || baseDept.icon || "🔬"
          },
          tests: []
        };
      }
      grouped[groupKey].tests.push(test);
    });

    return Object.values(grouped);
  }, [activeOrder, departments]);

  const handleSaveOrderToDb = async () => {
    if (!patientForm.name || !patientForm.phone || selectedTestIds.length === 0) {
      return alert("Please fill Patient Name, Phone Number, and select at least one Test.");
    }
    setIsLoading(true);
    try {
      const chosen = testCatalog.filter((t) => selectedTestIds.includes(t.id));
      const sub = chosen.reduce((acc, t) => acc + parseFloat(t.price || 0), 0);
      const net = sub - (sub * discountVal) / 100;
      const finalPaid = paidVal !== undefined ? parseFloat(paidVal) : net;
      const finalDue = Math.max(0, net - finalPaid);

      const createdOrder = await createNewOrder({ 
        patientData: patientForm, 
        testIds: selectedTestIds, 
        discount: discountVal, 
        netPayable: net, 
        paidAmount: finalPaid, 
        dueAmount: finalDue,
        testCatalog: testCatalog
      });

      setOrders(prev => [createdOrder, ...prev.filter(o => o.orderId !== createdOrder.orderId)]);
      setSelectedOrderId(createdOrder.orderId);

      setPatientForm({ id: "", name: "", age: "", gender: "Male", phone: "", doctor: "Self" });
      setSelectedTestIds([]);
      setDiscountVal(0);
      setPaidVal(undefined);

      alert(`✅ Order Created!\nPatient ID: ${createdOrder.patient?.id}\nSample Barcode: ${createdOrder.barcode}\nPaid: ৳${finalPaid} | Due: ৳${finalDue}`);
      setActiveTab("dashboard");
      fetchPaginatedOrders();
    } catch (e) { 
      alert("Error saving order: " + e.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleSettleDue = async (orderId, collectedAmount) => {
    setIsLoading(true);
    try {
      const { newPaid, newDue } = await settleOrderDue(orderId, collectedAmount);
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, billing: { ...o.billing, paid: newPaid, due: newDue } } : o));
      alert(`✅ Payment Collected!\nTotal Paid: ৳${newPaid}\nRemaining Due: ৳${newDue}`);

      const matched = orders.find(o => o.orderId === orderId);
      if (matched) {
        printMoneyReceiptA5({ ...matched, billing: { ...matched.billing, paid: newPaid, due: newDue } }, labSettings);
      }
      fetchPaginatedOrders();
    } catch (e) { 
      alert("Error collecting due: " + e.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleResultInput = async (paramId, val) => {
    if (!activeOrder || activeOrder.isLocked) return;
    const previousOrders = [...orders];
    setOrders((prev) => prev.map((o) => (o.orderId === activeOrder.orderId ? { ...o, results: { ...o.results, [paramId]: { value: val } } } : o)));
    setSaveStatus({ state: "saving", message: "Saving result to cloud..." });

    try {
      await saveTestResult(activeOrder.orderId, paramId, val, "ENTERED");
      setSaveStatus({ state: "saved", message: "Result saved" });
      setTimeout(() => setSaveStatus({ state: "idle", message: "" }), 2000);
    } catch (e) {
      setOrders(previousOrders);
      setSaveStatus({ state: "error", message: "Failed to save: " + e.message });
      alert("⚠️ Error saving result: " + e.message);
    }
  };

  const handleRemarksChange = (val) => {
    if (!activeOrder || activeOrder.isLocked) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.orderId === activeOrder.orderId ? { ...o, verifierRemarks: val } : o
      )
    );
  };

  const handleVerifyInDb = async () => {
    if (!activeOrder) return;
    setIsLoading(true);
    try {
      const remarksToSave = activeOrder.verifierRemarks?.trim() || "Clinically correlated and verified with internal quality control standards.";
      await verifyAndLockOrder(activeOrder.orderId, remarksToSave, currentUser?.name || "Consultant Pathologist");
      
      setOrders(prev => prev.map(o => o.orderId === activeOrder.orderId ? {
        ...o,
        qcStatus: "Verified",
        isLocked: true,
        verifierRemarks: remarksToSave
      } : o));

      alert("✅ Report Verified and Locked with Remarks!");
      fetchPaginatedOrders();
    } catch (e) { 
      alert("Verification failed: " + e.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleSaveNewTest = async () => {
    if (!newTestForm.name || !newTestForm.code || !newTestForm.price) return alert("Fill Name, Code, Price.");
    setIsLoading(true);
    try {
      await createNewTestWithParameters(newTestForm);
      alert("✅ Test Created!");
      const { tests } = await getMasterData();
      setTestCatalog(tests || []);
      setActiveTab("reception");
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  // OPEN EDIT MODAL (PRESERVES MULTI-RANGE GENDER/AGE TEXT)
  const handleOpenEditModal = (t) => {
    const rawParams = t.test_parameters || t.parameters || [];
    const normalizedParams = rawParams.length > 0
      ? rawParams.map((p, i) => ({
          id: p.id || `p-${i + 1}`,
          name: p.name || "",
          param_type: p.reference_text || p.ref_text ? "multirange" : (p.param_type || "numeric"),
          unit: p.unit || "",
          min: p.min_range !== null && p.min_range !== undefined ? p.min_range : (p.min !== undefined ? p.min : ""),
          max: p.max_range !== null && p.max_range !== undefined ? p.max_range : (p.max !== undefined ? p.max : ""),
          reference_text: p.reference_text || p.ref_text || ""
        }))
      : [{ id: "1", name: t.name || "", param_type: "numeric", unit: "", min: "", max: "", reference_text: "" }];

    setEditingTest({
      ...t,
      id: t.id,
      name: t.name || "",
      code: t.code || "",
      deptId: t.dept_id || t.deptId || (departments[0]?.id || "DEP-BIO"),
      dept_id: t.dept_id || t.deptId || (departments[0]?.id || "DEP-BIO"),
      price: t.price || "",
      sampleType: t.sample_type || t.sampleType || "Serum",
      tubeColor: t.tube_color || t.tubeColor || "Red / Yellow (SST / Plain Clot)",
      isProfile: t.is_profile !== undefined ? Boolean(t.is_profile) : Boolean(t.isProfile),
      is_available: t.is_available !== undefined ? t.is_available : true,
      parameters: normalizedParams
    });
  };

  const handleSaveTestEdits = async () => {
    if (!editingTest) return;
    if (!editingTest.name || !editingTest.code) return alert("Fill Name and Code.");
    setIsLoading(true);
    try {
      await updateExistingTest(editingTest.id, editingTest);
      alert("✅ Test Updated Successfully!");
      setEditingTest(null);
      const { tests } = await getMasterData();
      setTestCatalog(tests || []);
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleDeleteTest = async (testId, testName) => {
    if (!window.confirm(`Delete "${testName}"?`)) return;
    setIsLoading(true);
    try {
      await deleteTest(testId);
      const { tests } = await getMasterData();
      setTestCatalog(tests || []);
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  // 1-CLICK REAGENT STOCK TOGGLE HANDLER
  const handleToggleReagent = async (testId, newStatus) => {
    try {
      await toggleTestAvailability(testId, newStatus);
      setTestCatalog((prev) =>
        prev.map((t) => (t.id === testId ? { ...t, is_available: newStatus } : t))
      );
    } catch (e) {
      alert("Error updating reagent status: " + e.message);
    }
  };

  const handleSeedRadiology = async () => {
    setIsLoading(true);
    try {
      await seedRadiologyCatalog();
      const { departments: depts, tests } = await getMasterData();
      setDepartments(depts || []);
      setTestCatalog(tests || []);
      alert("✅ Standard Radiology & Imaging Catalog added successfully!");
    } catch (e) {
      alert("Notice loading radiology tests: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterStaff = async (staffData) => {
    setIsLoading(true);
    try {
      await registerStaffUser(staffData);
      alert("✅ Staff Registered!");
      setStaffList((await getStaffUsers()) || []);
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleDeleteStaff = async (userId, userName) => {
    if (!window.confirm(`Delete staff "${userName}"?`)) return;
    setIsLoading(true);
    try {
      await deleteStaffUser(userId);
      setStaffList((await getStaffUsers()) || []);
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleSaveDoctor = async (docData) => {
    setIsLoading(true);
    try {
      await createOrUpdateDoctor(docData);
      setDoctorsList((await getDoctorsList()) || []);
      alert("✅ Doctor Saved Successfully!");
    } catch (e) {
      alert("Error saving doctor: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDoctor = async (docId) => {
    setIsLoading(true);
    try {
      await deleteDoctor(docId);
      setDoctorsList((await getDoctorsList()) || []);
    } catch (e) {
      alert("Error deleting doctor: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (settingsData) => {
    setIsLoading(true);
    try {
      localStorage.setItem("apex_lab_settings", JSON.stringify(settingsData));
      const saved = await saveLabSettings(settingsData);
      setLabSettings(saved || settingsData);
      alert("✅ Settings Saved to Database!");
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  if (isVerifyingPublicUrl) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-bold">Connecting to Clinical LIMS...</h2>
        <p className="text-xs text-slate-400 mt-1">Retrieving live laboratory status</p>
      </div>
    );
  }

  if (patientTrackingOrder || verificationError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
        {patientTrackingOrder ? (
          <PatientLivePortal
            order={patientTrackingOrder}
            labSettings={labSettings}
            staffList={staffList}
          />
        ) : (
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full text-center space-y-3">
            <p className="text-rose-600 font-bold text-sm">Report Not Found</p>
            <p className="text-xs text-slate-500">{verificationError}</p>
            <button
              onClick={() => {
                window.history.replaceState({}, document.title, window.location.pathname);
                setVerificationError("");
              }}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold w-full"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Login 
        onLoginSuccess={(u) => { 
          setCurrentUser(u); 
          const role = (u.role || "").toLowerCase();
          setActiveTab(
            role === "receptionist" ? "reception" : 
            role === "technologist" ? "worklists" : 
            role === "verifier" || role === "biochemist" ? "verifier" : "dashboard"
          ); 
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans w-full">
      <Navbar 
        currentUser={currentUser} 
        onLogout={() => setCurrentUser(null)} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
        loadDatabaseData={fetchPaginatedOrders} 
        isLoading={isLoading} 
        labSettings={labSettings} 
      />
      
      {saveStatus.state !== "idle" && (
        <div className={`py-1.5 px-4 text-xs text-center font-bold transition ${
          saveStatus.state === "saving" ? "bg-amber-500 text-white" : 
          saveStatus.state === "error" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
        }`}>
          {saveStatus.message}
        </div>
      )}

      <main className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 flex-1">
        {activeTab === "dashboard" && (
          <Dashboard 
            orders={orders} 
            departments={departments} 
            testCatalog={testCatalog} 
            setSelectedOrderId={setSelectedOrderId} 
            setActiveTab={setActiveTab} 
            handlePrintMoneyReceipt={(ord) => printMoneyReceiptA5(ord, labSettings)} 
            handleSettleDue={handleSettleDue}
            dashboardSearch={dashboardSearch} 
            setDashboardSearch={setDashboardSearch} 
            dateRange={dateRange} 
            setDateRange={setDateRange} 
            activePreset={activePreset}
            setPreset={handlePresetSwitch}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={20}
            isLoading={isLoading}
          />
        )}

        {activeTab === "reception" && (
          <ReceptionPOS 
            testCatalog={testCatalog} 
            patientForm={patientForm} 
            setPatientForm={setPatientForm} 
            selectedTestIds={selectedTestIds} 
            setSelectedTestIds={setSelectedTestIds} 
            discountVal={discountVal} 
            setDiscountVal={setDiscountVal} 
            paidVal={paidVal}
            setPaidVal={setPaidVal}
            handleSaveOrderToDb={handleSaveOrderToDb} 
            handlePrintMoneyReceipt={() => printMoneyReceiptA5(activeOrder, labSettings)} 
            activeOrder={activeOrder} 
            isLoading={isLoading} 
            doctorsList={doctorsList}
          />
        )}

        {activeTab === "samples" && (
          <SampleTracking 
            activeOrder={activeOrder} 
            departmentalVials={departmentalVials} 
            handlePrintSpecificVialBarcode={(v) => printSpecificVialBarcode(v, () => setTrackingStatus((p) => ({ ...p, [activeOrder?.orderId]: { ...p[activeOrder?.orderId], barcodePrinted: true } })))} 
            trackingStatus={trackingStatus} 
          />
        )}

        {activeTab === "worklists" && (
          <Worklists 
            orders={orders} 
            departments={departments} 
            setSelectedOrderId={setSelectedOrderId} 
            setActiveTab={setActiveTab} 
          />
        )}

        {activeTab === "verifier" && (
          <VerificationQC 
            activeOrder={activeOrder} 
            handleResultInput={handleResultInput} 
            handleRemarksChange={handleRemarksChange}
            handleVerifyInDb={handleVerifyInDb} 
            isLoading={isLoading} 
            saveStatus={saveStatus} 
            currentUser={currentUser} 
          />
        )}

        {/* REPORTS & PRINT (WITH PRE-PRINTED AL-FATTAH PAD TOGGLE) */}
        {activeTab === "reports" && (
          <ReportsPrint 
            activeOrder={activeOrder} 
            currentUser={currentUser} 
            departmentGroupedReports={departmentGroupedReports} 
            handlePrintDepartmentA4Report={(deptId, usePad) => 
              printDepartmentA4Report(
                deptId, 
                activeOrder, 
                departmentGroupedReports, 
                staffList, 
                labSettings, 
                () => setTrackingStatus((p) => ({ ...p, [activeOrder?.orderId]: { ...p[activeOrder?.orderId], reportPrinted: true } })),
                usePad
              )
            } 
            staffList={staffList} 
            labSettings={labSettings} 
            onOpenVerificationModal={() => setPatientTrackingOrder(activeOrder)} 
            handleSettleDue={handleSettleDue}
            handleRemarksChange={handleRemarksChange}
          />
        )}

        {activeTab === "test-manager" && (
          <TestManager 
            departments={departments} 
            testCatalog={testCatalog} 
            newTestForm={newTestForm} 
            setNewTestForm={setNewTestForm} 
            handleSaveNewTest={handleSaveNewTest} 
            handleSaveTestEdits={handleSaveTestEdits} 
            handleDeleteTest={handleDeleteTest} 
            handleToggleReagent={handleToggleReagent}
            editingTest={editingTest} 
            setEditingTest={setEditingTest} 
            handleOpenEditModal={handleOpenEditModal}
            handleSeedRadiology={handleSeedRadiology}
            MASTER_SAMPLE_TYPES={MASTER_SAMPLE_TYPES} 
            MASTER_TUBE_COLORS={MASTER_TUBE_COLORS} 
            isLoading={isLoading} 
          />
        )}

        {activeTab === "staff-manager" && (
          <UserManagement 
            staffList={staffList} 
            handleRegisterStaff={handleRegisterStaff} 
            handleDeleteStaff={handleDeleteStaff} 
            isLoading={isLoading} 
          />
        )}

        {activeTab === "lab-settings" && (
          <LabSettings 
            labSettings={labSettings} 
            handleSaveSettings={handleSaveSettings} 
            isLoading={isLoading} 
          />
        )}

        {activeTab === "doctor-manager" && (
          <DoctorManagement 
            doctorsList={doctorsList} 
            handleSaveDoctor={handleSaveDoctor} 
            handleDeleteDoctor={handleDeleteDoctor} 
            isLoading={isLoading} 
          />
        )}
      </main>
    </div>
  );
}