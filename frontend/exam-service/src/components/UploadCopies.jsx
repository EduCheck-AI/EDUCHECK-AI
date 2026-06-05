import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaUpload,
  FaFilePdf,
  FaFileImage,
  FaTrash,
  FaCheckCircle,
  FaArrowLeft,
} from "react-icons/fa";
import api from "../services/api";
import toast from "react-hot-toast";

const UploadCopies = () => {
  const { id: examId } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [results, setResults] = useState([]);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    const newFiles = selected.map((file) => ({
      file,
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadAll = async () => {
    if (files.length === 0) {
      toast.error("Aucun fichier sélectionné");
      return;
    }

    setUploading(true);
    const newResults = [];

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      setProgress((prev) => ({
        ...prev,
        [item.id]: { status: "processing", message: "OCR en cours..." },
      }));

      try {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("exam_id", examId);
        formData.append("student_id", 1); // À améliorer

        const response = await api.post(
          "/copies/upload-et-corriger",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );

        setProgress((prev) => ({
          ...prev,
          [item.id]: {
            status: "success",
            message: "Corrigée !",
            note: response.data.note,
          },
        }));
        newResults.push({
          filename: item.name,
          status: "success",
          note: response.data.note,
          total: response.data.total,
          copie_id: response.data.copie_id,
        });

        toast.success(
          `${item.name} : ${response.data.note}/${response.data.total} pts`,
        );
      } catch (error) {
        console.error(error);
        setProgress((prev) => ({
          ...prev,
          [item.id]: { status: "error", message: "Erreur" },
        }));
        newResults.push({
          filename: item.name,
          status: "error",
          error: error.message,
        });
        toast.error(`Erreur pour ${item.name}`);
      }
    }

    setResults(newResults);
    setUploading(false);
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px" }}>
      {/* En-tête */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          <FaArrowLeft />
        </button>
        <h1 style={{ margin: 0 }}>Importer des copies</h1>
      </div>

      {/* Zone de drop */}
      <div
        style={{
          border: "2px dashed #cbd5e1",
          borderRadius: "16px",
          padding: "40px",
          textAlign: "center",
          background: "#f8fafc",
          marginBottom: "24px",
          cursor: "pointer",
        }}
        onClick={() => document.getElementById("file-input").click()}
      >
        <FaUpload
          style={{ fontSize: "48px", color: "#94a3b8", marginBottom: "16px" }}
        />
        <p>Cliquez ou glissez vos copies ici</p>
        <small style={{ color: "#64748b" }}>Formats : PDF, JPG, PNG</small>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </div>

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0" }}>
            Fichiers sélectionnés ({files.length})
          </h3>
          {files.map((file) => (
            <div
              key={file.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                {file.name.endsWith(".pdf") ? (
                  <FaFilePdf style={{ color: "#ef4444" }} />
                ) : (
                  <FaFileImage style={{ color: "#3b82f6" }} />
                )}
                <span>{file.name}</span>
                <small style={{ color: "#64748b" }}>
                  {(file.size / 1024).toFixed(1)} KB
                </small>
              </div>
              <div>
                {progress[file.id]?.status === "processing" && (
                  <span style={{ color: "#f59e0b" }}>
                    {progress[file.id].message}
                  </span>
                )}
                {progress[file.id]?.status === "success" && (
                  <span style={{ color: "#10b981" }}>
                    {progress[file.id].message} ({progress[file.id].note} pts)
                  </span>
                )}
                {progress[file.id]?.status === "error" && (
                  <span style={{ color: "#ef4444" }}>
                    {progress[file.id].message}
                  </span>
                )}
                {!progress[file.id] && (
                  <button
                    onClick={() => removeFile(file.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#ef4444",
                    }}
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={uploadAll}
            disabled={uploading}
            style={{
              width: "100%",
              marginTop: "16px",
              padding: "12px",
              background: uploading ? "#94a3b8" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: uploading ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {uploading
              ? "Traitement en cours..."
              : `Lancer la correction (${files.length} copies)`}
          </button>
        </div>
      )}

      {/* Résultats */}
      {results.length > 0 && (
        <div
          style={{
            background: "#f0fdf4",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid #bbf7d0",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0" }}>Résultats</h3>
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
            <span style={{ color: "#10b981" }}>
              {results.filter((r) => r.status === "success").length} corrigées
            </span>
            <span style={{ color: "#ef4444" }}>
              {results.filter((r) => r.status === "error").length} erreurs
            </span>
          </div>
          <button
            onClick={() => navigate(`/exams/${examId}`)}
            style={{
              padding: "10px 20px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            Voir les détails de l'examen
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadCopies;
