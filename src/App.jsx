import React, { useState, useEffect, useMemo } from "react";
import { 
  getMasterData, getOrdersPaginated, createNewOrder, saveTestResult, 
  verifyAndLockOrder, createNewTestWithParameters, updateExistingTest, 
  deleteTest, getStaffUsers, registerStaffUser, deleteStaffUser,
  getLabSettings, saveLabSettings, settleOrderDue
} from "./services/api";
import { supabase } from "./supabaseClient";

import { printMoneyReceiptA5, printSpecificVialBarcode, printDepartmentA4Report } from "./utils/printHelpers";

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
import VerificationModal from "./components/VerificationModal";

const MASTER_SAMPLE_TYPES = [
  "Whole Blood", "Serum", "Plasma (Fluoride)", "Plasma (Citrate)", 
  "Clean Catch Urine", "Fresh Stool", "Swab (Throat / Nasal)"
];

const MASTER_TUBE_COLORS = [
  "Purple / Lavender (EDTA)", "Red / Yellow (SST / Plain Clot)", 
  "Grey (Fluoride Oxalate)", "Light Blue (Citrate)", "Sterile Urine Cup"
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
  const [labSettings, setLabSettings] = useState(null);

  // Paginated Orders State (20 records per page)
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Default to TODAY
  const [activePreset, setActivePreset] = useState("TODAY");
  const [dateRange, setDateRange] = useState({ from: todayStr, to: todayStr });
  const [dashboardSearch, setDashboardSearch] = useState("");

  // Public QR Verification States
  const [publicVerifiedOrder, setPublicVerifiedOrder] = useState(null);
  const [isVerifyingPublicUrl, setIsVerifyingPublicUrl] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  // POS Form States
  const [selectedTestIds, setSelectedTestIds] = useState([]);
  const [discountVal, setDiscountVal] = useState(0);
  const [paidVal, setPaidVal] = useState(undefined);
  const [patientForm, setPatientForm] = useState({ id: "", name: "", age: "", gender: "Male", phone: "", doctor: "Self" });

  // Test Manager States
  const [editingTest, setEditingTest] = useState(null);
  const [newTestForm, setNewTestForm] = useState({ 
    name: "", code: "", deptId: "DEP-BIO", price: "", sampleType: "Serum", 
    tubeColor: "Red / Yellow (SST / Plain Clot)", isProfile: false, 
    parameters: [{ id: "1", name: "", param_type: "numeric", unit: "U/L", min: "", max: "" }] 
  });

  // 1. Check for Public QR Scan in URL (?verify=ORD-... or ?bc=LAB-...)
  useEffect(() => {
    const checkPublicQrScan = async () => {
      const params = new URLSearchParams(window.location.search);
      const verifyId = params.get("verify");
      const barcode = params.get("bc");
      if (!verifyId && !barcode) return;

      setIsVerifyingPublicUrl(true);
      try {
        const settings = await getLabSettings();
        if (settings) setLabSettings(settings);

        let query = supabase.from("orders").select(`
          *,
          patient:patients(*),
          order_tests(*, test:tests(*, test_parameters(*))),
          results(*)
        `);

        if (verifyId) query = query.eq("id", verifyId);
        else if (barcode) query = query.eq("barcode", barcode);

        const { data, error } = await query.maybeSingle();

        if (error || !data) {
          const local = JSON.parse(localStorage.getItem("apex_local_orders") || "[]");
          const matched = local.find(o => o.id === verifyId || o.orderId === verifyId || o.barcode === barcode);
          if (matched) setPublicVerifiedOrder(matched);
          else setVerificationError("Report not found or invalid barcode certificate.");
        } else {
          const matchedTests = (data.order_tests || []).map(ot => ot.test || ot.tests || ot).filter(Boolean);
          setPublicVerifiedOrder({
            orderId: data.id,
            receiptNo: `RCP-${(data.order_date || "").replace(/-/g, "")}-${data.id.slice(-4)}`,
            date: data.order_date,
            createdAt: data.created_at || data.order_date,
            barcode: data.barcode,
            patient: data.patient || { id: data.patient_id, name: "Verified Patient", gender: "Other" },
            tests: matchedTests,
            billing: { paid: data.paid_amount || 0, due: data.due_amount || 0, netPayable: data.net_payable || 0 },
            results: (data.results || []).reduce((acc, r) => ({ ...acc, [r.parameter_id]: { value: r.result_value } }), {}),
            qcStatus: data.qc_status || "Pending",
            isLocked: data.is_locked || false,
            verifierRemarks: data.verifier_remarks || ""
          });
        }
      } catch (err) {
        setVerificationError("Failed to verify report authenticity: " + err.message);
      } finally {
        setIsVerifyingPublicUrl(false);
      }
    };

    checkPublicQrScan();
  }, []);

  // 2. Fetch Master Data Once on Login
  useEffect(() => {
    if (!currentUser) return;
    const fetchMaster = async () => {
      try {
        const { departments: depts, tests } = await getMasterData();
        setDepartments(depts || []);
        setTestCatalog(tests || []);
        setStaffList((await getStaffUsers()) || []);
        setLabSettings(await getLabSettings());
      } catch (e) {
        console.warn("Master fetch warning:", e);
      }
    };
    fetchMaster();
  }, [currentUser]);

  // 3. Lazy Paginated Fetch (Strictly Newest Timestamp First)
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

      const formatted = (res.orders || []).map((o, idx) => {
        const matchedTests = (o.order_tests || []).map(ot => ot.test || ot.tests || ot).filter(Boolean);
        return {
          orderId: o.id || o.orderId,
          receiptNo: o.receiptNo || `RCP-${(o.order_date || "").replace(/-/g, "")}-${String(1001 + idx)}`,
          date: o.order_date || o.date || todayStr,
          createdAt: o.created_at || o.createdAt || o.order_date || todayStr,
          barcode: o.barcode,
          patient: o.patient || { id: o.patient_id || `PID-${1000 + idx}`, name: "Patient", phone: "N/A", age: 0, gender: "Other" },
          tests: matchedTests.length > 0 ? matchedTests : (o.tests || []),
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

      // Sort with newest timestamp at top
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

  // Preset switch handler
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

  // Department vials & grouped reports
  const departmentalVials = useMemo(() => {
    if (!activeOrder?.tests) return [];
    const vials = {};
    activeOrder.tests.forEach((test) => {
      const deptCode = (test.dept_id || "GEN").replace("DEP-", "");
      const key = `${deptCode}-${test.tube_color || "Vial"}`;
      if (!vials[key]) {
        vials[key] = {
          deptCode,
          testBarcode: `${deptCode}-${(activeOrder.date || "").replace(/-/g, "")}-${activeOrder.patient?.id ? String(activeOrder.patient.id).replace(/\D/g, "") : "001"}`,
          patientId: activeOrder.patient?.id || "PID-000",
          patientName: activeOrder.patient?.name || "Patient",
          tubeColor: test.tube_color || "Standard Tube",
          testNames: []
        };
      }
      vials[key].testNames.push(test.code || test.name);
    });
    return Object.values(vials);
  }, [activeOrder]);

  const departmentGroupedReports = useMemo(() => {
    if (!activeOrder?.tests) return [];
    const grouped = {};
    activeOrder.tests.forEach((test) => {
      const deptId = test.dept_id || "DEP-GEN";
      const deptObj = departments.find((d) => d.id === deptId) || { id: deptId, name: "General Pathology", icon: "🔬" };
      if (!grouped[deptId]) grouped[deptId] = { dept: deptObj, tests: [] };
      grouped[deptId].tests.push(test);
    });
    return Object.values(grouped);
  }, [activeOrder, departments]);

  // Save Order to Supabase and immediately place at index 0 (Top)
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
        specimens: [],
        testCatalog: testCatalog
      });

      // Place newly created order at index 0 (Top of the list)
      setOrders(prev => [createdOrder, ...prev.filter(o => o.orderId !== createdOrder.orderId)]);
      setSelectedOrderId(createdOrder.orderId);

      setPatientForm({ id: "", name: "", age: "", gender: "Male", phone: "", doctor: "Self" });
      setSelectedTestIds([]);
      setDiscountVal(0);
      setPaidVal(undefined);

      alert(`✅ Order Created!\nPatient ID: ${createdOrder.patient?.id}\nPaid: ৳${finalPaid} | Due: ৳${finalDue}`);
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

  const handleVerifyInDb = async () => {
    if (!activeOrder) return;
    setIsLoading(true);
    try {
      await verifyAndLockOrder(activeOrder.orderId, activeOrder.verifierRemarks || "Clinically verified.", currentUser?.name || "Pathologist");
      alert("✅ Report Verified and Locked!");
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

  const handleSaveTestEdits = async () => {
    if (!editingTest) return;
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

  const handleSaveSettings = async (settingsData) => {
    setIsLoading(true);
    try {
      localStorage.setItem("apex_lab_settings", JSON.stringify(settingsData));
      const saved = await saveLabSettings(settingsData);
      setLabSettings(saved || settingsData);
      alert("✅ Custom Template Saved to Database & Print!");
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  // Public QR Scanning Screen
  if (isVerifyingPublicUrl) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-bold">Verifying Clinical Report...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to central clinical LIMS database</p>
      </div>
    );
  }

  if (publicVerifiedOrder || verificationError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
        <VerificationModal
          order={publicVerifiedOrder}
          labSettings={labSettings}
          errorMessage={verificationError}
          onClose={() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            setPublicVerifiedOrder(null);
            setVerificationError("");
          }}
        />
      </div>
    );
  }

  // If user is not logged in and not scanning a QR code, show Login
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
            handleVerifyInDb={handleVerifyInDb} 
            isLoading={isLoading} 
            saveStatus={saveStatus} 
            currentUser={currentUser} 
          />
        )}

        {activeTab === "reports" && (
          <ReportsPrint 
            activeOrder={activeOrder} 
            departmentGroupedReports={departmentGroupedReports} 
            handlePrintDepartmentA4Report={(deptId) => printDepartmentA4Report(deptId, activeOrder, departmentGroupedReports, staffList, labSettings, () => setTrackingStatus((p) => ({ ...p, [activeOrder?.orderId]: { ...p[activeOrder?.orderId], reportPrinted: true } })))} 
            staffList={staffList} 
            labSettings={labSettings} 
            onOpenVerificationModal={() => setPublicVerifiedOrder(activeOrder)} 
            handleSettleDue={handleSettleDue}
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
            editingTest={editingTest} 
            setEditingTest={setEditingTest} 
            handleOpenEditModal={(t) => setEditingTest({ ...t, parameters: t.test_parameters || t.parameters || [] })} 
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
      </main>
    </div>
  );
}