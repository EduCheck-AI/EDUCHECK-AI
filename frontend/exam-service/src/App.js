import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
// Ajouter ces imports
import CorrectionsList from "./components/CorrectionsList";
import ManualCorrection from "./components/ManualCorrection";

// Composants
import ProtectedRoute from "./components/ProtectedRoutes";
import UploadCopies from "./components/UploadCopies";
import Sidebar from "./components/Sidebar";
import ExamList from "./components/ExamList";
import ExamForm from "./components/ExamForm";
import ExamDetails from "./components/ExamDetails";
import ExamImport from "./components/ExamImport";
import CorrectionsPage from "./components/CorrectionsPage";
import StatistiquesPage from "./components/StatistiquesPage";
import ParametresPage from "./components/ParametresPage";

import "./styles/main.css";
import "./styles/Sidebar.css";
import "./App.css";
import Navbar from "./components/Navbar";

function App() {
  return (
    <Router>
      <div className="navbar" />
      <Navbar />
      <div className="app-with-sidebar">
        <Sidebar />
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
              <Route
                path="/exams/:id/upload"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <UploadCopies />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <Navigate to="/exams" />
                  </ProtectedRoute>
                }
              />

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
                path="/statistiques"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <StatistiquesPage />
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
              
              <Route
                path="/corrections"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <CorrectionsList />{" "}
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
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
