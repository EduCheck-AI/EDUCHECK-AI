import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaGraduationCap, FaList, FaPlus, FaUpload } from 'react-icons/fa';
import '../styles/Navbar.css';

const Navbar = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname.startsWith(path) ? 'nav-link active' : 'nav-link';

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <FaGraduationCap />
          Edu<span className="logo-accent">Check</span> AI
        </Link>
        <div className="nav-links">
          <Link to="/exams" className={isActive('/exams')}>
            <FaList /> Examens
          </Link>
          <Link to="/exams/new" className="nav-link">
            <FaPlus /> Créer
          </Link>
          <Link to="/exams/import" className="nav-link">
            <FaUpload /> Importer
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;