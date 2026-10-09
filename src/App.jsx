import React, { useState, useEffect, useMemo } from "react";
import {
  getMasterData, getOrdersPaginated, createNewOrder, saveTestResult,
  verifyAndLockOrder, createNewTestWithParameters, updateExistingTest,
  deleteTest, toggleTestAvailability, getStaffUsers, registerStaffUser, deleteStaffUser,
  getLabSettings, saveLabSettings, settleOrderDue,
  getDoctorsList, createOrUpdateDoctor, deleteDoctor, seedRadiologyCatalog,
  markSampleRecollected, requestSampleRecollection
} from "./services/api";
import { supabase } from "./supabaseClient";

import { 
  printMoneyReceiptA5, 
  printSpecificVialBarcode, 
  printDepartmentA4Report,
  getAllOrderVials
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
  "Radiological Study", "Ultrasound Protocol", "Non-Contrast CT Head", "12-Lead Tracing",
  "Biopsy Specimen", "Aspiration Smear", "Fresh Specimen"
];

const MASTER_TUBE_COLORS = [
  "Purple / Lavender (EDTA)", "Red / Yellow (SST / Plain Clot)", 
  "Grey (Fluoride Oxalate)", "Light Blue (Citrate)", "Sterile Urine Cup", "No Specimen (Imaging)",
  "Formalin Container", "Fixed Glass Slides"
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
    tubeColor: "Red / Yellow (SST / Plain Clot)", isProfile: false, reportType: "tabular",
    parameters: [{ id: "1", name: "", param_type: "numeric", unit: "U/L", min: "", max: "", reference_text: "" }] 
  });

  // Rejection Handler
  const handleRejectSample = async (orderId, reason = "Hemolyzed Specimen") => {
    if (!orderId) return;
    try {
      const res = await requestSampleRecollection(orderId, reason);
      const cleanRemarks = res?.fullRemarks || `[RECOLLECTION REQUIRED: ${reason}]`;

      setOrders((prev) =>
        prev.map((o) =>
          (o.orderId === orderId || o.id === orderId)
            ? {
                ...o,
                sample_status: "Repeat Collection Required",
                sampleStatus: "Repeat Collection Required",
                verifierRemarks: cleanRemarks,
                verifier_remarks: cleanRemarks
              }
            : o
        )
      );

      fetchPaginatedOrders(true);
    } catch (e) {
      console.warn("Reject background notice:", e);
    }
  };

  // 1. Check Public QR Scan Link (Resolves ANY vial barcode)
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

        if (trackId) {
          query = query.eq("id", trackId);
        } else if (barcode) {
          query = query.or(`barcode.ilike.%${barcode}%,id.ilike.%${barcode}%`);
        }

        const { data, error } = await query.maybeSingle();

        if (error || !data) {
          const local = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
          const matched = local.find(o => {
            const vials = o.vials || getAllOrderVials(o);
            return (
              o.id === trackId || o.orderId === trackId || 
              o.barcode === barcode || 
              (o.allBarcodes && o.allBarcodes.includes(barcode)) ||
              vials.some(v => v.barcode === barcode)
            );
          });
          if (matched) setPatientTrackingOrder(matched);
          else setVerificationError("Report record not found or invalid certificate.");
        } else {
          const matchedTests = (data.order_tests || []).map(ot => ot.test || ot.tests || ot).filter(Boolean);
          const resolvedDoc = data.patient?.address?.startsWith("Ref: ") 
            ? data.patient.address.replace("Ref: ", "") 
            : (data.patient?.doctor || "Self");

          let resolvedDeptRemarks = {};
          try {
            if (data.verifier_remarks && data.verifier_remarks.trim().startsWith("{")) {
              resolvedDeptRemarks = JSON.parse(data.verifier_remarks);
            }
          } catch (e) {}

          (data.results || []).forEach(r => {
            if (r.parameter_id && r.parameter_id.startsWith("DEPT_REMARKS_")) {
              const dId = r.parameter_id.replace("DEPT_REMARKS_", "");
              if (r.result_value) resolvedDeptRemarks[dId] = r.result_value;
            }
          });

          let restoredVials = [];
          const vialResult = (data.results || []).find(r => r.parameter_id === "SPECIMEN_VIALS");
          if (vialResult && vialResult.result_value) {
            try { restoredVials = JSON.parse(vialResult.result_value); } catch (e) {}
          }

          const primaryBc = String(data.barcode || "").split(/[\s,]+/)[0];

          setPatientTrackingOrder({
            orderId: data.id,
            receiptNo: `RCP-${(data.order_date || "").replace(/-/g, "").slice(4)}-${data.id.slice(-4)}`,
            date: data.order_date,
            createdAt: data.created_at || data.order_date,
            barcode: primaryBc,
            vials: restoredVials.length > 0 ? restoredVials : getAllOrderVials({ ...data, barcode: primaryBc, tests: matchedTests }),
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
            dept_remarks: resolvedDeptRemarks,
            deptRemarks: resolvedDeptRemarks,
            verifierRemarks: typeof data.verifier_remarks === "string" && !data.verifier_remarks.startsWith("{") ? data.verifier_remarks : (resolvedDeptRemarks["GLOBAL"] || ""),
            verifier_remarks: data.verifier_remarks || ""
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

  // Main Paginated Orders Fetcher
  const fetchPaginatedOrders = async (silent = false) => {
    if (!currentUser) return;
    if (!silent) setIsLoading(true);
    try {
      const res = await getOrdersPaginated({
        page: currentPage,
        pageSize: 20,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        searchQuery: dashboardSearch
      });

      const localOrders = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");

      // SMART MULTI-BARCODE CACHE RESOLUTION:
      // If server query returns 0 rows during search, check if query matches secondary vial barcode in local orders!
      if (res.orders.length === 0 && dashboardSearch && dashboardSearch.trim()) {
        const q = dashboardSearch.trim().toLowerCase();
        const matchedLocal = localOrders.filter(lo => {
          const vials = (lo.vials && lo.vials.length > 0) ? lo.vials : getAllOrderVials(lo, testCatalog);
          const allBcs = [
            lo.barcode,
            ...(lo.allBarcodes || []),
            ...(lo.barcodesList || []),
            ...vials.map(v => v.barcode),
            ...(lo.tests || []).map(t => t.vialBarcode || t.barcode)
          ].filter(Boolean);
          return (
            allBcs.some(b => String(b).toLowerCase().includes(q)) ||
            (lo.patient?.name && lo.patient.name.toLowerCase().includes(q)) ||
            (lo.patient?.id && String(lo.patient.id).toLowerCase().includes(q)) ||
            (lo.patient?.phone && lo.patient.phone.includes(q))
          );
        });

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
        const localMatch = localOrders.find(lo => (lo.orderId || lo.id) === (o.id || o.orderId));

        // Restore multi-vial mapping from Supabase results or local storage
        let restoredVials = [];
        if (Array.isArray(o.results)) {
          const vialRow = o.results.find(r => r.parameter_id === "SPECIMEN_VIALS");
          if (vialRow && vialRow.result_value) {
            try { restoredVials = JSON.parse(vialRow.result_value); } catch (e) {}
          }
        }
        if (restoredVials.length === 0 && localMatch?.vials && localMatch.vials.length > 0) {
          restoredVials = localMatch.vials;
        }

        const matchedTests = (o.order_tests || []).map(ot => {
          const rawTest = ot.test || ot.tests || {};
          const testId = ot.test_id || rawTest.id || ot.id;
          const fromCat = (testCatalog || []).find(t => t.id === testId || (t.code && t.code === rawTest.code)) || {};

          const catParams = fromCat.test_parameters || fromCat.parameters || [];
          const rawParams = rawTest.test_parameters || rawTest.parameters || [];
          const resolvedParams = catParams.length > 0 ? catParams : rawParams;

          let specificVialBc = "";
          if (restoredVials.length > 0) {
            const vMatch = restoredVials.find(v => 
              v.testIds?.includes(testId) || v.testIds?.includes(rawTest.code) || v.testNames?.includes(rawTest.name)
            );
            if (vMatch) specificVialBc = vMatch.barcode;
          }

          return {
            ...fromCat,
            ...rawTest,
            id: testId,
            name: rawTest.name || fromCat.name || "Investigation",
            code: rawTest.code || fromCat.code || "",
            dept_id: rawTest.dept_id || fromCat.dept_id || rawTest.deptId || fromCat.deptId || "DEP-BIO",
            deptId: rawTest.dept_id || fromCat.dept_id || rawTest.deptId || fromCat.deptId || "DEP-BIO",
            tube_color: rawTest.tube_color || fromCat.tube_color || rawTest.tubeColor || fromCat.tubeColor || "Red / Yellow (SST / Plain Clot)",
            sample_type: rawTest.sample_type || fromCat.sample_type || "Blood",
            report_type: rawTest.report_type || fromCat.report_type || "tabular",
            vialBarcode: specificVialBc || rawTest.vialBarcode || "",
            test_parameters: resolvedParams,
            parameters: resolvedParams
          };
        }).filter(Boolean);

        const resolvedTests = (matchedTests && matchedTests.length > 0)
          ? matchedTests
          : (localMatch?.tests && localMatch.tests.length > 0)
            ? localMatch.tests
            : (Array.isArray(o.tests) && o.tests.length > 0)
              ? o.tests
              : [];

        const resolvedDoctor = 
          (o.patient?.address && o.patient.address.startsWith("Ref: ")) 
            ? o.patient.address.replace("Ref: ", "") 
            : (o.patient?.doctor || o.doctor || "Self");

        const resolvedVials = restoredVials.length > 0
          ? restoredVials
          : getAllOrderVials({ ...o, tests: resolvedTests }, testCatalog);

        let resolvedDeptRemarks = {};
        try {
          if (o.verifier_remarks && typeof o.verifier_remarks === "string" && o.verifier_remarks.trim().startsWith("{")) {
            resolvedDeptRemarks = JSON.parse(o.verifier_remarks);
          }
        } catch (e) {}

        if (Array.isArray(o.results)) {
          o.results.forEach((r) => {
            if (r.parameter_id && r.parameter_id.startsWith("DEPT_REMARKS_")) {
              const dId = r.parameter_id.replace("DEPT_REMARKS_", "");
              if (r.result_value !== undefined && r.result_value !== null) {
                resolvedDeptRemarks[dId] = r.result_value;
              }
            }
          });
        }

        const rawBarcodeStr = String(o.barcode || "");
        const allBarcodesList = rawBarcodeStr.split(/[\s,]+/).filter(Boolean);
        const primaryBarcode = allBarcodesList[0] || (resolvedVials[0]?.barcode) || "2026000001";

        return {
          orderId: o.id || o.orderId,
          receiptNo: o.receiptNo || `RCP-${(o.order_date || "").replace(/-/g, "").slice(4)}-${String(1001 + idx)}`,
          date: o.order_date || o.date || todayStr,
          createdAt: o.created_at || o.createdAt || o.order_date || todayStr,
          barcode: primaryBarcode,
          allBarcodes: allBarcodesList.length > 0 ? allBarcodesList : resolvedVials.map(v => v.barcode),
          barcodesList: allBarcodesList.length > 0 ? allBarcodesList : resolvedVials.map(v => v.barcode),
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
          tests: resolvedTests,
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
          sample_status: o.sample_status || o.sampleStatus || localMatch?.sample_status || "Order Created",
          sampleStatus: o.sample_status || o.sampleStatus || localMatch?.sample_status || "Order Created",
          qcStatus: o.qc_status || o.qcStatus || "Pending",
          isLocked: o.is_locked || o.isLocked || false,
          dept_remarks: resolvedDeptRemarks,
          deptRemarks: resolvedDeptRemarks,
          verifierRemarks: typeof o.verifier_remarks === "string" && !o.verifier_remarks.startsWith("{") ? o.verifier_remarks : (resolvedDeptRemarks["GLOBAL"] || ""),
          verifier_remarks: o.verifier_remarks || ""
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
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaginatedOrders();
  }, [currentUser, currentPage, dateRange, dashboardSearch]);

  const activeOrder = useMemo(() => orders.find((o) => o.orderId === selectedOrderId || o.id === selectedOrderId) || orders[0] || null, [orders, selectedOrderId]);

  // Realtime WebSocket Listener
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('lims-realtime-listener')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'results' },
        (payload) => {
          const newResult = payload.new;
          if (!newResult) return;

          setOrders((prev) =>
            prev.map((ord) => {
              const matches = ord.orderId === newResult.order_id || ord.id === newResult.order_id;
              if (matches) {
                const isDeptRemark = newResult.parameter_id && newResult.parameter_id.startsWith("DEPT_REMARKS_");
                let updatedDeptRemarks = { ...(ord.dept_remarks || ord.deptRemarks || {}) };

                if (isDeptRemark) {
                  const dId = newResult.parameter_id.replace("DEPT_REMARKS_", "");
                  updatedDeptRemarks[dId] = newResult.result_value;
                }

                return {
                  ...ord,
                  dept_remarks: updatedDeptRemarks,
                  deptRemarks: updatedDeptRemarks,
                  results: {
                    ...ord.results,
                    [newResult.parameter_id]: { value: newResult.result_value }
                  }
                };
              }
              return ord;
            })
          );
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchPaginatedOrders(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Direct Results Poller
  useEffect(() => {
    if (!currentUser || !activeOrder) return;
    const currentTargetId = activeOrder.orderId || activeOrder.id;
    if (!currentTargetId) return;

    const syncActiveResults = async () => {
      if (document.hidden) return;
      try {
        const { data: latestResults } = await supabase
          .from('results')
          .select('parameter_id, result_value')
          .eq('order_id', currentTargetId);

        if (latestResults && latestResults.length > 0) {
          setOrders((prev) =>
            prev.map((ord) => {
              if (ord.orderId === currentTargetId || ord.id === currentTargetId) {
                let changed = false;
                const updatedResults = { ...ord.results };
                const updatedDeptRemarks = { ...(ord.dept_remarks || ord.deptRemarks || {}) };

                latestResults.forEach((r) => {
                  if (updatedResults[r.parameter_id]?.value !== r.result_value) {
                    updatedResults[r.parameter_id] = { value: r.result_value };
                    changed = true;
                  }
                  if (r.parameter_id && r.parameter_id.startsWith("DEPT_REMARKS_")) {
                    const dId = r.parameter_id.replace("DEPT_REMARKS_", "");
                    if (updatedDeptRemarks[dId] !== r.result_value) {
                      updatedDeptRemarks[dId] = r.result_value;
                      changed = true;
                    }
                  }
                });

                return changed ? { ...ord, results: updatedResults, dept_remarks: updatedDeptRemarks, deptRemarks: updatedDeptRemarks } : ord;
              }
              return ord;
            })
          );
        }
      } catch (err) {}
    };

    const poller = setInterval(syncActiveResults, 2500);
    const onFocus = () => {
      syncActiveResults();
      fetchPaginatedOrders(true);
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(poller);
      window.removeEventListener('focus', onFocus);
    };
  }, [currentUser, activeOrder?.orderId, activeOrder?.id]);

  const handlePresetSwitch = (preset) => {
    setActivePreset(preset);
    setCurrentPage(1);
    const today = new Date();

    if (preset === "TODAY") {
      setDateRange({ from: todayStr, to: todayStr });
    } else if (preset === "YESTERDAY") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setDateRange({ from: y.toISOString().slice(0, 10), to: y.toISOString().slice(0, 10) });
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

  const handleMarkRecollected = async (orderId) => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const res = await markSampleRecollected(orderId);
      const cleanRemarks = res?.cleanRemarks || "New sample recollected. Clinically correlated and verified with quality control standards.";

      setOrders((prev) =>
        prev.map((o) =>
          (o.orderId === orderId || o.id === orderId)
            ? {
                ...o,
                sample_status: "Sample Recollected",
                sampleStatus: "Sample Recollected",
                verifierRemarks: cleanRemarks,
                verifier_remarks: cleanRemarks
              }
            : o
        )
      );

      if (selectedOrderId === orderId) {
        setSelectedOrderId(orderId);
      }
    } catch (e) {
      console.error("Recollection error:", e);
      alert("Error marking sample recollected: " + (e.message || e));
    } finally {
      setIsLoading(false);
    }
  };

  const departmentalVials = useMemo(() => {
    if (!activeOrder?.tests) return [];
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
      const baseDeptId = test.dept_id || test.deptId || "DEP-BIO";

      let groupKey = baseDeptId;
      let groupName = null;
      let groupIcon = null;

      if (code.includes("CBC") || name.includes("COMPLETE BLOOD COUNT")) {
        groupKey = "DEP-HEM-CBC";
        groupName = "Hematology & Coagulation";
        groupIcon = "🩸";
      } else if (code.includes("URINE") || name.includes("URINE")) {
        groupKey = "DEP-PAT-URINE";
        groupName = "Clinical Pathology & Urine Analysis";
        groupIcon = "🧫";
      } else if (code.includes("STOOL") || name.includes("STOOL")) {
        groupKey = "DEP-PAT-STOOL";
        groupName = "Clinical Pathology & Stool Examination";
        groupIcon = "🔬";
      } else if (code.includes("WIDAL")) {
        groupKey = "DEP-MIC-WIDAL";
        groupName = "Microbiology & Serology";
        groupIcon = "🧪";
      } else if (code.includes("SEMEN")) {
        groupKey = "DEP-PAT-SEMEN";
        groupName = "Clinical Pathology & Andrology";
        groupIcon = "🔬";
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

  // Order Creation Handler with Instant Receipt Print
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

      try {
        printMoneyReceiptA5(createdOrder, labSettings);
      } catch (err) {
        console.warn("Receipt print notice:", err);
      }

      setActiveTab("dashboard");
      fetchPaginatedOrders(true);
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
      fetchPaginatedOrders(true);
    } catch (e) { 
      alert("Error collecting due: " + e.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleResultInput = async (paramId, val) => {
    if (!activeOrder || activeOrder.isLocked) return;
    if (!paramId || String(paramId).trim() === "" || paramId === "undefined") return;

    const cleanVal = (
      val === undefined || val === null ||
      String(val).trim() === "undefined" || String(val).trim() === "null"
    ) ? "" : String(val).trim();

    let cleanRemarks = activeOrder.verifierRemarks || "";
    if (cleanRemarks.toUpperCase().includes("RECOLLECTION REQUIRED")) {
      cleanRemarks = "New sample recollected. Clinically correlated and verified with internal quality control standards.";
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.orderId === activeOrder.orderId
          ? {
              ...o,
              sample_status: "In Analysis",
              verifierRemarks: cleanRemarks,
              results: {
                ...o.results,
                [paramId]: { value: cleanVal }
              }
            }
          : o
      )
    );

    setSaveStatus({ state: "saving", message: "Syncing..." });
    try {
      await saveTestResult(activeOrder.orderId, paramId, cleanVal, "ENTERED");
      if (cleanRemarks !== activeOrder.verifierRemarks) {
        await supabase.from("orders").update({ verifier_remarks: cleanRemarks }).eq("id", activeOrder.orderId);
      }
      setSaveStatus({ state: "saved", message: "Saved" });
      setTimeout(() => setSaveStatus({ state: "idle", message: "" }), 1500);
    } catch (e) {
      setSaveStatus({ state: "error", message: "Error: " + e.message });
    }
  };

  const handleRemarksChange = (arg1, arg2) => {
    if (!activeOrder || activeOrder.isLocked) return;

    if (arg2 !== undefined) {
      const deptId = arg1;
      const text = arg2;
      const currentDeptRemarks = { ...(activeOrder.dept_remarks || activeOrder.deptRemarks || {}), [deptId]: text };

      setOrders((prev) =>
        prev.map((o) =>
          (o.orderId === activeOrder.orderId || o.id === activeOrder.orderId)
            ? {
                ...o,
                dept_remarks: currentDeptRemarks,
                deptRemarks: currentDeptRemarks
              }
            : o
        )
      );

      (async () => {
        try {
          await saveTestResult(activeOrder.orderId, `DEPT_REMARKS_${deptId}`, text);
          await supabase.from("orders").update({ verifier_remarks: JSON.stringify(currentDeptRemarks) }).eq("id", activeOrder.orderId);
        } catch (e) {}
      })();
    } else {
      const val = arg1;
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === activeOrder.orderId ? { ...o, verifierRemarks: val } : o
        )
      );
    }
  };

  const handleVerifyInDb = async () => {
    if (!activeOrder) return;
    setIsLoading(true);
    try {
      const remarksToSave = typeof activeOrder.verifierRemarks === "string" && activeOrder.verifierRemarks.trim()
        ? activeOrder.verifierRemarks.trim()
        : "Clinically correlated and verified with internal quality control standards.";

      const serializedRemarks = activeOrder.dept_remarks && Object.keys(activeOrder.dept_remarks).length > 0
        ? JSON.stringify(activeOrder.dept_remarks)
        : remarksToSave;

      await verifyAndLockOrder(activeOrder.orderId, serializedRemarks, currentUser?.name || "Consultant Pathologist");
      
      setOrders(prev => prev.map(o => o.orderId === activeOrder.orderId ? {
        ...o,
        qcStatus: "Verified",
        isLocked: true,
        verifierRemarks: remarksToSave,
        verifier_remarks: serializedRemarks
      } : o));

      alert("✅ Report Verified and Locked!");
      fetchPaginatedOrders(true);
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
      const createdTest = await createNewTestWithParameters(newTestForm);
      alert("✅ Test Added to Catalog!");
      
      const { tests } = await getMasterData();
      const updatedCatalog = (tests && tests.length > 0) ? tests : [createdTest, ...testCatalog];
      setTestCatalog(updatedCatalog);

      setNewTestForm({
        name: "", code: "", deptId: departments[0]?.id || "DEP-BIO", price: "", sampleType: "Serum", 
        tubeColor: "Red / Yellow (SST / Plain Clot)", isProfile: false, reportType: "tabular",
        parameters: [{ id: "1", name: "", param_type: "numeric", unit: "U/L", min: "", max: "", reference_text: "" }] 
      });

      setActiveTab("reception");
    } catch (e) { 
      alert(e.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleOpenEditModal = (t) => {
    const rawParams = t.test_parameters || t.parameters || [];

    const normalizedParams = rawParams.length > 0
      ? rawParams.map((p, i) => {
          let resolvedType = p.param_type || "numeric";

          if (resolvedType === "text" || resolvedType === "descriptive") {
            resolvedType = "text";
          } else if (resolvedType === "qualitative") {
            resolvedType = "qualitative";
          } else if (resolvedType === "numeric") {
            const hasMin = p.min_range !== null && p.min_range !== undefined && String(p.min_range).trim() !== "";
            const hasMax = p.max_range !== null && p.max_range !== undefined && String(p.max_range).trim() !== "";
            const hasRef = Boolean(p.reference_text && String(p.reference_text).trim() !== "");

            if (!hasMin && !hasMax && hasRef) {
              resolvedType = "multirange";
            } else {
              resolvedType = "numeric";
            }
          }

          const minVal = (p.min !== undefined && p.min !== null && p.min !== "")
            ? String(p.min)
            : ((p.min_range !== null && p.min_range !== undefined) ? String(p.min_range) : "");

          const maxVal = (p.max !== undefined && p.max !== null && p.max !== "")
            ? String(p.max)
            : ((p.max_range !== null && p.max_range !== undefined) ? String(p.max_range) : "");

          const refVal = p.reference_text || p.ref_text || p.default_template || p.template_text || "";

          return {
            id: p.id || `p-${i + 1}`,
            name: p.name || "",
            param_type: resolvedType,
            unit: p.unit || "",
            min: minVal,
            max: maxVal,
            min_range: minVal,
            max_range: maxVal,
            reference_text: refVal
          };
        })
      : [{ id: "1", name: t.name || "", param_type: "numeric", unit: "", min: "", max: "", min_range: "", max_range: "", reference_text: "" }];

    const isDescriptiveTest = t.report_type === "descriptive" || 
      normalizedParams.some(p => p.param_type === "text");

    setEditingTest({
      ...t,
      id: t.id,
      name: t.name || "",
      code: t.code || "",
      deptId: t.dept_id || t.deptId || (departments[0]?.id || "DEP-BIO"),
      dept_id: t.dept_id || t.deptId || (departments[0]?.id || "DEP-BIO"),
      price: t.price !== undefined ? String(t.price) : "",
      sampleType: t.sample_type || t.sampleType || "Serum",
      tubeColor: t.tube_color || t.tubeColor || "Red / Yellow (SST / Plain Clot)",
      isProfile: isDescriptiveTest ? false : (t.is_profile !== undefined ? Boolean(t.is_profile) : Boolean(t.isProfile)),
      reportType: isDescriptiveTest ? "descriptive" : (t.report_type || "tabular"),
      report_type: isDescriptiveTest ? "descriptive" : (t.report_type || "tabular"),
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
      alert("✅ Standard Modality Protocols loaded!");
    } catch (e) {
      alert("Notice loading protocols: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterStaff = async (staffData) => {
    setIsLoading(true);
    try {
      await registerStaffUser(staffData);
      alert("✅ Staff Member Registered!");
      setStaffList((await getStaffUsers()) || []);
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleDeleteStaff = async (userId, userName) => {
    if (!window.confirm(`Delete staff member "${userName}"?`)) return;
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
      alert("✅ Doctor Saved!");
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
      alert("✅ Branding Settings Saved!");
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  // Public QR Code Portal
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
          <PatientLivePortal
            order={patientTrackingOrder}
            labSettings={labSettings}
            staffList={staffList}
          />
        ) : (
          <div className="bg-white p-5 rounded-2xl max-w-sm w-full text-center space-y-2.5 shadow-xl border border-slate-200">
            <p className="text-rose-600 font-bold text-xs uppercase tracking-tight">Record Not Found</p>
            <p className="text-xs text-slate-500">{verificationError}</p>
            <button
              onClick={() => {
                window.history.replaceState({}, document.title, window.location.pathname);
                setVerificationError("");
              }}
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold w-full mt-2"
            >
              Return to Login
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
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col w-full">
      <Navbar 
        currentUser={currentUser} 
        onLogout={() => setCurrentUser(null)} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
        loadDatabaseData={() => fetchPaginatedOrders(false)} 
        isLoading={isLoading} 
        labSettings={labSettings} 
      />
      
      {saveStatus.state !== "idle" && (
        <div className={`py-1 px-3 text-[11px] text-center font-semibold transition ${
          saveStatus.state === "saving" ? "bg-amber-500 text-white" : 
          saveStatus.state === "error" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
        }`}>
          {saveStatus.message}
        </div>
      )}

      <main className="w-full max-w-[1720px] mx-auto px-3 sm:px-4 py-3 sm:py-4 flex-1">
        {activeTab === "dashboard" && (
          <Dashboard
            orders={orders}
            departments={departments}
            testCatalog={testCatalog}
            setSelectedOrderId={setSelectedOrderId}
            setActiveTab={setActiveTab}
            handlePrintMoneyReceipt={(ord) => printMoneyReceiptA5(ord, labSettings)}
            handleSettleDue={handleSettleDue}
            handleMarkRecollected={handleMarkRecollected}
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
            handleMarkRecollected={handleMarkRecollected}
            handleRejectSample={handleRejectSample}
            isLoading={isLoading}
            saveStatus={saveStatus}
            currentUser={currentUser}
            labSettings={labSettings}
          />
        )}

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

        {activeTab === "doctor-manager" && (
          <DoctorManagement 
            doctorsList={doctorsList} 
            handleSaveDoctor={handleSaveDoctor} 
            handleDeleteDoctor={handleDeleteDoctor} 
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
      </main>
    </div>
  );
}