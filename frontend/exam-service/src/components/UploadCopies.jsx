import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaUpload, FaFilePdf, FaFileImage, FaTrash, FaArrowLeft, FaUser, FaEnvelope } from "react-icons/fa";
import api from "../services/api";
import toast from "react-hot-toast";

const UploadCopies = () => {
  const { id: examId } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [results, setResults] = useState([]);
  const [fileStudent, setFileStudent] = useState({});
  const [studentEmail, setStudentEmail] = useState({});
  const [students, setStudent] = useState([]);

  useEffect(() => {
  const fetchStudents = async () => {
    try {
      const response = await api.get("/students");
      setStudents(response.data);
    } catch (error) {
      console.error("Erreur chargement étudiants:", error);
    }
  };
  fetchStudents();
}, []);

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
    
    const newStudentMap = {};
    const newEmailMap = {};
    newFiles.forEach((f) => {
      let defaultName = f.name.replace(/\.(pdf|jpg|jpeg|png)$/i, "");
      defaultName = defaultName.replace(/[_\-]/g, " ");
      newStudentMap[f.id] = defaultName;
      newEmailMap[f.id] = "";
    });
    setFileStudent((prev) => ({ ...prev, ...newStudentMap }));
    setStudentEmail((prev) => ({ ...prev, ...newEmailMap }));
  };

  const updateStudentName = (fileId, name) => {
    setFileStudent((prev) => ({ ...prev, [fileId]: name }));
  };

  const updateStudentEmail = (fileId, email) => {
    setStudentEmail((prev) => ({ ...prev, [fileId]: email }));
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setFileStudent((prev) => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
    setStudentEmail((prev) => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
  };

  const uploadAll = async () => {
    if (files.length === 0) {
      toast.error("Aucun fichier sélectionné");
      return;
    }

    const missingNames = files.some(f => !fileStudent[f.id]?.trim());
    if (missingNames) {
      toast.error("Veuillez saisir le nom de l'étudiant pour chaque fichier");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      
      // Ajouter tous les fichiers
      files.forEach((item) => {
        formData.append("files", item.file);
      });
      
      // Ajouter l'ID de l'examen
      formData.append("exam_id", examId);
      
      // Ajouter les noms des étudiants (format JSON)
      const studentNames = files.map(f => fileStudent[f.id]);
      formData.append("student_names", JSON.stringify(studentNames));
      
      // Ajouter les emails des étudiants (format JSON)
      const studentEmails = files.map(f => studentEmail[f.id] || "");
      formData.append("student_emails", JSON.stringify(studentEmails));
      
      // UN SEUL appel API
      const response = await api.post("/copies/batch-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // Mettre à jour les progressions et résultats
      const newResults = [];
      response.data.results.forEach((result, idx) => {
        const fileItem = files[idx];
        
        if (result.status === "success") {
          setProgress(prev => ({
            ...prev,
            [fileItem.id]: {
              status: "success",
              message: "Corrigée !",
              note: result.note,
            },
          }));
          newResults.push({
            filename: result.filename,
            student_name: result.student_name,
            student_email: studentEmail[fileItem.id] || "",
            status: "success",
            note: result.note,
            total: result.total,
            pourcentage: result.pourcentage,
            copie_id: result.copie_id,
          });
          toast.success(`${result.student_name} : ${result.note}/${result.total} pts`);
        } else {
          setProgress(prev => ({
            ...prev,
            [fileItem.id]: { status: "error", message: result.error },
          }));
          newResults.push({
            filename: result.filename,
            student_name: result.student_name,
            status: "error",
            error: result.error,
          });
          toast.error(`Erreur pour ${result.student_name}`);
        }
      });
      
      setResults(newResults);
      
    } catch (error) {
      console.error("Batch upload error:", error);
      toast.error("Erreur lors de l'upload multiple");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>
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
          transition: "all 0.2s",
        }}
        onClick={() => document.getElementById("file-input").click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.style.background = "#eff6ff";
          e.currentTarget.style.borderColor = "#3b82f6";
        }}
        onDragLeave={(e) => {
          e.currentTarget.style.background = "#f8fafc";
          e.currentTarget.style.borderColor = "#cbd5e1";
        }}
      >
        <FaUpload style={{ fontSize: "48px", color: "#94a3b8", marginBottom: "16px" }} />
        <p style={{ margin: "0 0 8px 0" }}>Cliquez ou glissez vos copies ici</p>
        <small style={{ color: "#64748b" }}>Formats : PDF, JPG, PNG — Multi-sélection possible</small>
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
        <div style={{ background: "white", borderRadius: "16px", padding: "20px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ margin: "0 0 16px 0" }}>📄 Fichiers sélectionnés ({files.length})</h3>
          
          {files.map((file, index) => (
            <div key={file.id} style={{ padding: "12px 0", borderBottom: index === files.length - 1 ? "none" : "1px solid #e2e8f0" }}>
              
              {/* Ligne du fichier */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {file.name.endsWith(".pdf") ? <FaFilePdf style={{ color: "#ef4444", fontSize: "20px" }} /> : <FaFileImage style={{ color: "#3b82f6", fontSize: "20px" }} />}
                  <span style={{ fontWeight: "500" }}>{file.name}</span>
                  <small style={{ color: "#64748b" }}>{(file.size / 1024).toFixed(1)} KB</small>
                </div>
                <div>
                  {progress[file.id]?.status === "processing" && (
                    <span style={{ color: "#f59e0b", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="spinner-small"></span> {progress[file.id].message}
                    </span>
                  )}
                  {progress[file.id]?.status === "success" && (
                    <span style={{ color: "#10b981" }}>✅ {progress[file.id].message} ({progress[file.id].note} pts)</span>
                  )}
                  {progress[file.id]?.status === "error" && (
                    <span style={{ color: "#ef4444" }}>❌ {progress[file.id].message}</span>
                  )}
                  {!progress[file.id] && (
                    <button onClick={() => removeFile(file.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px 8px", borderRadius: "6px" }}>
                      <FaTrash /> Supprimer
                    </button>
                  )}
                </div>
              </div>
              
              {/* Champs Nom + Email */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "12px", paddingLeft: "32px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaUser style={{ color: "#64748b" }} />
                  <input
                    type="text"
                    value={fileStudent[file.id] || ""}
                    onChange={(e) => updateStudentName(file.id, e.target.value)}
                    placeholder="Nom de l'étudiant *"
                    disabled={progress[file.id]?.status === "processing"}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      width: "200px",
                      fontSize: "14px",
                    }}
                  />
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaEnvelope style={{ color: "#64748b" }} />
                  <input
                    type="email"
                    value={studentEmail[file.id] || ""}
                    onChange={(e) => updateStudentEmail(file.id, e.target.value)}
                    placeholder="Email (optionnel)"
                    disabled={progress[file.id]?.status === "processing"}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      width: "220px",
                      fontSize: "14px",
                    }}
                  />
                  <small style={{ color: "#64748b", fontSize: "11px" }}>Recevoir notification</small>
                </div>
              </div>
            </div>
          ))}

          {/* Bouton de lancement */}
          <button
            onClick={uploadAll}
            disabled={uploading}
            style={{
              width: "100%",
              marginTop: "24px",
              padding: "14px",
              background: uploading ? "#94a3b8" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: uploading ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "16px",
              transition: "background 0.2s",
            }}
          >
            {uploading ? "⏳ Traitement en cours..." : `🚀 Lancer la correction (${files.length} copie${files.length > 1 ? "s" : ""})`}
          </button>
        </div>
      )}

      {/* Résultats */}
      {results.length > 0 && (
        <div style={{ background: "#f0fdf4", borderRadius: "16px", padding: "20px", border: "1px solid #bbf7d0" }}>
          <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>📊 Résultats de la correction</h3>
          
          <div style={{ display: "flex", gap: "24px", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid #bbf7d0" }}>
            <span style={{ color: "#10b981", fontWeight: "500" }}>✅ {results.filter((r) => r.status === "success").length} corrigée(s)</span>
            <span style={{ color: "#ef4444", fontWeight: "500" }}>❌ {results.filter((r) => r.status === "error").length} erreur(s)</span>
          </div>
          
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
            <thead>
              <tr style={{ background: "#e8f5e9", borderRadius: "8px" }}>
                <th style={{ padding: "10px 8px", textAlign: "left" }}>Étudiant</th>
                <th style={{ padding: "10px 8px", textAlign: "left" }}>Note</th>
                <th style={{ padding: "10px 8px", textAlign: "left" }}>Pourcentage</th>
                <th style={{ padding: "10px 8px", textAlign: "left" }}>Statut</th>
               </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #dcfce7" }}>
                  <td style={{ padding: "10px 8px" }}>{r.student_name}</td>
                  <td style={{ padding: "10px 8px", fontWeight: "500" }}>{r.note || "-"} / {r.total || "-"}</td>
                  <td style={{ padding: "10px 8px" }}>{r.pourcentage ? `${r.pourcentage}%` : "-"}</td>
                  <td style={{ padding: "10px 8px" }}>
                    {r.status === "success" ? (
                      <span style={{ color: "#10b981" }}>✅ Corrigée</span>
                    ) : (
                      <span style={{ color: "#ef4444" }}>❌ {r.error}</span>
                    )}
                  </td>
                 </tr>
              ))}
            </tbody>
           </table>
          
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              onClick={() => {
                setResults([]);
                setFiles([]);
                setProgress({});
                setFileStudent({});
                setStudentEmail({});
              }}
              style={{ padding: "10px 20px", background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "10px", cursor: "pointer" }}
            >
              Nouvel import
            </button>
            <button
              onClick={() => navigate(`/exams/${examId}`)}
              style={{ padding: "10px 20px", background: "#10b981", color: "white", border: "none", borderRadius: "10px", cursor: "pointer" }}
            >
              Voir les détails de l'examen
            </button>
          </div>
        </div>
      )}

      {/* Style pour le spinner */}
      <style>{`
        .spinner-small {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid #f59e0b;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UploadCopies;