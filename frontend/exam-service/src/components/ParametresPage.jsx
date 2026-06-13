import React, { useState, useEffect } from "react";
import { FaCog, FaTrash, FaDownload, FaSave, FaSun, FaMoon, FaFilePdf, FaFileCsv } from "react-icons/fa";
import toast from "react-hot-toast";
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";

const ParametresPage = () => {
  const { isDark, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    notifications: true,
    autoCorrect: true,
    defaultPoints: 20,
  });
  
  const [exams, setExams] = useState([]);
  const [copies, setCopies] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedCopieId, setSelectedCopieId] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv"); // "csv" ou "pdf" pour l'export classe

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const examsData = await api.getExams();
      setExams(examsData);
      if (examsData.length > 0) {
        setSelectedExamId(examsData[0].id.toString());
      }
    } catch (error) {
      console.error("Erreur chargement examens:", error);
      toast.error("Erreur lors du chargement des examens");
    }
  };

  const loadCopies = async (examId) => {
    if (!examId) return;
    setLoading(true);
    try {
      const response = await api.get(`/copies/exam/${examId}`);
      const copiesData = response.data;
      setCopies(copiesData);
      if (copiesData.length > 0) {
        setSelectedCopieId(copiesData[0].id.toString());
      } else {
        setSelectedCopieId("");
      }
    } catch (error) {
      console.error("Erreur chargement copies:", error);
      setCopies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      loadCopies(selectedExamId);
    }
  }, [selectedExamId]);

  const handleSave = () => {
    localStorage.setItem("appSettings", JSON.stringify(settings));
    toast.success("Paramètres sauvegardés");
  };

  const handleReset = () => {
    if (window.confirm("Réinitialiser tous les paramètres par défaut ?")) {
      const defaultSettings = {
        notifications: true,
        autoCorrect: true,
        defaultPoints: 20,
      };
      setSettings(defaultSettings);
      localStorage.setItem("appSettings", JSON.stringify(defaultSettings));
      toast.success("Paramètres réinitialisés");
    }
  };

  // Export des résultats de la classe (CSV ou PDF)
  const handleExportClassResults = async () => {
    if (!selectedExamId) {
      toast.error("Veuillez sélectionner un examen");
      return;
    }
    
    const exam = exams.find(e => e.id.toString() === selectedExamId);
    const format = exportFormat;
    const toastId = toast.loading(`Export des résultats de "${exam?.titre}" en ${format.toUpperCase()}...`);
    
    try {
      // Route différente selon le format
      const endpoint = format === "pdf" 
        ? `/exports/exams/${selectedExamId}/class/pdf`
        : `/exports/exams/${selectedExamId}/class/csv`;
      
      const response = await fetch(`http://localhost:8002${endpoint}`, {
        method: "GET",
        headers: {
          "Accept": format === "pdf" ? "application/pdf" : "text/csv",
        },
      });
      
      if (!response.ok) throw new Error("Erreur lors de l'export");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = `resultats_${exam?.titre || selectedExamId}_classe.${format}`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Export de "${exam?.titre}" terminé !`, { id: toastId });
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'export", { id: toastId });
    }
  };

  // Export d'une copie individuelle
  const handleExportCopie = async () => {
    if (!selectedCopieId) {
      toast.error("Veuillez sélectionner une copie");
      return;
    }
    
    const copie = copies.find(c => c.id.toString() === selectedCopieId);
    const toastId = toast.loading(`Export de la copie de ${copie?.student_name || "l'étudiant"} en ${selectedFormat.toUpperCase()}...`);
    
    try {
      const response = await fetch(`http://localhost:8002/exports/copies/${selectedCopieId}/${selectedFormat}`, {
        method: "GET",
        headers: {
          "Accept": selectedFormat === "pdf" ? "application/pdf" : selectedFormat === "json" ? "application/json" : "text/csv",
        },
      });
      
      if (!response.ok) throw new Error("Erreur lors de l'export");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = `rapport_${copie?.student_name || "copie"}_${selectedCopieId}.${selectedFormat}`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Export de la copie terminé !`, { id: toastId });
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'export", { id: toastId });
    }
  };

  const handleExportSettings = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      settings: settings,
      savedSettings: localStorage.getItem("appSettings"),
      userInfo: {
        userId: localStorage.getItem("userId"),
        userName: localStorage.getItem("userName"),
        userRole: localStorage.getItem("userRole"),
      }
    };
    
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `educhk_settings_${new Date().toISOString().slice(0, 19)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Paramètres exportés !");
  };

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1>
          <FaCog style={{ marginRight: "12px", color: "var(--primary)" }} />
          Paramètres
        </h1>
        <p>Configurez votre application</p>
      </div>

      <div className="settings-grid">
        {/* Apparence */}
        <div className="settings-card">
          <h3>Apparence</h3>
          <div className="setting-item">
            <label>Thème</label>
            <button onClick={toggleTheme} className="theme-toggle-btn">
              {isDark ? <FaSun /> : <FaMoon />}
              {isDark ? " Mode clair" : " Mode sombre"}
            </button>
          </div>
        </div>

        {/* Général */}
        <div className="settings-card">
          <h3>Général</h3>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) =>
                  setSettings({ ...settings, notifications: e.target.checked })
                }
              />
              Activer les notifications
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.autoCorrect}
                onChange={(e) =>
                  setSettings({ ...settings, autoCorrect: e.target.checked })
                }
              />
              Correction automatique après import
            </label>
          </div>
          <div className="setting-item">
            <label>Points par défaut :</label>
            <input
              type="number"
              value={settings.defaultPoints}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultPoints: parseInt(e.target.value),
                })
              }
              className="setting-input"
            />
          </div>
        </div>

        {/* Export Résultats Classe - avec choix CSV ou PDF */}
        <div className="settings-card">
          <h3>Exporter les résultats d'une classe</h3>
          <div className="setting-item">
            <label>Sélectionner un examen :</label>
            <select 
              value={selectedExamId} 
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="setting-select"
            >
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.titre} ({exam.matiere}) - {exam.points_totaux} pts
                </option>
              ))}
            </select>
          </div>
          
          <div className="setting-item">
            <label>Format d'export :</label>
            <div className="format-buttons">
              <button 
                className={`format-btn ${exportFormat === "csv" ? "active" : ""}`}
                onClick={() => setExportFormat("csv")}
              >
                <FaFileCsv /> CSV
              </button>
              <button 
                className={`format-btn ${exportFormat === "pdf" ? "active" : ""}`}
                onClick={() => setExportFormat("pdf")}
              >
                <FaFilePdf /> PDF
              </button>
            </div>
          </div>

          <button onClick={handleExportClassResults} className="settings-btn primary">
            <FaDownload /> Exporter les résultats ({exportFormat.toUpperCase()})
          </button>
        </div>

        {/* Export Copie Individuelle */}
        <div className="settings-card">
          <h3>Exporter une copie</h3>
          <div className="setting-item">
            <label>Sélectionner un examen :</label>
            <select 
              value={selectedExamId} 
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="setting-select"
            >
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.titre}
                </option>
              ))}
            </select>
          </div>
          
          <div className="setting-item">
            <label>Sélectionner un étudiant :</label>
            <select 
              value={selectedCopieId} 
              onChange={(e) => setSelectedCopieId(e.target.value)}
              className="setting-select"
              disabled={loading || copies.length === 0}
            >
              {loading ? (
                <option>Chargement...</option>
              ) : copies.length === 0 ? (
                <option>Aucune copie disponible</option>
              ) : (
                copies.map(copie => (
                  <option key={copie.id} value={copie.id}>
                    {copie.student_name || `Étudiant #${copie.student_id}`} - Note: {copie.note || "Non corrigée"}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="setting-item">
            <label>Format d'export :</label>
            <div className="format-buttons">
              <button 
                className={`format-btn ${selectedFormat === "pdf" ? "active" : ""}`}
                onClick={() => setSelectedFormat("pdf")}
              >
                PDF
              </button>
              <button 
                className={`format-btn ${selectedFormat === "csv" ? "active" : ""}`}
                onClick={() => setSelectedFormat("csv")}
              >
                CSV
              </button>
              <button 
                className={`format-btn ${selectedFormat === "json" ? "active" : ""}`}
                onClick={() => setSelectedFormat("json")}
              >
                JSON
              </button>
            </div>
          </div>

          <button 
            onClick={handleExportCopie} 
            className="settings-btn primary"
            disabled={!selectedCopieId || copies.length === 0}
          >
            <FaDownload /> Exporter la copie
          </button>
        </div>

        {/* Paramètres */}
        <div className="settings-card">
          <h3>Gestion des paramètres</h3>
          <button onClick={handleExportSettings} className="settings-btn">
            <FaDownload /> Exporter mes paramètres
          </button>
          <button onClick={handleReset} className="settings-btn reset">
            <FaTrash /> Réinitialiser les paramètres
          </button>
        </div>

        {/* API */}
        <div className="settings-card">
          <h3>🔌 API</h3>
          <div className="api-info">
            <p>
              <strong>Exam Service:</strong> http://localhost:8002
            </p>
            <p>
              <strong>Auth Service:</strong> http://localhost:8001
            </p>
            <p>
              <strong>OCR Service:</strong> http://localhost:8003
            </p>
          </div>
        </div>
      </div>

      <div className="save-bar">
        <button onClick={handleSave} className="btn-save">
          <FaSave /> Sauvegarder les modifications
        </button>
      </div>

      <style jsx>{`
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
          margin-bottom: 24px;
        }
        .settings-card {
          background: var(--card-bg, white);
          border-radius: 20px;
          padding: 24px;
          border: 1px solid var(--border-color, #e2e8f0);
        }
        .settings-card h3 {
          margin-bottom: 20px;
          font-size: 18px;
          color: var(--text-primary, #1e293b);
        }
        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 10px;
          color: var(--text-secondary, #475569);
        }
        .setting-input {
          padding: 8px 12px;
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 8px;
          width: 80px;
          background: var(--bg-primary, white);
          color: var(--text-primary, #1e293b);
        }
        .setting-select {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 8px;
          background: var(--bg-primary, white);
          color: var(--text-primary, #1e293b);
          cursor: pointer;
        }
        .settings-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          margin-bottom: 12px;
          border: none;
          border-radius: 10px;
          background: var(--bg-tertiary, #f1f5f9);
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-primary, #1e293b);
        }
        .settings-btn:hover {
          background: var(--sidebar-hover, #e2e8f0);
        }
        .settings-btn.primary {
          background: var(--primary, #2563eb);
          color: white;
        }
        .settings-btn.primary:hover {
          background: var(--primary-dark, #1d4ed8);
        }
        .settings-btn.reset:hover {
          background: #fee2e2;
          color: #ef4444;
        }
        .settings-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .format-buttons {
          display: flex;
          gap: 8px;
        }
        .format-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 8px;
          background: var(--bg-tertiary, #f1f5f9);
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-primary, #1e293b);
        }
        .format-btn.active {
          background: var(--primary, #2563eb);
          color: white;
          border-color: var(--primary, #2563eb);
        }
        .theme-toggle-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--bg-tertiary, #f1f5f9);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 40px;
          cursor: pointer;
          color: var(--text-primary, #1e293b);
        }
        .api-info p {
          margin: 8px 0;
          font-size: 13px;
          font-family: monospace;
          background: var(--bg-tertiary, #f8fafc);
          padding: 6px 10px;
          border-radius: 8px;
          color: var(--text-secondary, #475569);
        }
        .save-bar {
          text-align: right;
          padding-top: 20px;
          border-top: 1px solid var(--border-color, #e2e8f0);
        }
        .btn-save {
          background: var(--success, #10b981);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-save:hover {
          background: #059669;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};

export default ParametresPage;