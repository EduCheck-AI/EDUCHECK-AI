import React, { useState, useEffect } from "react";
import { FaCog, FaTrash, FaDownload, FaSave, FaSun, FaMoon, FaFilePdf, FaFileCsv, FaFileCode, FaExclamationTriangle, FaSpinner } from "react-icons/fa";
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
  const [exportFormat, setExportFormat] = useState("csv");
  const [exporting, setExporting] = useState(false);

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

  // ✅ EXPORT DES RÉSULTATS DE CLASSE - Version corrigée avec téléchargement forcé
  const handleExportClassResults = async () => {
    if (!selectedExamId) {
      toast.error("Veuillez sélectionner un examen");
      return;
    }
    
    const exam = exams.find(e => e.id.toString() === selectedExamId);
    if (!exam) {
      toast.error("Examen non trouvé");
      return;
    }

    setExporting(true);
    const toastId = toast.loading(`Export des résultats de "${exam.titre}" en ${exportFormat.toUpperCase()}...`);

    try {
      // ✅ Utilisation de fetch directement pour avoir plus de contrôle
      const url = `http://localhost:8002/exports/exams/${selectedExamId}/class/${exportFormat}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": exportFormat === "pdf" ? "application/pdf" : "text/csv",
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      // ✅ Récupérer le blob
      const blob = await response.blob();
      
      // ✅ Vérifier que le blob n'est pas vide
      if (blob.size === 0) {
        throw new Error("Le fichier généré est vide");
      }

      // ✅ Créer l'URL et forcer le téléchargement
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `resultats_${exam.titre || 'classe'}_${new Date().toISOString().slice(0,10)}.${exportFormat}`;
      document.body.appendChild(link);
      
      // ✅ Forcer le clic et nettoyer
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);

      toast.success(`Export de "${exam.titre}" terminé !`, { id: toastId });
    } catch (error) {
      console.error("Erreur export:", error);
      
      let errorMessage = "Erreur lors de l'export";
      if (error.message.includes("404")) {
        errorMessage = "Endpoint d'export non trouvé";
      } else if (error.message.includes("500")) {
        errorMessage = "Erreur serveur lors de l'export";
      } else if (error.message.includes("vide")) {
        errorMessage = "Le fichier généré est vide";
      } else if (error.name === "TypeError") {
        errorMessage = "Le serveur ne répond pas. Vérifiez qu'il est démarré.";
      }
      
      toast.error(errorMessage, { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  // ✅ EXPORT D'UNE COPIE INDIVIDUELLE - Version corrigée
  const handleExportCopie = async () => {
    if (!selectedCopieId) {
      toast.error("Veuillez sélectionner une copie");
      return;
    }
    
    const copie = copies.find(c => c.id.toString() === selectedCopieId);
    if (!copie) {
      toast.error("Copie non trouvée");
      return;
    }

    setExporting(true);
    const toastId = toast.loading(`Export de la copie de ${copie.student_name || "l'étudiant"} en ${selectedFormat.toUpperCase()}...`);

    try {
      // ✅ Utilisation de fetch directement
      const url = `http://localhost:8002/exports/copies/${selectedCopieId}/${selectedFormat}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": selectedFormat === "pdf" ? "application/pdf" : 
                    selectedFormat === "json" ? "application/json" : "text/csv",
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error("Le fichier généré est vide");
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `rapport_${copie.student_name || 'copie'}_${copie.id}_${new Date().toISOString().slice(0,10)}.${selectedFormat}`;
      document.body.appendChild(link);
      
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);

      toast.success("Export de la copie terminé !", { id: toastId });
    } catch (error) {
      console.error("Erreur export copie:", error);
      
      let errorMessage = "Erreur lors de l'export";
      if (error.message.includes("404")) {
        errorMessage = "Copie ou endpoint non trouvé";
      } else if (error.message.includes("500")) {
        errorMessage = "Erreur serveur lors de l'export";
      } else if (error.message.includes("vide")) {
        errorMessage = "Le fichier généré est vide";
      } else if (error.name === "TypeError") {
        errorMessage = "Le serveur ne répond pas";
      }
      
      toast.error(errorMessage, { id: toastId });
    } finally {
      setExporting(false);
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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("Paramètres exportés !");
  };

  return (
    <div className="min-h-screen bg-gris-chaud-50 dark:bg-stone-900 p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-bleu-profond-50 dark:bg-bleu-profond-900 flex items-center justify-center text-bleu-profond-600 dark:text-bleu-profond-300">
              <FaCog size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-stone-900 dark:text-white tracking-tight">
                Paramètres
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                Configurez votre application et gérez les exports
              </p>
            </div>
          </div>
        </div>

        {/* Grille des paramètres */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Apparence */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 shadow-sm transition-colors duration-200">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-bleu-profond-500 dark:bg-bleu-profond-400 rounded-full"></span>
              Apparence
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-600 dark:text-stone-400">Thème</span>
              <button
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 transition-colors"
              >
                {isDark ? <FaSun size={14} className="text-yellow-500" /> : <FaMoon size={14} />}
                {isDark ? "Mode clair" : "Mode sombre"}
              </button>
            </div>
          </div>

          {/* Général */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 shadow-sm transition-colors duration-200">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-bleu-profond-500 dark:bg-bleu-profond-400 rounded-full"></span>
              Général
            </h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-sm text-stone-700 dark:text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                  className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-bleu-profond-600 dark:text-bleu-profond-400 focus:ring-bleu-profond-500 dark:bg-stone-700"
                />
                Activer les notifications
              </label>
              <label className="flex items-center gap-3 text-sm text-stone-700 dark:text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoCorrect}
                  onChange={(e) => setSettings({ ...settings, autoCorrect: e.target.checked })}
                  className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-bleu-profond-600 dark:text-bleu-profond-400 focus:ring-bleu-profond-500 dark:bg-stone-700"
                />
                Correction automatique après import
              </label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-stone-600 dark:text-stone-400">Points par défaut :</span>
                <input
                  type="number"
                  value={settings.defaultPoints}
                  onChange={(e) => setSettings({ ...settings, defaultPoints: parseInt(e.target.value) || 0 })}
                  className="w-20 px-3 py-1.5 text-sm border border-stone-200 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-bleu-profond-500 focus:border-transparent bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-white transition-colors"
                  min="1"
                  max="100"
                />
              </div>
            </div>
          </div>

          {/* Export Résultats Classe */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 shadow-sm transition-colors duration-200">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
              Exporter les résultats d'une classe
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-stone-600 dark:text-stone-400 mb-1.5">Sélectionner un examen</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-bleu-profond-500 focus:border-transparent bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-white transition-colors"
                >
                  {exams.map(exam => (
                    <option key={exam.id} value={exam.id}>
                      {exam.titre} ({exam.matiere}) - {exam.points_totaux} pts
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-stone-600 dark:text-stone-400 mb-1.5">Format d'export</label>
                <div className="flex gap-2">
                  {[
                    { value: "csv", icon: <FaFileCsv size={14} />, label: "CSV" },
                    { value: "pdf", icon: <FaFilePdf size={14} />, label: "PDF" },
                  ].map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => setExportFormat(fmt.value)}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                        exportFormat === fmt.value
                          ? "bg-bleu-profond-600 dark:bg-bleu-profond-500 text-white"
                          : "bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600"
                      }`}
                    >
                      {fmt.icon} {fmt.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleExportClassResults}
                disabled={exporting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Export en cours...
                  </>
                ) : (
                  <>
                    <FaDownload size={14} /> Exporter les résultats
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Export Copie Individuelle */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 shadow-sm transition-colors duration-200">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-violet-500 rounded-full"></span>
              Exporter une copie
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-stone-600 dark:text-stone-400 mb-1.5">Examen</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-bleu-profond-500 focus:border-transparent bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-white transition-colors"
                >
                  {exams.map(exam => (
                    <option key={exam.id} value={exam.id}>
                      {exam.titre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-stone-600 dark:text-stone-400 mb-1.5">Étudiant</label>
                <select
                  value={selectedCopieId}
                  onChange={(e) => setSelectedCopieId(e.target.value)}
                  disabled={loading || copies.length === 0}
                  className="w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-bleu-profond-500 focus:border-transparent bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-white transition-colors disabled:opacity-50"
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
              <div>
                <label className="block text-sm text-stone-600 dark:text-stone-400 mb-1.5">Format d'export</label>
                <div className="flex gap-2">
                  {[
                    { value: "pdf", icon: <FaFilePdf size={14} />, label: "PDF" },
                    { value: "csv", icon: <FaFileCsv size={14} />, label: "CSV" },
                    { value: "json", icon: <FaFileCode size={14} />, label: "JSON" },
                  ].map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => setSelectedFormat(fmt.value)}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                        selectedFormat === fmt.value
                          ? "bg-bleu-profond-600 dark:bg-bleu-profond-500 text-white"
                          : "bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600"
                      }`}
                    >
                      {fmt.icon} {fmt.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleExportCopie}
                disabled={!selectedCopieId || copies.length === 0 || exporting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-bleu-profond-600 hover:bg-bleu-profond-700 dark:bg-bleu-profond-500 dark:hover:bg-bleu-profond-600 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Export en cours...
                  </>
                ) : (
                  <>
                    <FaDownload size={14} /> Exporter la copie
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Gestion des paramètres */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 shadow-sm transition-colors duration-200">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
              Gestion des paramètres
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleExportSettings}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
              >
                <FaDownload size={14} /> Exporter mes paramètres
              </button>
              <button
                onClick={handleReset}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <FaExclamationTriangle size={14} /> Réinitialiser les paramètres
              </button>
            </div>
          </div>

          {/* API */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 shadow-sm transition-colors duration-200">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
              🔌 API
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-stone-50 dark:bg-stone-700 rounded-xl text-sm">
                <span className="text-stone-500 dark:text-stone-400">Exam Service</span>
                <code className="text-xs text-bleu-profond-600 dark:text-bleu-profond-400 font-mono">http://localhost:8002</code>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-stone-50 dark:bg-stone-700 rounded-xl text-sm">
                <span className="text-stone-500 dark:text-stone-400">Auth Service</span>
                <code className="text-xs text-bleu-profond-600 dark:text-bleu-profond-400 font-mono">http://localhost:8001</code>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-stone-50 dark:bg-stone-700 rounded-xl text-sm">
                <span className="text-stone-500 dark:text-stone-400">OCR Service</span>
                <code className="text-xs text-bleu-profond-600 dark:text-bleu-profond-400 font-mono">http://localhost:8003</code>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de sauvegarde */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-4 shadow-sm transition-colors duration-200">
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              <FaSave size={14} /> Sauvegarder les modifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParametresPage;