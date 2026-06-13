import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./contexts/ThemeContext";
import Navbar from "./components/Navbar";
import ExamList from "./components/ExamList";
import ExamDetails from "./components/ExamDetails";
import ExamForm from "./components/ExamForm";
import ExamImport from "./components/ExamImport";
import CorrectionsList from "./components/CorrectionsList";
import ManualCorrection from "./components/ManualCorrection";
import StatistiquesAvancees from "./components/StatistiquesPage";
import UploadCopies from "./components/UploadCopies";
import Sidebar from "./components/Sidebar";
import ParametresPage from "./components/ParametresPage";
import ProfilePage from "./components/ProfilePage";  // ← AJOUTEZ CETTE LIGNE
import "./styles/global-theme.css";
import "./styles/Sidebar.css";
import "./App.css";
import "./styles/Sidebar.css";

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

  if (requiredRole && userRole !== requiredRole) {
    window.location.href = "http://localhost:3000";
    return null;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Navbar />
        <div className="app-with-sidebar">
          <Sidebar />
          <main className="main-content-with-sidebar">
            <Toaster
  position="top-right"
  containerStyle={{
    top: 80,  // Pour éviter la navbar
  }}
  toastOptions={{
    duration: 4000,
    style: {
      background: "#1e293b",        // Fond solide
      color: "#ffffff",              // Texte blanc
      border: "1px solid #334155",
      borderRadius: "12px",
      padding: "12px 20px",
      fontSize: "14px",
      fontWeight: "500",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
      backdropFilter: "none",        // Pas de flou
      opacity: 1,                   // Complètement opaque
    },
    success: {
      style: {
        background: "#10b981",       // Vert solide
        color: "white",
        border: "none",
      },
      iconTheme: { 
        primary: "white", 
        secondary: "#10b981" 
      },
    },
    error: {
      style: {
        background: "#ef4444",       // Rouge solide
        color: "white",
        border: "none",
      },
      iconTheme: { 
        primary: "white", 
        secondary: "#ef4444" 
      },
    },
    loading: {
      style: {
        background: "#3b82f6",       // Bleu solide
        color: "white",
        border: "none",
      },
    },
  }}
/>
            <div className="content-wrapper">
              <Routes>
                <Route path="/" element={<Navigate to="/exams" />} />
                <Route path="/exams" element={<ProtectedRoute requiredRole="teacher"><ExamList /></ProtectedRoute>} />
                <Route path="/exams/new" element={<ProtectedRoute requiredRole="teacher"><ExamForm /></ProtectedRoute>} />
                <Route path="/exams/import" element={<ProtectedRoute requiredRole="teacher"><ExamImport /></ProtectedRoute>} />
                <Route path="/exams/:id" element={<ProtectedRoute requiredRole="teacher"><ExamDetails /></ProtectedRoute>} />
                <Route path="/exams/:id/edit" element={<ProtectedRoute requiredRole="teacher"><ExamForm /></ProtectedRoute>} />
                <Route path="/exams/:id/upload" element={<ProtectedRoute requiredRole="teacher"><UploadCopies /></ProtectedRoute>} />
                <Route path="/corrections" element={<ProtectedRoute requiredRole="teacher"><CorrectionsList /></ProtectedRoute>} />
                <Route path="/corrections/:id" element={<ProtectedRoute requiredRole="teacher"><ManualCorrection /></ProtectedRoute>} />
                <Route path="/statistiques" element={<ProtectedRoute requiredRole="teacher"><StatistiquesAvancees /></ProtectedRoute>} />
                <Route path="/parametres" element={<ProtectedRoute requiredRole="teacher"><ParametresPage /></ProtectedRoute>} />
                
                {/* AJOUTEZ CETTE ROUTE */}
                <Route path="/profile" element={<ProtectedRoute requiredRole="teacher"><ProfilePage /></ProtectedRoute>} />
                
                <Route path="*" element={<Navigate to="/exams" />} />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;