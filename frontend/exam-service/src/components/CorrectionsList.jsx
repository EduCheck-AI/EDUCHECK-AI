import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaFileAlt,
  FaCheckCircle,
  FaClock,
  FaSearch,
  FaEye,
  FaEdit,
  FaDownload,
  FaChartLine,
  FaUpload,
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

const CorrectionsList = () => {
  const [copies, setCopies] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ État pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  // ✅ Réinitialiser à la page 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedExam, filterStatus, searchTerm]);

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
            exam_id: exam.id,
          }));
          allCopies = [...allCopies, ...copiesWithExam];
        } catch (e) {
          console.log(`Aucune copie pour l'examen ${exam.id}`);
        }
      }
      setCopies(allCopies);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCopies = () => {
    let filtered = [...copies];

    if (selectedExam !== "all") {
      filtered = filtered.filter((c) => c.exam_id === parseInt(selectedExam));
    }

    if (filterStatus === "corrigees") {
      filtered = filtered.filter(
        (c) => c.note !== null && c.note !== undefined,
      );
    } else if (filterStatus === "en-attente") {
      filtered = filtered.filter(
        (c) => c.note === null || c.note === undefined,
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.exam_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.student_id?.toString().includes(searchTerm),
      );
    }

    return filtered;
  };

  const getStats = () => {
    const filtered = getFilteredCopies();
    const total = filtered.length;
    const corrigees = filtered.filter(
      (c) => c.note !== null && c.note !== undefined,
    ).length;
    const enAttente = total - corrigees;
    const moyenne =
      corrigees > 0
        ? (
            filtered.reduce((sum, c) => sum + (parseFloat(c.note) || 0), 0) /
            corrigees
          ).toFixed(1)
        : 0;

    return { total, corrigees, enAttente, moyenne };
  };

  const exportClassResults = async (examId, examTitle) => {
    try {
      const response = await api.get(`/exams/${examId}/export/class/csv`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `resultats_${examTitle}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export CSV réussi");
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'export");
    }
  };

  const stats = getStats();
  const filteredCopies = getFilteredCopies();

  // ✅ Calculs de pagination
  const totalItems = filteredCopies.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentItems = filteredCopies.slice(startIndex, endIndex);

  // ✅ Fonctions de navigation
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    // Scroll en haut du tableau
    document
      .getElementById("table-container")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // ✅ Générer les numéros de pages
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Toujours montrer la première page
      pages.push(1);

      // Calculer le milieu
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Ajuster pour montrer 3 pages autour de la page courante
      if (currentPage <= 3) {
        end = Math.min(totalPages - 1, 4);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3);
      }

      // Ajouter des points de suspension avant
      if (start > 2) {
        pages.push("...");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Ajouter des points de suspension après
      if (end < totalPages - 1) {
        pages.push("...");
      }

      // Toujours montrer la dernière page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (loading) return <LoadingSpinner message="Chargement des copies..." />;

  const statCards = [
    {
      icon: <FaFileAlt />,
      value: stats.total,
      label: "Total copies",
      color: "text-bleu-profond-600",
      bg: "bg-bleu-profond-50",
      filter: "all",
    },
    {
      icon: <FaCheckCircle />,
      value: stats.corrigees,
      label: "Corrigées",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      filter: "corrigees",
    },
    {
      icon: <FaClock />,
      value: stats.enAttente,
      label: "En attente",
      color: "text-amber-600",
      bg: "bg-amber-50",
      filter: "en-attente",
    },
    {
      icon: <FaChartLine />,
      value: `${stats.moyenne}/20`,
      label: "Moyenne classe",
      color: "text-violet-600",
      bg: "bg-violet-50",
      filter: null,
    },
  ];

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
                Gestion des corrections
              </h1>
              <p className="text-sm text-stone-500 mt-0.5">
                Consultez et corrigez les copies soumises par les étudiants
              </p>
            </div>
          </div>
        </div>

        {/* Cartes statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((card, index) => (
            <div
              key={index}
              onClick={() => card.filter && setFilterStatus(card.filter)}
              className={`bg-white rounded-2xl p-5 border border-stone-200 transition-all duration-200 ${
                card.filter
                  ? "cursor-pointer hover:border-bleu-profond-300 hover:shadow-md"
                  : ""
              } ${filterStatus === card.filter && card.filter ? "ring-2 ring-bleu-profond-500 ring-offset-2" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-stone-900">
                    {card.value}
                  </p>
                  <p className="text-sm text-stone-500 mt-1">{card.label}</p>
                </div>
                <div
                  className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center text-xl ${card.color}`}
                >
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Barre de filtres */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" />
              <input
                type="text"
                placeholder="Rechercher par examen, étudiant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-bleu-profond-500 focus:border-transparent bg-stone-50 focus:bg-white transition-all text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="px-4 py-2 border border-stone-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bleu-profond-500 focus:border-transparent"
              >
                <option value="all">Tous les examens</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.titre} ({exam.matiere})
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                    filterStatus === "all"
                      ? "bg-bleu-profond-600 text-white"
                      : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setFilterStatus("corrigees")}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                    filterStatus === "corrigees"
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  Corrigées
                </button>
                <button
                  onClick={() => setFilterStatus("en-attente")}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                    filterStatus === "en-attente"
                      ? "bg-amber-600 text-white"
                      : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  En attente
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau des copies avec ID pour le scroll */}
        <div id="table-container">
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
                  Aucune copie ne correspond à vos critères de recherche.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                          <div className="flex items-center gap-1.5">
                            <FaUser size={12} /> Étudiant
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                          <div className="flex items-center gap-1.5">
                            <FaBook size={12} /> Examen
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                          Matière
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                          <div className="flex items-center gap-1.5">
                            <FaCalendarAlt size={12} /> Date
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                          Note
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {currentItems.map((copie) => (
                        <tr
                          key={copie.id}
                          className="hover:bg-stone-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs text-stone-400 font-mono">
                            #{copie.id}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-stone-700">
                            {copie.student_name ||
                              `Étudiant #${copie.student_id}`}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-stone-600 max-w-[150px] truncate"
                            title={copie.exam_title}
                          >
                            {copie.exam_title}
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-600">
                            {copie.exam_matiere || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-500">
                            {new Date(copie.date_soumission).toLocaleDateString(
                              "fr-FR",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {copie.note !== null && copie.note !== undefined ? (
                              <span className="text-sm font-semibold text-bleu-profond-600">
                                {copie.note}/{copie.exam_points}
                              </span>
                            ) : (
                              <span className="text-sm text-stone-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {copie.note !== null && copie.note !== undefined ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                <FaCheckCircle size={10} /> Corrigée
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                                <FaClock size={10} /> En attente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/corrections/${copie.id}`}
                                state={{
                                  copie: copie,
                                  exam_id: copie.exam_id,
                                  exam_title: copie.exam_title,
                                  student_answer:
                                    copie.reponses || "Aucune réponse",
                                }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                  copie.note !== null &&
                                  copie.note !== undefined
                                    ? "text-bleu-profond-600 bg-bleu-profond-50 hover:bg-bleu-profond-100"
                                    : "text-amber-600 bg-amber-50 hover:bg-amber-100"
                                }`}
                              >
                                {copie.note !== null &&
                                copie.note !== undefined ? (
                                  <>
                                    <FaEye size={12} /> Voir
                                  </>
                                ) : (
                                  <>
                                    <FaEdit size={12} /> Corriger
                                  </>
                                )}
                              </Link>
                              <button
                                onClick={() =>
                                  exportClassResults(
                                    copie.exam_id,
                                    copie.exam_title,
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-stone-600 bg-stone-100 hover:bg-stone-200 transition-all"
                              >
                                <FaDownload size={12} /> Export
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ✅ Composant de pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
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

                  <div className="flex items-center gap-1">
                    {/* Première page */}
                    <button
                      onClick={goToFirstPage}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === 1
                          ? "text-stone-300 cursor-not-allowed"
                          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                      }`}
                      title="Première page"
                    >
                      <FaAngleDoubleLeft size={14} />
                    </button>

                    {/* Page précédente */}
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === 1
                          ? "text-stone-300 cursor-not-allowed"
                          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                      }`}
                      title="Page précédente"
                    >
                      <FaChevronLeft size={14} />
                    </button>

                    {/* Numéros de pages */}
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

                    {/* Page suivante */}
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === totalPages
                          ? "text-stone-300 cursor-not-allowed"
                          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                      }`}
                      title="Page suivante"
                    >
                      <FaChevronRight size={14} />
                    </button>

                    {/* Dernière page */}
                    <button
                      onClick={goToLastPage}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === totalPages
                          ? "text-stone-300 cursor-not-allowed"
                          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                      }`}
                      title="Dernière page"
                    >
                      <FaAngleDoubleRight size={14} />
                    </button>

                    {/* Sélecteur d'éléments par page */}
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
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Boutons d'import par examen */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-stone-800 mb-4 flex items-center gap-2">
            <FaUpload className="text-bleu-profond-600" />
            Importer des copies
          </h3>
          <div className="flex flex-wrap gap-3">
            {exams.map((exam) => (
              <Link
                key={exam.id}
                to={`/exams/${exam.id}/upload`}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-bleu-profond-600 rounded-xl hover:bg-bleu-profond-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <FaUpload size={12} />
                {exam.titre.length > 25
                  ? exam.titre.slice(0, 25) + "…"
                  : exam.titre}
              </Link>
            ))}
            {exams.length === 0 && (
              <p className="text-sm text-stone-500">
                Aucun examen disponible. Créez d'abord un examen.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrectionsList;
