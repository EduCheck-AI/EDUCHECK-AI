import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaFilePdf,
  FaPlus,
  FaUpload,
  FaBook,
  FaCheckCircle,
  FaClock,
  FaSearch,
  FaFilter,
} from "react-icons/fa";
import api from "../services/api";
import LoadingSpinner from "./LoadingSpinner";
import toast from "react-hot-toast";
import "../styles/ExamList.css";

const ExamList = () => {
  const navigate = useNavigate();
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
    } catch (error) {
      toast.error("Erreur lors du chargement des examens");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterExams = () => {
    let filtered = [...exams];

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (exam) =>
          exam.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          exam.matiere?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Filtre par statut
    if (filterStatus !== "all") {
      filtered = filtered.filter((exam) => exam.statut === filterStatus);
    }

    setFilteredExams(filtered);
  };

  const handleDelete = async (id, titre) => {
    if (!window.confirm(`Supprimer l'examen "${titre}" définitivement ?`))
      return;
    try {
      await api.deleteExam(id);
      setExams(exams.filter((e) => e.id !== id));
      toast.success(`Examen "${titre}" supprimé`);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handlePublish = async (id) => {
    try {
      await api.publishExam(id);
      await loadExams();
      toast.success(
        "Examen publié ! Les étudiants peuvent maintenant y accéder.",
      );
    } catch (error) {
      toast.error("Erreur lors de la publication");
    }
  };

  const handleExportPDF = async (id, titre) => {
    const toastId = toast.loading(`Génération du PDF pour "${titre}"...`);
    try {
      await api.exportExamPDF(id);
      toast.success("PDF téléchargé !", { id: toastId });
    } catch (error) {
      toast.error("Erreur lors de la génération du PDF", { id: toastId });
    }
  };

  if (loading) return <LoadingSpinner message="Chargement des examens..." />;

  const stats = {
    total: exams.length,
    publies: exams.filter((e) => e.statut === "publié").length,
    brouillons: exams.filter((e) => e.statut === "brouillon").length,
  };

  return (
    <div className="exam-list fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Mes examens</h1>
          <p className="subtitle">
            Gérez et corrigez vos examens en un clin d'œil
          </p>
        </div>
        <div className="header-actions">
          <Link to="/exams/import" className="btn btn-secondary">
            <FaUpload /> Importer
          </Link>
          <Link to="/exams/new" className="btn btn-primary">
            <FaPlus /> Nouvel examen
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FaBook />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total examens</span>
          </div>
        </div>
        <div
          className="stat-card clickable"
          onClick={() => setFilterStatus("publié")}
        >
          <div className="stat-icon green">
            <FaCheckCircle />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.publies}</span>
            <span className="stat-label">Publiés</span>
          </div>
        </div>
        <div
          className="stat-card clickable"
          onClick={() => setFilterStatus("brouillon")}
        >
          <div className="stat-icon orange">
            <FaClock />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.brouillons}</span>
            <span className="stat-label">Brouillons</span>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="search-filter-bar">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher un examen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterStatus === "all" ? "active" : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            Tous
          </button>
          <button
            className={`filter-btn ${filterStatus === "publié" ? "active" : ""}`}
            onClick={() => setFilterStatus("publié")}
          >
            Publiés
          </button>
          <button
            className={`filter-btn ${filterStatus === "brouillon" ? "active" : ""}`}
            onClick={() => setFilterStatus("brouillon")}
          >
            Brouillons
          </button>
        </div>
      </div>

      {/* Exam Grid */}
      {filteredExams.length > 0 ? (
        <div className="exams-grid">
          {filteredExams.map((exam, index) => (
            <div
              key={exam.id}
              className="exam-card"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div className="exam-card-header">
                <h3 className="exam-title">{exam.titre}</h3>
                <span className={`status-badge ${exam.statut}`}>
                  {exam.statut === "publié" ? "Publié" : "Brouillon"}
                </span>
              </div>

              <div className="exam-meta">
                <span className="matiere">
                  {exam.matiere || "Matière non spécifiée"}
                </span>
                <span className="points">{exam.points_totaux} pts</span>
              </div>

              {exam.description && (
                <p className="exam-description">
                  {exam.description.length > 100
                    ? exam.description.slice(0, 100) + "..."
                    : exam.description}
                </p>
              )}

              <div className="exam-date">
                Créé le{" "}
                {new Date(exam.date_creation).toLocaleDateString("fr-FR")}
              </div>

              <div className="exam-actions">
                <Link
                  to={`/exams/${exam.id}`}
                  className="action-btn view"
                  title="Voir les détails"
                >
                  <FaEye /> Détails
                </Link>
                <Link
                  to={`/exams/${exam.id}/edit`}
                  className="action-btn edit"
                  title="Modifier"
                >
                  <FaEdit /> Modifier
                </Link>
                <button
                  onClick={() => handleExportPDF(exam.id, exam.titre)}
                  className="action-btn pdf"
                  title="Exporter PDF"
                >
                  <FaFilePdf /> PDF
                </button>
                <button
                  onClick={() => handleDelete(exam.id, exam.titre)}
                  className="action-btn delete"
                  title="Supprimer"
                >
                  <FaTrash /> Supprimer
                </button>
              </div>

              {exam.statut === "brouillon" && (
                <button
                  onClick={() => handlePublish(exam.id)}
                  className="publish-btn"
                >
                  Publier l'examen
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon"></div>
          <FaSearch/>
          <h3>Aucun examen trouvé</h3>
          <p>
            {searchTerm || filterStatus !== "all"
              ? "Aucun examen ne correspond à vos critères."
              : "Commencez par créer ou importer votre premier examen."}
          </p>
          {!searchTerm && filterStatus === "all" && (
            <div className="empty-actions">
              <Link to="/exams/new" className="btn btn-primary">
                Créer un examen
              </Link>
              <Link to="/exams/import" className="btn btn-secondary">
                Importer un examen
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamList;
