import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaFileAlt,
  FaSpinner,
  FaCheckCircle,
  FaEye,
  FaFilePdf,
  FaUser,
  FaBook,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
} from "react-icons/fa";
import api from "../services/api";
import LoadingSpinner from "./LoadingSpinner";
import toast from "react-hot-toast";

const CorrectionsPage = () => {
  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState("all");
  const [exams, setExams] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedExam]);

  const loadData = async () => {
    try {
      const examsData = await api.getExams();
      setExams(examsData);

      let allCopies = [];
      for (const exam of examsData) {
        try {
          const res = await api.get(`/copies/exam/${exam.id}`);
          const copiesWithExam = res.data.map((c) => ({
            ...c,
            exam_title: exam.titre,
            exam_matiere: exam.matiere,
            exam_points: exam.points_totaux,
          }));
          allCopies = [...allCopies, ...copiesWithExam];
        } catch (e) {}
      }
      setCopies(allCopies);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async (copieId, studentName) => {
    const toastId = toast.loading(`Génération du PDF...`);
    try {
      window.open(
        `http://localhost:8002/copies/${copieId}/export/pdf`,
        "_blank",
      );
      toast.success("PDF généré", { id: toastId });
    } catch (error) {
      toast.error("Erreur d'export", { id: toastId });
    }
  };

  const filteredCopies =
    selectedExam === "all"
      ? copies
      : copies.filter((c) => c.exam_id === parseInt(selectedExam));

  // Pagination calculations
  const totalItems = filteredCopies.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentItems = filteredCopies.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    document
      .getElementById("copies-container")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = Math.min(totalPages - 1, 4);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3);
      }

      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");
      if (totalPages > 1) pages.push(totalPages);
    }

    return pages;
  };

  const stats = {
    total: copies.length,
    corrigees: copies.filter((c) => c.note !== null && c.note !== undefined)
      .length,
    enAttente: copies.filter((c) => c.note === null || c.note === undefined)
      .length,
  };

  if (loading) return <LoadingSpinner message="Chargement des copies..." />;

  return (
    <div className="min-h-screen bg-gris-chaud-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-bleu-profond-50 flex items-center justify-center text-bleu-profond-600">
              <FaFileAlt size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
                Corrections
              </h1>
              <p className="text-sm text-stone-500 mt-0.5">
                Consultez et gérez les copies soumises par les étudiants
              </p>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-stone-200 flex items-center justify-between hover:border-bleu-profond-300 transition-all">
            <div>
              <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
              <p className="text-sm text-stone-500 mt-1">Total copies</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-bleu-profond-50 flex items-center justify-center text-bleu-profond-600 text-xl">
              <FaFileAlt />
            </div>
          </div>
          <div
            className="bg-white rounded-2xl p-5 border border-stone-200 flex items-center justify-between hover:border-emerald-300 transition-all cursor-pointer"
            onClick={() => setSelectedExam("all")}
          >
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                {stats.corrigees}
              </p>
              <p className="text-sm text-stone-500 mt-1">Corrigées</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-xl">
              <FaCheckCircle />
            </div>
          </div>
          <div
            className="bg-white rounded-2xl p-5 border border-stone-200 flex items-center justify-between hover:border-amber-300 transition-all cursor-pointer"
            onClick={() => setSelectedExam("all")}
          >
            <div>
              <p className="text-2xl font-bold text-amber-600">
                {stats.enAttente}
              </p>
              <p className="text-sm text-stone-500 mt-1">En attente</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 text-xl">
              <FaSpinner className="animate-spin" />
            </div>
          </div>
        </div>

        {/* Filtre par examen */}
        {exams.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <label className="text-sm font-medium text-stone-700">
                Filtrer par examen :
              </label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="flex-1 min-w-[200px] px-4 py-2 border border-stone-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bleu-profond-500 focus:border-transparent"
              >
                <option value="all">Tous les examens</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.titre} ({exam.matiere})
                  </option>
                ))}
              </select>
              <span className="text-sm text-stone-500">
                {filteredCopies.length} copie
                {filteredCopies.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}

        {/* Liste des copies */}
        <div id="copies-container">
          {currentItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-stone-50 flex items-center justify-center text-3xl mb-4 border border-stone-200">
                  <FaFileAlt className="text-stone-300" />
                </div>
                <h3 className="text-lg font-medium text-stone-900 mb-2">
                  Aucune copie trouvée
                </h3>
                <p className="text-sm text-stone-500">
                  Aucune copie ne correspond à vos critères.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {currentItems.map((copie) => (
                  <div
                    key={copie.id}
                    className="bg-white rounded-2xl border border-stone-200 hover:border-bleu-profond-300 hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    <div className="p-5">
                      {/* En-tête */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="min-w-0">
                          <span className="text-xs font-mono text-stone-400">
                            #{copie.id}
                          </span>
                          <h3 className="text-sm font-semibold text-stone-800 mt-0.5 truncate">
                            {copie.exam_title}
                          </h3>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
                            copie.note !== null && copie.note !== undefined
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {copie.note !== null && copie.note !== undefined ? (
                            <FaCheckCircle size={10} />
                          ) : (
                            <FaSpinner size={10} className="animate-spin" />
                          )}
                          {copie.note !== null && copie.note !== undefined
                            ? "Corrigée"
                            : "En attente"}
                        </span>
                      </div>

                      {/* Informations */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-stone-600">
                          <FaBook className="text-stone-400 text-xs w-4 flex-shrink-0" />
                          <span className="truncate">
                            {copie.exam_matiere || "Non spécifiée"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-stone-600">
                          <FaUser className="text-stone-400 text-xs w-4 flex-shrink-0" />
                          <span className="truncate">
                            {copie.student_name ||
                              `Étudiant #${copie.student_id}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-stone-600">
                          <FaCalendarAlt className="text-stone-400 text-xs w-4 flex-shrink-0" />
                          <span className="text-xs text-stone-500 truncate">
                            {new Date(copie.date_soumission).toLocaleString(
                              "fr-FR",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Note */}
                      {copie.note !== null && copie.note !== undefined && (
                        <div className="mt-4 pt-3 border-t border-stone-100">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-stone-500">Note</span>
                            <span className="text-lg font-bold text-bleu-profond-600">
                              {copie.note}{" "}
                              <span className="text-sm font-normal text-stone-400">
                                / {copie.exam_points || "?"}
                              </span>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-4 pt-3 border-t border-stone-100 flex gap-2">
                        <button
                          onClick={() =>
                            handleExportPDF(copie.id, copie.student_name)
                          }
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
                        >
                          <FaFilePdf size={12} /> PDF
                        </button>
                        <Link
                          to={`/exams/${copie.exam_id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-bleu-profond-600 bg-bleu-profond-50 hover:bg-bleu-profond-100 transition-colors"
                        >
                          <FaEye size={12} /> Voir l'examen
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                  <div className="text-sm text-stone-500">
                    Affichage de{" "}
                    <span className="font-medium text-stone-700">
                      {startIndex + 1}
                    </span>{" "}
                    à{" "}
                    <span className="font-medium text-stone-700">
                      {endIndex}
                    </span>{" "}
                    sur{" "}
                    <span className="font-medium text-stone-700">
                      {totalItems}
                    </span>{" "}
                    copies
                  </div>

                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    <button
                      onClick={goToFirstPage}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === 1
                          ? "text-stone-300 cursor-not-allowed"
                          : "text-stone-600 hover:bg-stone-100"
                      }`}
                      title="Première page"
                    >
                      <FaAngleDoubleLeft size={14} />
                    </button>
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === 1
                          ? "text-stone-300 cursor-not-allowed"
                          : "text-stone-600 hover:bg-stone-100"
                      }`}
                      title="Page précédente"
                    >
                      <FaChevronLeft size={14} />
                    </button>

                    <div className="flex gap-1">
                      {getPageNumbers().map((page, index) => (
                        <button
                          key={index}
                          onClick={() =>
                            typeof page === "number" && goToPage(page)
                          }
                          className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-all ${
                            page === currentPage
                              ? "bg-bleu-profond-600 text-white shadow-sm"
                              : page === "..."
                                ? "text-stone-400 cursor-default"
                                : "text-stone-600 hover:bg-stone-100"
                          }`}
                          disabled={page === "..."}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === totalPages
                          ? "text-stone-300 cursor-not-allowed"
                          : "text-stone-600 hover:bg-stone-100"
                      }`}
                      title="Page suivante"
                    >
                      <FaChevronRight size={14} />
                    </button>
                    <button
                      onClick={goToLastPage}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === totalPages
                          ? "text-stone-300 cursor-not-allowed"
                          : "text-stone-600 hover:bg-stone-100"
                      }`}
                      title="Dernière page"
                    >
                      <FaAngleDoubleRight size={14} />
                    </button>

                    <div className="ml-4 flex items-center gap-2">
                      <span className="text-xs text-stone-500">Lignes:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bleu-profond-500"
                      >
                        <option value={6}>6</option>
                        <option value={9}>9</option>
                        <option value={12}>12</option>
                        <option value={24}>24</option>
                        <option value={48}>48</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorrectionsPage;
