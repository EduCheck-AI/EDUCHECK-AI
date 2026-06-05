import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import "./Sidebare.css"; // Gardez le nom du fichier ou changez-le
import {
  FaGraduationCap,
  FaList,
  FaPlus,
  FaUpload,
  FaFileAlt,
  FaChartLine,
  FaCog,
  FaChevronLeft,
  FaChevronRight,
  FaBars,
  FaUser,
} from "react-icons/fa";

const Sidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Configuration des URLs par service
  const serviceUrls = {
    auth: "http://localhost:3000",
    exam: "http://localhost:3001",
  };

  const isActive = (path, service) => {
    if (service === "exam") {
      // Pour exam-service, vérifier le pathname actuel
      return (
        location.pathname === path || location.pathname.startsWith(path + "/")
      );
    }
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const handleNavigation = (path, service) => {
    if (service === "exam") {
      // Navigation vers exam-service sur le port 3001
      window.location.href = `${serviceUrls.exam}${path}`;
    } else {
      // Navigation dans auth-service avec react-router
      // Vous devrez passer navigate du parent ou utiliser window.location
      window.location.href = `${serviceUrls.auth}${path}`;
    }
  };

  const menuItems = [
    {
      path: "/dashbord",
      label: "Tableau de bord",
      icon: <FaUser />,
      service: "auth",
    },
    { path: "/exams", label: "Mes examens", icon: <FaList />, service: "exam" },
    {
      path: "/exams/new",
      label: "Créer un examen",
      icon: <FaPlus />,
      service: "exam",
    },
    {
      path: "/exams/import",
      label: "Importer",
      icon: <FaUpload />,
      service: "exam",
    },
    {
      path: "/corrections",
      label: "Corrections",
      icon: <FaFileAlt />,
      service: "exam",
    },
    {
      path: "/statistiques",
      label: "Statistiques",
      icon: <FaChartLine />,
      service: "exam",
    },
    {
      path: "/parametres",
      label: "Paramètres",
      icon: <FaCog />,
      service: "auth",
    },
  ];

  const toggleSidebar = () => setCollapsed(!collapsed);
  const toggleMobile = () => setMobileOpen(!mobileOpen);

  return (
    <>
      {/* Mobile menu button */}
      <button className="mobile-menu-btn" onClick={toggleMobile}>
        <FaBars />
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && <div className="sidebar-overlay" onClick={toggleMobile} />}

      {/* Sidebar */}
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
      >
        <div className="sidebar-header">
          <div className="logo">
            <FaGraduationCap className="logo-icon" />
            {!collapsed && (
              <span>
                Edu<span className="logo-accent">Check</span> AI
              </span>
            )}
          </div>
          <button className="collapse-btn" onClick={toggleSidebar}>
            {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div
              key={item.path}
              onClick={() => handleNavigation(item.path, item.service)}
              className={`nav-item ${isActive(item.path, item.service) ? "active" : ""}`}
              style={{ cursor: "pointer" }}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && (
            <div className="footer-info">
              <p>EduCheck AI v1.0</p>
              <p className="copy">© 2026 - PFE</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
