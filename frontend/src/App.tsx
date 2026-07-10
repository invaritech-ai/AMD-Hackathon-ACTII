import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ToastContainer } from "./components/Toast";
import { useToastStore } from "./store/toastStore";
import { UploadRoute } from "./routes/UploadRoute";
import { DiscrepanciesRoute } from "./routes/DiscrepanciesRoute";
import { ClaimsRoute } from "./routes/ClaimsRoute";
import { LedgerRoute } from "./routes/LedgerRoute";

export function App() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<UploadRoute />} />
        <Route path="/discrepancies" element={<DiscrepanciesRoute />} />
        <Route path="/discrepancies/:runId" element={<DiscrepanciesRoute />} />
        <Route path="/claims" element={<ClaimsRoute />} />
        <Route path="/claims/:runId" element={<ClaimsRoute />} />
        <Route path="/ledger" element={<LedgerRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </Layout>
  );
}