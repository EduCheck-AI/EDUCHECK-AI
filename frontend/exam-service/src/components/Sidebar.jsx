import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";
import {
  FaGraduationCap,
  FaList,
  FaPlus,
  FaUpload,
  FaFileAlt,
  FaChartLine,
  FaCog,
  FaBars,
  FaUser,
  FaSignOutAlt,
  FaUserCircle
} from "react-icons/fa";
import toast from "react-hot-toast";

const logoImage = "/logo.jpeg";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const userName = localStorage.getItem("userName") || "Utilisateur";
  const userRole = localStorage.getItem("userRole") || "teacher";

  const handleNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("appSettings");
    
    toast.success("Déconnexion réussie");
    window.location.href = "http://localhost:3000";
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const menuItems = [
    { path: "/profile", label: "Mon Profil", icon: <FaUserCircle /> },
    { path: "/exams", label: "Mes examens", icon: <FaList /> },
    { path: "/exams/new", label: "Créer un examen", icon: <FaPlus /> },
    { path: "/exams/import", label: "Importer", icon: <FaUpload /> },
    { path: "/corrections", label: "Corrections", icon: <FaFileAlt /> },
    { path: "/statistiques", label: "Statistiques", icon: <FaChartLine /> },
    { path: "/parametres", label: "Paramètres", icon: <FaCog /> },
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const toggleMobile = () => setMobileOpen(!mobileOpen);

  return (
    <>
      <button className="mobile-menu-btn" onClick={toggleMobile}>
        <FaBars />
      </button>

      {mobileOpen && <div className="sidebar-overlay" onClick={toggleMobile} />}

      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo">
            <img src={logoImage} alt="EduCheck AI" className="logo-image" />
            <span>
              Edu<span className="logo-accent">Check</span> AI
            </span>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <div className="user-name">{userName}</div>
            <div className="user-role">{userRole === "teacher" ? "Enseignant" : "Étudiant"}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`nav-item ${isActive(item.path) ? "active" : ""}`}
              style={{ cursor: "pointer" }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt className="logout-icon" />
            <span>Déconnexion</span>
          </div>
          <div className="footer-info">
            <p>EduCheck AI v1.0</p>
            <p className="copy">© 2026 - PFE</p>
          </div>
        </div>
      </aside>

      {showLogoutConfirm && (
        <div className="logout-modal-overlay" onClick={cancelLogout}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logout-modal-header">
              <FaSignOutAlt />
              <h3>Déconnexion</h3>
            </div>
            <div className="logout-modal-body">
              <p>Êtes-vous sûr de vouloir vous déconnecter ?</p>
            </div>
            <div className="logout-modal-footer">
              <button onClick={cancelLogout} className="btn-cancel">Annuler</button>
              <button onClick={confirmLogout} className="btn-confirm">Se déconnecter</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;