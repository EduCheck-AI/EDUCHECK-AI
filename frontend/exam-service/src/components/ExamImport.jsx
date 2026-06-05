import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUpload,
  FaFilePdf,
  FaFileImage,
  FaFileAlt,
  FaCheckCircle,
} from "react-icons/fa";
import api from "../services/api";
import toast from "react-hot-toast";
import "../styles/ExamImport.css";

const ExamImport = () => {
  const navigate = useNavigate();
  const inputRef = useRef();
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const getExt = (f) => f?.name.split(".").pop().toLowerCase();

  const getFileIcon = () => {
    if (!file) return <FaFileAlt className="drop-zone-icon default" />;
    const ext = getExt(file);
    if (ext === "pdf") return <FaFilePdf className="drop-zone-icon pdf" />;
    if (["jpg", "jpeg", "png"].includes(ext))
      return <FaFileImage className="drop-zone-icon image" />;
    return <FaFileAlt className="drop-zone-icon txt" />;
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

  // Import direct → auto_create=true → inséré en DB immédiatement
  const handleImport = async () => {
    if (!file) {
      toast.error("Sélectionnez un fichier");
      return;
    }

    setLoading(true);
    setLoadingMsg("Analyse OCR et création en base de données...");
    try {
      // auto_create=true par défaut dans api.importExam
      const result = await api.importExam(file, true);

      const examId = result.exam_created?.id;
      const nbQuestions = result.exam_created?.questions_created ?? 0;

      toast.success(
        `Examen importé avec ${nbQuestions} question${nbQuestions > 1 ? "s" : ""}`,
        { duration: 4000 },
      );

      // Rediriger vers les détails de l'examen créé
      if (examId) {
        navigate(`/exams/${examId}`);
      } else {
        navigate("/exams");
      }
    } catch (err) {
      const detail = err.response?.data?.detail || "Erreur lors de l'import";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="exam-import fade-in">
      <h1>Importer un examen</h1>

      <div className="import-card">
        {loading ? (
          <div className="import-loading">
            <div className="spinner" />
            <p>{loadingMsg}</p>
            <p className="import-loading-hint">
              L'OCR peut prendre 15–30 secondes selon la taille du fichier.
            </p>
          </div>
        ) : (
          <>
            {/* Drop zone */}
            <div
              className={`drop-zone ${dragOver ? "drag-over" : ""} ${file ? "has-file" : ""}`}
              onClick={() => inputRef.current.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                type="file"
                className="file-input"
                accept=".pdf,.jpg,.jpeg,.png,.txt"
                onChange={(e) =>
                  e.target.files[0] && handleFile(e.target.files[0])
                }
              />
              {getFileIcon()}
              <p className="drop-zone-text">
                {file ? file.name : "Cliquez ou glissez votre fichier ici"}
              </p>
              <p className="drop-zone-hint">
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB — prêt à importer`
                  : "PDF scanné, image JPG/PNG, ou fichier texte"}
              </p>
              {!file && (
                <div className="format-badges">
                  {["PDF", "JPG", "PNG", "TXT"].map((f) => (
                    <span key={f} className="format-badge">
                      .{f.toLowerCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="import-info">
              <FaCheckCircle className="import-info-icon" />
              <p>
                L'examen sera automatiquement analysé par OCR, les questions
                extraites et enregistrées en base de données.
              </p>
            </div>

            {/* Actions */}
            <div className="import-actions">
              <button
                onClick={() => {
                  setFile(null);
                }}
                disabled={!file}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={!file}
                className="btn btn-primary"
              >
                <FaUpload /> Importer l'examen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExamImport;
