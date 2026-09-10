import React, { useState, useEffect, useMemo } from "react";
import { 
  getMasterData, getAllOrders, createNewOrder, saveTestResult, 
  verifyAndLockOrder, createNewTestWithParameters, updateExistingTest, 
  deleteTest, getStaffUsers, registerStaffUser, deleteStaffUser,
  getLabSettings, saveLabSettings
} from "./services/api";

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

const MASTER_SAMPLE_TYPES = ["Whole Blood", "Serum", "Plasma (Fluoride)", "Plasma (Citrate)", "Clean Catch Urine", "Fresh Stool", "Swab (Throat / Nasal)"];
const MASTER_TUBE_COLORS = ["Purple / Lavender (EDTA)", "Red / Yellow (SST / Plain Clot)", "Grey (Fluoride Oxalate)", "Light Blue (Citrate)", "Sterile Urine Cup"];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Core Data States
  const [departments, setDepartments] = useState([]);
  const [testCatalog, setTestCatalog] = useState([]);
  const [orders, setOrders] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [labSettings, setLabSettings] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState({});

  // Verification Certificate Modal Trigger
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Universal Search & Date Range
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // Forms State
  const [selectedTestIds, setSelectedTestIds] = useState([]);
  const [discountVal, setDiscountVal] = useState(0);
  const [patientForm, setPatientForm] = useState({ id: "", name: "", age: "", gender: "Male", phone: "", doctor: "Self" });
  const [editingTest, setEditingTest] = useState(null);
  const [newTestForm, setNewTestForm] = useState({ name: "", code: "", deptId: "DEP-BIO", price: "", sampleType: "Serum", tubeColor: "Red / Yellow (SST / Plain Clot)", isProfile: false, parameters: [{ id: "1", name: "", param_type: "numeric", unit: "U/L", min: "", max: "" }] });

  const loadDatabaseData = async () => {
    setIsLoading(true);
    try {
      const { departments: depts, tests } = await getMasterData();
      setDepartments(depts || []);
      setTestCatalog(tests || []);
      setStaffList((await getStaffUsers()) || []);
      
      const settings = await getLabSettings();
      setLabSettings(settings || null);

      const liveOrders = await getAllOrders();
      if (liveOrders?.length > 0) {
        const formatted = liveOrders.map((o, idx) => ({
          orderId: o.id,
          receiptNo: `RCP-2026-${String(1001 + idx)}`,
          date: o.order_date || new Date().toISOString().slice(0, 10),
          barcode: o.barcode,
          patient: o.patient || { id: o.patient_id || `PID-${1000 + idx}`, name: "Patient", phone: "N/A", age: 0, gender: "Other" },
          tests: o.order_tests?.map((ot) => ot.test) || [],
          billing: { subTotal: parseFloat(o.subtotal) || 0, discount: parseFloat(o.discount_percent) || 0, netPayable: parseFloat(o.net_payable) || 0, paid: parseFloat(o.paid_amount) || 0, due: parseFloat(o.due_amount) || 0 },
          results: (o.results || []).reduce((acc, r) => ({ ...acc, [r.parameter_id]: { value: r.result_value } }), {}),
          qcStatus: o.qc_status || "Pending", isLocked: o.is_locked || false, verifierRemarks: o.verifier_remarks || ""
        }));
        setOrders(formatted);
        setSelectedOrderId(formatted[0].orderId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadDatabaseData(); }, []);
  const activeOrder = useMemo(() => orders.find((o) => o.orderId === selectedOrderId) || orders[0] || null, [orders, selectedOrderId]);

  // Check URL query parameters for public verification link (e.g. ?verify=ORD-...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verify") && orders.length > 0) {
      const matched = orders.find(o => o.orderId === params.get("verify") || o.barcode === params.get("bc"));
      if (matched) {
        setSelectedOrderId(matched.orderId);
        setShowVerificationModal(true);
      }
    }
  }, [orders]);

  // Generate department-specific vials
  const departmentalVials = useMemo(() => {
    if (!activeOrder?.tests) return [];
    const vials = {};
    activeOrder.tests.forEach((test) => {
      const deptCode = (test.dept_id || "GEN").replace("DEP-", "");
      const key = `${deptCode}-${test.tube_color || "Vial"}`;
      if (!vials[key]) {
        vials[key] = {
          deptCode,
          testBarcode: `${deptCode}-${activeOrder.date.replace(/-/g, "")}-${activeOrder.patient?.id ? activeOrder.patient.id.replace(/\D/g, "") : "001"}`,
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

  // Group tests by department for reports
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

  // Universal & Date Range Filter for Dashboard
  const dashboardFilteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const q = dashboardSearch.trim().toLowerCase();
      const matchText = !q || (
        ord.receiptNo.toLowerCase().includes(q) ||
        (ord.patient?.id && ord.patient.id.toLowerCase().includes(q)) ||
        ord.barcode.toLowerCase().includes(q) ||
        ord.patient?.name?.toLowerCase().includes(q) ||
        ord.patient?.phone?.includes(q)
      );

      const matchFrom = !dateRange.from || ord.date >= dateRange.from;
      const matchTo = !dateRange.to || ord.date <= dateRange.to;

      return matchText && matchFrom && matchTo;
    });
  }, [orders, dashboardSearch, dateRange]);

  // Actions
  const handleSaveOrderToDb = async () => {
    if (!patientForm.name || !patientForm.phone || selectedTestIds.length === 0) return alert("Fill Patient Name, Phone & Tests.");
    setIsLoading(true);
    try {
      const chosen = testCatalog.filter((t) => selectedTestIds.includes(t.id));
      const sub = chosen.reduce((acc, t) => acc + parseFloat(t.price || 0), 0);
      const net = sub - (sub * discountVal) / 100;
      await createNewOrder({ patientData: patientForm, testIds: selectedTestIds, discount: discountVal, netPayable: net, paidAmount: net, specimens: [] });
      alert("✅ Order Saved!");
      await loadDatabaseData();
      setActiveTab("samples");
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleResultInput = async (paramId, val) => {
    if (!activeOrder || activeOrder.isLocked) return;
    setOrders((prev) => prev.map((o) => (o.orderId === activeOrder.orderId ? { ...o, results: { ...o.results, [paramId]: { value: val } } } : o)));
    try { await saveTestResult(activeOrder.orderId, paramId, val, "ENTERED"); } catch (e) {}
  };

  const handleVerifyInDb = async () => {
    if (!activeOrder) return;
    setIsLoading(true);
    try {
      await verifyAndLockOrder(activeOrder.orderId, activeOrder.verifierRemarks || "Clinically verified with quality control checks.", "Dr. S. Rahman, MD");
      alert("✅ Report Verified and Locked!");
      await loadDatabaseData();
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleSaveNewTest = async () => {
    if (!newTestForm.name || !newTestForm.code || !newTestForm.price) return alert("Fill Name, Code, Price.");
    setIsLoading(true);
    try {
      await createNewTestWithParameters(newTestForm);
      alert("✅ Test Created!");
      await loadDatabaseData();
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
      await loadDatabaseData();
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleDeleteTest = async (testId, testName) => {
    if (!window.confirm(`Delete "${testName}"?`)) return;
    setIsLoading(true);
    try { await deleteTest(testId); await loadDatabaseData(); } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleRegisterStaff = async (staffData) => {
    setIsLoading(true);
    try { await registerStaffUser(staffData); alert("✅ Staff Registered!"); await loadDatabaseData(); } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleDeleteStaff = async (userId, userName) => {
    if (!window.confirm(`Delete staff "${userName}"?`)) return;
    setIsLoading(true);
    try { await deleteStaffUser(userId); await loadDatabaseData(); } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  // Save Settings and update React state immediately
 // Save Settings and update React state + localStorage immediately
  const handleSaveSettings = async (settingsData) => {
    setIsLoading(true);
    try {
      // 1. Immediately cache in localStorage for zero-delay printing
      localStorage.setItem("apex_lab_settings", JSON.stringify(settingsData));

      // 2. Persist to Supabase database
      const saved = await saveLabSettings(settingsData);
      setLabSettings(saved || settingsData);
      alert("✅ Custom Template Saved to Database!");
    } catch (e) {
      alert("Error saving settings: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return <Login onLoginSuccess={(u) => { setCurrentUser(u); setActiveTab(u.role === "receptionist" ? "reception" : u.role === "technologist" ? "worklists" : u.role === "verifier" ? "verifier" : "dashboard"); }} />;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans w-full">
      <Navbar currentUser={currentUser} onLogout={() => setCurrentUser(null)} activeTab={activeTab} setActiveTab={setActiveTab} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} loadDatabaseData={loadDatabaseData} isLoading={isLoading} labSettings={labSettings} />
      
      <main className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 flex-1">
        {activeTab === "dashboard" && <Dashboard orders={dashboardFilteredOrders} departments={departments} testCatalog={testCatalog} setSelectedOrderId={setSelectedOrderId} setActiveTab={setActiveTab} handlePrintMoneyReceipt={(ord) => printMoneyReceiptA5(ord, labSettings)} dashboardSearch={dashboardSearch} setDashboardSearch={setDashboardSearch} dateRange={dateRange} setDateRange={setDateRange} />}
        {activeTab === "reception" && <ReceptionPOS testCatalog={testCatalog} patientForm={patientForm} setPatientForm={setPatientForm} selectedTestIds={selectedTestIds} setSelectedTestIds={setSelectedTestIds} discountVal={discountVal} setDiscountVal={setDiscountVal} handleSaveOrderToDb={handleSaveOrderToDb} handlePrintMoneyReceipt={() => printMoneyReceiptA5(activeOrder, labSettings)} activeOrder={activeOrder} isLoading={isLoading} />}
        {activeTab === "samples" && <SampleTracking activeOrder={activeOrder} departmentalVials={departmentalVials} handlePrintSpecificVialBarcode={(v) => printSpecificVialBarcode(v, () => setTrackingStatus((p) => ({ ...p, [activeOrder?.orderId]: { ...p[activeOrder?.orderId], barcodePrinted: true } })))} trackingStatus={trackingStatus} />}
        {activeTab === "worklists" && <Worklists orders={orders} departments={departments} setSelectedOrderId={setSelectedOrderId} setActiveTab={setActiveTab} />}
        {activeTab === "verifier" && <VerificationQC activeOrder={activeOrder} handleResultInput={handleResultInput} handleVerifyInDb={handleVerifyInDb} isLoading={isLoading} />}
        {activeTab === "reports" && <ReportsPrint activeOrder={activeOrder} departmentGroupedReports={departmentGroupedReports} handlePrintDepartmentA4Report={(deptId) => printDepartmentA4Report(deptId, activeOrder, departmentGroupedReports, staffList, labSettings, () => setTrackingStatus((p) => ({ ...p, [activeOrder?.orderId]: { ...p[activeOrder?.orderId], reportPrinted: true } })))} staffList={staffList} labSettings={labSettings} onOpenVerificationModal={() => setShowVerificationModal(true)} />}
        {activeTab === "test-manager" && <TestManager departments={departments} testCatalog={testCatalog} newTestForm={newTestForm} setNewTestForm={setNewTestForm} handleSaveNewTest={handleSaveNewTest} handleSaveTestEdits={handleSaveTestEdits} handleDeleteTest={handleDeleteTest} editingTest={editingTest} setEditingTest={setEditingTest} handleOpenEditModal={(t) => setEditingTest({ ...t, parameters: t.test_parameters || t.parameters || [] })} MASTER_SAMPLE_TYPES={MASTER_SAMPLE_TYPES} MASTER_TUBE_COLORS={MASTER_TUBE_COLORS} isLoading={isLoading} />}
        {activeTab === "staff-manager" && <UserManagement staffList={staffList} handleRegisterStaff={handleRegisterStaff} handleDeleteStaff={handleDeleteStaff} isLoading={isLoading} />}
        {activeTab === "lab-settings" && <LabSettings labSettings={labSettings} handleSaveSettings={handleSaveSettings} isLoading={isLoading} />}
      </main>

      {/* Online Verification Certificate Modal */}
      {showVerificationModal && (
        <VerificationModal
          order={activeOrder}
          labSettings={labSettings}
          onClose={() => setShowVerificationModal(false)}
        />
      )}
    </div>
  );
}