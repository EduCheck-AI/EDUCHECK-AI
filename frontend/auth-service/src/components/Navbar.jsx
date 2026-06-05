import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaMoon,
  FaSun,
  FaGraduationCap,
  FaList,
  FaPlus,
  FaUpload,
  FaBars,
  FaTimes,
  FaUser,
  FaCog,
  FaChartLine,
  FaFileAlt,
} from "react-icons/fa";
import "./Navbar.css";

const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  // Liens de navigation avec plus d'options
  const navLinks = [
   
    { path: "/profile", label: "Profile", icon: <FaUser /> },
  ];

  // État pour le thème sombre
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    return savedTheme === "dark" || (savedTheme === null && prefersDark);
  });

  // Fonction pour basculer le thème
  const toggleTheme = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add("dark-mode");
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark-mode");
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  };

  // Appliquer le thème au chargement
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark-mode");
      document.body.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
      document.body.classList.remove("dark-mode");
    }
  }, [isDark]);

  return (
    <nav className={`navbar ${isDark ? "dark" : "light"}`}>
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/dashboard" className="navbar-logo">
          <FaGraduationCap className="logo-icon" />
          <span>
            Edu<span className="logo-accent">Check</span> AI
          </span>
        </Link>

        {/* Container for right side items */}
        <div className="nav-actions">
          {/* Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="dark-mode-btn"
            aria-label="Toggle dark mode"
            title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {isDark ? <FaSun /> : <FaMoon />}
            <span className="dark-mode-text">
              {isDark ? "Clair" : "Sombre"}
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <div className="nav-links desktop-nav">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link ${isActive(link.path) ? "active" : ""}`}
              >
                <span className="nav-icon">{link.icon}</span>
                <span className="nav-label">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      <div className={`mobile-nav ${mobileMenuOpen ? "open" : ""}`}>
        {/* Dark mode toggle in mobile menu */}
        <button onClick={toggleTheme} className="mobile-dark-mode-btn">
          {isDark ? <FaSun /> : <FaMoon />}
          <span>{isDark ? "Mode clair" : "Mode sombre"}</span>
        </button>

        {/* Mobile navigation links */}
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`mobile-nav-link ${isActive(link.path) ? "active" : ""}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="nav-icon">{link.icon}</span>
            <span className="nav-label">{link.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
