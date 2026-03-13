// Point d'entrée principal de l'application React
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/main.css";

// Création de la racine React et rendu de l'application dans le DOM
// On utilise React.StrictMode pour détecter les problèmes potentiels
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    {/* StrictMode aide à détecter les problèmes potentiels */}
    <App />
  </React.StrictMode>,
);
