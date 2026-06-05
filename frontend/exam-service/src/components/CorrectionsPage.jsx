import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaFileAlt,
  FaSpinner,
  FaCheckCircle,
  FaEye,
  FaFilePdf,
} from "react-icons/fa";
import api from "../services/api";
import LoadingSpinner from "./LoadingSpinner";
import toast from "react-hot-toast";

const CorrectionsPage = () => {
  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState("all");
  const [exams, setExams] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const examsData = await api.getExams();
      setExams(examsData);

      // Récupérer toutes les copies
      let allCopies = [];
      for (const exam of examsData) {
        try {
          const res = await api.get(`/copies/exam/${exam.id}`);
          const copiesWithExam = res.data.map((c) => ({
            ...c,
            exam_title: exam.titre,
            exam_matiere: exam.matiere,
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

  const stats = {
    total: copies.length,
    corrigees: copies.filter((c) => c.note !== null).length,
    enAttente: copies.filter((c) => c.note === null).length,
  };

  if (loading) return <LoadingSpinner message="Chargement des copies..." />;

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1>Corrections</h1>
        <p>Consultez et gérez les copies soumises par les étudiants</p>
      </div>

      {/* Statistiques */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FaFileAlt />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total copies</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FaCheckCircle />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.corrigees}</span>
            <span className="stat-label">Corrigées</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FaSpinner />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.enAttente}</span>
            <span className="stat-label">En attente</span>
          </div>
        </div>
      </div>

      {/* Filtre par examen */}
      {exams.length > 0 && (
        <div className="filter-section">
          <label>Filtrer par examen :</label>
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tous les examens</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.titre}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Liste des copies */}
      {filteredCopies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>Aucune copie trouvée</h3>
          <p>Aucune copie n'a encore été soumise pour cet examen.</p>
        </div>
      ) : (
        <div className="copies-grid">
          {filteredCopies.map((copie) => (
            <div key={copie.id} className="copy-card">
              <div className="copy-header">
                <h3>Copie #{copie.id}</h3>
                <span
                  className={`status-badge ${copie.note !== null ? "corrige" : "en-attente"}`}
                >
                  {copie.note !== null ? "✓ Corrigée" : "⏳ En attente"}
                </span>
              </div>

              <div className="copy-info">
                <p>
                  <strong>Examen :</strong> {copie.exam_title}
                </p>
                <p>
                  <strong>Matière :</strong>{" "}
                  {copie.exam_matiere || "Non spécifiée"}
                </p>
                <p>
                  <strong>Étudiant :</strong> #{copie.student_id}
                </p>
                <p>
                  <strong>Soumis le :</strong>{" "}
                  {new Date(copie.date_soumission).toLocaleString("fr-FR")}
                </p>
                {copie.note !== null && (
                  <p className="copy-note">
                    <strong>Note :</strong> {copie.note} / ? pts
                  </p>
                )}
              </div>

              <div className="copy-actions">
                <button
                  onClick={() => handleExportPDF(copie.id)}
                  className="action-btn pdf"
                >
                  <FaFilePdf /> Exporter PDF
                </button>
                <Link
                  to={`/exams/${copie.exam_id}`}
                  className="action-btn view"
                >
                  <FaEye /> Voir examen
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .filter-section {
          background: white;
          padding: 16px 20px;
          border-radius: 16px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .filter-section label {
          font-weight: 500;
          color: #1e293b;
        }
        .filter-select {
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 14px;
          min-width: 250px;
        }
        .copies-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }
        .copy-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }
        .copy-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }
        .copy-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        .copy-header h3 {
          font-size: 16px;
          margin: 0;
        }
        .status-badge.corrige {
          background: #ecfdf5;
          color: #10b981;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
        }
        .status-badge.en-attente {
          background: #fffbeb;
          color: #f59e0b;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
        }
        .copy-info p {
          margin: 8px 0;
          font-size: 14px;
          color: #475569;
        }
        .copy-note {
          font-size: 16px;
          color: #3b82f6;
          margin-top: 12px;
        }
        .copy-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
        }
      `}</style>
    </div>
  );
};

export default CorrectionsPage;
