import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FaEdit,
  FaFilePdf,
  FaArrowLeft,
  FaUpload,
  FaFileAlt,
  FaBook,
  FaCalendarAlt,
  FaInfoCircle,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import api from "../services/api";
import QuestionList from "./QuestionList";
import LoadingSpinner from "./LoadingSpinner";
import toast from "react-hot-toast";

const ExamDetails = () => {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBrut, setShowBrut] = useState(false);

  useEffect(() => {
    loadExamDetails();
  }, [id]);

  const loadExamDetails = async () => {
    try {
      const [examData, questionsData] = await Promise.all([
        api.getExam(id),
        api.getExamQuestions(id),
      ]);
      setExam(examData);
      setQuestions(questionsData);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    const toastId = toast.loading("Génération du PDF en cours...");
    try {
      await api.exportExamPDF(id);
      toast.success("PDF téléchargé !", { id: toastId });
    } catch {
      toast.error("Erreur export PDF", { id: toastId });
    }
  };

  const handleExportBrut = async () => {
    try {
      await api.exportExamBrut(id);
      toast.success("Fichier téléchargé");
    } catch {
      toast.error("Erreur export contenu brut");
    }
  };

  if (loading) return <LoadingSpinner message="Chargement de l'examen..." />;
  if (!exam) {
    return (
      <div className="min-h-screen bg-gris-chaud-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-stone-900 mb-2">
            Examen non trouvé
          </h3>
          <p className="text-sm text-stone-500 mb-6">
            L'examen que vous recherchez n'existe pas ou a été supprimé.
          </p>
          <Link
            to="/exams"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-bleu-profond-600 rounded-xl hover:bg-bleu-profond-700 transition-colors"
          >
            <FaArrowLeft size={14} />
            Retour aux examens
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gris-chaud-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête avec navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Link
            to="/exams"
            className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-bleu-profond-600 transition-colors"
          >
            <FaArrowLeft size={14} />
            Retour aux examens
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/exams/${id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-all"
            >
              <FaEdit size={14} />
              Modifier
            </Link>
            <Link
              to={`/exams/${exam.id}/upload`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-bleu-profond-600 rounded-xl hover:bg-bleu-profond-700 transition-all shadow-sm hover:shadow-md"
            >
              <FaUpload size={14} />
              Importer des copies
            </Link>
            {exam.contenu_brut && (
              <button
                onClick={handleExportBrut}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-all"
              >
                <FaFileAlt size={14} />
                Contenu brut
              </button>
            )}
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md"
            >
              <FaFilePdf size={14} />
              Exporter PDF
            </button>
          </div>
        </div>

        {/* Informations de l'examen */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
                {exam.titre}
              </h1>
              {exam.description && (
                <p className="text-sm text-stone-500 mt-1">
                  {exam.description}
                </p>
              )}
            </div>
            <div className="flex-shrink-0">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  exam.statut === "publié"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {exam.statut === "publié" ? "✓ Publié" : "✎ Brouillon"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-stone-100">
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wider">
                Matière
              </p>
              <p className="text-sm font-medium text-stone-700 mt-1 flex items-center gap-1.5">
                <FaBook className="text-bleu-profond-500 text-xs" />
                {exam.matiere || "Non spécifiée"}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wider">
                Points totaux
              </p>
              <p className="text-sm font-medium text-stone-700 mt-1">
                {exam.points_totaux} pts
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wider">
                Questions
              </p>
              <p className="text-sm font-medium text-stone-700 mt-1">
                {questions.length} question{questions.length > 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wider">
                Date de création
              </p>
              <p className="text-sm font-medium text-stone-700 mt-1 flex items-center gap-1.5">
                <FaCalendarAlt className="text-stone-400 text-xs" />
                {new Date(exam.date_creation).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Contenu brut */}
        {questions.length === 0 && exam.contenu_brut && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                  <FaInfoCircle className="text-bleu-profond-500" />
                  Contenu de l'examen
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Les questions n'ont pas encore été extraites automatiquement.
                  Vous pouvez les ajouter manuellement ci-dessous ou réimporter
                  le fichier.
                </p>
              </div>
              <button
                onClick={() => setShowBrut(!showBrut)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors flex-shrink-0"
              >
                {showBrut ? (
                  <>
                    <FaEyeSlash size={14} /> Masquer
                  </>
                ) : (
                  <>
                    <FaEye size={14} /> Voir le texte
                  </>
                )}
              </button>
            </div>

            {showBrut && (
              <div className="mt-4 p-4 bg-stone-50 rounded-xl border border-stone-200 overflow-x-auto">
                <pre className="text-xs text-stone-700 whitespace-pre-wrap font-mono leading-relaxed max-h-[400px] overflow-y-auto">
                  {exam.contenu_brut}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Statistiques rapides si des questions existent */}
        {questions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
              <p className="text-lg font-bold text-bleu-profond-600">
                {questions.length}
              </p>
              <p className="text-xs text-stone-500">Questions</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
              <p className="text-lg font-bold text-emerald-600">
                {questions.filter((q) => q.type_question === "qcm").length}
              </p>
              <p className="text-xs text-stone-500">QCM</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
              <p className="text-lg font-bold text-amber-600">
                {questions.filter((q) => q.type_question === "calcul").length}
              </p>
              <p className="text-xs text-stone-500">Calculs</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
              <p className="text-lg font-bold text-violet-600">
                {questions.filter((q) => q.type_question === "ouverte").length}
              </p>
              <p className="text-xs text-stone-500">Ouvertes</p>
            </div>
          </div>
        )}

        {/* Liste des questions */}
        <QuestionList
          examId={id}
          questions={questions}
          onUpdate={loadExamDetails}
        />
      </div>
    </div>
  );
};

export default ExamDetails;
