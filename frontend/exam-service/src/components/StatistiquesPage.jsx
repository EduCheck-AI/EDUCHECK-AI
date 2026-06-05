import React, { useState, useEffect } from "react";
import {
  FaChartLine,
  FaBook,
  FaUserGraduate,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";
import api from "../services/api";
import LoadingSpinner from "./LoadingSpinner";

const StatistiquesPage = () => {
  const [stats, setStats] = useState({
    totalExams: 0,
    totalQuestions: 0,
    totalCopies: 0,
    averageNote: 0,
    examsByMatiere: {},
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const exams = await api.getExams();

      let totalQuestions = 0;
      let totalCopies = 0;
      let totalNotes = 0;
      let notesCount = 0;
      const examsByMatiere = {};

      for (const exam of exams) {
        // Compter les questions
        const questions = await api.getExamQuestions(exam.id);
        totalQuestions += questions.length;

        // Compter les copies
        const copies = await api
          .get(`/copies/exam/${exam.id}`)
          .then((res) => res.data);
        totalCopies += copies.length;

        // Calculer les notes moyennes
        for (const copy of copies) {
          if (copy.note) {
            totalNotes += parseFloat(copy.note);
            notesCount++;
          }
        }

        // Grouper par matière
        const matiere = exam.matiere || "Autre";
        examsByMatiere[matiere] = (examsByMatiere[matiere] || 0) + 1;
      }

      setStats({
        totalExams: exams.length,
        totalQuestions,
        totalCopies,
        averageNote: notesCount > 0 ? (totalNotes / notesCount).toFixed(1) : 0,
        examsByMatiere,
      });
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <LoadingSpinner message="Chargement des statistiques..." />;

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1>Statistiques</h1>
        <p>Visualisez les performances de votre plateforme</p>
      </div>

      {/* Cartes principales */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FaBook />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalExams}</span>
            <span className="stat-label">Examens créés</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FaUserGraduate />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalCopies}</span>
            <span className="stat-label">Copies soumises</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FaCheckCircle />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalQuestions}</span>
            <span className="stat-label">Questions créées</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <FaChartLine />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.averageNote}/20</span>
            <span className="stat-label">Moyenne générale</span>
          </div>
        </div>
      </div>

      {/* Répartition par matière */}
      <div className="card">
        <h3>Répartition des examens par matière</h3>
        <div className="matiere-list">
          {Object.entries(stats.examsByMatiere).map(([matiere, count]) => (
            <div key={matiere} className="matiere-item">
              <span className="matiere-name">{matiere}</span>
              <div className="matiere-bar-container">
                <div
                  className="matiere-bar"
                  style={{ width: `${(count / stats.totalExams) * 100}%` }}
                />
              </div>
              <span className="matiere-count">{count} examen(s)</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin-top: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        .card h3 {
          margin-bottom: 20px;
          font-size: 18px;
        }
        .matiere-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .matiere-item {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .matiere-name {
          width: 120px;
          font-weight: 500;
        }
        .matiere-bar-container {
          flex: 1;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        .matiere-bar {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          border-radius: 4px;
        }
        .matiere-count {
          width: 100px;
          font-size: 14px;
          color: #64748b;
        }
        .stat-icon.purple {
          background: #f3e8ff;
          color: #9333ea;
        }
      `}</style>
    </div>
  );
};

export default StatistiquesPage;
