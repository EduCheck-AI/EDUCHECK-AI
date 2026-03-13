import React, { useState } from 'react';
import { FaPlus, FaTrash, FaTimes } from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';
import '../styles/QuestionForm.css';

const TYPES = [
  { val: 'ouverte', label: 'Ouverte',  icon: '✏️', desc: 'Réponse libre' },
  { val: 'calcul',  label: 'Calcul',   icon: '🔢', desc: 'Calcul / démonstration' },
  { val: 'qcm',     label: 'QCM',      icon: '☑️', desc: 'Choix multiple' },
];

const LETTRES = ['A', 'B', 'C', 'D', 'E', 'F'];

const QuestionForm = ({ examId, question, onClose, onSuccess }) => {
  const parseChoix = () => {
    if (question?.type_question === 'qcm' && question?.reponse_correcte) {
      try { return JSON.parse(question.reponse_correcte).choix || ['', '', '', '']; }
      catch { return ['', '', '', '']; }
    }
    return ['', '', '', ''];
  };

  const parseBonne = () => {
    if (question?.type_question === 'qcm' && question?.reponse_correcte) {
      try { return JSON.parse(question.reponse_correcte).bonne_reponse ?? 0; }
      catch { return 0; }
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
  const [bonneReponse, setBonneReponse] = useState(parseBonne());
  const [loading, setLoading] = useState(false);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleChoixChange = (i, v) => {
    const n = [...choix]; n[i] = v; setChoix(n);
  };

  const addChoix = () => { if (choix.length < 6) setChoix([...choix, '']); };

  const removeChoix = (i) => {
    if (choix.length <= 2) return;
    const n = choix.filter((_, j) => j !== i);
    setChoix(n);
    if (bonneReponse >= n.length) setBonneReponse(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.texte.trim()) { toast.error('Le texte est obligatoire'); return; }
    if (formData.type_question === 'qcm' && choix.filter(c => c.trim()).length < 2) {
      toast.error('Ajoutez au moins 2 choix'); return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        reponse_correcte: formData.type_question === 'qcm'
          ? JSON.stringify({ choix: choix.filter(c => c.trim()), bonne_reponse: bonneReponse })
          : null,
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

  return (
    <div className="qf-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="qf-modal">

        {/* Header */}
        <div className="qf-header">
          <div className="qf-header-left">
            <div className="qf-header-icon">
              {TYPES.find(t => t.val === formData.type_question)?.icon}
            </div>
            <div>
              <h2>{question ? 'Modifier la question' : 'Nouvelle question'}</h2>
              <p>{TYPES.find(t => t.val === formData.type_question)?.desc}</p>
            </div>
          </div>
          <button className="qf-close" onClick={onClose} type="button">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="qf-body">

            {/* Type selector */}
            <div className="qf-field">
              <label className="qf-label">Type de question</label>
              <div className="qf-type-grid">
                {TYPES.map(t => (
                  <button
                    key={t.val}
                    type="button"
                    className={`qf-type-card ${formData.type_question === t.val ? 'active' : ''}`}
                    onClick={() => set('type_question', t.val)}
                  >
                    <span className="qf-type-icon">{t.icon}</span>
                    <span className="qf-type-label">{t.label}</span>
                    <span className="qf-type-desc">{t.desc}</span>
                    {formData.type_question === t.val && (
                      <span className="qf-type-check">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Texte */}
            <div className="qf-field">
              <label className="qf-label">
                {formData.type_question === 'qcm' ? 'Énoncé *' : 'Texte de la question *'}
              </label>
              <textarea
                value={formData.texte}
                onChange={e => set('texte', e.target.value)}
                required
                rows={formData.type_question === 'qcm' ? 2 : 4}
                className="qf-textarea"
                placeholder={
                  formData.type_question === 'qcm'
                    ? 'Ex: Quelle est la limite de u_n quand n → +∞ ?'
                    : 'Écrivez le texte complet de la question...'
                }
              />
            </div>

            {/* ── CHOIX QCM ── */}
            {formData.type_question === 'qcm' && (
              <div className="qf-field">
                <div className="qf-choix-header">
                  <label className="qf-label">Choix de réponses</label>
                  <span className="qf-choix-hint">Cliquez sur la lettre pour marquer la bonne réponse</span>
                </div>

                <div className="qf-choix-list">
                  {choix.map((c, i) => (
                    <div key={i} className={`qf-choix-row ${bonneReponse === i ? 'correct' : ''}`}>
                      <button
                        type="button"
                        className={`qf-letter-btn ${bonneReponse === i ? 'correct' : ''}`}
                        onClick={() => setBonneReponse(i)}
                        title="Marquer comme bonne réponse"
                      >
                        {bonneReponse === i ? '✓' : LETTRES[i]}
                      </button>

                      <input
                        type="text"
                        value={c}
                        onChange={e => handleChoixChange(i, e.target.value)}
                        className="qf-choix-input"
                        placeholder={`Choix ${LETTRES[i]}...`}
                      />

                      {choix.length > 2 && (
                        <button
                          type="button"
                          className="qf-choix-del"
                          onClick={() => removeChoix(i)}
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  ))}

                  {choix.length < 6 && (
                    <button type="button" className="qf-add-choix" onClick={addChoix}>
                      <FaPlus /> Ajouter un choix
                    </button>
                  )}
                </div>

                {/* Récapitulatif bonne réponse */}
                <div className="qf-bonne-recap">
                  <span className="qf-recap-dot" />
                  Bonne réponse : <strong>{LETTRES[bonneReponse]}</strong>
                  {choix[bonneReponse] && ` — ${choix[bonneReponse]}`}
                </div>
              </div>
            )}

            {/* Points + Ordre */}
            <div className="qf-row">
              <div className="qf-field">
                <label className="qf-label">Points</label>
                <div className="qf-points-row">
                  <button type="button" className="qf-pts-btn"
                    onClick={() => set('points', Math.max(0.5, parseFloat(formData.points) - 0.5))}>−</button>
                  <span className="qf-pts-val">{formData.points}</span>
                  <button type="button" className="qf-pts-btn"
                    onClick={() => set('points', Math.min(20, parseFloat(formData.points) + 0.5))}>+</button>
                </div>
              </div>
              <div className="qf-field">
                <label className="qf-label">Ordre d'affichage</label>
                <input
                  type="number"
                  value={formData.ordre}
                  onChange={e => set('ordre', e.target.value)}
                  min="0"
                  className="qf-input"
                />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="qf-footer">
            <button type="button" onClick={onClose} className="qf-btn-cancel">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="qf-btn-submit">
              {loading ? 'En cours...' : (question ? '✓ Enregistrer' : '+ Ajouter')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default QuestionForm;