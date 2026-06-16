import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaUser, FaBars, FaTimes } from "react-icons/fa";

const logoImage = "/logo.jpeg";

const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const navLinks = [
    { path: "/profile", icon: <FaUser size={18} />, label: "Profil" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-bleu-profond-700 text-white z-[1000] w-full h-[89px] border-b border-bleu-profond-800 shadow-sm">
      <div className="w-full h-full px-4 md:px-6 flex justify-between items-center">
        {/* Logo */}
        <Link to="/exams" className="flex items-center gap-3 no-underline">
          <img
            src={logoImage}
            alt="EduCheck AI"
            className="h-12 w-auto object-contain"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive(link.path)
                  ? "bg-white/20 text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 border border-white/20"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div
        className={`md:hidden fixed top-[89px] left-0 right-0 bg-bleu-profond-700 flex flex-col p-4 gap-2 border-b border-bleu-profond-800 transform transition-transform duration-300 ease-in-out z-[999] ${
          mobileMenuOpen ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive(link.path)
                ? "bg-white/20 text-white"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
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
