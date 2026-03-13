import React, { useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';
import '../styles/QuestionForm.css';

const QuestionForm = ({ examId, question, onClose, onSuccess }) => {
  // Parser les choix existants si c'est un QCM en édition
  const parseChoix = () => {
    if (question?.type_question === 'qcm' && question?.reponse_correcte) {
      try {
        const parsed = JSON.parse(question.reponse_correcte);
        return parsed.choix || ['', '', '', ''];
      } catch { return ['', '', '', '']; }
    }
    return ['', '', '', ''];
  };

  const parseBonneReponse = () => {
    if (question?.type_question === 'qcm' && question?.reponse_correcte) {
      try {
        const parsed = JSON.parse(question.reponse_correcte);
        return parsed.bonne_reponse ?? 0;
      } catch { return 0; }
    }
    return 0;
  };

  const [formData, setFormData] = useState({
    texte: question?.texte || '',
    points: question?.points || 2,
    type_question: question?.type_question || 'ouverte',
    ordre: question?.ordre || 0,
  });
  const [choix, setChoix] = useState(parseChoix());
  const [bonneReponse, setBonneReponse] = useState(parseBonneReponse());
  const [loading, setLoading] = useState(false);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleChoixChange = (index, value) => {
    const newChoix = [...choix];
    newChoix[index] = value;
    setChoix(newChoix);
  };

  const addChoix = () => {
    if (choix.length < 6) setChoix([...choix, '']);
  };

  const removeChoix = (index) => {
    if (choix.length <= 2) return;
    const newChoix = choix.filter((_, i) => i !== index);
    setChoix(newChoix);
    if (bonneReponse >= newChoix.length) setBonneReponse(0);
  };

  const buildReponseCorrecte = () => {
    if (formData.type_question === 'qcm') {
      return JSON.stringify({
        choix: choix.filter(c => c.trim()),
        bonne_reponse: bonneReponse
      });
    }
    return null;
  };

  const validate = () => {
    if (!formData.texte.trim()) { toast.error('Le texte est obligatoire'); return false; }
    if (formData.type_question === 'qcm') {
      const valides = choix.filter(c => c.trim());
      if (valides.length < 2) { toast.error('Ajoutez au moins 2 choix'); return false; }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        ...formData,
        reponse_correcte: buildReponseCorrecte(),
      };
      if (question) {
        await api.updateQuestion(question.id, payload);
        toast.success('Question modifiée ✓');
      } else {
        await api.createQuestion({ ...payload, exam_id: parseInt(examId) });
        toast.success('Question ajoutée ✓');
      }
      onSuccess();
    } catch {
      toast.error(question ? 'Erreur de modification' : "Erreur d'ajout");
    } finally {
      setLoading(false);
    }
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const LETTRES = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="modal" onClick={handleBackdrop}>
      <div className="modal-content modal-large">
        <h2>{question ? 'Modifier la question' : 'Ajouter une question'}</h2>

        <form onSubmit={handleSubmit}>
          {/* Type */}
          <div className="form-group">
            <label>Type de question</label>
            <div className="type-toggle">
              {[
                { val: 'ouverte', icon: '✏️', label: 'Ouverte' },
                { val: 'calcul',  icon: '🔢', label: 'Calcul' },
                { val: 'qcm',     icon: '☑️', label: 'QCM' },
              ].map(t => (
                <button
                  key={t.val}
                  type="button"
                  className={`type-btn ${formData.type_question === t.val ? 'selected' : ''}`}
                  onClick={() => set('type_question', t.val)}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Texte de la question */}
          <div className="form-group">
            <label>
              {formData.type_question === 'qcm'
                ? 'Énoncé de la question *'
                : 'Texte de la question *'}
            </label>
            <textarea
              value={formData.texte}
              onChange={e => set('texte', e.target.value)}
              required
              rows={formData.type_question === 'qcm' ? 2 : 4}
              className="form-control"
              placeholder={
                formData.type_question === 'qcm'
                  ? 'Ex: Quelle est la limite de u_n quand n → +∞ ?'
                  : 'Écrire le texte de la question...'
              }
            />
          </div>

          {/* ── CHOIX QCM ── */}
          {formData.type_question === 'qcm' && (
            <div className="form-group">
              <label>Choix de réponses <span className="label-hint">(cochez la bonne réponse)</span></label>
              <div className="choix-list">
                {choix.map((c, i) => (
                  <div key={i} className={`choix-row ${bonneReponse === i ? 'correct' : ''}`}>
                    {/* Radio bonne réponse */}
                    <button
                      type="button"
                      className={`choix-radio ${bonneReponse === i ? 'selected' : ''}`}
                      onClick={() => setBonneReponse(i)}
                      title="Marquer comme bonne réponse"
                    >
                      {bonneReponse === i ? '✓' : LETTRES[i]}
                    </button>

                    {/* Input du choix */}
                    <input
                      type="text"
                      value={c}
                      onChange={e => handleChoixChange(i, e.target.value)}
                      className="form-control choix-input"
                      placeholder={`Choix ${LETTRES[i]}...`}
                    />

                    {/* Supprimer */}
                    {choix.length > 2 && (
                      <button
                        type="button"
                        className="choix-delete"
                        onClick={() => removeChoix(i)}
                        title="Supprimer ce choix"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                ))}

                {choix.length < 6 && (
                  <button type="button" className="btn-add-choix" onClick={addChoix}>
                    <FaPlus /> Ajouter un choix
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Points + Ordre */}
          <div className="form-row">
            <div className="form-group">
              <label>Points</label>
              <input
                type="number"
                value={formData.points}
                onChange={e => set('points', e.target.value)}
                min="0.5" max="20" step="0.5"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Ordre</label>
              <input
                type="number"
                value={formData.ordre}
                onChange={e => set('ordre', e.target.value)}
                min="0"
                className="form-control"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'En cours...' : (question ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionForm;