import React, { useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import api from '../services/api';
import QuestionForm from './QuestionForm';
import MathText from './MathText';
import toast from 'react-hot-toast';
import '../styles/QuestionList.css';

const TYPE_LABELS = { ouverte: 'Ouverte', calcul: 'Calcul', qcm: 'QCM' };

const QuestionList = ({ examId, questions, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const handleDelete = async (questionId) => {
    if (!window.confirm('Supprimer cette question ?')) return;
    try {
      await api.deleteQuestion(questionId);
      onUpdate();
      toast.success('Question supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="question-list">
      <div className="list-header">
        <h2>Questions ({questions.length})</h2>
        <button
          onClick={() => { setEditingQuestion(null); setShowForm(true); }}
          className="btn btn-primary"
        >
          <FaPlus /> Ajouter
        </button>
      </div>

      {questions.length > 0 ? (
        questions.map((q, i) => (
          <div key={q.id} className="question-card" style={{ animationDelay: `${i * 0.04}s` }}>
            <div className="question-header">
              <h3>
                <span className="question-num">{i + 1}</span>
                <span className="question-pts">{q.points} pts</span>
              </h3>
              <div className="question-actions">
                <button
                  onClick={() => { setEditingQuestion(q); setShowForm(true); }}
                  className="btn-icon"
                  title="Modifier"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="btn-icon delete"
                  title="Supprimer"
                >
                  <FaTrash />
                </button>
              </div>
            </div>

            {/* Texte avec formules rendues */}
            <p className="question-text">
              <MathText text={q.texte} />
            </p>

            <span className={`type-badge ${q.type_question}`}>
              {TYPE_LABELS[q.type_question] || q.type_question}
            </span>
          </div>
        ))
      ) : (
        <div className="empty-questions">
          Aucune question — cliquez sur <strong>Ajouter</strong> pour commencer
        </div>
      )}

      {(showForm || editingQuestion) && (
        <QuestionForm
          examId={examId}
          question={editingQuestion}
          onClose={() => { setShowForm(false); setEditingQuestion(null); }}
          onSuccess={() => { setShowForm(false); setEditingQuestion(null); onUpdate(); }}
        />
      )}
    </div>
  );
};

export default QuestionList;