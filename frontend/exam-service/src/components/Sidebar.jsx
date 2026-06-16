import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaList,
  FaPlus,
  FaUpload,
  FaFileAlt,
  FaChartLine,
  FaCog,
  FaBars,
  FaSignOutAlt,
  FaUserCircle,
  FaTimes,
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
    { path: "/profile", label: "Mon Profil", icon: <FaUserCircle size={18} /> },
    { path: "/exams", label: "Mes examens", icon: <FaList size={18} /> },
    {
      path: "/exams/new",
      label: "Créer un examen",
      icon: <FaPlus size={18} />,
    },
    { path: "/exams/import", label: "Importer", icon: <FaUpload size={18} /> },
    {
      path: "/corrections",
      label: "Corrections",
      icon: <FaFileAlt size={18} />,
    },
    {
      path: "/statistiques",
      label: "Statistiques",
      icon: <FaChartLine size={18} />,
    },
    { path: "/parametres", label: "Paramètres", icon: <FaCog size={18} /> },
  ];

  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const toggleMobile = () => setMobileOpen(!mobileOpen);

  return (
    <>
      {/* Bouton mobile */}
      <button
        className="lg:hidden fixed top-4 left-4 z-[1001] flex items-center justify-center w-11 h-11 bg-white border border-stone-200 text-stone-700 rounded-xl shadow-sm hover:bg-stone-50 transition-all duration-200"
        onClick={toggleMobile}
      >
        <FaBars size={20} />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[999]"
          onClick={toggleMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-[260px] bg-white flex flex-col transition-all duration-300 ease-in-out z-[1000] shadow-md border-r border-stone-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header avec logo */}
        <div className="flex items-center justify-center px-5 py-6 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <img
              src={logoImage}
              alt="EduCheck AI"
              className="h-10 w-auto object-contain"
            />
            <span className="text-xl font-bold text-stone-800">
              Edu<span className="text-blue-600">Check</span> AI
            </span>
          </div>
        </div>

        {/* Profil utilisateur */}
        <div className="flex items-center gap-3 mx-3 my-4 px-4 py-3 bg-stone-50 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-stone-800 truncate">
              {userName}
            </div>
            <div className="text-xs text-stone-500">
              {userRole === "teacher" ? "Enseignant" : "Étudiant"}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-1 overflow-y-auto">
          {menuItems.map((item) => (
            <div
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                isActive(item.path)
                  ? "bg-blue-50 text-blue-600"
                  : "text-stone-600 hover:bg-stone-50 hover:text-blue-600"
              }`}
            >
              <span className="text-xl min-w-[24px] flex items-center justify-center">
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-stone-200 mt-auto">
          <div
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-red-500 bg-red-50/50 hover:bg-red-100/70 mb-4"
          >
            <FaSignOutAlt size={18} />
            <span className="text-sm font-medium">Déconnexion</span>
          </div>
          <div className="text-center">
            <p className="text-xs text-stone-400">EduCheck AI </p>
          </div>
        </div>
      </aside>

      {/* Modal de confirmation de déconnexion */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
          onClick={cancelLogout}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[400px] shadow-xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-200">
              <FaSignOutAlt size={22} className="text-red-500" />
              <h3 className="text-lg font-semibold text-stone-800 m-0">
                Déconnexion
              </h3>
            </div>
            <div className="px-5 py-5 text-stone-600">
              <p>Êtes-vous sûr de vouloir vous déconnecter ?</p>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-stone-200">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 rounded-lg border-none bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer text-sm font-medium"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
