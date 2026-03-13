import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaEdit, FaFilePdf, FaArrowLeft, FaFileAlt } from 'react-icons/fa';
import api from '../services/api';
import QuestionList from './QuestionList';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';
import '../styles/ExamDetails.css';

const ExamDetails = () => {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBrut, setShowBrut] = useState(false);

  useEffect(() => { loadExamDetails(); }, [id]);

  const loadExamDetails = async () => {
    try {
      const [examData, questionsData] = await Promise.all([
        api.getExam(id),
        api.getExamQuestions(id)
      ]);
      setExam(examData);
      setQuestions(questionsData);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    const toastId = toast.loading('Génération du PDF en cours...');
    try {
      await api.exportExamPDF(id);
      toast.success('PDF téléchargé !', { id: toastId });
    } catch {
      toast.error('Erreur export PDF', { id: toastId });
    }
  };

  const handleExportBrut = async () => {
    try {
      await api.exportExamBrut(id);
      toast.success('Fichier téléchargé');
    } catch {
      toast.error('Erreur export contenu brut');
    }
  };

  if (loading) return <LoadingSpinner message="Chargement de l'examen..." />;
  if (!exam) return <div className="empty-state"><p>Examen non trouvé</p></div>;

  return (
    <div className="exam-details fade-in">
      <div className="details-header">
        <Link to="/exams" className="back-link">
          <FaArrowLeft /> Retour aux examens
        </Link>
        <div className="header-actions">
          <Link to={`/exams/${id}/edit`} className="btn btn-secondary">
            <FaEdit /> Modifier
          </Link>
          {exam.contenu_brut && (
            <button onClick={handleExportBrut} className="btn btn-secondary">
              <FaFileAlt /> Contenu brut
            </button>
          )}
          <button onClick={handleExportPDF} className="btn btn-success">
            <FaFilePdf /> Exporter PDF
          </button>
        </div>
      </div>

      {/* Infos examen */}
      <div className="exam-info">
        <h1>{exam.titre}</h1>
        <div className="info-grid">
          <div className="info-item">
            <label>Matière</label>
            <p>{exam.matiere || 'Non spécifiée'}</p>
          </div>
          <div className="info-item">
            <label>Points totaux</label>
            <p>{exam.points_totaux} pts</p>
          </div>
          <div className="info-item">
            <label>Statut</label>
            <p><span className={`status ${exam.statut}`}>{exam.statut}</span></p>
          </div>
          <div className="info-item">
            <label>Date de création</label>
            <p>{new Date(exam.date_creation).toLocaleString('fr-FR')}</p>
          </div>
        </div>
      </div>

      {/* Contenu brut si pas de questions */}
      {questions.length === 0 && exam.contenu_brut && (
        <div className="contenu-brut-block">
          <div className="contenu-brut-header">
            <div>
              <h2>Contenu de l'examen</h2>
              <p className="contenu-hint">
                Les questions n'ont pas encore été extraites automatiquement.
                Vous pouvez les ajouter manuellement ci-dessous ou réimporter le fichier.
              </p>
            </div>
            <button
              onClick={() => setShowBrut(!showBrut)}
              className="btn btn-secondary"
            >
              {showBrut ? 'Masquer' : 'Voir le texte'}
            </button>
          </div>

          {showBrut && (
            <pre className="contenu-brut-text">{exam.contenu_brut}</pre>
          )}
        </div>
      )}

      {/* Liste des questions */}
      <QuestionList
        examId={id}
        questions={questions}
        onUpdate={loadExamDetails}
      />
    </div>
  );
};

export default ExamDetails;