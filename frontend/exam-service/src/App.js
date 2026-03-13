// Importation des dépendances principales de React et des routes
import React from "react";
import {
  BrowserRouter as Router, // Fournit le routage côté client
  Routes, // Conteneur pour les différentes routes
  Route, // Définit une route individuelle
  Navigate, // Permet de rediriger
} from "react-router-dom";
import { Toaster } from "react-hot-toast"; // Pour les notifications

// Importation des composants de l'application
import Navbar from "./components/Navbar";
import ExamList from "./components/ExamList";
import ExamForm from "./components/ExamForm";
import ExamDetails from "./components/ExamDetails";
import ExamImport from "./components/ExamImport";
import "./App.css";

// Composant principal de l'application
function App() {
  return (
    <Router>
      <div className="app">
        {/* Barre de navigation en haut */}
        <Navbar />
        {/* Affichage des notifications toast */}
        <Toaster position="top-right" />
        <div className="container">
          {/* Définition des routes de l'application */}
          <Routes>
            {/* Redirection de la racine vers /exams */}
            <Route path="/" element={<Navigate to="/exams" />} />
            {/* Liste des examens */}
            <Route path="/exams" element={<ExamList />} />
            {/* Création d'un nouvel examen */}
            <Route path="/exams/new" element={<ExamForm />} />
            {/* Importation d'un examen */}
            <Route path="/exams/import" element={<ExamImport />} />
            {/* Détails d'un examen */}
            <Route path="/exams/:id" element={<ExamDetails />} />
            {/* Modification d'un examen */}
            <Route path="/exams/:id/edit" element={<ExamForm />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

// Exportation du composant principal
export default App;
