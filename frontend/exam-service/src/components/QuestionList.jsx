import React, { useState } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaFileAlt,
  FaCalculator,
  FaListUl,
} from "react-icons/fa";
import api from "../services/api";
import QuestionForm from "./QuestionForm";
import MathText from "./MathText";
import toast from "react-hot-toast";

const TYPE_LABELS = { ouverte: "Ouverte", calcul: "Calcul", qcm: "QCM" };
const TYPE_ICONS = {
  ouverte: <FaFileAlt size={12} />,
  calcul: <FaCalculator size={12} />,
  qcm: <FaListUl size={12} />,
};
const TYPE_COLORS = {
  ouverte: "bg-stone-100 text-stone-600 border-stone-200",
  calcul: "bg-amber-50 text-amber-600 border-amber-200",
  qcm: "bg-bleu-profond-50 text-bleu-profond-600 border-bleu-profond-200",
};

const QuestionList = ({ examId, questions, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const handleDelete = async (questionId) => {
    if (!window.confirm("Supprimer cette question ?")) return;
    try {
      await api.deleteQuestion(questionId);
      onUpdate();
      toast.success("Question supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="ml-6 p-6 space-y-6">
      {/* En-tête avec compteur et actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-stone-900 tracking-tight">
              Questions
            </h2>
            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2.5 rounded-full bg-stone-100 text-xs font-medium text-stone-600">
              {questions.length}
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-0.5">
            {questions.length === 0
              ? "Aucune question pour le moment"
              : `${questions.length} question${questions.length > 1 ? "s" : ""} au total`}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingQuestion(null);
            setShowForm(true);
          }}
          className="group inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-bleu-profond-600 rounded-xl hover:bg-bleu-profond-700 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <FaPlus
            size={14}
            className="group-hover:rotate-90 transition-transform duration-200"
          />
          Ajouter une question
        </button>
      </div>

      {/* Liste des questions */}
      {questions.length > 0 ? (
        <div className="space-y-3">
          {questions.map((q, i) => {
            const isHovered = hoveredId === q.id;
            return (
              <div
                key={q.id}
                className={`group relative bg-white rounded-2xl border transition-all duration-200 ${
                  isHovered
                    ? "border-bleu-profond-300 shadow-lg shadow-bleu-profond-100/50 -translate-y-0.5"
                    : "border-stone-200 shadow-sm hover:shadow-md"
                }`}
                onMouseEnter={() => setHoveredId(q.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="flex items-start gap-4 p-5">
                  {/* Numéro avec cercle */}
                  <div className="flex-shrink-0 hidden sm:block">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold transition-colors duration-200 ${
                        isHovered
                          ? "bg-bleu-profond-100 text-bleu-profond-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {i + 1}
                    </div>
                  </div>

                  {/* Contenu principal */}
                  <div className="flex-1 min-w-0">
                    {/* En-tête de la question */}
                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                      <span className="text-sm font-medium text-stone-700">
                        Question {i + 1}
                      </span>
                      <span className="text-xs text-stone-400">•</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-stone-50 text-stone-600 border-stone-200">
                        {q.points} pt{q.points > 1 ? "s" : ""}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[q.type_question] || "bg-stone-100 text-stone-600 border-stone-200"}`}
                      >
                        {TYPE_ICONS[q.type_question]}
                        {TYPE_LABELS[q.type_question] || q.type_question}
                      </span>
                    </div>

                    {/* Texte de la question */}
                    <div className="text-sm text-stone-800 leading-relaxed prose prose-sm max-w-none">
                      <MathText text={q.texte} />
                    </div>

                    {/* Prévisualisation QCM si applicable */}
                    {q.type_question === "qcm" && q.reponse_correcte && (
                      <div className="mt-3 pt-3 border-t border-stone-100">
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            try {
                              const data = JSON.parse(q.reponse_correcte);
                              return data.choix
                                ?.slice(0, 3)
                                .map((choix, idx) => (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${
                                      idx === data.bonne_reponse
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-stone-50 text-stone-500 border border-stone-200"
                                    }`}
                                  >
                                    <span className="font-medium">
                                      {String.fromCharCode(65 + idx)}.
                                    </span>
                                    {choix.length > 30
                                      ? choix.slice(0, 30) + "…"
                                      : choix}
                                    {idx === data.bonne_reponse && (
                                      <span className="ml-0.5 text-emerald-500">
                                        ✓
                                      </span>
                                    )}
                                  </span>
                                ));
                            } catch {
                              return null;
                            }
                          })()}
                          {(() => {
                            try {
                              const data = JSON.parse(q.reponse_correcte);
                              return (
                                data.choix?.length > 3 && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-stone-50 text-stone-400 border border-stone-200">
                                    +{data.choix.length - 3}
                                  </span>
                                )
                              );
                            } catch {
                              return null;
                            }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions - apparaissent au hover */}
                  <div
                    className={`flex gap-1 flex-shrink-0 transition-all duration-200 ${
                      isHovered ? "opacity-100" : "opacity-0 sm:opacity-100"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setEditingQuestion(q);
                        setShowForm(true);
                      }}
                      className="p-2.5 text-stone-400 hover:text-bleu-profond-600 hover:bg-bleu-profond-50 rounded-xl transition-all duration-200 hover:scale-105"
                      title="Modifier"
                    >
                      <FaEdit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-2.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-105"
                      title="Supprimer"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>

                {/* Indicateur de survol élégant */}
                <div
                  className={`absolute inset-0 rounded-2xl transition-opacity duration-200 pointer-events-none ${
                    isHovered ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-bleu-profond-500/5 via-transparent to-bleu-profond-500/5" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="relative bg-white rounded-2xl border border-dashed border-stone-300 p-12 text-center">
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-stone-50 flex items-center justify-center text-4xl mb-4 border border-stone-200">
              <FaFileAlt className="text-stone-300" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 mb-1">
              Aucune question
            </h3>
            <p className="text-sm text-stone-500 max-w-sm mb-6">
              Commencez par ajouter votre première question. Vous pouvez créer
              des questions ouvertes, des calculs ou des QCM.
            </p>
            <button
              onClick={() => {
                setEditingQuestion(null);
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-bleu-profond-600 border-2 border-bleu-profond-200 rounded-xl hover:bg-bleu-profond-50 hover:border-bleu-profond-300 transition-all duration-200 hover:-translate-y-0.5"
            >
              <FaPlus size={14} />
              Ajouter une question
            </button>
          </div>
          {/* Décoration de fond */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-bleu-profond-400 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-40 h-40 rounded-full bg-bleu-profond-400 blur-3xl" />
          </div>
        </div>
      )}

      {/* Modal QuestionForm */}
      {(showForm || editingQuestion) && (
        <QuestionForm
          examId={examId}
          question={editingQuestion}
          onClose={() => {
            setShowForm(false);
            setEditingQuestion(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingQuestion(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

export default QuestionList;
