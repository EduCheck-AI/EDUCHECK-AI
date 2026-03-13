import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaInfoCircle, FaBook, FaCog } from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';
import '../styles/ExamForm.css';

const MATIERES = [
  { label: 'Mathématiques',    icon: '📐' },
  { label: 'Physique-Chimie',  icon: '⚗️' },
  { label: 'Français',         icon: '📝' },
  { label: 'Histoire-Géo',     icon: '🌍' },
  { label: 'SVT',              icon: '🌿' },
  { label: 'Philosophie',      icon: '🧠' },
  { label: 'Anglais',          icon: '🇬🇧' },
  { label: 'Informatique',     icon: '💻' },
  { label: 'Autre',            icon: '📚' },
];

const ExamForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    matiere: '',
    id_enseignant: 1,
    points_totaux: 20,
    statut: 'brouillon',
    contenu_brut: null
  });

  useEffect(() => { if (id) loadExam(); }, [id]);

  const loadExam = async () => {
    try {
      const data = await api.getExam(id);
      setFormData(data);
    } catch {
      toast.error("Erreur lors du chargement");
    }
  };

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.titre.trim()) { toast.error('Le titre est obligatoire'); return; }
    setLoading(true);
    try {
      if (id) {
        await api.updateExam(id, formData);
        toast.success('Examen modifié ✓');
      } else {
        await api.createExam(formData);
        toast.success('Examen créé ✓');
      }
      navigate('/exams');
    } catch {
      toast.error(id ? 'Erreur de modification' : 'Erreur de création');
    } finally {
      setLoading(false);
    }
  };

  const matiereSelectionnee = MATIERES.find(m => m.label === formData.matiere);

  return (
    <div className="exam-form fade-in">
      {/* Header */}
      <div className="form-page-header">
        <h1>{id ? "Modifier l'examen" : 'Nouvel examen'}</h1>
        <p>{id ? 'Modifiez les informations de votre examen' : 'Remplissez les informations pour créer votre examen'}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-layout">

          {/* Colonne gauche */}
          <div>

            {/* Section 1 — Informations générales */}
            <div className="form-section">
              <div className="section-title">
                <FaInfoCircle /> Informations générales
              </div>
              <div className="section-body">
                <div className="form-group">
                  <label>Titre *</label>
                  <input
                    type="text"
                    value={formData.titre}
                    onChange={e => set('titre', e.target.value)}
                    required
                    className="form-control"
                    placeholder="Ex: Contrôle — Suites numériques"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={e => set('description', e.target.value)}
                    rows="3"
                    className="form-control"
                    placeholder="Instructions générales, matériel autorisé, durée..."
                  />
                </div>
              </div>
            </div>

            {/* Section 2 — Matière */}
            <div className="form-section">
              <div className="section-title">
                <FaBook /> Matière
              </div>
              <div className="section-body">
                <div className="matiere-grid">
                  {MATIERES.map(m => (
                    <button
                      key={m.label}
                      type="button"
                      className={`matiere-btn ${formData.matiere === m.label ? 'selected' : ''}`}
                      onClick={() => set('matiere', m.label)}
                    >
                      <span className="matiere-icon">{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3 — Paramètres */}
            <div className="form-section">
              <div className="section-title">
                <FaCog /> Paramètres
              </div>
              <div className="section-body">
                {/* Points */}
                <div className="form-group">
                  <label>Points totaux</label>
                  <div className="points-row">
                    <div>
                      <div className="points-value">{formData.points_totaux}</div>
                      <div className="points-unit">points</div>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={formData.points_totaux}
                      onChange={e => set('points_totaux', Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Statut */}
                <div className="form-group">
                  <label>Statut</label>
                  <div className="statut-toggle">
                    <button
                      type="button"
                      className={`statut-btn ${formData.statut === 'brouillon' ? 'selected brouillon' : ''}`}
                      onClick={() => set('statut', 'brouillon')}
                    >
                      ✏️ Brouillon
                    </button>
                    <button
                      type="button"
                      className={`statut-btn ${formData.statut === 'publié' ? 'selected publie' : ''}`}
                      onClick={() => set('statut', 'publié')}
                    >
                      ✅ Publié
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Colonne droite — Aperçu */}
          <div className="form-preview">
            <div className="preview-card">
              <h3>Aperçu</h3>
              <p className={`preview-titre ${!formData.titre ? 'empty' : ''}`}>
                {formData.titre || 'Titre de l\'examen...'}
              </p>
              <div className="preview-badges">
                {formData.matiere && (
                  <span className="preview-badge">
                    {matiereSelectionnee?.icon} {formData.matiere}
                  </span>
                )}
                <span className="preview-badge">
                  {formData.statut === 'publié' ? '✅ Publié' : '✏️ Brouillon'}
                </span>
              </div>
              <div className="preview-points-big">{formData.points_totaux}</div>
              <div className="preview-points-label">points totaux</div>
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="form-actions-bar">
          <button type="button" onClick={() => navigate('/exams')} className="btn btn-secondary">
            Annuler
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'En cours...' : (id ? 'Enregistrer les modifications' : 'Créer l\'examen')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExamForm;