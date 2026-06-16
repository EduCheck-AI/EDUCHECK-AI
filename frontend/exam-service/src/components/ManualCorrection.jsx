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
  const correctionDejaDone = useRef(false);
  const { copie, exam_id, exam_title } = location.state || {};

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
        new RegExp(`^${numeroQuestion}[\\.\)\\:\\s]*(.+)`),
      );
      if (match) return match[1].trim();
    }
    return "Non détectée";
  };

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
      setFeedbacks((prev) => ({ ...prev, [question.id]: result.feedback }));
      setNotes((prev) => ({
        ...prev,
        [question.id]: parseFloat(result.points_obtenus) || 0,
      }));
      toast.success("Correction NLP effectuée !");
    } catch (error) {
      setFeedbacks((prev) => ({
        ...prev,
        [question.id]:
          "Erreur de correction NLP. Veuillez corriger manuellement.",
      }));
    } finally {
      setChargementIA((prev) => ({ ...prev, [question.id]: false }));
    }
  };

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
      setFeedbacks((prev) => ({ ...prev, [question.id]: result.feedback }));
      setNotes((prev) => ({
        ...prev,
        [question.id]: parseFloat(result.points_obtenus) || 0,
      }));
      toast.success("Feedback généré par IA !");
    } catch {
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
        (s, q) => s + (parseFloat(q.points) || 0),
        0,
      );
      setNoteMax(max);

      const reponsesInitiales = {};
      questionsData.forEach((q) => {
        if (q.reponse_correcte) {
          try {
            const data = JSON.parse(q.reponse_correcte);
            if (q.type_question === "qcm") {
              const choix = data.choix || [];
              reponsesInitiales[q.id] =
                choix[data.bonne_reponse || 0] || "Non spécifiée";
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

      let correctionsExistantes = {};
      try {
        const correctionsRes = await api.get(`/corrections/copie/${id}`);
        if (correctionsRes.data?.length > 0) {
          correctionsExistantes = correctionsRes.data.reduce((acc, c) => {
            acc[c.question_id] = {
              points_obtenus: parseFloat(c.points_obtenus) || 0,
              feedback: c.feedback || "",
            };
            return acc;
          }, {});
        }
      } catch {}

      const notesInitiales = {};
      const feedbacksInitiales = {};

      for (const q of questionsData) {
        if (correctionsExistantes[q.id]) {
          notesInitiales[q.id] = correctionsExistantes[q.id].points_obtenus;
          feedbacksInitiales[q.id] = correctionsExistantes[q.id].feedback;
        } else if (q.type_question === "qcm") {
          let reponseEtudiant = extraireReponseEtudiant(
            copie?.contenu_brut,
            questionsData.indexOf(q) + 1,
          );
          const lettreMatch = reponseEtudiant.match(/^([A-F])/i);
          if (lettreMatch) reponseEtudiant = lettreMatch[1].toUpperCase();
          const lettres = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };
          const reponseIndex = lettres[reponseEtudiant] ?? -1;
          try {
            const data = JSON.parse(q.reponse_correcte || "{}");
            const choix = data.choix || [];
            const bonneReponse = data.bonne_reponse || 0;
            notesInitiales[q.id] =
              reponseIndex === bonneReponse ? parseFloat(q.points) : 0;
            feedbacksInitiales[q.id] =
              reponseIndex === bonneReponse
                ? "✓ Bonne réponse !"
                : "✗ Mauvaise réponse. La bonne réponse est : " +
                  (choix[bonneReponse] || "?");
          } catch {
            notesInitiales[q.id] = 0;
            feedbacksInitiales[q.id] = "Question QCM à corriger";
          }
        } else {
          const reponseEtudiant = extraireReponseEtudiant(
            copie?.contenu_brut,
            questionsData.indexOf(q) + 1,
          );
          notesInitiales[q.id] = 0;
          feedbacksInitiales[q.id] =
            reponseEtudiant !== "Non détectée"
              ? "Correction NLP en cours..."
              : "Réponse non détectée. Cliquez sur 'Corriger avec IA' pour une analyse manuelle.";
        }
      }

      setNotes(notesInitiales);
      setFeedbacks(feedbacksInitiales);
      setNoteTotale(
        copie.note && parseFloat(copie.note) > 0
          ? parseFloat(copie.note)
          : Object.values(notesInitiales).reduce((a, b) => a + b, 0),
      );

      for (const q of questionsData) {
        if (!correctionsExistantes[q.id] && q.type_question !== "qcm") {
          const reponseEtudiant = extraireReponseEtudiant(
            copie?.contenu_brut,
            questionsData.indexOf(q) + 1,
          );
          if (reponseEtudiant !== "Non détectée")
            await corrigerAvecNLP(q, reponseEtudiant);
        }
      }
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setChargement(false);
    }
  };

  const mettreAJourNote = (questionId, noteMaxQuestion, nouvelleNote) => {
    const noteValide = Math.min(
      Math.max(0, parseFloat(nouvelleNote) || 0),
      noteMaxQuestion,
    );
    setNotes((prev) => ({ ...prev, [questionId]: noteValide }));
  };

  const updateFeedback = (questionId, feedback) =>
    setFeedbacks((prev) => ({ ...prev, [questionId]: feedback }));

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
        questions.indexOf(question) + 1,
      );
      if (reponseEtudiant !== "Non détectée")
        await corrigerAvecNLP(question, reponseEtudiant);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const toutSauvegarder = async () => {
    setSauvegarde(true);
    try {
      for (const question of questions) {
        await api.post(`/corrections/${id}/save`, {
          question_id: question.id,
          points_obtenus: notes[question.id] || 0,
          feedback: feedbacks[question.id] || "",
        });
      }
      await api.put(`/copies/${id}/note`, { note: noteTotale });
      toast.success("Corrections sauvegardées");
      navigate("/corrections");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSauvegarde(false);
    }
  };

  const corrigerTout = async () => {
    setCorrigerToutEnCours(true);
    toast("Correction IA de toutes les questions en cours...", { icon: "🤖" });
    try {
      for (const [index, question] of questions.entries()) {
        const reponseEtudiant = extraireReponseEtudiant(
          copie?.contenu_brut,
          index + 1,
        );
        if (reponseEtudiant !== "Non détectée")
          await genererFeedbackAvecGroq(question, reponseEtudiant);
      }
      toast.success("Toutes les questions ont été corrigées par IA !");
    } catch {
      toast.error("Erreur lors de la correction globale");
    } finally {
      setCorrigerToutEnCours(false);
    }
  };

  const exporterPDF = () =>
    window.open(`http://localhost:8002/copies/${id}/export/pdf`, "_blank");

  if (chargement) return <LoadingSpinner />;

  const pourcentage =
    noteMax > 0 ? ((noteTotale / noteMax) * 100).toFixed(1) : 0;

  const getScoreColor = (score, maxPoints) => {
    const p = (score / maxPoints) * 100;
    if (p >= 60)
      return {
        border: "border-emerald-400",
        bg: "bg-emerald-50",
        badge: "bg-emerald-100 text-emerald-700",
      };
    if (p >= 40)
      return {
        border: "border-amber-400",
        bg: "bg-amber-50",
        badge: "bg-amber-100 text-amber-700",
      };
    return {
      border: "border-red-400",
      bg: "bg-red-50",
      badge: "bg-red-100 text-red-600",
    };
  };

  const typeBadge = {
    qcm: "bg-violet-100 text-violet-700",
    calcul: "bg-blue-100 text-blue-700",
    ouverte: "bg-stone-100 text-stone-600",
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {/* ── Header ── */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={() => navigate("/corrections")}
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
          >
            <FaArrowLeft size={12} /> Retour
          </button>

          <div className="text-center">
            <h1 className="text-base font-bold text-stone-900">
              Correction manuelle
            </h1>
            <p className="text-xs text-stone-500">
              Copie #{id} · {exam_title}
            </p>
            <p className="text-xs text-violet-500 font-medium mt-0.5">
              {copie?.student_name || `Étudiant #${copie?.student_id}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exporterPDF}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              <FaFilePdf size={12} /> PDF
            </button>
            <button
              onClick={corrigerTout}
              disabled={corrigerToutEnCours}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:bg-violet-300 disabled:cursor-not-allowed transition-colors"
            >
              <FaRobot size={12} />
              {corrigerToutEnCours ? "En cours..." : "Corriger tout avec IA"}
            </button>
            <button
              onClick={toutSauvegarder}
              disabled={sauvegarde}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors"
            >
              <FaSave size={12} />
              {sauvegarde ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* ── Score global ── */}
        <div className="bg-stone-900 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-end justify-between mb-5 flex-wrap gap-4">
            <div>
              <p className="text-xs text-stone-400 mb-1">Note finale</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">
                  {noteTotale.toFixed(1)}
                </span>
                <span className="text-lg text-stone-400">/ {noteMax} pts</span>
              </div>
            </div>
            <span
              className={`px-3 py-1.5 rounded-xl text-sm font-bold ${
                pourcentage >= 50
                  ? "bg-emerald-500 text-white"
                  : "bg-red-500 text-white"
              }`}
            >
              {pourcentage}%
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(pourcentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-stone-500">
            <span>0</span>
            <span>{noteMax} pts</span>
          </div>
        </div>

        {/* ── Questions ── */}
        {questions.map((question, index) => {
          const noteMaxQuestion = parseFloat(question.points) || 1;
          const noteActuelle = notes[question.id] ?? 0;
          const colors = getScoreColor(noteActuelle, noteMaxQuestion);
          const reponseEtudiant = extraireReponseEtudiant(
            copie?.contenu_brut,
            index + 1,
          );
          const estEnChargement = chargementIA[question.id];

          return (
            <div
              key={question.id}
              className={`bg-white rounded-2xl border-l-4 border border-stone-100 ${colors.border} mb-5 overflow-hidden`}
            >
              {/* Card head */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeBadge[question.type_question] || typeBadge.ouverte}`}
                  >
                    {question.type_question === "qcm" && "QCM"}
                    {question.type_question === "calcul" && "Calcul"}
                    {question.type_question === "ouverte" && "Ouverte"}
                  </span>
                  <p className="text-sm text-stone-700 font-medium line-clamp-1 max-w-xs">
                    {question.texte}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={noteMaxQuestion}
                    step="0.5"
                    value={noteActuelle}
                    onChange={(e) =>
                      mettreAJourNote(
                        question.id,
                        noteMaxQuestion,
                        e.target.value,
                      )
                    }
                    className="w-16 px-2 py-1.5 text-center text-sm font-bold border-[1.5px] border-stone-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  />
                  <span className="text-sm text-stone-400">
                    / {noteMaxQuestion} pts
                  </span>
                </div>
              </div>

              <div className="p-5 flex flex-col gap-4">
                {/* Réponse étudiant */}
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                    Réponse de l'étudiant
                  </p>
                  <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-mono text-sm text-stone-800 whitespace-pre-wrap">
                    {reponseEtudiant}
                  </div>
                </div>

                {/* Bonne réponse */}
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">
                    Bonne réponse
                  </p>
                  {reponsesAttendues[question.id] ? (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <span className="text-sm text-emerald-800 flex-1">
                        {reponsesAttendues[question.id]}
                      </span>
                      <button
                        onClick={() => {
                          const nouvelleReponse = prompt(
                            "Modifier la réponse attendue:",
                            reponsesAttendues[question.id],
                          );
                          if (nouvelleReponse !== null)
                            enregistrerReponseAttendue(
                              question.id,
                              nouvelleReponse,
                            );
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 font-medium hover:bg-amber-200 transition-colors flex-shrink-0"
                      >
                        Modifier
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Saisissez la réponse correcte..."
                        value={reponsesAttendues[question.id] || ""}
                        onChange={(e) =>
                          setReponsesAttendues((prev) => ({
                            ...prev,
                            [question.id]: e.target.value,
                          }))
                        }
                        className="flex-1 px-3 py-2 text-sm border-[1.5px] border-emerald-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100"
                      />
                      <button
                        onClick={() =>
                          enregistrerReponseAttendue(
                            question.id,
                            reponsesAttendues[question.id],
                          )
                        }
                        className="px-3 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
                      >
                        Enregistrer
                      </button>
                    </div>
                  )}
                </div>

                {/* Feedback */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                      Feedback
                    </p>
                    {!estEnChargement && (
                      <button
                        onClick={() =>
                          genererFeedbackAvecGroq(question, reponseEtudiant)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-100 text-violet-700 text-xs font-semibold hover:bg-violet-200 transition-colors"
                      >
                        <FaMagic size={10} /> Corriger avec IA
                      </button>
                    )}
                  </div>
                  {estEnChargement ? (
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin flex-shrink-0" />
                      <span className="text-sm text-blue-600">
                        Correction en cours...
                      </span>
                    </div>
                  ) : (
                    <textarea
                      rows={3}
                      value={feedbacks[question.id] || ""}
                      onChange={(e) =>
                        updateFeedback(question.id, e.target.value)
                      }
                      placeholder="Feedback pour l'étudiant..."
                      className="w-full px-3.5 py-2.5 text-sm border-[1.5px] border-stone-200 rounded-xl outline-none resize-vertical bg-stone-50 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-stone-300"
                    />
                  )}
                  <p className="text-xs text-stone-400 mt-1.5">
                    {question.type_question !== "qcm"
                      ? "Correction NLP appliquée automatiquement. Cliquez sur 'Corriger avec IA' pour une analyse approfondie."
                      : "Correction QCM automatique. Cliquez sur 'Corriger avec IA' pour une analyse approfondie."}
                  </p>
                </div>

                {/* Actions rapides */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() =>
                      mettreAJourNote(
                        question.id,
                        noteMaxQuestion,
                        noteMaxQuestion,
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 transition-colors"
                  >
                    <FaCheck size={10} /> Correct
                  </button>
                  <button
                    onClick={() =>
                      mettreAJourNote(question.id, noteMaxQuestion, 0)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200 transition-colors"
                  >
                    <FaTimes size={10} /> Incorrect
                  </button>
                  <button
                    onClick={() =>
                      mettreAJourNote(
                        question.id,
                        noteMaxQuestion,
                        noteMaxQuestion / 2,
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold hover:bg-amber-200 transition-colors"
                  >
                    <FaEdit size={10} /> Partiel
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ManualCorrection;
