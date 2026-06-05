import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaPlus,
  FaTrash,
  FaTimes,
  FaChevronRight,
  FaChevronLeft,
  FaCheck,
} from "react-icons/fa";
import api from "../services/api";
import toast from "react-hot-toast";
import "../styles/ExamForm.css";

const TYPES_Q = [
  { val: "ouverte", label: "Ouverte", icon: "O", desc: "Réponse libre" },
  { val: "calcul", label: "Calcul", icon: "#", desc: "Calcul / démo" },
  { val: "qcm", label: "QCM", icon: "◆", desc: "Choix multiple" },
];

const LETTRES = ["A", "B", "C", "D", "E", "F"];

const emptyQuestion = () => ({
  tempId: Date.now() + Math.random(),
  texte: "",
  points: 2,
  type_question: "ouverte",
  ordre: 0,
  choix: ["", "", "", ""],
  bonneReponse: 0,
  reponse_attendue: "", // ← NOUVEAU CHAMP
});

// ── Inline Question Editor ──
const QuestionEditor = ({ q, index, onChange, onRemove }) => {
  const set = (field, val) => onChange({ ...q, [field]: val });

  const setChoix = (i, v) => {
    const c = [...q.choix];
    c[i] = v;
    onChange({ ...q, choix: c });
  };
  const addChoix = () => {
    if (q.choix.length < 6) onChange({ ...q, choix: [...q.choix, ""] });
  };
  const removeChoix = (i) => {
    if (q.choix.length <= 2) return;
    const c = q.choix.filter((_, j) => j !== i);
    onChange({
      ...q,
      choix: c,
      bonneReponse: q.bonneReponse >= c.length ? 0 : q.bonneReponse,
    });
  };

  return (
    <div className="qe-card">
      <div className="qe-card-head">
        <span className="qe-num">{index + 1}</span>
        <div className="qe-type-tabs">
          {TYPES_Q.map((t) => (
            <button
              key={t.val}
              type="button"
              className={`qe-type-tab ${q.type_question === t.val ? "active" : ""}`}
              onClick={() => set("type_question", t.val)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="qe-pts-ctrl">
          <button
            type="button"
            className="qe-pts-btn"
            onClick={() =>
              set("points", Math.max(0.5, parseFloat(q.points) - 0.5))
            }
          >
            −
          </button>
          <span className="qe-pts-val">{q.points} pt</span>
          <button
            type="button"
            className="qe-pts-btn"
            onClick={() =>
              set("points", Math.min(20, parseFloat(q.points) + 0.5))
            }
          >
            +
          </button>
        </div>
        <button
          type="button"
          className="qe-remove"
          onClick={() => onRemove(q.tempId)}
          title="Supprimer"
        >
          <FaTimes />
        </button>
      </div>

      <div className="qe-body">
        <textarea
          value={q.texte}
          onChange={(e) => set("texte", e.target.value)}
          rows={q.type_question === "qcm" ? 2 : 3}
          className="qe-textarea"
          placeholder={
            q.type_question === "qcm"
              ? "Énoncé de la question..."
              : "Texte complet de la question..."
          }
        />

        {/* ── CHAMP RÉPONSE ATTENDUE (pour Calcul et Ouverte) ── */}
        {(q.type_question === "calcul" || q.type_question === "ouverte") && (
          <div className="qe-reponse-section" style={{ marginTop: "16px" }}>
            <label
              className="qe-reponse-label"
              style={{
                fontWeight: "500",
                display: "block",
                marginBottom: "8px",
              }}
            >
              📝 Réponse attendue :
            </label>
            <textarea
              value={q.reponse_attendue || ""}
              onChange={(e) => set("reponse_attendue", e.target.value)}
              rows={2}
              className="qe-reponse-input"
              placeholder="Saisissez la réponse correcte attendue pour cette question..."
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                resize: "vertical",
              }}
            />
            <small style={{ color: "#64748b", fontSize: "12px" }}>
              Cette réponse servira de référence pour la correction automatique.
            </small>
          </div>
        )}

        {/* ── CHOIX QCM ── */}
        {q.type_question === "qcm" && (
          <div className="qe-choix-section">
            <div className="qe-choix-label">
              Choix{" "}
              <span className="qe-choix-hint">
                — cliquez sur la lettre pour marquer la bonne réponse
              </span>
            </div>
            <div className="qe-choix-list">
              {q.choix.map((c, i) => (
                <div
                  key={i}
                  className={`qe-choix-row ${q.bonneReponse === i ? "correct" : ""}`}
                >
                  <button
                    type="button"
                    className={`qe-letter ${q.bonneReponse === i ? "correct" : ""}`}
                    onClick={() => onChange({ ...q, bonneReponse: i })}
                  >
                    {q.bonneReponse === i ? <FaCheck /> : LETTRES[i]}
                  </button>
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => setChoix(i, e.target.value)}
                    className="qe-choix-input"
                    placeholder={`Choix ${LETTRES[i]}...`}
                  />
                  {q.choix.length > 2 && (
                    <button
                      type="button"
                      className="qe-choix-del"
                      onClick={() => removeChoix(i)}
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
              {q.choix.length < 6 && (
                <button
                  type="button"
                  className="qe-add-choix"
                  onClick={addChoix}
                >
                  <FaPlus /> Ajouter un choix
                </button>
              )}
            </div>
            <div className="qe-bonne-recap">
              <span className="qe-recap-dot" />
              Bonne réponse : <strong>{LETTRES[q.bonneReponse]}</strong>
              {q.choix[q.bonneReponse] && ` — ${q.choix[q.bonneReponse]}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Form ──
const ExamForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [examData, setExamData] = useState({
    titre: "",
    description: "",
    matiere: "",
    id_enseignant: 1,
    points_totaux: 20,
    statut: "brouillon",
    contenu_brut: null,
  });
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [existingQuestions, setExistingQuestions] = useState([]);

  useEffect(() => {
    if (id) loadExam();
  }, [id]);

  const loadExam = async () => {
    try {
      const [exam, qs] = await Promise.all([
        api.getExam(id),
        api.getExamQuestions(id),
      ]);
      setExamData(exam);
      if (qs.length > 0) {
        setExistingQuestions(qs);
        setQuestions(
          qs.map((q) => {
            let choix = ["", "", "", ""];
            let bonneReponse = 0;
            let reponseAttendue = "";

            if (q.type_question === "qcm" && q.reponse_correcte) {
              try {
                const p = JSON.parse(q.reponse_correcte);
                choix = p.choix || choix;
                bonneReponse = p.bonne_reponse ?? 0;
              } catch {}
            } else if (q.reponse_correcte) {
              // Pour les questions calcul/ouverte
              reponseAttendue = q.reponse_correcte;
            }

            return {
              ...q,
              tempId: q.id,
              choix,
              bonneReponse,
              reponse_attendue: reponseAttendue,
            };
          }),
        );
      }
    } catch {
      toast.error("Erreur chargement");
    }
  };

  const setField = (field, value) =>
    setExamData((prev) => ({ ...prev, [field]: value }));

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);

  const updateQuestion = (updated) =>
    setQuestions((prev) =>
      prev.map((q) => (q.tempId === updated.tempId ? updated : q)),
    );

  const removeQuestion = (tempId) => {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((q) => q.tempId !== tempId));
  };

  const goToStep2 = () => {
    if (!examData.titre.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    const validQuestions = questions.filter((q) => q.texte.trim());
    if (validQuestions.length === 0) {
      toast.error("Ajoutez au moins une question");
      return;
    }

    setLoading(true);
    try {
      let examId = id;

      // 1. Créer ou modifier l'examen
      if (id) {
        await api.updateExam(id, examData);
      } else {
        const created = await api.createExam(examData);
        examId = created.id;
      }

      // 2. Supprimer anciennes questions si modification
      if (id && existingQuestions.length > 0) {
        for (const q of existingQuestions) {
          try {
            await api.deleteQuestion(q.id);
          } catch {}
        }
      }

      // 3. Créer les nouvelles questions
      for (let i = 0; i < validQuestions.length; i++) {
        const q = validQuestions[i];

        let reponseCorrecte = null;

        if (q.type_question === "qcm") {
          reponseCorrecte = JSON.stringify({
            choix: q.choix.filter((c) => c.trim()),
            bonne_reponse: q.bonneReponse,
          });
        } else if (q.reponse_attendue && q.reponse_attendue.trim()) {
          // Pour calcul et ouverte, stocker la réponse attendue directement
          reponseCorrecte = q.reponse_attendue.trim();
        }

        const payload = {
          texte: q.texte,
          points: parseFloat(q.points),
          type_question: q.type_question,
          ordre: i + 1,
          exam_id: parseInt(examId),
          reponse_correcte: reponseCorrecte,
        };
        await api.createQuestion(payload);
      }

      toast.success(
        `Examen ${id ? "modifié" : "créé"} avec ${validQuestions.length} questions ✓`,
      );
      navigate("/exams");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const totalPtsQuestions = questions.reduce(
    (s, q) => s + parseFloat(q.points || 0),
    0,
  );

  return (
    <div className="ef-page fade-in">
      {/* Stepper */}
      <div className="ef-stepper">
        <div
          className={`ef-step ${step >= 1 ? "active" : ""} ${step > 1 ? "done" : ""}`}
        >
          <div className="ef-step-circle">{step > 1 ? <FaCheck /> : "1"}</div>
          <span>Informations</span>
        </div>
        <div className={`ef-step-line ${step > 1 ? "done" : ""}`} />
        <div className={`ef-step ${step >= 2 ? "active" : ""}`}>
          <div className="ef-step-circle">2</div>
          <span>Questions</span>
        </div>
      </div>

      {/* ── ÉTAPE 1 ── */}
      {step === 1 && (
        <div className="ef-layout fade-in">
          <div className="ef-left">
            <div className="ef-card">
              <div className="ef-card-head">
                <span className="ef-card-num">1</span>
                <h2>Informations générales</h2>
              </div>
              <div className="ef-card-body">
                <div className="ef-field">
                  <label>
                    Titre <span className="ef-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={examData.titre}
                    onChange={(e) => setField("titre", e.target.value)}
                    required
                    className="ef-input"
                    placeholder="Ex : Contrôle — Suites numériques S1"
                  />
                </div>
                <div className="ef-field">
                  <label>
                    Description <span className="ef-optional">optionnel</span>
                  </label>
                  <textarea
                    value={examData.description || ""}
                    onChange={(e) => setField("description", e.target.value)}
                    rows="3"
                    className="ef-input ef-textarea"
                    placeholder="Instructions générales, durée, matériel autorisé..."
                  />
                </div>
              </div>
            </div>

            <div className="ef-card">
              <div className="ef-card-head">
                <span className="ef-card-num">2</span>
                <h2>Matière</h2>
              </div>
              <div className="ef-card-body">
                <div className="ef-field">
                  <label>
                    Nom de la matière <span className="ef-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={examData.matiere}
                    onChange={(e) => setField("matiere", e.target.value)}
                    className="ef-input"
                    placeholder="Ex : Mathématiques, Physique-Chimie..."
                  />
                </div>
              </div>
            </div>

            <div className="ef-card">
              <div className="ef-card-head">
                <span className="ef-card-num">3</span>
                <h2>Paramètres</h2>
              </div>
              <div className="ef-card-body">
                <div className="ef-field">
                  <label>Points totaux</label>
                  <div className="ef-points-wrap">
                    <div className="ef-points-display">
                      <span className="ef-points-num">
                        {examData.points_totaux}
                      </span>
                      <span className="ef-points-unit">pts</span>
                    </div>
                    <div className="ef-slider-wrap">
                      <span className="ef-slider-min">0</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={examData.points_totaux}
                        onChange={(e) =>
                          setField("points_totaux", Number(e.target.value))
                        }
                        className="ef-slider"
                      />
                      <span className="ef-slider-max">100</span>
                    </div>
                  </div>
                </div>
                <div className="ef-field">
                  <label>Statut</label>
                  <div className="ef-statut-wrap">
                    {[
                      {
                        val: "brouillon",
                        dot: "draft",
                        label: "Brouillon",
                        desc: "Non visible",
                      },
                      {
                        val: "publié",
                        dot: "pub",
                        label: "Publié",
                        desc: "Visible aux étudiants",
                      },
                    ].map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        className={`ef-statut-btn ${examData.statut === s.val ? `active-${s.dot}` : ""}`}
                        onClick={() => setField("statut", s.val)}
                      >
                        <span className={`ef-statut-dot ${s.dot}`} />
                        <div>
                          <strong>{s.label}</strong>
                          <span>{s.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <div className="ef-right">
            <div className="ef-preview-card">
              <div className="ef-preview-label">Aperçu</div>
              <div className="ef-preview-body">
                <div
                  className={`ef-preview-title ${!examData.titre ? "empty" : ""}`}
                >
                  {examData.titre || "Titre de l'examen..."}
                </div>
                <div className="ef-preview-tags">
                  {examData.matiere ? (
                    <span className="ef-preview-tag matiere">
                      {examData.matiere}
                    </span>
                  ) : (
                    <span className="ef-preview-tag empty-tag">
                      Matière non choisie
                    </span>
                  )}
                  <span
                    className={`ef-preview-tag statut ${examData.statut === "publié" ? "pub" : "draft"}`}
                  >
                    {examData.statut === "publié" ? "● Publié" : "● Brouillon"}
                  </span>
                </div>
                <div className="ef-preview-divider" />
                <div className="ef-preview-pts-row">
                  <span className="ef-preview-pts-num">
                    {examData.points_totaux}
                  </span>
                  <span className="ef-preview-pts-label">points</span>
                </div>
              </div>
              <div className="ef-checklist">
                {[
                  { done: !!examData.titre, label: "Titre renseigné" },
                  { done: !!examData.matiere, label: "Matière sélectionnée" },
                  { done: examData.statut === "publié", label: "Publié" },
                ].map((c, i) => (
                  <div
                    key={i}
                    className={`ef-check-item ${c.done ? "done" : ""}`}
                  >
                    <span className="ef-check-icon">{c.done ? "✓" : "○"}</span>
                    {c.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 ── */}
      {step === 2 && (
        <div className="ef-step2 fade-in">
          <div className="ef-step2-header">
            <div>
              <h2>Questions de l'examen</h2>
              <p>
                {questions.filter((q) => q.texte.trim()).length} question(s) ·{" "}
                {totalPtsQuestions.toFixed(1)} pts au total
              </p>
            </div>
            <button
              type="button"
              className="ef-btn-add-q"
              onClick={addQuestion}
            >
              <FaPlus /> Ajouter une question
            </button>
          </div>

          <div className="ef-questions-list">
            {questions.map((q, i) => (
              <QuestionEditor
                key={q.tempId}
                q={q}
                index={i}
                onChange={updateQuestion}
                onRemove={removeQuestion}
              />
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="ef-nav">
        <div className="ef-nav-left">
          {step === 2 && (
            <button
              type="button"
              className="ef-btn-cancel"
              onClick={() => setStep(1)}
            >
              <FaChevronLeft /> Retour
            </button>
          )}
          {step === 1 && (
            <button
              type="button"
              className="ef-btn-cancel"
              onClick={() => navigate("/exams")}
            >
              Annuler
            </button>
          )}
        </div>
        <div className="ef-nav-right">
          {step === 1 && (
            <button type="button" className="ef-btn-submit" onClick={goToStep2}>
              Suivant : Questions <FaChevronRight />
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              className="ef-btn-submit"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Sauvegarde..." : id ? "✓ Enregistrer" : "Enregistrer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamForm;
