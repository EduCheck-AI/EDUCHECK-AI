import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUpload,
  FaFilePdf,
  FaFileImage,
  FaFileAlt,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import api from "../services/api";
import toast from "react-hot-toast";

const ExamImport = () => {
  const navigate = useNavigate();
  const inputRef = useRef();
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const getExt = (f) => f?.name.split(".").pop().toLowerCase();

  const getFileIcon = () => {
    if (!file)
      return (
        <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
          <FaFileAlt className="text-stone-400 text-2xl" />
        </div>
      );
    const ext = getExt(file);
    if (ext === "pdf")
      return (
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <FaFilePdf className="text-red-500 text-2xl" />
        </div>
      );
    if (["jpg", "jpeg", "png"].includes(ext))
      return (
        <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
          <FaFileImage className="text-violet-500 text-2xl" />
        </div>
      );
    return (
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <FaFileAlt className="text-blue-500 text-2xl" />
      </div>
    );
  };

  const handleFile = (f) => {
    const allowed = ["pdf", "jpg", "jpeg", "png", "txt"];
    const ext = f.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error("Format non supporté. Utilisez PDF, JPG, PNG ou TXT");
      return;
    }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Sélectionnez un fichier");
      return;
    }
    setLoading(true);
    setLoadingMsg("Analyse OCR et création en base de données...");
    try {
      const result = await api.importExam(file, true);
      const examId = result.exam_created?.id;
      const nbQuestions = result.exam_created?.questions_created ?? 0;
      toast.success(
        `Examen importé avec ${nbQuestions} question${nbQuestions > 1 ? "s" : ""}`,
        { duration: 4000 },
      );
      if (examId) navigate(`/exams/${examId}`);
      else navigate("/exams");
    } catch (err) {
      const detail = err.response?.data?.detail || "Erreur lors de l'import";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-stone-900">
          Importer un examen
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          L'IA extrait et structure les questions automatiquement
        </p>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {" "}
        {loading ? (
          /* ── État chargement ── */
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin mb-5" />
            <p className="text-sm font-semibold text-stone-700 mb-1">
              {loadingMsg}
            </p>
            <p className="text-xs text-stone-400">
              L'OCR peut prendre 15–30 secondes selon la taille du fichier.
            </p>
          </div>
        ) : (
          <>
            {/* ── Drop zone ── */}
            <div
              onClick={() => inputRef.current.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative m-5 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center py-20 px-6 text-center transition-all ${
                dragOver
                  ? "border-blue-400 bg-blue-50"
                  : file
                    ? "border-emerald-300 bg-emerald-50/40"
                    : "border-stone-200 bg-stone-50 hover:border-blue-300 hover:bg-blue-50/30"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.txt"
                onChange={(e) =>
                  e.target.files[0] && handleFile(e.target.files[0])
                }
              />

              {getFileIcon()}

              <p
                className={`text-sm font-semibold mb-1 ${file ? "text-stone-800" : "text-stone-500"}`}
              >
                {file ? file.name : "Cliquez ou glissez votre fichier ici"}
              </p>
              <p className="text-xs text-stone-400">
                {file
                  ? `${(file.size / 1024).toFixed(1)} Ko — prêt à importer`
                  : "PDF scanné, image JPG/PNG, ou fichier texte"}
              </p>

              {/* Format badges */}
              {!file && (
                <div className="flex gap-2 mt-4">
                  {["PDF", "JPG", "PNG", "TXT"].map((f) => (
                    <span
                      key={f}
                      className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-xs font-semibold text-stone-500"
                    >
                      .{f.toLowerCase()}
                    </span>
                  ))}
                </div>
              )}

              {/* File selected indicator */}
              {file && (
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  <FaCheckCircle size={11} /> Fichier sélectionné
                </div>
              )}
            </div>

            {/* ── Info banner ── */}
            <div className="mx-5 mb-5 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <FaCheckCircle className="text-blue-400 text-sm flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                L'examen sera automatiquement analysé par OCR, les questions
                extraites et enregistrées en base de données.
              </p>
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center gap-3 px-5 pb-5">
              <button
                onClick={() => setFile(null)}
                disabled={!file}
                className="flex-1 py-2.5 rounded-xl border-[1.5px] border-stone-200 bg-white text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Réinitialiser
              </button>
              <button
                onClick={handleImport}
                disabled={!file}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-200 disabled:cursor-not-allowed transition-colors"
              >
                <FaUpload size={12} /> Importer l'examen
              </button>
            </div>
          </>
        )}
      </div>

      {/* Back link */}
      <button
        onClick={() => navigate("/exams")}
        className="mt-6 text-xs text-stone-400 hover:text-stone-600 transition-colors"
      >
        ← Retour à mes examens
      </button>
    </div>
  );
};

export default ExamImport;
