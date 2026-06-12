import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import ExamList from "./components/ExamList";
import ExamDetails from "./components/ExamDetails";
import ExamForm from "./components/ExamForm";
import ExamImport from "./components/ExamImport";
import CorrectionsPage from "./components/CorrectionsPage";
import CorrectionsList from "./components/CorrectionsList"; // ✅ ajouté
import ManualCorrection from "./components/ManualCorrection"; // ✅ ajouté
import StatistiquesAvancees  from "./components/StatistiquesPage";
import UploadCopies from "./components/UploadCopies";
import Sidebar from "./components/Sidebar";
import ParametresPage from "./components/ParametresPage"; // ✅ ajouté
import "./styles/main.css";
import "./styles/Sidebar.css";
import "./App.css";

// ✅ ProtectedRoute corrigé
const ProtectedRoute = ({ children, requiredRole }) => {
  const params = new URLSearchParams(window.location.search);
  const urlUserId = params.get("userId");
  const urlUserName = params.get("userName");
  const urlUserRole = params.get("userRole");

  if (urlUserId) {
    localStorage.setItem("userId", urlUserId);
    localStorage.setItem("userName", urlUserName);
    localStorage.setItem("userRole", urlUserRole);
    window.history.replaceState({}, "", window.location.pathname);
  }

  const userId = localStorage.getItem("userId");
  const userRole = localStorage.getItem("userRole");

  if (!userId) {
    window.location.href = "http://localhost:3000";
    return null;
  }

  // ✅ Vérifier le rôle
  if (requiredRole && userRole !== requiredRole) {
    window.location.href = "http://localhost:3000";
    return null;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Navbar />
      <div className="app-with-sidebar">
        <Sidebar /> {/* ✅ une seule fois */}
        <main className="main-content-with-sidebar">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { background: "#363636", color: "#fff" },
              success: { style: { background: "#10b981" } },
              error: { style: { background: "#ef4444" } },
            }}
          />
          <div className="content-wrapper">
            <Routes>
              <Route path="/" element={<Navigate to="/exams" />} />

              <Route
                path="/exams"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <ExamList />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/exams/new"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <ExamForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/exams/import"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <ExamImport />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/exams/:id"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <ExamDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/exams/:id/edit"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <ExamForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/exams/:id/upload"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <UploadCopies />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/corrections"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <CorrectionsList />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/corrections/:id"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <ManualCorrection />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/statistiques"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <StatistiquesAvancees />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/parametres"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <ParametresPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/exams" />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
