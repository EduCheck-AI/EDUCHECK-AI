import React, { useState, useEffect, useRef } from "react";
import { correctionIA } from "../services/api";

import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  FaSave,
  FaArrowLeft,
  FaFilePdf,
  FaCheck,
  FaTimes,
  FaEdit,
  FaRobot,
  FaMagic,
} from "react-icons/fa";
import api from "../services/api";
import toast from "react-hot-toast";
import LoadingSpinner from "./LoadingSpinner";

const ManualCorrection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [notes, setNotes] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [reponsesAttendues, setReponsesAttendues] = useState({});
  const [noteTotale, setNoteTotale] = useState(0);
  const [noteMax, setNoteMax] = useState(0);
  const [chargementIA, setChargementIA] = useState({});
  const [corrigerToutEnCours, setCorrigerToutEnCours] = useState(false);

  // Empêcher la re-correction si les données sont déjà chargées
  const correctionDejaDone = useRef(false);

  const { copie, exam_id, exam_title } = location.state || {};

  // Recalcul de la note totale uniquement quand notes change
  useEffect(() => {
    if (Object.keys(notes).length === 0) return;
    const total = Object.values(notes).reduce((a, b) => a + b, 0);
    setNoteTotale(total);
  }, [notes]);

  const extraireReponseEtudiant = (contenuBrut, numeroQuestion) => {
    if (!contenuBrut) return "Non détectée";
    const lignes = contenuBrut.split("\n");
    for (const ligne of lignes) {
      const match = ligne.match(
        new RegExp(`^${numeroQuestion}[\\.\)\\:\\s]*(.+)`)
      );
      if (match) {
        return match[1].trim();
      }
    }
    return "Non détectée";
  };

  // 🤖 CORRECTION NLP (automatique au chargement)
  const corrigerAvecNLP = async (question, reponseEtudiant) => {
    setChargementIA((prev) => ({ ...prev, [question.id]: true }));
    try {
      const result = await correctionIA({
        question_texte: question.texte,
        reponse_etudiant: reponseEtudiant,
        reponse_correcte: reponsesAttendues[question.id] || null,
        points: question.points,
        type_question: question.type_question,
        use_groq: false,
      });

      setFeedbacks((prev) => ({
        ...prev,
        [question.id]: result.feedback,
      }));

      setNotes((prev) => ({
        ...prev,
        [question.id]: parseFloat(result.points_obtenus) || 0,
      }));

      toast.success("Correction NLP effectuée !");
    } catch (error) {
      console.error("Erreur NLP:", error);
      setFeedbacks((prev) => ({
        ...prev,
        [question.id]: "Erreur de correction NLP. Veuillez corriger manuellement.",
      }));
    } finally {
      setChargementIA((prev) => ({ ...prev, [question.id]: false }));
    }
  };

  // ✨ GÉNÉRATION FEEDBACK AVEC GROQ (sur clic du prof)
  const genererFeedbackAvecGroq = async (question, reponseEtudiant) => {
    if (!reponseEtudiant || reponseEtudiant === "Non détectée") {
      toast.error("Aucune réponse détectée pour cette question");
      return;
    }

    setChargementIA((prev) => ({ ...prev, [question.id]: true }));
    try {
      const result = await correctionIA({
        question_texte: question.texte,
        reponse_etudiant: reponseEtudiant,
        reponse_correcte: reponsesAttendues[question.id] || null,
        points: question.points,
        type_question: question.type_question,
        use_groq: true,
      });

      setFeedbacks((prev) => ({
        ...prev,
        [question.id]: result.feedback,
      }));

      setNotes((prev) => ({
        ...prev,
        [question.id]: parseFloat(result.points_obtenus) || 0,
      }));

      toast.success("Feedback généré par IA !");
    } catch (error) {
      console.error("Erreur Groq:", error);
      toast.error("Erreur lors de la génération du feedback");
    } finally {
      setChargementIA((prev) => ({ ...prev, [question.id]: false }));
    }
  };

  useEffect(() => {
    if (!copie || !exam_id) {
      toast.error("Données manquantes");
      navigate("/corrections");
      return;
    }
    if (!correctionDejaDone.current) {
      correctionDejaDone.current = true;
      chargerDonnees();
    }
  }, []);

  const chargerDonnees = async () => {
    try {
      const questionsData = await api.getExamQuestions(exam_id);
      setQuestions(questionsData);

      const max = questionsData.reduce(
        (somme, q) => somme + (parseFloat(q.points) || 0),
        0
      );
      setNoteMax(max);

      const reponsesInitiales = {};
      questionsData.forEach((q) => {
        if (q.reponse_correcte) {
          try {
            const data = JSON.parse(q.reponse_correcte);
            if (q.type_question === "qcm") {
              const choix = data.choix || [];
              const bonneReponse = data.bonne_reponse || 0;
              reponsesInitiales[q.id] = choix[bonneReponse] || "Non spécifiée";
            } else {
              reponsesInitiales[q.id] = data.choix
                ? data.choix.join(", ")
                : q.reponse_correcte;
            }
          } catch {
            reponsesInitiales[q.id] = q.reponse_correcte;
          }
        } else {
          reponsesInitiales[q.id] = "";
        }
      });
      setReponsesAttendues(reponsesInitiales);

      // Vérifier les corrections déjà existantes en base
      let correctionsExistantes = {};
      try {
        const correctionsRes = await api.get(`/corrections/copie/${id}`);
        if (correctionsRes.data && correctionsRes.data.length > 0) {
          correctionsExistantes = correctionsRes.data.reduce((acc, c) => {
            acc[c.question_id] = {
              points_obtenus: parseFloat(c.points_obtenus) || 0,
              feedback: c.feedback || "",
            };
            return acc;
          }, {});
        }
      } catch (e) {
        console.log("Aucune correction existante en base");
      }

      const notesInitiales = {};
      const feedbacksInitiales = {};

      for (const q of questionsData) {
        if (correctionsExistantes[q.id]) {
          //  Correction déjà en base → on l'utilise, pas de re-correction
          notesInitiales[q.id] = correctionsExistantes[q.id].points_obtenus;
          feedbacksInitiales[q.id] = correctionsExistantes[q.id].feedback;

        } else if (q.type_question === "qcm") {
          // QCM → correction locale automatique
          let reponseEtudiant = extraireReponseEtudiant(
            copie?.contenu_brut,
            questionsData.indexOf(q) + 1
          );

           const lettreMatch = reponseEtudiant.match(/^([A-F])/i);
  if (lettreMatch) {
    reponseEtudiant = lettreMatch[1].toUpperCase();
  }


  const lettres = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };
  let reponseIndex = lettres[reponseEtudiant] ?? -1;
          try {
            const data = JSON.parse(q.reponse_correcte || "{}");
            const choix = data.choix || [];
            const bonneReponse = data.bonne_reponse || 0;
            const lettres = { A: 0, B: 1, C: 2, D: 3 };
            let reponseIndex = -1;
            if (reponseEtudiant in lettres) {
              reponseIndex = lettres[reponseEtudiant];
            } else if (!isNaN(parseInt(reponseEtudiant))) {
              reponseIndex = parseInt(reponseEtudiant);
            }
            notesInitiales[q.id] =
              reponseIndex === bonneReponse ? parseFloat(q.points) : 0;
            feedbacksInitiales[q.id] =
              reponseIndex === bonneReponse
                ? "✓ Bonne réponse !"
                : "✗ Mauvaise réponse. La bonne réponse est : " +
                  (choix[bonneReponse] || "?");
          } catch (e) {
            notesInitiales[q.id] = 0;
            feedbacksInitiales[q.id] = "Question QCM à corriger";
          }

        } else {
          // ✅ Question ouverte / calcul → NLP automatique
          const reponseEtudiant = extraireReponseEtudiant(
            copie?.contenu_brut,
            questionsData.indexOf(q) + 1
          );

          if (reponseEtudiant !== "Non détectée") {
            // On initialise d'abord à 0 pour afficher quelque chose
            notesInitiales[q.id] = 0;
            feedbacksInitiales[q.id] = "Correction NLP en cours...";
          } else {
            notesInitiales[q.id] = 0;
            feedbacksInitiales[q.id] =
              "Réponse non détectée. Cliquez sur 'Corriger avec IA' pour une analyse manuelle.";
          }
        }
      }

      // Appliquer les notes et feedbacks initiaux
      setNotes(notesInitiales);
      setFeedbacks(feedbacksInitiales);

      // Calculer la note totale initiale
      const totalCalcule = Object.values(notesInitiales).reduce((a, b) => a + b, 0);
      if (copie.note && parseFloat(copie.note) > 0) {
        setNoteTotale(parseFloat(copie.note));
      } else {
        setNoteTotale(totalCalcule);
      }

      // 🔥 Lancer NLP automatiquement pour les questions ouvertes/calcul sans correction existante
      for (const q of questionsData) {
        if (!correctionsExistantes[q.id] && q.type_question !== "qcm") {
          const reponseEtudiant = extraireReponseEtudiant(
            copie?.contenu_brut,
            questionsData.indexOf(q) + 1
          );
          if (reponseEtudiant !== "Non détectée") {
            await corrigerAvecNLP(q, reponseEtudiant);
          }
        }
      }

    } catch (erreur) {
      console.error("Erreur:", erreur);
      toast.error("Erreur lors du chargement");
    } finally {
      setChargement(false);
    }
  };

  const mettreAJourNote = (questionId, noteMaxQuestion, nouvelleNote) => {
    const noteValide = Math.min(
      Math.max(0, parseFloat(nouvelleNote) || 0),
      noteMaxQuestion
    );
    setNotes((prev) => ({ ...prev, [questionId]: noteValide }));
  };

  const updateFeedback = (questionId, feedback) => {
    setFeedbacks((prev) => ({ ...prev, [questionId]: feedback }));
  };

  const enregistrerReponseAttendue = async (questionId, reponse) => {
    try {
      const question = questions.find((q) => q.id === questionId);
      await api.put(`/questions/${questionId}`, {
        texte: question.texte,
        points: question.points,
        type_question: question.type_question,
        ordre: question.ordre,
        reponse_correcte: reponse,
      });
      setReponsesAttendues((prev) => ({ ...prev, [questionId]: reponse }));
      toast.success("Réponse correcte enregistrée");
      const reponseEtudiant = extraireReponseEtudiant(
        copie?.contenu_brut,
        questions.indexOf(question) + 1
      );
      if (reponseEtudiant !== "Non détectée") {
        await corrigerAvecNLP(question, reponseEtudiant);
      }
    } catch (erreur) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const toutSauvegarder = async () => {
    setSauvegarde(true);
    try {
      for (const question of questions) {
        const feedback = feedbacks[question.id] || "";
        await api.post(`/corrections/${id}/save`, {
          question_id: question.id,
          points_obtenus: notes[question.id] || 0,
          feedback: feedback,
        });
      }
      await api.put(`/copies/${id}/note`, { note: noteTotale });
      toast.success("Corrections sauvegardées");
      navigate("/corrections");
    } catch (erreur) {
      console.error("Erreur:", erreur);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSauvegarde(false);
    }
  };

  // 🔥 Corriger toutes les questions avec Groq (IA)
  const corrigerTout = async () => {
    setCorrigerToutEnCours(true);
    toast("Correction IA de toutes les questions en cours...", { icon: "🤖" });
    try {
      for (const [index, question] of questions.entries()) {
        const reponseEtudiant = extraireReponseEtudiant(copie?.contenu_brut, index + 1);
        if (reponseEtudiant !== "Non détectée") {
          await genererFeedbackAvecGroq(question, reponseEtudiant);
        }
      }
      toast.success("Toutes les questions ont été corrigées par IA !");
    } catch (error) {
      toast.error("Erreur lors de la correction globale");
    } finally {
      setCorrigerToutEnCours(false);
    }
  };

  const exporterPDF = () => {
    window.open(`http://localhost:8002/copies/${id}/export/pdf`, "_blank");
  };

  if (chargement) return <LoadingSpinner />;

  const pourcentage =
    noteMax > 0 ? ((noteTotale / noteMax) * 100).toFixed(1) : 0;

  const getScoreColor = (score, maxPoints) => {
    const pourc = (score / maxPoints) * 100;
    if (pourc >= 60) return { bg: "#d1fae5", color: "#10b981", text: "Correct" };
    if (pourc >= 40) return { bg: "#fed7aa", color: "#f59e0b", text: "Partiel" };
    return { bg: "#fee2e2", color: "#ef4444", text: "Incorrect" };
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px" }}>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <button onClick={() => navigate("/corrections")} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer" }}>
          <FaArrowLeft /> Retour
        </button>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: 0 }}>Correction manuelle</h1>
          <p style={{ margin: 0, color: "#64748b" }}>Copie #{id} - {exam_title}</p>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#8b5cf6" }}>
     {copie?.student_name || `Étudiant #${copie?.student_id}`}
  </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={exporterPDF} style={{ padding: "10px 20px", background: "#f1f5f9", border: "none", borderRadius: "10px", cursor: "pointer" }}>
            <FaFilePdf /> PDF
          </button>
          <button
            onClick={corrigerTout}
            disabled={corrigerToutEnCours}
            style={{ padding: "10px 20px", background: corrigerToutEnCours ? "#c4b5fd" : "#8b5cf6", color: "white", border: "none", borderRadius: "10px", cursor: corrigerToutEnCours ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <FaRobot /> {corrigerToutEnCours ? "Correction en cours..." : "Corriger tout avec IA"}
          </button>
          <button onClick={toutSauvegarder} disabled={sauvegarde} style={{ padding: "10px 20px", background: "#10b981", color: "white", border: "none", borderRadius: "10px", cursor: "pointer" }}>
            <FaSave /> {sauvegarde ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* Score global */}
      <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", borderRadius: "20px", padding: "24px", marginBottom: "24px", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <span style={{ fontSize: "14px", opacity: 0.8 }}>Note finale</span>
            <div>
              <span style={{ fontSize: "36px", fontWeight: "bold" }}>{noteTotale.toFixed(1)}</span>
              <span style={{ fontSize: "18px", opacity: 0.7 }}> / {noteMax} pts</span>
            </div>
          </div>
          <div style={{ padding: "4px 12px", borderRadius: "20px", background: pourcentage >= 50 ? "#10b981" : "#ef4444" }}>{pourcentage}%</div>
        </div>
        <div style={{ height: "8px", background: "rgba(255,255,255,0.2)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ width: `${Math.min(pourcentage, 100)}%`, height: "100%", background: "#3b82f6" }} />
        </div>
      </div>

      {/* Liste des questions */}
      {questions.map((question, index) => {
        const noteMaxQuestion = parseFloat(question.points) || 1;
        const noteActuelle = notes[question.id] ?? 0;
        const scoreColor = getScoreColor(noteActuelle, noteMaxQuestion);
        const reponseEtudiant = extraireReponseEtudiant(copie?.contenu_brut, index + 1);
        const estEnChargement = chargementIA[question.id];
        const feedbackValue = feedbacks[question.id] || "";

        return (
          <div key={question.id} style={{ background: "white", borderRadius: "16px", padding: "20px", marginBottom: "20px", borderLeft: `4px solid ${scoreColor.color}` }}>
            {/* En-tête question */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontWeight: "bold", background: "#f1f5f9", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>{index + 1}</span>
                <span style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "12px", background: "#e2e8f0" }}>
                  {question.type_question === "qcm" && "QCM"}
                  {question.type_question === "calcul" && "Calcul"}
                  {question.type_question === "ouverte" && "Ouverte"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  min="0"
                  max={noteMaxQuestion}
                  step="0.5"
                  value={noteActuelle}
                  onChange={(e) => mettreAJourNote(question.id, noteMaxQuestion, e.target.value)}
                  style={{ width: "70px", padding: "8px", border: "1px solid #e2e8f0", borderRadius: "8px", textAlign: "center" }}
                />
                <span>/ {noteMaxQuestion} pts</span>
              </div>
            </div>

            {/* Texte question */}
            <div style={{ marginBottom: "16px" }}>
              <strong>Question :</strong>
              <p style={{ margin: "8px 0 0 0", color: "#1e293b" }}>{question.texte}</p>
            </div>

            {/* Réponse étudiant */}
            <div style={{ marginBottom: "16px", padding: "12px", background: "#f0fdf4", borderRadius: "12px", borderLeft: "3px solid #10b981" }}>
              <strong>Réponse de l'étudiant :</strong>
              <div style={{ marginTop: "8px", padding: "12px", background: "white", borderRadius: "8px", border: "1px solid #e2e8f0", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                {reponseEtudiant}
              </div>
            </div>

            {/* Feedback + bouton IA (Groq) uniquement */}
            <div style={{ marginBottom: "16px", padding: "12px", background: "#eff6ff", borderRadius: "12px", borderLeft: "3px solid #3b82f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                <strong>Feedback :</strong>
                {/* Bouton "Corriger avec IA" = Groq uniquement, visible pour toutes les questions */}
                {!estEnChargement && (
                  <button
                    onClick={() => genererFeedbackAvecGroq(question, reponseEtudiant)}
                    style={{ padding: "6px 12px", background: "#8b5cf6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <FaMagic /> Corriger avec IA
                  </button>
                )}
              </div>
              {estEnChargement ? (
                <div style={{ marginTop: "8px", color: "#64748b" }}>Correction en cours...</div>
              ) : (
                <textarea
                  rows="3"
                  value={feedbackValue}
                  onChange={(e) => updateFeedback(question.id, e.target.value)}
                  placeholder="Feedback pour l'étudiant..."
                  style={{ width: "100%", padding: "12px", marginTop: "8px", border: "1px solid #cbd5e1", borderRadius: "8px", resize: "vertical", fontFamily: "inherit", fontSize: "14px", backgroundColor: "white" }}
                />
              )}
              <small style={{ display: "block", marginTop: "6px", color: "#64748b" }}>
                {question.type_question !== "qcm"
                  ? "Correction NLP appliquée automatiquement. Cliquez sur 'Corriger avec IA' pour une analyse approfondie."
                  : "Correction QCM automatique. Cliquez sur 'Corriger avec IA' pour une analyse approfondie."}
              </small>
            </div>

            {/* Réponse attendue */}
            <div style={{ marginBottom: "16px", padding: "12px", background: "#d1fae5", borderRadius: "12px", borderLeft: "4px solid #10b981" }}>
              <strong style={{ color: "#065f46" }}>BONNE RÉPONSE :</strong>
              {reponsesAttendues[question.id] ? (
                <div style={{ marginTop: "8px", padding: "10px", background: "white", borderRadius: "8px", border: "1px solid #10b981" }}>
                  {reponsesAttendues[question.id]}
                  <button
                    onClick={() => {
                      const nouvelleReponse = prompt("Modifier la réponse attendue:", reponsesAttendues[question.id]);
                      if (nouvelleReponse !== null) enregistrerReponseAttendue(question.id, nouvelleReponse);
                    }}
                    style={{ marginLeft: "12px", padding: "4px 10px", background: "#f59e0b", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                  >
                    Modifier
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: "8px" }}>
                  <input
                    type="text"
                    placeholder="Saisissez la réponse correcte..."
                    value={reponsesAttendues[question.id] || ""}
                    onChange={(e) => setReponsesAttendues((prev) => ({ ...prev, [question.id]: e.target.value }))}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #10b981" }}
                  />
                  <button
                    onClick={() => enregistrerReponseAttendue(question.id, reponsesAttendues[question.id])}
                    style={{ marginTop: "8px", padding: "8px 16px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
                  >
                    Enregistrer
                  </button>
                </div>
              )}
            </div>

            {/* Boutons d'action rapide */}
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button onClick={() => mettreAJourNote(question.id, noteMaxQuestion, noteMaxQuestion)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#d1fae5", color: "#10b981", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                <FaCheck /> Correct
              </button>
              <button onClick={() => mettreAJourNote(question.id, noteMaxQuestion, 0)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                <FaTimes /> Incorrect
              </button>
              <button onClick={() => mettreAJourNote(question.id, noteMaxQuestion, noteMaxQuestion / 2)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#fed7aa", color: "#f59e0b", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                <FaEdit /> Partiel
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ManualCorrection;