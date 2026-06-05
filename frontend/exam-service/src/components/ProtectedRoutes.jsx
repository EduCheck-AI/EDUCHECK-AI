// frontend/exam-service/src/components/ProtectedRoutes.jsx

import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function ProtectedRoute({ children, requiredRole }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // 🔥 LOGS DE DIAGNOSTIC
    console.log("=== ProtectedRoute ===");
    console.log("1. Location search:", location.search);

    const params = new URLSearchParams(location.search);
    const tokenFromUrl = params.get("token");
    const userFromUrl = params.get("user");
    console.log("2. Token from URL:", tokenFromUrl ? "Oui" : "Non");
    console.log("3. User from URL:", userFromUrl ? "Oui" : "Non");

    if (tokenFromUrl && userFromUrl && !localStorage.getItem("access_token")) {
      console.log("4. Stockage du token depuis URL");
      localStorage.setItem("access_token", tokenFromUrl);
      localStorage.setItem("user", decodeURIComponent(userFromUrl));
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const token = localStorage.getItem("access_token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    console.log("5. Token in localStorage:", token ? "Présent" : "Absent");
    console.log("6. User in localStorage:", user);
    console.log("7. requiredRole:", requiredRole);
    console.log("8. User role:", user?.role);

    if (!token || !user) {
      console.log("9. ❌ PAS DE TOKEN - Redirection vers login");
      window.location.href = "http://localhost:3000";
      return;
    }

    if (requiredRole && user.role !== requiredRole) {
      console.log("10. ❌ MAUVAIS RÔLE - Redirection");
      navigate("/");
      return;
    }

    console.log("11. ✅ AUTH OK - Affichage des enfants");
  }, [location, navigate, requiredRole]);

  const token = localStorage.getItem("access_token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Pendant le premier rendu avant useEffect
  if (!token || !user) {
    console.log("12. 🔄 Rendu initial - Affichage loader");
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  if (requiredRole && user.role !== requiredRole) {
    return <div>Accès interdit</div>;
  }

  return children;
}
