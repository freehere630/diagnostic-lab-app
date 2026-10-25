import RolePermissions from "./components/RolePermissions";
import AnalyzerSettings from "./components/AnalyzerSettings";
import AuditLog from "./components/AuditLog";
import DoctorProfile from "./components/DoctorProfile";
import React, { useState, useEffect, useMemo, useRef } from "react";
import DoctorCommissions from "./components/DoctorCommissions";
import {
  getMasterData, getOrdersPaginated, createNewOrder, saveTestResult,
  verifyAndLockOrder, createNewTestWithParameters, updateExistingTest,
  deleteTest, toggleTestAvailability, getStaffUsers,
  getLabSettings, saveLabSettings, settleOrderDue,
  getDoctorsList, createOrUpdateDoctor, deleteDoctor, seedRadiologyCatalog,
  markSampleRecollected, requestSampleRecollection,
} from "./services/api";

import {
  createStaffUser,
  deleteStaffUser as deleteStaffUserAuth,
  logout as authLogout,
  getCurrentSession,
  fetchProfileForUser,
  mapUser,
} from "./services/authApi";

import { supabase } from "./supabaseClient";
import { onInventoryUpdate } from "./utils/inventoryEvents";
import { consumeTestReagents } from "./services/inventoryApi";

import {
  printMoneyReceiptA5,
  printSpecificVialBarcode,
  printDepartmentA4Report,
  getAllOrderVials,
} from "./utils/printHelpers";

// Components
import Login from "./components/Login";
import AppLayout from "./components/AppLayout";
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

// Inventory Components
import InventoryItems from "./components/InventoryItems";
import SupplierManagement from "./components/SupplierManagement";
import ReceiveStockModal from "./components/ReceiveStockModal";
import StockLedger from "./components/StockLedger";
import InventoryDashboard from "./components/InventoryDashboard";
import PurchaseOrders from "./components/PurchaseOrders";
import PurchaseOrderDetail from "./components/PurchaseOrderDetail";
import ReceiveAgainstPOModal from "./components/ReceiveAgainstPOModal";
import MachineDashboard from "./components/MachineDashboard";
import StockOperations from "./components/StockOperations";
import InventoryReports from "./components/InventoryReports";

// Finance Components
import FinanceDashboard from "./components/FinanceDashboard";
import CashClosing from "./components/CashClosing";

// Format a Date as YYYY-MM-DD in the USER'S local timezone.
const toLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const MASTER_SAMPLE_TYPES = [
  "Whole Blood", "Serum", "Plasma (Fluoride)", "Plasma (Citrate)",
  "Clean Catch Urine", "Fresh Stool", "Swab (Throat / Nasal)",
  "Radiological Study", "Ultrasound Protocol", "Non-Contrast CT Head", "12-Lead Tracing",
  "Biopsy Specimen", "Aspiration Smear", "Fresh Specimen",
];

const MASTER_TUBE_COLORS = [
  "Purple / Lavender (EDTA)", "Red / Yellow (SST / Plain Clot)",
  "Grey (Fluoride Oxalate)", "Light Blue (Citrate)", "Sterile Urine Cup", "No Specimen (Imaging)",
  "Formalin Container", "Fixed Glass Slides",
];

export default function App() {
  const todayStr = toLocalDateStr();

  // ============================================================
  // 1. STATE
  // ============================================================
  const [selectedDoctorForProfile, setSelectedDoctorForProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ state: "idle", message: "" });

  // Core master data
  const [departments, setDepartments] = useState([]);
  const [testCatalog, setTestCatalog] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [labSettings, setLabSettings] = useState(null);

  // Orders & pagination
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Date filter
  const readSavedDateFilter = () => {
    try {
      const raw = sessionStorage.getItem("apex_date_filter");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.from && parsed?.to && parsed?.preset) return parsed;
      }
    } catch (e) { /* fall through */ }
    return { from: todayStr, to: todayStr, preset: "TODAY" };
  };
  const initialDateFilter = readSavedDateFilter();
  const [activePreset, setActivePreset] = useState(initialDateFilter.preset);
  const [dateRange, setDateRange] = useState({ from: initialDateFilter.from, to: initialDateFilter.to });
  const [dashboardSearch, setDashboardSearch] = useState("");

  // Patient tracking portal
  const [patientTrackingOrder, setPatientTrackingOrder] = useState(null);
  const [isVerifyingPublicUrl, setIsVerifyingPublicUrl] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  // POS form (SPLIT PAYMENTS)
  const [selectedTestIds, setSelectedTestIds] = useState([]);
  const [discountVal, setDiscountVal] = useState(0);
  const [paidCashVal, setPaidCashVal] = useState("");
  const [paidOnlineVal, setPaidOnlineVal] = useState("");
  const [patientForm, setPatientForm] = useState({
    id: "", name: "", age: "", gender: "Male", phone: "", doctor: "Self",
  });

  // Test manager
  const [editingTest, setEditingTest] = useState(null);
  const [newTestForm, setNewTestForm] = useState({
    name: "", code: "", deptId: "DEP-BIO", price: "", sampleType: "Serum",
    tubeColor: "Red / Yellow (SST / Plain Clot)", isProfile: false, reportType: "tabular",
    parameters: [{ id: "1", name: "", param_type: "numeric", unit: "U/L", min: "", max: "", reference_text: "" }],
    consumables: [],
  });

  // Inventory Modals
  const [receiveStockOpen, setReceiveStockOpen] = useState(false);
  const [receiveStockInitialItemId, setReceiveStockInitialItemId] = useState(null);
  const [selectedPOId, setSelectedPOId] = useState(null);
  const [receivePOId, setReceivePOId] = useState(null);

  // ============================================================
  // 2. REFS
  // ============================================================
  const lastActiveOrderRef = useRef(null);
  const savingRef = useRef(false);          // <-- guards handleSaveOrderToDb
  const resultWriteTimers = useRef({});
  const recentlyWrittenRef = useRef({});
  const fetchSeqRef = useRef(0);

  // ============================================================
  // 3. MEMOS
  // ============================================================
  const activeOrder = useMemo(() => {
    const found = orders.find((o) => o.orderId === selectedOrderId || o.id === selectedOrderId);
    if (found) {
      lastActiveOrderRef.current = found;
      return found;
    }
    return lastActiveOrderRef.current || orders[0] || null;
  }, [orders, selectedOrderId]);

  const visitOrders = useMemo(() => {
    if (!activeOrder) return [];
    const key = activeOrder.receiptNo;
    if (!key) return [activeOrder];
    const siblings = orders.filter((o) => o.receiptNo === key);
    return siblings.length > 0 ? siblings : [activeOrder];
  }, [orders, activeOrder]);

  const departmentalVials = useMemo(() => {
    if (!visitOrders || visitOrders.length === 0) return [];
    const collected = [];
    for (const vo of visitOrders) {
      const vials = getAllOrderVials(vo, testCatalog);
      for (const v of vials) {
        const bc = v.barcode || v.testBarcode;
        if (!collected.some((c) => c.barcode === bc)) collected.push(v);
      }
    }
    return collected.map((v) => ({
      deptCode: v.deptCode || "GEN",
      testBarcode: v.barcode || v.testBarcode,
      patientId: activeOrder?.patient?.id || "P-1001",
      patientName: activeOrder?.patient?.name || "Patient",
      tubeColor: v.tubeColor || "Standard",
      testNames: v.testNames && v.testNames.length > 0 ? v.testNames : [],
    }));
  }, [visitOrders, activeOrder, testCatalog]);

  const departmentGroupedReports = useMemo(() => {
    const sources = (visitOrders && visitOrders.length > 0) ? visitOrders : (activeOrder ? [activeOrder] : []);
    const allTests = [];
    for (const vo of sources) {
      const voId = vo.orderId || vo.id;
      const voBc = String(vo.barcode || "").split(/[\s,]+/)[0];
      const voLocked = vo.isLocked === true || vo.qcStatus === "Verified";
      for (const t of (vo.tests || [])) {
        allTests.push({ ...t, _owningOrderId: voId, _owningBarcode: voBc, _owningLocked: voLocked });
      }
    }
    if (allTests.length === 0) return [];

    const grouped = {};
    allTests.forEach((test) => {
      const code = (test.code || "").toUpperCase();
      const name = (test.name || "").toUpperCase();
      
      // FIX: Normalize short IDs like "IMM" or "HEM" to "DEP-IMM" / "DEP-HEM"
      let baseDeptId = (test.dept_id || test.deptId || "DEP-BIO").toUpperCase();
      if (baseDeptId === "IMM") baseDeptId = "DEP-IMM";
      if (baseDeptId === "HEM") baseDeptId = "DEP-HEM";
      if (baseDeptId === "BIO") baseDeptId = "DEP-BIO";
      if (baseDeptId === "PAT") baseDeptId = "DEP-PAT";
      if (baseDeptId === "MIC") baseDeptId = "DEP-MIC";

      let groupKey = baseDeptId;
      let groupName = null;
      let groupIcon = null;

      // Explicitly map names so they are always full and correct
      if (baseDeptId === "DEP-IMM") {
        groupKey = "DEP-IMM"; groupName = "Immunology & Endocrinology"; groupIcon = "🧬";
      } else if (baseDeptId === "DEP-HEM") {
        groupKey = "DEP-HEM"; groupName = "Hematology & Coagulation"; groupIcon = "🩸";
      } else if (baseDeptId === "DEP-BIO") {
        groupKey = "DEP-BIO"; groupName = "Clinical Biochemistry"; groupIcon = "🧪";
      } else if (baseDeptId === "DEP-MIC") {
        groupKey = "DEP-MIC"; groupName = "Microbiology & Serology"; groupIcon = "🔬";
      } else if (code.includes("CBC") || name.includes("COMPLETE BLOOD COUNT")) {
        groupKey = "DEP-HEM-CBC"; groupName = "Hematology & Coagulation"; groupIcon = "🩸";
      } else if (code.includes("URINE") || name.includes("URINE")) {
        groupKey = "DEP-PAT-URINE"; groupName = "Clinical Pathology & Urine Analysis"; groupIcon = "🧫";
      } else if (code.includes("STOOL") || name.includes("STOOL")) {
        groupKey = "DEP-PAT-STOOL"; groupName = "Clinical Pathology & Stool Examination"; groupIcon = "🔬";
      } else if (code.includes("WIDAL")) {
        groupKey = "DEP-MIC-WIDAL"; groupName = "Microbiology & Serology"; groupIcon = "🧪";
      } else if (code.includes("SEMEN")) {
        groupKey = "DEP-PAT-SEMEN"; groupName = "Clinical Pathology & Andrology"; groupIcon = "🔬";
      }

      if (!grouped[groupKey]) {
        const baseDept = departments.find((d) => d.id === baseDeptId) || { id: baseDeptId, name: "General Pathology", icon: "🔬" };
        grouped[groupKey] = {
          dept: { 
            id: groupKey, 
            name: groupName || baseDept.name, 
            icon: groupIcon || baseDept.icon || "🔬" 
          },
          tests: [], ownerOrderId: null, ownerBarcode: null, ownerLocked: false, ownerOrder: null,
        };
      }
      grouped[groupKey].tests.push(test);
      
      // ... (leave the rest of the original logic exactly as it is)

      if (!grouped[groupKey].ownerOrderId && test._owningOrderId) {
        const owner = sources.find((o) => (o.orderId || o.id) === test._owningOrderId);
        grouped[groupKey].ownerOrderId = test._owningOrderId;
        grouped[groupKey].ownerBarcode = test._owningBarcode;
        grouped[groupKey].ownerLocked = test._owningLocked;
        grouped[groupKey].ownerOrder = owner || null;
      }
    });
    return Object.values(grouped);
  }, [activeOrder, visitOrders, departments]);

  // ============================================================
  // 4. EFFECTS
  // ============================================================

  // --- Public QR scan ---
  useEffect(() => {
    const checkPublicQrScan = async () => {
      const params = new URLSearchParams(window.location.search);
      const trackId = params.get("track") || params.get("verify");
      const barcode = params.get("bc");
      if (!trackId && !barcode) return;

      setIsVerifyingPublicUrl(true);
      try {
        try {
          const settings = await getLabSettings();
          if (settings) setLabSettings(settings);
        } catch (e) { /* anon cannot read lab_settings */ }

        const { data: rpcData, error: rpcErr } = await supabase.rpc("lookup_order_by_qr", {
          p_track_id: trackId || null, p_barcode: barcode || null,
        });
        if (rpcErr) throw rpcErr;
        if (!rpcData) {
          setVerificationError("Report record not found or invalid certificate.");
          return;
        }

        // Normalize results for the portal
        const normalizedResults = (() => {
          const raw = rpcData.results;
          if (!raw) return {};
          if (Array.isArray(raw)) {
            return raw.reduce((acc, r) => {
              if (r && r.parameter_id !== undefined && r.parameter_id !== null) {
                acc[r.parameter_id] = { value: r.result_value };
              }
              return acc;
            }, {});
          }
          const out = {};
          for (const [k, v] of Object.entries(raw)) {
            out[k] = (v && typeof v === "object" && !Array.isArray(v)) ? v : { value: v };
          }
          return out;
        })();

        setStaffList(Array.isArray(rpcData.staff) ? rpcData.staff : []);
        setPatientTrackingOrder({ ...rpcData, results: normalizedResults });
      } catch (err) {
        console.error("QR lookup failed:", err);
        setVerificationError("Failed to load patient report: " + (err.message || String(err)));
      } finally {
        setIsVerifyingPublicUrl(false);
      }
    };
    checkPublicQrScan();
  }, []);

  // --- Session restore + auth listener ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      const session = await getCurrentSession();
      if (!mounted || !session?.user) return;
      const profile = await fetchProfileForUser(session.user.id);
      if (!mounted || !profile) return;
      const user = mapUser(session.user, profile);
      setCurrentUser(user);
      const role = (user.role || "").toLowerCase();
      setActiveTab(
        role === "receptionist" ? "reception" :
        role === "technologist" ? "worklists" :
        role === "verifier" || role === "biochemist" ? "verifier" : "dashboard"
      );
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) setCurrentUser(null);
    });

    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  // --- Persist date filter ---
  useEffect(() => {
    try {
      sessionStorage.setItem("apex_date_filter", JSON.stringify({ from: dateRange.from, to: dateRange.to, preset: activePreset }));
    } catch (e) { /* private mode */ }
  }, [dateRange, activePreset]);

  // --- Sync "Today" at midnight ---
  useEffect(() => {
    if (activePreset !== "TODAY") return;
    const check = () => {
      const now = toLocalDateStr();
      if (dateRange.from !== now || dateRange.to !== now) setDateRange({ from: now, to: now });
    };
    window.addEventListener("focus", check);
    const t = setInterval(check, 120000);
    return () => { window.removeEventListener("focus", check); clearInterval(t); };
  }, [activePreset, dateRange]);

  // --- Focus listener for refetch ---
  useEffect(() => {
    if (!currentUser) return;
    const onFocus = () => fetchPaginatedOrders(true);
    const onVisibility = () => { if (!document.hidden) onFocus(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // --- Master data fetch ---
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

  useEffect(() => {
    if (!currentUser) return;
    fetchMaster();
  }, [currentUser]);

  // --- Listen for inventory changes ---
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = onInventoryUpdate(() => {
      fetchMaster(); // Refreshes the test catalog (POS out-of-stock logic)
      fetchPaginatedOrders(true); // Refreshes the dashboard orders
    });
    return () => unsubscribe();
  }, [currentUser]);

  // --- Main paginated orders fetcher ---
  const fetchPaginatedOrders = async (silent = false) => {
    if (!currentUser) return;
    const mySeq = ++fetchSeqRef.current;
    if (!silent) setIsLoading(true);

    try {
      const res = await getOrdersPaginated({
        page: currentPage, pageSize: 20, dateFrom: dateRange.from, dateTo: dateRange.to, searchQuery: dashboardSearch,
      });
      if (mySeq !== fetchSeqRef.current) return;

      const localOrders = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
      const localById = new Map();
      const localSearchIndex = localOrders.map((lo) => {
        const key = lo.orderId || lo.id;
        if (key) localById.set(key, lo);
        const vials = (lo.vials && lo.vials.length > 0) ? lo.vials : getAllOrderVials(lo, testCatalog);
        const barcodes = [
          lo.barcode, ...(lo.allBarcodes || []), ...(lo.barcodesList || []),
          ...vials.map((v) => v.barcode), ...(lo.tests || []).map((t) => t.vialBarcode || t.barcode),
        ].filter(Boolean).map((b) => String(b).toLowerCase());
        return { order: lo, barcodes, name: (lo.patient?.name || "").toLowerCase(), id: String(lo.patient?.id || "").toLowerCase(), phone: String(lo.patient?.phone || "") };
      });

      if (res.orders.length === 0 && dashboardSearch && dashboardSearch.trim()) {
        const q = dashboardSearch.trim().toLowerCase();
        const matchedLocal = localSearchIndex.filter((e) =>
          e.barcodes.some((b) => b.includes(q)) || e.name.includes(q) || e.id.includes(q) || e.phone.includes(q)
        ).map((e) => e.order);
        if (matchedLocal.length > 0) {
          setOrders(matchedLocal);
          setSelectedOrderId(matchedLocal[0].orderId || matchedLocal[0].id);
          setTotalPages(1);
          setTotalCount(matchedLocal.length);
          if (!silent) setIsLoading(false);
          return;
        }
      }

      const formatted = (res.orders || []).map((o, idx) => {
        const localMatch = localById.get(o.id || o.orderId);
        let restoredVials = [];
        if (Array.isArray(o.results)) {
          const vialRow = o.results.find((r) => r.parameter_id === "SPECIMEN_VIALS");
          if (vialRow && vialRow.result_value) { try { restoredVials = JSON.parse(vialRow.result_value); } catch (e) {} }
        }
        if (restoredVials.length === 0 && localMatch?.vials && localMatch.vials.length > 0) restoredVials = localMatch.vials;

        const matchedTests = (o.order_tests || []).map((ot) => {
          const rawTest = ot.test || ot.tests || {};
          const testId = ot.test_id || rawTest.id || ot.id;
          const fromCat = (testCatalog || []).find((t) => t.id === testId || (t.code && t.code === rawTest.code)) || {};
          const catParams = fromCat.test_parameters || fromCat.parameters || [];
          const rawParams = rawTest.test_parameters || rawTest.parameters || [];
          const resolvedParams = catParams.length > 0 ? catParams : rawParams;
          let specificVialBc = "";
          if (restoredVials.length > 0) {
            const vMatch = restoredVials.find((v) => v.testIds?.includes(testId) || v.testIds?.includes(rawTest.code) || v.testNames?.includes(rawTest.name));
            if (vMatch) specificVialBc = vMatch.barcode;
          }
          return {
            ...fromCat, ...rawTest, id: testId, name: rawTest.name || fromCat.name || "Investigation", code: rawTest.code || fromCat.code || "",
            dept_id: rawTest.dept_id || fromCat.dept_id || rawTest.deptId || fromCat.deptId || "DEP-BIO",
            deptId: rawTest.dept_id || fromCat.dept_id || rawTest.deptId || fromCat.deptId || "DEP-BIO",
            tube_color: rawTest.tube_color || fromCat.tube_color || rawTest.tubeColor || fromCat.tubeColor || "Red / Yellow (SST / Plain Clot)",
            sample_type: rawTest.sample_type || fromCat.sample_type || "Blood", report_type: rawTest.report_type || fromCat.report_type || "tabular",
            vialBarcode: specificVialBc || rawTest.vialBarcode || "", test_parameters: resolvedParams, parameters: resolvedParams,
          };
        }).filter(Boolean);

        const orderPrimaryBc = String(o.barcode || "").split(/[\s,]+/)[0];
        const filterByVial = (arr) => {
          if (!Array.isArray(arr)) return [];
          if (!orderPrimaryBc) return arr;
          return arr.filter((t) => { const tb = t?.vialBarcode || t?.barcode; if (!tb) return true; return String(tb) === orderPrimaryBc; });
        };

        const localMatchTests = filterByVial(localMatch?.tests);
        const dbFallbackTests = filterByVial(o.tests);
        const resolvedTests = (matchedTests && matchedTests.length > 0) ? matchedTests : (localMatchTests.length > 0) ? localMatchTests : dbFallbackTests;

        const resolvedDoctor = (o.patient?.address && o.patient.address.startsWith("Ref: ")) ? o.patient.address.replace("Ref: ", "") : (o.patient?.doctor || o.doctor || "Self");
        const resolvedVials = restoredVials.length > 0 ? restoredVials : getAllOrderVials({ ...o, tests: resolvedTests }, testCatalog);

        let resolvedDeptRemarks = {};
        try {
          if (o.verifier_remarks && typeof o.verifier_remarks === "string" && o.verifier_remarks.trim().startsWith("{")) resolvedDeptRemarks = JSON.parse(o.verifier_remarks);
        } catch (e) {}

        if (Array.isArray(o.results)) {
          o.results.forEach((r) => {
            if (r.parameter_id && r.parameter_id.startsWith("DEPT_REMARKS_")) {
              const dId = r.parameter_id.replace("DEPT_REMARKS_", "");
              if (r.result_value !== undefined && r.result_value !== null) resolvedDeptRemarks[dId] = r.result_value;
            }
          });
        }

        const rawBarcodeStr = String(o.barcode || "");
        const allBarcodesList = rawBarcodeStr.split(/[\s,]+/).filter(Boolean);
        const primaryBarcode = allBarcodesList[0] || (resolvedVials[0]?.barcode) || "2026000001";

        return {
          orderId: o.id || o.orderId, receiptNo: o.receipt_no || o.receiptNo || `RCP-${(o.order_date || "").replace(/-/g, "")}-${String(1001 + idx)}`,
          date: o.order_date || o.date || todayStr, createdAt: o.created_at || o.createdAt || o.order_date || todayStr, verifiedAt: o.verified_at || o.verifiedAt || null,
          barcode: primaryBarcode, allBarcodes: allBarcodesList.length > 0 ? allBarcodesList : resolvedVials.map((v) => v.barcode),
          barcodesList: allBarcodesList.length > 0 ? allBarcodesList : resolvedVials.map((v) => v.barcode), doctor: resolvedDoctor,
          patient: { ...(o.patient || {}), id: o.patient_id || `P-${1000 + idx}`, name: o.patient?.name || "Patient", phone: o.patient?.phone || "N/A", age: o.patient?.age || 0, gender: o.patient?.gender || "Other", doctor: resolvedDoctor },
          tests: resolvedTests, vials: resolvedVials,
          billing: o.billing || { subTotal: parseFloat(o.subtotal) || 0, discount: parseFloat(o.discount_percent) || 0, netPayable: parseFloat(o.net_payable) || 0, paid: parseFloat(o.paid_amount) || 0, due: parseFloat(o.due_amount) || 0 },
          results: Array.isArray(o.results) ? o.results.reduce((acc, r) => ({ ...acc, [r.parameter_id]: { value: r.result_value } }), {}) : (o.results || {}),
          sample_status: o.sample_status || o.sampleStatus || localMatch?.sample_status || "Order Created", sampleStatus: o.sample_status || o.sampleStatus || localMatch?.sample_status || "Order Created",
          qcStatus: o.qc_status || o.qcStatus || "Pending", isLocked: o.is_locked || o.isLocked || false, dept_remarks: resolvedDeptRemarks, deptRemarks: resolvedDeptRemarks,
          verifierRemarks: typeof o.verifier_remarks === "string" && !o.verifier_remarks.startsWith("{") ? o.verifier_remarks : (resolvedDeptRemarks["GLOBAL"] || ""), verifier_remarks: o.verifier_remarks || "",
        };
      });

      formatted.sort((a, b) => (new Date(b.createdAt || b.date).getTime() || 0) - (new Date(a.createdAt || a.date).getTime() || 0));
      setOrders(formatted);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount || 0);
      if (formatted.length > 0 && !selectedOrderId) setSelectedOrderId(formatted[0].orderId);
    } catch (err) {
      if (mySeq === fetchSeqRef.current) console.error("Pagination load error:", err);
    } finally {
      if (!silent && mySeq === fetchSeqRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaginatedOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, currentPage, dateRange, dashboardSearch]);

  // --- Realtime listener ---
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase.channel("lims-realtime-listener")
      .on("postgres_changes", { event: "*", schema: "public", table: "results" }, (payload) => {
        const newResult = payload.new; if (!newResult) return;
        const paramId = newResult.parameter_id;
        if (recentlyWrittenRef.current[paramId] && Date.now() < recentlyWrittenRef.current[paramId]) return;
        if (recentlyWrittenRef.current[paramId]) delete recentlyWrittenRef.current[paramId];
        setOrders((prev) => prev.map((ord) => {
          const matches = ord.orderId === newResult.order_id || ord.id === newResult.order_id;
          if (matches) {
            const isDeptRemark = paramId && paramId.startsWith("DEPT_REMARKS_");
            const updatedDeptRemarks = { ...(ord.dept_remarks || ord.deptRemarks || {}) };
            if (isDeptRemark) { const dId = paramId.replace("DEPT_REMARKS_", ""); updatedDeptRemarks[dId] = newResult.result_value; }
            return { ...ord, dept_remarks: updatedDeptRemarks, deptRemarks: updatedDeptRemarks, results: { ...ord.results, [paramId]: { value: newResult.result_value } } };
          }
          return ord;
        }));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const changed = payload.new; if (!changed?.id) return;
        setOrders((prev) => prev.map((ord) => {
          if (ord.orderId !== changed.id && ord.id !== changed.id) return ord;
          return {
            ...ord, sample_status: changed.sample_status ?? ord.sample_status, sampleStatus: changed.sample_status ?? ord.sampleStatus,
            qcStatus: changed.qc_status ?? ord.qcStatus, qc_status: changed.qc_status ?? ord.qc_status, isLocked: changed.is_locked ?? ord.isLocked, is_locked: changed.is_locked ?? ord.is_locked,
            verifierRemarks: typeof changed.verifier_remarks === "string" && !changed.verifier_remarks.startsWith("{") ? changed.verifier_remarks : ord.verifierRemarks, verifier_remarks: changed.verifier_remarks ?? ord.verifier_remarks,
            paid_amount: changed.paid_amount ?? ord.paid_amount, due_amount: changed.due_amount ?? ord.due_amount, verified_at: changed.verified_at ?? ord.verified_at,
            billing: { ...(ord.billing || {}), paid: changed.paid_amount != null ? parseFloat(changed.paid_amount) : ord.billing?.paid, due: changed.due_amount != null ? parseFloat(changed.due_amount) : ord.billing?.due },
          };
        }));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  // --- Poller ---
  useEffect(() => {
    if (!currentUser || !activeOrder) return;
    const currentTargetId = activeOrder.orderId || activeOrder.id;
    if (!currentTargetId) return;
    const syncActiveResults = async () => {
      if (document.hidden) return;
      try {
        const { data: latestResults } = await supabase.from("results").select("parameter_id, result_value").eq("order_id", currentTargetId);
        if (latestResults && latestResults.length > 0) {
          setOrders((prev) => prev.map((ord) => {
            if (ord.orderId === currentTargetId || ord.id === currentTargetId) {
              let changed = false; const updatedResults = { ...ord.results }; const updatedDeptRemarks = { ...(ord.dept_remarks || ord.deptRemarks || {}) };
              latestResults.forEach((r) => {
                if (resultWriteTimers.current && resultWriteTimers.current[r.parameter_id]) return;
                if (recentlyWrittenRef.current[r.parameter_id] && Date.now() < recentlyWrittenRef.current[r.parameter_id]) return;
                if (updatedResults[r.parameter_id]?.value !== r.result_value) { updatedResults[r.parameter_id] = { value: r.result_value }; changed = true; }
                if (r.parameter_id && r.parameter_id.startsWith("DEPT_REMARKS_")) { const dId = r.parameter_id.replace("DEPT_REMARKS_", ""); if (updatedDeptRemarks[dId] !== r.result_value) { updatedDeptRemarks[dId] = r.result_value; changed = true; } }
              });
              return changed ? { ...ord, results: updatedResults, dept_remarks: updatedDeptRemarks, deptRemarks: updatedDeptRemarks } : ord;
            }
            return ord;
          }));
        }
      } catch (err) { /* silent */ }
    };
    const poller = setInterval(syncActiveResults, 8000);
    const onFocus = () => { syncActiveResults(); fetchPaginatedOrders(true); };
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(poller); window.removeEventListener("focus", onFocus); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, activeOrder?.orderId, activeOrder?.id]);

  useEffect(() => {
    return () => { if (resultWriteTimers.current) { Object.values(resultWriteTimers.current).forEach(clearTimeout); resultWriteTimers.current = {}; } };
  }, [selectedOrderId]);

  // ============================================================
  // 5. CALLBACKS
  // ============================================================
  const handlePresetSwitch = (preset) => {
    setActivePreset(preset); setCurrentPage(1); const today = new Date();
    if (preset === "TODAY") setDateRange({ from: todayStr, to: todayStr });
    else if (preset === "YESTERDAY") { const y = new Date(); y.setDate(y.getDate() - 1); const yStr = toLocalDateStr(y); setDateRange({ from: yStr, to: yStr }); }
    else if (preset === "LAST_7") { const d = new Date(); d.setDate(d.getDate() - 7); setDateRange({ from: toLocalDateStr(d), to: todayStr }); }
    else if (preset === "THIS_MONTH") { const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); setDateRange({ from: toLocalDateStr(startOfMonth), to: todayStr }); }
    else if (preset === "ALL") setDateRange({ from: "", to: "" });
  };

  const handleRejectSample = async (orderId, reason = "Hemolyzed Specimen") => {
    if (!orderId) return;
    try {
      const res = await requestSampleRecollection(orderId, reason);
      const cleanRemarks = res?.fullRemarks || `[RECOLLECTION REQUIRED: ${reason}]`;
      setOrders((prev) => prev.map((o) => (o.orderId === orderId || o.id === orderId) ? { ...o, sample_status: "Repeat Collection Required", sampleStatus: "Repeat Collection Required", verifierRemarks: cleanRemarks, verifier_remarks: cleanRemarks } : o));
    } catch (e) { console.warn("Reject background notice:", e); }
  };

  const handleMarkRecollected = async (orderId) => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const res = await markSampleRecollected(orderId);
      const cleanRemarks = res?.cleanRemarks || "New sample recollected. Clinically correlated and verified with quality control standards.";
      setOrders((prev) => prev.map((o) => (o.orderId === orderId || o.id === orderId) ? { ...o, sample_status: "Sample Recollected", sampleStatus: "Sample Recollected", verifierRemarks: cleanRemarks, verifier_remarks: cleanRemarks } : o));
      if (selectedOrderId === orderId) setSelectedOrderId(orderId);
    } catch (e) { console.error("Recollection error:", e); alert("Error marking sample recollected: " + (e.message || e)); } finally { setIsLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────
  // FIXED: handleSaveOrderToDb
  //  • Ref guard kills double-click duplicate orders
  //  • UHID collision pre-flight prevents silent patient overwrite
  //  • Payment capping prevents revenue overstatement
  //  • Filter reset ensures the new order is visible on the dashboard
  // ─────────────────────────────────────────────────────────────
  const handleSaveOrderToDb = async () => {
    // 1. Re-entrancy guard — set synchronously, before any await.
    if (savingRef.current) return;

    // 2. Validation
    if (!patientForm.name?.trim()) return alert("Please enter the patient's name.");
    if (!patientForm.phone?.trim()) return alert("Please enter the patient's phone number.");
    if (selectedTestIds.length === 0) return alert("Please select at least one test.");

    savingRef.current = true;
    setIsLoading(true);

    try {
      // 3. UHID collision pre-flight — only when a returning patient is linked.
      if (patientForm.id) {
        const { data: existing, error: lookupErr } = await supabase
          .from("patients")
          .select("id, name, phone")
          .eq("id", patientForm.id)
          .maybeSingle();

        if (lookupErr) {
          console.warn("UHID lookup failed:", lookupErr.message);
        } else if (existing) {
          const nameChanged = existing.name !== patientForm.name;
          const phoneChanged = existing.phone !== patientForm.phone;
          if (nameChanged || phoneChanged) {
            const ok = window.confirm(
              `This UHID already belongs to an existing patient.\n\n` +
                `UHID:   ${patientForm.id}\n` +
                `Saved name:   ${existing.name}\n` +
                `Saved phone:  ${existing.phone}\n\n` +
                `You are about to overwrite with:\n` +
                `New name:   ${patientForm.name}\n` +
                `New phone:  ${patientForm.phone}\n\n` +
                `Continue and modify the existing record?`
            );
            if (!ok) {
              savingRef.current = false;
              setIsLoading(false);
              return;
            }
          }
        }
      }

      // 4. Billing math
      const chosen = testCatalog.filter((t) => selectedTestIds.includes(t.id));
      const sub = chosen.reduce((acc, t) => acc + parseFloat(t.price || 0), 0);
      const net = Math.max(0, sub - (sub * discountVal) / 100);

      // 5. Cap overpayment so revenue reconciles with the cash drawer.
      //    Any excess is treated as "change to return", not as income.
      let cash = Math.max(0, parseFloat(paidCashVal) || 0);
      let online = Math.max(0, parseFloat(paidOnlineVal) || 0);
      const rawTotal = cash + online;

      let changeReturned = 0;
      if (rawTotal > net) {
        changeReturned = rawTotal - net;
        const cashCut = Math.min(cash, changeReturned);
        cash -= cashCut;
        const remainingCut = changeReturned - cashCut;
        if (remainingCut > 0) online = Math.max(0, online - remainingCut);
      }

      const finalPaidTotal = cash + online;
      const finalDue = Math.max(0, net - finalPaidTotal);

      // 6. Persist atomically.
      const createdOrder = await createNewOrder({
        patientData: patientForm,
        testIds: selectedTestIds,
        discount: discountVal,
        netPayable: net,
        paidCash: cash,
        paidOnline: online,
        dueAmount: finalDue,
        testCatalog,
      });

      // 7. Local state update.
      setOrders((prev) => [
        createdOrder,
        ...prev.filter((o) => o.orderId !== createdOrder.orderId),
      ]);
      setSelectedOrderId(createdOrder.orderId);

      // 8. Form reset.
      setPatientForm({ id: "", name: "", age: "", gender: "Male", phone: "", doctor: "Self" });
      setSelectedTestIds([]);
      setDiscountVal(0);
      setPaidCashVal("");
      setPaidOnlineVal("");

      // 9. Print receipt (non-blocking — a print failure must not lose the order).
      try {
        printMoneyReceiptA5(createdOrder, labSettings);
      } catch (err) {
        console.warn("Receipt print:", err);
      }

      // 10. Reset dashboard filters so the new order is actually visible.
      //     Without this, a receptionist who was viewing "Yesterday" won't
      //     see today's order on the dashboard.
      setActivePreset("TODAY");
      setDateRange({ from: todayStr, to: todayStr });
      setCurrentPage(1);
      setActiveTab("dashboard");
      fetchPaginatedOrders(true);

      // 11. Inform the cashier of the change owed (after print dialog closes).
      if (changeReturned > 0) {
        setTimeout(() => {
          alert(
            `Receipt printed.\n\n` +
              `Change to return to patient: ৳${changeReturned.toFixed(0)}\n\n` +
              `(Recorded paid amount has been capped at the net payable to keep the cash drawer balanced.)`
          );
        }, 100);
      }
    } catch (e) {
      alert("Error saving order: " + e.message);
    } finally {
      savingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleSettleDue = async (orderId, collectedCash, collectedOnline) => {
    setIsLoading(true);
    try {
      // 1. Update the database with the split payment
      const { newPaid, newDue, changeReturned } = await settleOrderDue(orderId, collectedCash, collectedOnline);
      
      // 2. Update local state immediately
      setOrders((prev) => prev.map((o) => o.orderId === orderId ? { ...o, billing: { ...o.billing, paid: newPaid, due: newDue } } : o));
      
      // 3. Prepare the updated receipt (fetch all historical payments to show accurate Cash/Online split)
      const matched = orders.find((o) => o.orderId === orderId);
      if (matched) {
        const { data: pays } = await supabase.from('payments').select('*').eq('order_id', orderId);
        let totalCash = 0;
        let totalOnline = 0;
        
        if (pays) {
          pays.forEach(p => {
            if (p.payment_method === 'Cash') totalCash += parseFloat(p.amount);
            else totalOnline += parseFloat(p.amount);
          });
        }

        printMoneyReceiptA5({ 
          ...matched, 
          billing: { 
            ...matched.billing, 
            paid: newPaid, 
            due: newDue, 
            paidCash: totalCash, 
            paidOnline: totalOnline 
          } 
        }, labSettings);
      }

      alert(
        `✅ Payment Collected!\nTotal Paid: ৳${newPaid}\nRemaining Due: ৳${newDue}` +
        (changeReturned > 0 ? `\n\n⚠ Change to return: ৳${changeReturned}` : "")
      );
      
      fetchPaginatedOrders(true);
    } catch (e) { 
      alert("Error collecting due: " + e.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleResultInput = async (paramId, val) => {
    if (!activeOrder) return;
    if (!paramId || String(paramId).trim() === "" || paramId === "undefined") return;

    const owner = visitOrders.find((o) => { if (o.isLocked) return false; return (o.tests || []).some((t) => { const params = t.test_parameters || t.parameters || []; return params.some((p) => p.id === paramId); }); });
    const effectiveOrder = owner || activeOrder;
    const targetOrderId = effectiveOrder.orderId || effectiveOrder.id;
    if (effectiveOrder.isLocked) return;

    const cleanVal = (val === undefined || val === null || String(val).trim() === "undefined" || String(val).trim() === "null") ? "" : String(val).trim();
    let cleanRemarks = effectiveOrder.verifierRemarks || "";
    if (cleanRemarks.toUpperCase().includes("RECOLLECTION REQUIRED")) cleanRemarks = "New sample recollected. Clinically correlated and verified with internal quality control standards.";

    setOrders((prev) => prev.map((o) => (o.orderId === targetOrderId || o.id === targetOrderId) ? { ...o, sample_status: "In Analysis", verifierRemarks: cleanRemarks, results: { ...o.results, [paramId]: { value: cleanVal } } } : o));
    setSaveStatus({ state: "saving", message: "Syncing..." });

    recentlyWrittenRef.current[paramId] = Date.now() + 3000;

    if (resultWriteTimers.current[paramId]) clearTimeout(resultWriteTimers.current[paramId]);
    resultWriteTimers.current[paramId] = setTimeout(async () => {
      try {
        await saveTestResult(targetOrderId, paramId, cleanVal, "ENTERED");
        recentlyWrittenRef.current[paramId] = Date.now() + 3000;
        if (cleanRemarks !== effectiveOrder.verifierRemarks) await supabase.from("orders").update({ verifier_remarks: cleanRemarks }).eq("id", targetOrderId);
        setSaveStatus({ state: "saved", message: "Saved" });
        setTimeout(() => setSaveStatus({ state: "idle", message: "" }), 1200);
      } catch (e) { setSaveStatus({ state: "error", message: "Error: " + e.message }); } finally { delete resultWriteTimers.current[paramId]; }
    }, 200);
  };

  const handleRemarksChange = (arg1, arg2) => {
    if (!activeOrder) return;
    if (arg2 !== undefined) {
      const deptId = arg1; const text = arg2;
      const targetOrder = visitOrders.find((o) => (o.tests || []).some((t) => (t.dept_id || t.deptId) === deptId)) || activeOrder;
      if (targetOrder.isLocked) return;
      const targetOrderId = targetOrder.orderId || targetOrder.id;
      const currentDeptRemarks = { ...(targetOrder.dept_remarks || targetOrder.deptRemarks || {}), [deptId]: text };
      setOrders((prev) => prev.map((o) => (o.orderId === targetOrderId || o.id === targetOrderId) ? { ...o, dept_remarks: currentDeptRemarks, deptRemarks: currentDeptRemarks } : o));
      (async () => {
        try {
          recentlyWrittenRef.current[`DEPT_REMARKS_${deptId}`] = Date.now() + 3000;
          await saveTestResult(targetOrderId, `DEPT_REMARKS_${deptId}`, text);
          await supabase.from("orders").update({ verifier_remarks: JSON.stringify(currentDeptRemarks) }).eq("id", targetOrderId);
        } catch (e) { /* silent */ }
      })();
    } else {
      const val = arg1;
      setOrders((prev) => prev.map((o) => { const inVisit = visitOrders.some((vo) => (vo.orderId || vo.id) === (o.orderId || o.id)); if (!inVisit || o.isLocked) return o; return { ...o, verifierRemarks: val }; }));
    }
  };

  const handleVerifyInDb = async (targetDeptId = null) => {
    if (!activeOrder) return;
    let ordersToVerify = (visitOrders && visitOrders.length > 0) ? visitOrders : [activeOrder];
    if (targetDeptId) {
      ordersToVerify = ordersToVerify.filter((vo) => (vo.tests || []).some((t) => (t.dept_id || t.deptId) === targetDeptId));
      if (ordersToVerify.length === 0) { alert("No orders found for that department."); return; }
    }

    const incompleteReport = [];
    for (const vo of ordersToVerify) {
      if (vo.isLocked === true || vo.qcStatus === "Verified") continue;
      const missing = [];
      for (const t of (vo.tests || [])) {
        const params = t.test_parameters || t.parameters || [];
        const effectiveParams = params.length > 0 ? params : [{ id: t.id, name: t.name || "Result" }];
        for (const p of effectiveParams) {
          const raw = vo.results?.[p.id]?.value ?? vo.results?.[p.id] ?? vo.results?.[t.id]?.value ?? vo.results?.[t.id];
          const val = raw === undefined || raw === null ? "" : String(raw).trim();
          if (val === "" || val.toLowerCase() === "undefined" || val.toLowerCase() === "null") missing.push(`${t.code || t.name} → ${p.name || "Result"}`);
        }
      }
      if (missing.length > 0) incompleteReport.push({ orderId: vo.orderId || vo.id, barcode: String(vo.barcode || "").split(/[\s,]+/)[0], missing });
    }

    if (incompleteReport.length > 0) {
      const lines = incompleteReport.map((r) => `• ${r.barcode}: ${r.missing.length} parameter(s) missing\n   ${r.missing.slice(0, 5).join(", ")}${r.missing.length > 5 ? ", …" : ""}`);
      const scopeLabel = targetDeptId ? `the ${targetDeptId.replace("DEP-", "")} department` : "the report";
      alert(`⚠ Cannot verify ${scopeLabel} — the following parameters have no result:\n\n${lines.join("\n\n")}\n\nPlease enter every result before verifying.`);
      return;
    }

    setIsLoading(true);
    try {
      const defaultRemarks = "Clinically correlated and verified with internal quality control standards.";
      const verifierName = currentUser?.name || "Consultant Pathologist";
      for (const vo of ordersToVerify) {
        if (vo.isLocked) continue;
        const remarksToSave = typeof vo.verifierRemarks === "string" && vo.verifierRemarks.trim() ? vo.verifierRemarks.trim() : defaultRemarks;
        const serializedRemarks = vo.dept_remarks && Object.keys(vo.dept_remarks).length > 0 ? JSON.stringify(vo.dept_remarks) : remarksToSave;
        await verifyAndLockOrder(vo.orderId || vo.id, serializedRemarks, verifierName);
        try { await consumeTestReagents(vo.orderId || vo.id); } catch (invErr) { console.warn("Inventory deduction skipped:", invErr); }
      }

      const verifiedIds = new Set(ordersToVerify.map((o) => o.orderId || o.id));
      setOrders((prev) => prev.map((o) => verifiedIds.has(o.orderId || o.id) ? { ...o, qcStatus: "Verified", isLocked: true, verifiedAt: new Date().toISOString() } : o));
      const scopeText = targetDeptId ? `${targetDeptId.replace("DEP-", "")} department` : "all department reports";
      alert(`✅ ${scopeText} Verified and Locked!`);
    } catch (e) { alert("Verification failed: " + e.message); } finally { setIsLoading(false); }
  };

  const handleSaveNewTest = async () => {
    if (!newTestForm.name || !newTestForm.code || !newTestForm.price) return alert("Fill Name, Code, Price.");
    setIsLoading(true);
    try {
      const createdTest = await createNewTestWithParameters(newTestForm);
      alert("✅ Test Added to Catalog!");
      const { tests } = await getMasterData();
      const updatedCatalog = (tests && tests.length > 0) ? tests : [createdTest, ...testCatalog];
      setTestCatalog(updatedCatalog);
      setNewTestForm({ name: "", code: "", deptId: departments[0]?.id || "DEP-BIO", price: "", sampleType: "Serum", tubeColor: "Red / Yellow (SST / Plain Clot)", isProfile: false, reportType: "tabular", parameters: [{ id: "1", name: "", param_type: "numeric", unit: "U/L", min: "", max: "", reference_text: "" }], consumables: [] });
      setActiveTab("reception");
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleOpenEditModal = async (t) => {
    const rawParams = t.test_parameters || t.parameters || [];
    const normalizedParams = rawParams.length > 0 ? rawParams.map((p, i) => {
      let resolvedType = p.param_type || "numeric";
      if (resolvedType === "text" || resolvedType === "descriptive") resolvedType = "text";
      else if (resolvedType === "qualitative") resolvedType = "qualitative";
      else if (resolvedType === "numeric") {
        const hasMin = p.min_range !== null && p.min_range !== undefined && String(p.min_range).trim() !== "";
        const hasMax = p.max_range !== null && p.max_range !== undefined && String(p.max_range).trim() !== "";
        const hasRef = Boolean(p.reference_text && String(p.reference_text).trim() !== "");
        resolvedType = (!hasMin && !hasMax && hasRef) ? "multirange" : "numeric";
      }
      const minVal = (p.min !== undefined && p.min !== null && p.min !== "") ? String(p.min) : ((p.min_range !== null && p.min_range !== undefined) ? String(p.min_range) : "");
      const maxVal = (p.max !== undefined && p.max !== null && p.max !== "") ? String(p.max) : ((p.max_range !== null && p.max_range !== undefined) ? String(p.max_range) : "");
      const refVal = p.reference_text || p.ref_text || p.default_template || p.template_text || "";
      return { id: p.id || `p-${i + 1}`, name: p.name || "", param_type: resolvedType, unit: p.unit || "", min: minVal, max: maxVal, min_range: minVal, max_range: maxVal, reference_text: refVal };
    }) : [{ id: "1", name: t.name || "", param_type: "numeric", unit: "", min: "", max: "", min_range: "", max_range: "", reference_text: "" }];

    const isDescriptiveTest = t.report_type === "descriptive" || normalizedParams.some((p) => p.param_type === "text");

    // Fetch consumables mapping
    let existingConsumables = [];
    try {
      const { getTestConsumables } = await import("./services/inventoryApi");
      existingConsumables = await getTestConsumables(t.id);
    } catch (e) { /* silent */ }

    setEditingTest({
      ...t, id: t.id, name: t.name || "", code: t.code || "",
      deptId: t.dept_id || t.deptId || (departments[0]?.id || "DEP-BIO"), dept_id: t.dept_id || t.deptId || (departments[0]?.id || "DEP-BIO"),
      price: t.price !== undefined ? String(t.price) : "", sampleType: t.sample_type || t.sampleType || "Serum", tubeColor: t.tube_color || t.tubeColor || "Red / Yellow (SST / Plain Clot)",
      isProfile: isDescriptiveTest ? false : (t.is_profile !== undefined ? Boolean(t.is_profile) : Boolean(t.isProfile)),
      reportType: isDescriptiveTest ? "descriptive" : (t.report_type || "tabular"), report_type: isDescriptiveTest ? "descriptive" : (t.report_type || "tabular"),
      is_available: t.is_available !== undefined ? t.is_available : true, parameters: normalizedParams,
      consumables: existingConsumables || [],
    });
  };

  const handleSaveTestEdits = async () => {
    if (!editingTest) return;
    if (!editingTest.name || !editingTest.code) return alert("Fill Name and Code.");
    setIsLoading(true);
    try {
      await updateExistingTest(editingTest.id, editingTest);
      const { saveTestConsumables } = await import("./services/inventoryApi");
      await saveTestConsumables(editingTest.id, editingTest.consumables || []);
      alert("✅ Test Updated!");
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

  const handleToggleReagent = async (testId, newStatus) => {
    try {
      await toggleTestAvailability(testId, newStatus);
      setTestCatalog((prev) => prev.map((t) => (t.id === testId ? { ...t, is_available: newStatus } : t)));
    } catch (e) { alert("Error updating reagent status: " + e.message); }
  };

  const handleSeedRadiology = async () => {
    setIsLoading(true);
    try {
      await seedRadiologyCatalog();
      const { departments: depts, tests } = await getMasterData();
      setDepartments(depts || []);
      setTestCatalog(tests || []);
      alert("✅ Standard Modality Protocols loaded!");
    } catch (e) { alert("Notice loading protocols: " + e.message); } finally { setIsLoading(false); }
  };

  const handleRegisterStaff = async (staffData) => {
    setIsLoading(true);
    try {
      await createStaffUser(staffData);
      alert("✅ Staff Member Registered!");
      setStaffList((await getStaffUsers()) || []);
    } catch (e) { alert("Error registering staff: " + (e.message || e)); } finally { setIsLoading(false); }
  };

  const handleDeleteStaff = async (userId, userName) => {
    if (!window.confirm(`Delete staff member "${userName}"?`)) return;
    setIsLoading(true);
    try {
      await deleteStaffUserAuth(userId);
      setStaffList((await getStaffUsers()) || []);
    } catch (e) { alert("Error deleting staff: " + (e.message || e)); } finally { setIsLoading(false); }
  };

  const handleSaveDoctor = async (docData) => {
    setIsLoading(true);
    try {
      await createOrUpdateDoctor(docData);
      setDoctorsList((await getDoctorsList()) || []);
      alert("✅ Doctor Saved!");
      return true;
    } catch (e) { alert("Error saving doctor: " + e.message); return false; } finally { setIsLoading(false); }
  };

  const handleDeleteDoctor = async (docId) => {
    setIsLoading(true);
    try {
      await deleteDoctor(docId);
      setDoctorsList((await getDoctorsList()) || []);
    } catch (e) { alert("Error deleting doctor: " + e.message); } finally { setIsLoading(false); }
  };

  const handleSaveSettings = async (settingsData) => {
    setIsLoading(true);
    try {
      localStorage.setItem("apex_lab_settings", JSON.stringify(settingsData));
      const saved = await saveLabSettings(settingsData);
      setLabSettings(saved || settingsData);
      alert("✅ Branding Settings Saved!");
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  const openReceiveStock = (itemId = null) => {
    setReceiveStockInitialItemId(itemId);
    setReceiveStockOpen(true);
  };

  useEffect(() => {
    if (activeTab !== "inventory-po") setSelectedPOId(null);
  }, [activeTab]);

  // ============================================================
  // 6. CONDITIONAL RENDERS
  // ============================================================
  if (isVerifyingPublicUrl) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <h2 className="text-sm font-bold">Connecting to Clinical LIMS...</h2>
        <p className="text-[11px] text-slate-400">Retrieving diagnostic laboratory status</p>
      </div>
    );
  }

  if (patientTrackingOrder || verificationError) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-3 sm:p-4">
        {patientTrackingOrder ? (
          <PatientLivePortal order={patientTrackingOrder} labSettings={labSettings} staffList={staffList} />
        ) : (
          <div className="bg-white p-5 rounded-2xl max-w-sm w-full text-center space-y-2.5 shadow-xl border border-slate-200">
            <p className="text-rose-600 font-bold text-xs uppercase tracking-tight">Record Not Found</p>
            <p className="text-xs text-slate-500">{verificationError}</p>
            <button onClick={() => { window.history.replaceState({}, document.title, window.location.pathname); setVerificationError(""); }} className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold w-full mt-2">Return to Login</button>
          </div>
        )}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Login onLoginSuccess={(u) => {
        setCurrentUser(u);
        const role = (u.role || "").toLowerCase();
        setActiveTab(role === "receptionist" ? "reception" : role === "technologist" ? "worklists" : role === "verifier" || role === "biochemist" ? "verifier" : "dashboard");
      }} />
    );
  }

  // ============================================================
  // 7. MAIN RENDER
  // ============================================================
  return (
    <AppLayout
      currentUser={currentUser}
      labSettings={labSettings}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={async () => { await authLogout(); setCurrentUser(null); }}
      onNewOrder={() => setActiveTab("reception")}
      isLoading={isLoading}
      loadDatabaseData={() => fetchPaginatedOrders(false)}
      dateRange={dateRange}
      setDateRange={setDateRange}
      activePreset={activePreset}
      setPreset={handlePresetSwitch}
      setCurrentPage={setCurrentPage}
      onGlobalOrderPick={(orderId) => { setSelectedOrderId(orderId); setActiveTab("dashboard"); }}
      onGlobalPatientPick={() => setActiveTab("reception")}
    >
      {saveStatus.state !== "idle" && (
        <div className={`fixed top-16 right-4 z-[60] py-1.5 px-3 text-[11px] font-semibold rounded-lg shadow-lg transition ${saveStatus.state === "saving" ? "bg-amber-500 text-white" : saveStatus.state === "error" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}`}>
          {saveStatus.message}
        </div>
      )}

      {activeTab === "dashboard" && (
        <Dashboard orders={orders} departments={departments} testCatalog={testCatalog} setSelectedOrderId={setSelectedOrderId} setActiveTab={setActiveTab} handlePrintMoneyReceipt={(ord) => printMoneyReceiptA5(ord, labSettings)} handleSettleDue={handleSettleDue} handleMarkRecollected={handleMarkRecollected} dashboardSearch={dashboardSearch} setDashboardSearch={setDashboardSearch} dateRange={dateRange} setDateRange={setDateRange} activePreset={activePreset} setPreset={handlePresetSwitch} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} totalCount={totalCount} pageSize={20} isLoading={isLoading} />
      )}

      {activeTab === "reception" && (
        <ReceptionPOS testCatalog={testCatalog} patientForm={patientForm} setPatientForm={setPatientForm} selectedTestIds={selectedTestIds} setSelectedTestIds={setSelectedTestIds} discountVal={discountVal} setDiscountVal={setDiscountVal} paidCashVal={paidCashVal} setPaidCashVal={setPaidCashVal} paidOnlineVal={paidOnlineVal} setPaidOnlineVal={setPaidOnlineVal} handleSaveOrderToDb={handleSaveOrderToDb} activeOrder={activeOrder} isLoading={isLoading} doctorsList={doctorsList} />
      )}

      {activeTab === "samples" && (
        <SampleTracking activeOrder={activeOrder} departmentalVials={departmentalVials} handlePrintSpecificVialBarcode={(v) => printSpecificVialBarcode(v, () => setTrackingStatus((p) => ({ ...p, [activeOrder?.orderId]: { ...p[activeOrder?.orderId], barcodePrinted: true } })))} trackingStatus={trackingStatus} />
      )}

      {activeTab === "worklists" && (
        <Worklists orders={orders} departments={departments} setSelectedOrderId={setSelectedOrderId} setActiveTab={setActiveTab} />
      )}

      {activeTab === "verifier" && (
        <VerificationQC activeOrder={activeOrder} visitOrders={visitOrders} testCatalog={testCatalog} handleResultInput={handleResultInput} handleRemarksChange={handleRemarksChange} handleVerifyInDb={handleVerifyInDb} handleMarkRecollected={handleMarkRecollected} handleRejectSample={handleRejectSample} isLoading={isLoading} saveStatus={saveStatus} currentUser={currentUser} labSettings={labSettings} />
      )}

      {activeTab === "reports" && (
        <ReportsPrint activeOrder={activeOrder} currentUser={currentUser} departmentGroupedReports={departmentGroupedReports} handlePrintDepartmentA4Report={(deptId, usePad) => printDepartmentA4Report(deptId, activeOrder, departmentGroupedReports, staffList, labSettings, () => setTrackingStatus((p) => ({ ...p, [activeOrder?.orderId]: { ...p[activeOrder?.orderId], reportPrinted: true } })), usePad)} staffList={staffList} labSettings={labSettings} onOpenVerificationModal={() => { const fullVisit = { ...activeOrder, tests: (visitOrders || [activeOrder]).flatMap((v) => v.tests || []), allBarcodes: (visitOrders || [activeOrder]).map((v) => String(v.barcode || "").split(/[\s,]+/)[0]).filter(Boolean) }; setPatientTrackingOrder(fullVisit); }} handleSettleDue={handleSettleDue} handleRemarksChange={handleRemarksChange} />
      )}

      {activeTab === "test-manager" && (
        <TestManager departments={departments} testCatalog={testCatalog} newTestForm={newTestForm} setNewTestForm={setNewTestForm} handleSaveNewTest={handleSaveNewTest} handleSaveTestEdits={handleSaveTestEdits} handleDeleteTest={handleDeleteTest} handleToggleReagent={handleToggleReagent} editingTest={editingTest} setEditingTest={setEditingTest} handleOpenEditModal={handleOpenEditModal} handleSeedRadiology={handleSeedRadiology} MASTER_SAMPLE_TYPES={MASTER_SAMPLE_TYPES} MASTER_TUBE_COLORS={MASTER_TUBE_COLORS} isLoading={isLoading} />
      )}

      {activeTab === "doctor-manager" && (
        <DoctorManagement doctorsList={doctorsList} handleSaveDoctor={handleSaveDoctor} handleDeleteDoctor={handleDeleteDoctor} isLoading={isLoading} />
      )}

      {activeTab === "staff-manager" && (
        <UserManagement staffList={staffList} handleRegisterStaff={handleRegisterStaff} handleDeleteStaff={handleDeleteStaff} isLoading={isLoading} />
      )}

      {activeTab === "lab-settings" && (
        <LabSettings labSettings={labSettings} handleSaveSettings={handleSaveSettings} isLoading={isLoading} />
      )}

      {/* INVENTORY TABS */}
      {activeTab === "inventory-dashboard" && <InventoryDashboard onNavigate={(tab) => setActiveTab(tab)} />}

      {activeTab === "inventory-items" && <InventoryItems onReceiveStock={openReceiveStock} onNavigate={setActiveTab} departments={departments} />}

      {activeTab === "inventory-suppliers" && <SupplierManagement />}

      {activeTab === "inventory-ledger" && <StockLedger />}

      {activeTab === "inventory-machines" && <MachineDashboard departments={departments} />}

      {activeTab === "inventory-ops" && <StockOperations onNavigate={setActiveTab} />}

      {activeTab === "inventory-reports" && <InventoryReports />}

      {activeTab === "inventory-po" && !selectedPOId && <PurchaseOrders onOpenPO={(id) => setSelectedPOId(id)} />}

      {activeTab === "inventory-po" && selectedPOId && <PurchaseOrderDetail poId={selectedPOId} onBack={() => setSelectedPOId(null)} onReceive={(id) => setReceivePOId(id)} />}
      {activeTab === "role-permissions" && <RolePermissions />}
      {/* FINANCE TABS */}
      {activeTab === "finance" && <FinanceDashboard />}
      {activeTab === "finance-closing" && <CashClosing />}
      {activeTab === "doctor-commissions" && !selectedDoctorForProfile && (
        <DoctorCommissions
          onSelectDoctor={(id, name) => setSelectedDoctorForProfile({ id, name })}
          onPayOut={(doc) => setSelectedDoctorForProfile({ id: doc.id, name: doc.name })}
        />
      )}

      {activeTab === "doctor-commissions" && selectedDoctorForProfile && (
        <DoctorProfile
          doctorId={selectedDoctorForProfile.id}
          doctorName={selectedDoctorForProfile.name}
          labSettings={labSettings}
          onBack={() => setSelectedDoctorForProfile(null)}
        />
      )}
      {activeTab === "audit-log" && <AuditLog />}
      {activeTab === "analyzer-settings" && <AnalyzerSettings />}
      {/* MODALS */}
      <ReceiveStockModal open={receiveStockOpen} onClose={() => { setReceiveStockOpen(false); setReceiveStockInitialItemId(null); }} initialItemId={receiveStockInitialItemId} onReceived={() => { fetchMaster(); fetchPaginatedOrders(true); }} />
      <ReceiveAgainstPOModal open={!!receivePOId} poId={receivePOId} onClose={() => setReceivePOId(null)} onReceived={() => { fetchMaster(); fetchPaginatedOrders(true); }} />
    </AppLayout>
  );
}