import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaFilePdf,
  FaPlus,
  FaUpload,
  FaSearch,
  FaCheckCircle,
} from "react-icons/fa";
import api from "../services/api";
import LoadingSpinner from "./LoadingSpinner";
import toast from "react-hot-toast";

const ExamList = () => {
  const [exams, setExams] = useState([]);
  const [filteredExams, setFilteredExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadExams();
  }, []);
  useEffect(() => {
    filterExams();
  }, [exams, searchTerm, filterStatus]);

  const loadExams = async () => {
    try {
      const data = await api.getExams();
      setExams(data);
      setFilteredExams(data);
    } catch {
      toast.error("Erreur lors du chargement des examens");
    } finally {
      setLoading(false);
    }
  };

  const filterExams = () => {
    let filtered = [...exams];
    if (searchTerm) {
      filtered = filtered.filter(
        (exam) =>
          exam.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          exam.matiere?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    if (filterStatus !== "all") {
      filtered = filtered.filter((exam) => exam.statut === filterStatus);
    }
    setFilteredExams(filtered);
  };

  const handleDelete = async (id, titre) => {
    if (!window.confirm(`Supprimer "${titre}" ?`)) return;
    try {
      await api.deleteExam(id);
      setExams(exams.filter((e) => e.id !== id));
      toast.success(`"${titre}" supprimé`);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handlePublish = async (id) => {
    try {
      await api.publishExam(id);
      await loadExams();
      toast.success("Examen publié");
    } catch {
      toast.error("Erreur lors de la publication");
    }
  };

  const handleExportPDF = async (id) => {
    const toastId = toast.loading("Génération du PDF...");
    try {
      await api.exportExamPDF(id);
      toast.success("PDF téléchargé", { id: toastId });
    } catch {
      toast.error("Erreur d'export", { id: toastId });
    }
  };

  if (loading) return <LoadingSpinner message="Chargement..." />;

  const stats = {
    total: exams.length,
    publies: exams.filter((e) => e.statut === "publié").length,
    brouillons: exams.filter((e) => e.statut === "brouillon").length,
  };

  const filters = [
    { key: "all", label: "Tous", count: stats.total },
    { key: "publié", label: "Publiés", count: stats.publies },
    { key: "brouillon", label: "Brouillons", count: stats.brouillons },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
                Mes examens
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {stats.total} examen{stats.total !== 1 ? "s" : ""} au total
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/exams/import"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <FaUpload size={13} />
                Importer
              </Link>
              <Link
                to="/exams/new"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaPlus size={13} />
                Nouvel examen
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Filtres + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  filterStatus === f.key
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    filterStatus === f.key
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-sm ml-auto">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
        </div>

        {/* Grille 2 colonnes */}
        {filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col"
              >
                <div className="p-5 flex flex-col flex-1">
                  {/* Titre + badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-base font-semibold text-slate-800 leading-snug">
                      {exam.titre}
                    </h3>
                    <span
                      className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        exam.statut === "publié"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                      }`}
                    >
                      {exam.statut === "publié" ? "Publié" : "Brouillon"}
                    </span>
                  </div>

                  {/* Méta */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="font-medium text-slate-600">
                      {exam.matiere || "Sans matière"}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span>{exam.points_totaux || 0} pts</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span>
                      {new Date(exam.date_creation).toLocaleDateString(
                        "fr-FR",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                    </span>
                  </div>

                  {/* Description */}
                  {exam.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                      {exam.description}
                    </p>
                  )}

                  {/* Séparateur */}
                  <div className="border-t border-slate-100 mt-auto pt-4">
                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/exams/${exam.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <FaEye size={11} /> Voir
                        </Link>
                        <Link
                          to={`/exams/${exam.id}/edit`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <FaEdit size={11} /> Modifier
                        </Link>
                        <button
                          onClick={() => handleExportPDF(exam.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <FaFilePdf size={11} /> PDF
                        </button>
                      </div>

                      <button
                        onClick={() => handleDelete(exam.id, exam.titre)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <FaTrash size={11} /> Supprimer
                      </button>
                    </div>

                    {/* Publier */}
                    {exam.statut === "brouillon" && (
                      <button
                        onClick={() => handlePublish(exam.id)}
                        className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FaCheckCircle size={13} />
                        Publier l'examen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <FaSearch className="text-slate-400 text-lg" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">
              Aucun examen trouvé
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {searchTerm || filterStatus !== "all"
                ? "Aucun résultat pour cette recherche"
                : "Créez votre premier examen pour commencer"}
            </p>
            {!searchTerm && filterStatus === "all" && (
              <div className="flex gap-3 justify-center">
                <Link
                  to="/exams/new"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <FaPlus size={13} /> Créer un examen
                </Link>
                <Link
                  to="/exams/import"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  <FaUpload size={13} /> Importer
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamList;
