import React, { useState } from "react";
import { FaCog, FaTrash, FaDownload, FaUpload, FaSave } from "react-icons/fa";
import toast from "react-hot-toast";

const ParametresPage = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    autoCorrect: true,
    defaultPoints: 20,
  });

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

  const handleExportData = () => {
    toast.info("Export des données en cours...");
    setTimeout(() => {
      toast.success("Export terminé");
    }, 1000);
  };

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1>Paramètres</h1>
        <p>Configurez votre application</p>
      </div>

      <div className="settings-grid">
        {/* Général */}
        <div className="settings-card">
          <h3>⚙️ Général</h3>
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

        {/* Données */}
        <div className="settings-card">
          <h3>💾 Données</h3>
          <button onClick={handleExportData} className="settings-btn">
            <FaDownload /> Exporter les données
          </button>
          <button onClick={handleReset} className="settings-btn reset">
            <FaTrash /> Réinitialiser
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
        <button onClick={handleSave} className="btn btn-primary">
          <FaSave /> Sauvegarder les modifications
        </button>
      </div>

      <style jsx>{`
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 24px;
          margin-bottom: 24px;
        }
        .settings-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          border: 1px solid #e2e8f0;
        }
        .settings-card h3 {
          margin-bottom: 20px;
          font-size: 18px;
        }
        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .setting-input {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          width: 80px;
        }
        .settings-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          margin-bottom: 12px;
          border: none;
          border-radius: 10px;
          background: #f1f5f9;
          cursor: pointer;
          transition: all 0.2s;
        }
        .settings-btn:hover {
          background: #e2e8f0;
        }
        .settings-btn.reset:hover {
          background: #fee2e2;
          color: #ef4444;
        }
        .api-info p {
          margin: 8px 0;
          font-size: 13px;
          font-family: monospace;
          background: #f8fafc;
          padding: 6px 10px;
          border-radius: 8px;
        }
        .save-bar {
          text-align: right;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
      `}</style>
    </div>
  );
};

export default ParametresPage;
