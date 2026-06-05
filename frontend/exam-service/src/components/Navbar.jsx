import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaGraduationCap,
  FaList,
  FaPlus,
  FaUpload,
  FaBars,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import "../styles/Navbar.css";

const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const navLinks = [
        { path: "/profile", icon: <FaUser /> },
    
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/exams" className="navbar-logo">
          <FaGraduationCap className="logo-icon" />
          <span>
            Edu<span className="logo-accent">Check</span> AI
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="nav-links desktop-nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? "active" : ""}`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className={`mobile-nav ${mobileMenuOpen ? "open" : ""}`}>
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`mobile-nav-link ${isActive(link.path) ? "active" : ""}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            {link.icon}
            <span>{link.label}</span>
          </Link>
        ))}
        
      </div>
    </nav>
  );
};

export default Navbar;
