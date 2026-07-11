import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ToastContainer } from "./components/Toast";
import { useToastStore } from "./store/toastStore";
import { UploadRoute } from "./routes/UploadRoute";
import { DiscrepanciesRoute } from "./routes/DiscrepanciesRoute";
import { ClaimsRoute } from "./routes/ClaimsRoute";
import { LedgerRoute } from "./routes/LedgerRoute";
import { GraphRoute } from "./routes/GraphRoute";

export function App() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<UploadRoute />} />
        <Route path="/graph" element={<GraphRoute />} />
        <Route path="/cases/:caseId/discrepancies" element={<DiscrepanciesRoute />} />
        <Route path="/cases/:caseId/claims" element={<ClaimsRoute />} />
        <Route path="/discrepancies" element={<Navigate to="/graph" replace />} />
        <Route path="/discrepancies/:runId" element={<Navigate to="/graph" replace />} />
        <Route path="/claims" element={<Navigate to="/graph" replace />} />
        <Route path="/claims/:runId" element={<Navigate to="/graph" replace />} />
        <Route path="/ledger" element={<LedgerRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </Layout>
  );
}
