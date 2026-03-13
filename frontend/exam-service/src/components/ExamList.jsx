import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaEye, FaEdit, FaTrash, FaFilePdf, FaPlus, FaUpload,
         FaBook, FaCheckCircle, FaClock } from 'react-icons/fa';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';
import '../styles/ExamList.css';

const ExamList = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadExams(); }, []);

  const loadExams = async () => {
    try {
      const data = await api.getExams();
      setExams(data);
    } catch {
      toast.error('Erreur lors du chargement des examens');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet examen définitivement ?')) return;
    try {
      await api.deleteExam(id);
      setExams(exams.filter(e => e.id !== id));
      toast.success('Examen supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handlePublish = async (id) => {
    try {
      await api.publishExam(id);
      loadExams();
      toast.success('Examen publié ✓');
    } catch {
      toast.error('Erreur lors de la publication');
    }
  };

  const handleExportPDF = async (id) => {
    const toastId = toast.loading('Génération du PDF...');
    try {
      await api.exportExamPDF(id);
      toast.success('PDF téléchargé !', { id: toastId });
    } catch {
      toast.error('Erreur export PDF', { id: toastId });
    }
  };

  if (loading) return <LoadingSpinner message="Chargement des examens..." />;

  const total = exams.length;
  const publies = exams.filter(e => e.statut === 'publié').length;
  const brouillons = exams.filter(e => e.statut === 'brouillon').length;

  return (
    <div className="exam-list fade-in">
      {/* Header */}
      <div className="header">
        <h1>Mes Examens</h1>
        <div className="header-actions">
          <Link to="/exams/import" className="btn btn-secondary">
            <FaUpload /> Importer
          </Link>
          <Link to="/exams/new" className="btn btn-primary">
            <FaPlus /> Nouvel examen
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-icon blue"><FaBook /></div>
          <div className="stat-info">
            <span className="stat-value">{total}</span>
            <span className="stat-label">Total examens</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FaCheckCircle /></div>
          <div className="stat-info">
            <span className="stat-value">{publies}</span>
            <span className="stat-label">Publiés</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><FaClock /></div>
          <div className="stat-info">
            <span className="stat-value">{brouillons}</span>
            <span className="stat-label">Brouillons</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      {exams.length > 0 ? (
        <div className="grid">
          {exams.map((exam, i) => (
            <div
              key={exam.id}
              className="exam-card"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="exam-header">
                <h3>{exam.titre}</h3>
                <span className={`status ${exam.statut}`}>{exam.statut}</span>
              </div>

              <p className="exam-matiere">{exam.matiere || 'Matière non spécifiée'}</p>
              <p className="exam-description">{exam.description && exam.description.length > 80 ? exam.description.slice(0, 80) + "..." : (exam.description || "Aucune description")}</p>

              <div className="exam-footer">
                <span>{new Date(exam.date_creation).toLocaleDateString('fr-FR')}</span>
                <span className="exam-points">{exam.points_totaux} pts</span>
              </div>

              <div className="exam-actions">
                <Link to={`/exams/${exam.id}`} className="btn-icon" title="Voir les détails">
                  <FaEye />
                </Link>
                <Link to={`/exams/${exam.id}/edit`} className="btn-icon" title="Modifier">
                  <FaEdit />
                </Link>
                <button onClick={() => handleExportPDF(exam.id)} className="btn-icon" title="Exporter PDF">
                  <FaFilePdf />
                </button>
                <button onClick={() => handleDelete(exam.id)} className="btn-icon delete" title="Supprimer">
                  <FaTrash />
                </button>
              </div>

              {exam.statut === 'brouillon' && (
                <button onClick={() => handlePublish(exam.id)} className="btn-publish">
                  Publier l'examen
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>Aucun examen pour le moment</p>
          <Link to="/exams/new" className="btn btn-primary">
            <FaPlus /> Créer votre premier examen
          </Link>
        </div>
      )}
    </div>
  );
};

export default ExamList;