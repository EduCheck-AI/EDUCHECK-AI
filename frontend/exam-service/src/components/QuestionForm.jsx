import React, { useState } from "react";
import { FaPlus, FaTrash, FaTimes } from "react-icons/fa";
import api from "../services/api";
import toast from "react-hot-toast";

const TYPES = [
  { val: "ouverte", label: "Ouverte", icon: "T", desc: "Réponse libre" },
  { val: "calcul", label: "Calcul", icon: "∑", desc: "Calcul / démonstration" },
  { val: "qcm", label: "QCM", icon: "◉", desc: "Choix multiple" },
];

const LETTRES = ["A", "B", "C", "D", "E", "F"];

const QuestionForm = ({ examId, question, onClose, onSuccess }) => {
  const parseChoix = () => {
    if (question?.type_question === "qcm" && question?.reponse_correcte) {
      try {
        return JSON.parse(question.reponse_correcte).choix || ["", "", "", ""];
      } catch {
        return ["", "", "", ""];
      }
    }
    return ["", "", "", ""];
  };

  const parseBonne = () => {
    if (question?.type_question === "qcm" && question?.reponse_correcte) {
      try {
        return JSON.parse(question.reponse_correcte).bonne_reponse ?? 0;
      } catch {
        return 0;
      }
    }
    return 0;
  };

  const [formData, setFormData] = useState({
    texte: question?.texte || "",
    points: question?.points || 2,
    type_question: question?.type_question || "ouverte",
    ordre: question?.ordre || 0,
  });
  const [choix, setChoix] = useState(parseChoix());
  const [bonneReponse, setBonneReponse] = useState(parseBonne());
  const [loading, setLoading] = useState(false);

  const set = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleChoixChange = (i, v) => {
    const n = [...choix];
    n[i] = v;
    setChoix(n);
  };

  const addChoix = () => {
    if (choix.length < 6) setChoix([...choix, ""]);
  };

  const removeChoix = (i) => {
    if (choix.length <= 2) return;
    const n = choix.filter((_, j) => j !== i);
    setChoix(n);
    if (bonneReponse >= n.length) setBonneReponse(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.texte.trim()) {
      toast.error("Le texte est obligatoire");
      return;
    }
    if (
      formData.type_question === "qcm" &&
      choix.filter((c) => c.trim()).length < 2
    ) {
      toast.error("Ajoutez au moins 2 choix");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        reponse_correcte:
          formData.type_question === "qcm"
            ? JSON.stringify({
                choix: choix.filter((c) => c.trim()),
                bonne_reponse: bonneReponse,
              })
            : null,
      };
      if (question) {
        await api.updateQuestion(question.id, payload);
        toast.success("Question modifiée");
      } else {
        await api.createQuestion({ ...payload, exam_id: parseInt(examId) });
        toast.success("Question ajoutée");
      }
      onSuccess();
    } catch {
      toast.error(question ? "Erreur de modification" : "Erreur d'ajout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-bleu-profond-50 flex items-center justify-center text-bleu-profond-600 font-semibold text-sm">
              {TYPES.find((t) => t.val === formData.type_question)?.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                {question ? "Modifier la question" : "Nouvelle question"}
              </h2>
              <p className="text-sm text-stone-500">
                {TYPES.find((t) => t.val === formData.type_question)?.desc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            type="button"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 space-y-6">
            {/* Type selector */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3">
                Type de question
              </label>
              <div className="grid grid-cols-3 gap-3">
                {TYPES.map((t) => (
                  <button
                    key={t.val}
                    type="button"
                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                      formData.type_question === t.val
                        ? "border-bleu-profond-500 bg-bleu-profond-50"
                        : "border-stone-200 hover:border-stone-300"
                    }`}
                    onClick={() => set("type_question", t.val)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-sm font-semibold ${
                          formData.type_question === t.val
                            ? "text-bleu-profond-600"
                            : "text-stone-400"
                        }`}
                      >
                        {t.icon}
                      </span>
                      <span className="text-sm font-medium text-stone-700">
                        {t.label}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400">{t.desc}</p>
                    {formData.type_question === t.val && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-bleu-profond-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Texte */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                {formData.type_question === "qcm"
                  ? "Énoncé"
                  : "Texte de la question"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.texte}
                onChange={(e) => set("texte", e.target.value)}
                required
                rows={formData.type_question === "qcm" ? 2 : 4}
                className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-bleu-profond-500 focus:border-transparent transition-all bg-stone-50 focus:bg-white resize-none"
                placeholder={
                  formData.type_question === "qcm"
                    ? "Exemple : Quelle est la limite de u_n quand n tend vers l'infini ?"
                    : "Rédigez le texte complet de votre question..."
                }
              />
            </div>

            {/* Choix QCM */}
            {formData.type_question === "qcm" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-stone-700">
                    Choix de réponses
                  </label>
                  <span className="text-xs text-stone-400">
                    Cliquez sur la lettre pour définir la bonne réponse
                  </span>
                </div>

                <div className="space-y-2">
                  {choix.map((c, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-2 rounded-xl border-2 transition-all ${
                        bonneReponse === i
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-stone-200"
                      }`}
                    >
                      <button
                        type="button"
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-all flex-shrink-0 ${
                          bonneReponse === i
                            ? "bg-emerald-500 text-white"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        }`}
                        onClick={() => setBonneReponse(i)}
                        title="Marquer comme bonne réponse"
                      >
                        {bonneReponse === i ? "✓" : LETTRES[i]}
                      </button>

                      <input
                        type="text"
                        value={c}
                        onChange={(e) => handleChoixChange(i, e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bleu-profond-500 focus:border-transparent bg-white"
                        placeholder={`Choix ${LETTRES[i]}...`}
                      />

                      {choix.length > 2 && (
                        <button
                          type="button"
                          className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => removeChoix(i)}
                        >
                          <FaTrash size={14} />
                        </button>
                      )}
                    </div>
                  ))}

                  {choix.length < 6 && (
                    <button
                      type="button"
                      className="w-full py-2.5 border-2 border-dashed border-stone-300 rounded-xl text-sm text-stone-500 hover:border-bleu-profond-400 hover:text-bleu-profond-600 hover:bg-bleu-profond-50 transition-all flex items-center justify-center gap-2"
                      onClick={addChoix}
                    >
                      <FaPlus size={12} /> Ajouter un choix
                    </button>
                  )}
                </div>

                {/* Bonne réponse recap */}
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-stone-600">
                    Bonne réponse :{" "}
                    <span className="font-medium text-stone-900">
                      {LETTRES[bonneReponse]}
                    </span>
                    {choix[bonneReponse] && (
                      <span className="text-stone-500">
                        {" "}
                        — {choix[bonneReponse]}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Points + Ordre */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Points
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors"
                    onClick={() =>
                      set(
                        "points",
                        Math.max(0.5, parseFloat(formData.points) - 0.5),
                      )
                    }
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-lg font-medium text-stone-900">
                    {formData.points}
                  </span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors"
                    onClick={() =>
                      set(
                        "points",
                        Math.min(20, parseFloat(formData.points) + 0.5),
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Ordre d'affichage
                </label>
                <input
                  type="number"
                  value={formData.ordre}
                  onChange={(e) => set("ordre", e.target.value)}
                  min="0"
                  className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-bleu-profond-500 focus:border-transparent bg-stone-50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-100 bg-stone-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-medium text-white bg-bleu-profond-600 rounded-xl hover:bg-bleu-profond-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                "En cours..."
              ) : question ? (
                "Enregistrer"
              ) : (
                <>
                  <FaPlus size={14} /> Ajouter
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionForm;
