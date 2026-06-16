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

const TYPES_Q = [
  { val: "ouverte", label: "Ouverte", icon: "T", desc: "Réponse libre" },
  { val: "calcul", label: "Calcul", icon: "∑", desc: "Calcul / démonstration" },
  { val: "qcm", label: "QCM", icon: "◉", desc: "Choix multiple" },
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
  reponse_attendue: "",
});

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

const getCurrentUserId = () => {
  const userId = getCookie("user_id");
  if (userId) return parseInt(userId);
  return 1;
};

// ── Question Editor ──
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
    <div className="bg-white rounded-2xl border border-stone-200 mb-4 overflow-hidden transition-shadow hover:shadow-md hover:border-stone-300">
      {/* Head */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-stone-100">
        <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>

        {/* Type tabs */}
        <div className="flex gap-1.5 flex-1">
          {TYPES_Q.map((t) => (
            <button
              key={t.val}
              type="button"
              onClick={() => set("type_question", t.val)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                q.type_question === t.val
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Points control */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              set("points", Math.max(0.5, parseFloat(q.points) - 0.5))
            }
            className="w-6 h-6 rounded-md border border-stone-200 bg-white text-stone-500 text-sm font-bold hover:bg-stone-50 flex items-center justify-center leading-none"
          >
            −
          </button>
          <span className="text-sm font-semibold text-stone-800 min-w-[46px] text-center">
            {q.points} pt
          </span>
          <button
            type="button"
            onClick={() =>
              set("points", Math.min(20, parseFloat(q.points) + 0.5))
            }
            className="w-6 h-6 rounded-md border border-stone-200 bg-white text-stone-500 text-sm font-bold hover:bg-stone-50 flex items-center justify-center leading-none"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => onRemove(q.tempId)}
          className="w-7 h-7 rounded-lg border-none bg-transparent text-stone-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-sm transition-colors"
        >
          <FaTimes />
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        <textarea
          value={q.texte}
          onChange={(e) => set("texte", e.target.value)}
          rows={q.type_question === "qcm" ? 2 : 3}
          className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-stone-200 bg-stone-50 text-sm text-stone-900 resize-vertical outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-[3px] focus:ring-blue-50 placeholder:text-stone-300"
          placeholder={
            q.type_question === "qcm"
              ? "Énoncé de la question..."
              : "Texte complet de la question..."
          }
        />

        {/* Réponse attendue (ouverte / calcul) */}
        {(q.type_question === "calcul" || q.type_question === "ouverte") && (
          <div className="mt-3 bg-emerald-50/60 border-[1.5px] border-emerald-200 rounded-xl p-4">
            <label className="block text-xs font-semibold text-emerald-700 mb-2">
              ✦ Réponse attendue
            </label>
            <textarea
              value={q.reponse_attendue || ""}
              onChange={(e) => set("reponse_attendue", e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] text-sm text-stone-900 resize-vertical outline-none transition-all bg-white placeholder:text-stone-300 focus:ring-[3px] focus:ring-emerald-100"
              style={{
                borderColor: q.reponse_attendue ? "#6ee7b7" : "#fca5a5",
              }}
              placeholder="Saisissez la réponse correcte attendue..."
            />
          </div>
        )}

        {/* QCM */}
        {q.type_question === "qcm" && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-stone-600 mb-3">
              Choix{" "}
              <span className="font-normal text-stone-400">
                — cliquer la lettre pour marquer la bonne réponse
              </span>
            </p>
            <div className="flex flex-col gap-2">
              {q.choix.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onChange({ ...q, bonneReponse: i })}
                    className={`w-8 h-8 rounded-lg border-[1.5px] text-xs font-bold flex items-center justify-center flex-shrink-0 transition-all ${
                      q.bonneReponse === i
                        ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                        : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"
                    }`}
                  >
                    {q.bonneReponse === i ? <FaCheck /> : LETTRES[i]}
                  </button>
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => setChoix(i, e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border-[1.5px] border-stone-200 bg-stone-50 text-sm text-stone-900 outline-none focus:border-blue-400 focus:bg-white transition-all"
                    placeholder={`Choix ${LETTRES[i]}...`}
                  />
                  {q.choix.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeChoix(i)}
                      className="w-7 h-7 rounded-lg text-stone-300 hover:bg-red-50 hover:text-red-400 flex items-center justify-center text-xs transition-colors"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
              {q.choix.length < 6 && (
                <button
                  type="button"
                  onClick={addChoix}
                  className="w-full py-2 mt-1 border-[1.5px] border-dashed border-stone-200 rounded-lg text-xs text-stone-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 flex items-center justify-center gap-1.5 transition-all"
                >
                  <FaPlus size={10} /> Ajouter un choix
                </button>
              )}
            </div>
            <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              ✓ Bonne réponse : <strong>{LETTRES[q.bonneReponse]}</strong>
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
    for (const q of validQuestions) {
      if (q.type_question === "qcm") {
        const choixValides = q.choix.filter((c) => c.trim()).length;
        if (choixValides < 2) {
          toast.error(
            `Le QCM "${q.texte.substring(0, 50)}..." doit avoir au moins 2 choix`,
          );
          return;
        }
      }
    }
    setLoading(true);
    try {
      let examId = id;
      if (id) {
        await api.updateExam(id, examData);
      } else {
        const userId = getCurrentUserId();
        const created = await api.createExam({
          ...examData,
          id_enseignant: userId,
        });
        examId = created.id;
      }
      if (id && existingQuestions.length > 0) {
        for (const q of existingQuestions) {
          try {
            await api.deleteQuestion(q.id);
          } catch {}
        }
      }
      for (let i = 0; i < validQuestions.length; i++) {
        const q = validQuestions[i];
        let reponseCorrecte = null;
        if (q.type_question === "qcm") {
          reponseCorrecte = JSON.stringify({
            choix: q.choix.filter((c) => c.trim()),
            bonne_reponse: q.bonneReponse,
          });
        } else if (q.reponse_attendue?.trim()) {
          reponseCorrecte = q.reponse_attendue.trim();
        }
        await api.createQuestion({
          texte: q.texte,
          points: parseFloat(q.points),
          type_question: q.type_question,
          ordre: i + 1,
          exam_id: parseInt(examId),
          reponse_correcte: reponseCorrecte,
        });
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

  const checklist = [
    { done: !!examData.titre, label: "Titre renseigné" },
    { done: !!examData.matiere, label: "Matière sélectionnée" },
    { done: examData.statut === "publié", label: "Publié" },
  ];

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* ── Stepper ── */}
      <div className="bg-white border-b border-stone-200 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-0">
          {/* Step 1 */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step > 1
                  ? "bg-emerald-500 text-white"
                  : step === 1
                    ? "bg-blue-600 text-white shadow-[0_0_0_4px_#dbeafe]"
                    : "bg-stone-100 text-stone-400 border-[1.5px] border-stone-200"
              }`}
            >
              {step > 1 ? <FaCheck size={12} /> : "1"}
            </div>
            <span
              className={`text-sm font-medium ${step >= 1 ? "text-stone-700" : "text-stone-400"}`}
            >
              Informations
            </span>
          </div>

          <div
            className={`flex-1 h-px mx-4 max-w-16 ${step > 1 ? "bg-emerald-400" : "bg-stone-200"}`}
          />

          {/* Step 2 */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step === 2
                  ? "bg-blue-600 text-white shadow-[0_0_0_4px_#dbeafe]"
                  : "bg-stone-100 text-stone-400 border-[1.5px] border-stone-200"
              }`}
            >
              2
            </div>
            <span
              className={`text-sm font-medium ${step === 2 ? "text-stone-700" : "text-stone-400"}`}
            >
              Questions
            </span>
          </div>
        </div>
      </div>

      {/* ── ÉTAPE 1 ── */}
      {step === 1 && (
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Left */}
          <div>
            {/* Card 1 */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-4">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-stone-100">
                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-semibold text-stone-800">
                  Informations générales
                </h2>
              </div>
              <div className="px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">
                    Titre <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={examData.titre}
                    onChange={(e) => setField("titre", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-stone-200 bg-stone-50 text-sm text-stone-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-[3px] focus:ring-blue-50 placeholder:text-stone-300"
                    placeholder="Ex : Contrôle — Suites numériques S1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">
                    Description{" "}
                    <span className="text-xs font-normal text-stone-400 ml-1">
                      optionnel
                    </span>
                  </label>
                  <textarea
                    value={examData.description || ""}
                    onChange={(e) => setField("description", e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-stone-200 bg-stone-50 text-sm text-stone-900 outline-none resize-vertical transition-all focus:border-blue-400 focus:bg-white focus:ring-[3px] focus:ring-blue-50 placeholder:text-stone-300"
                    placeholder="Instructions générales, durée, matériel autorisé..."
                  />
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-4">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-stone-100">
                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h2 className="text-sm font-semibold text-stone-800">
                  Matière
                </h2>
              </div>
              <div className="px-6 py-5">
                <label className="block text-sm font-medium text-stone-600 mb-1.5">
                  Nom de la matière <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={examData.matiere}
                  onChange={(e) => setField("matiere", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-stone-200 bg-stone-50 text-sm text-stone-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-[3px] focus:ring-blue-50 placeholder:text-stone-300"
                  placeholder="Ex : Mathématiques, Physique-Chimie..."
                />
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-stone-100">
                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h2 className="text-sm font-semibold text-stone-800">
                  Paramètres
                </h2>
              </div>
              <div className="px-6 py-5 flex flex-col gap-5">
                {/* Points */}
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-2">
                    Points totaux
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-baseline gap-1 bg-blue-50 border-[1.5px] border-blue-200 rounded-xl px-4 py-2">
                      <span className="text-2xl font-bold text-blue-700">
                        {examData.points_totaux}
                      </span>
                      <span className="text-sm text-blue-500">pts</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setField(
                            "points_totaux",
                            Math.min(100, examData.points_totaux + 1),
                          )
                        }
                        className="w-7 h-6 rounded-md border border-stone-200 bg-white text-stone-500 text-sm font-semibold hover:bg-stone-50 flex items-center justify-center leading-none"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setField(
                            "points_totaux",
                            Math.max(0, examData.points_totaux - 1),
                          )
                        }
                        className="w-7 h-6 rounded-md border border-stone-200 bg-white text-stone-500 text-sm font-semibold hover:bg-stone-50 flex items-center justify-center leading-none"
                      >
                        −
                      </button>
                    </div>
                  </div>
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-2">
                    Statut
                  </label>
                  <div className="flex gap-3">
                    {[
                      {
                        val: "brouillon",
                        dot: "bg-amber-400",
                        activeBg: "bg-amber-50 border-amber-300",
                        label: "Brouillon",
                        desc: "Non visible",
                      },
                      {
                        val: "publié",
                        dot: "bg-emerald-400",
                        activeBg: "bg-emerald-50 border-emerald-300",
                        label: "Publié",
                        desc: "Visible aux étudiants",
                      },
                    ].map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => setField("statut", s.val)}
                        className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-[1.5px] text-left transition-all ${
                          examData.statut === s.val
                            ? s.activeBg
                            : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`}
                        />
                        <div>
                          <p className="text-sm font-semibold text-stone-800">
                            {s.label}
                          </p>
                          <p className="text-xs text-stone-400">{s.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Preview */}
          <div>
            <div className="bg-white rounded-2xl border border-stone-200 p-5 sticky top-6">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-4">
                Aperçu
              </p>
              <p
                className={`text-base font-bold mb-2.5 ${!examData.titre ? "text-stone-300" : "text-stone-900"}`}
              >
                {examData.titre || "Titre de l'examen..."}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {examData.matiere ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                    {examData.matiere}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-400">
                    Matière non choisie
                  </span>
                )}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    examData.statut === "publié"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  ● {examData.statut === "publié" ? "Publié" : "Brouillon"}
                </span>
              </div>
              <div className="border-t border-stone-100 my-3" />
              <div>
                <span className="text-3xl font-extrabold text-blue-600">
                  {examData.points_totaux}
                </span>
                <span className="text-sm text-stone-400 ml-1">points</span>
              </div>

              {/* Checklist */}
              <div className="mt-4 pt-4 border-t border-stone-100 flex flex-col gap-2">
                {checklist.map((c, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2.5 text-sm ${c.done ? "text-stone-700" : "text-stone-400"}`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center text-[9px] flex-shrink-0 ${
                        c.done
                          ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                          : "border-stone-200 text-stone-300"
                      }`}
                      style={{ width: 18, height: 18 }}
                    >
                      {c.done ? "✓" : "○"}
                    </div>
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
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                Questions de l'examen
              </h2>
              <p className="text-sm text-stone-500 mt-0.5">
                {questions.filter((q) => q.texte.trim()).length} question(s) ·{" "}
                {totalPtsQuestions.toFixed(1)} pts au total
              </p>
            </div>
            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <FaPlus size={11} /> Ajouter une question
            </button>
          </div>

          <div>
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

      {/* ── Navigation bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-6 py-3.5 flex items-center justify-between z-50">
        <div>
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-[1.5px] border-stone-200 bg-white text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              <FaChevronLeft size={11} /> Retour
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/exams")}
              className="px-4 py-2.5 rounded-xl border-[1.5px] border-stone-200 bg-white text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>

        <div>
          {step === 1 ? (
            <button
              type="button"
              onClick={goToStep2}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Suivant : Questions <FaChevronRight size={11} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? "Sauvegarde..."
                : id
                  ? "✓ Enregistrer les modifications"
                  : "✓ Enregistrer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamForm;
