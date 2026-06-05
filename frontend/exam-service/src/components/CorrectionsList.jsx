import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaFileAlt,
  FaCheckCircle,
  FaClock,
  FaSearch,
  FaEye,
  FaEdit,
  FaDownload,
  FaChartLine,
  FaUpload,
} from "react-icons/fa";
import api from "../services/api";
import LoadingSpinner from "./LoadingSpinner";
import toast from "react-hot-toast";

const CorrectionsList = () => {
  const [copies, setCopies] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Récupérer tous les examens
      const examsData = await api.getExams();
      console.log("Examens trouvés:", examsData);
      setExams(examsData);

      // Récupérer toutes les copies
      let allCopies = [];
      for (const exam of examsData) {
        try {
          const res = await api.get(`/copies/exam/${exam.id}`);
          console.log(`Copies pour examen ${exam.id}:`, res.data);
          const copiesWithExam = res.data.map((c) => ({
            ...c,
            exam_title: exam.titre,
            exam_matiere: exam.matiere,
            exam_points: exam.points_totaux,
            exam_id: exam.id,
          }));
          allCopies = [...allCopies, ...copiesWithExam];
        } catch (e) {
          console.log(`Aucune copie pour l'examen ${exam.id}`);
        }
      }
      console.log("Total copies:", allCopies);
      setCopies(allCopies);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCopies = () => {
    let filtered = [...copies];

    // Filtre par examen
    if (selectedExam !== "all") {
      filtered = filtered.filter((c) => c.exam_id === parseInt(selectedExam));
    }

    // Filtre par statut
    if (filterStatus === "corrigees") {
      filtered = filtered.filter(
        (c) => c.note !== null && c.note !== undefined,
      );
    } else if (filterStatus === "en-attente") {
      filtered = filtered.filter(
        (c) => c.note === null || c.note === undefined,
      );
    }

    // Recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.exam_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.student_id?.toString().includes(searchTerm),
      );
    }

    return filtered;
  };

  const getStats = () => {
    const filtered = getFilteredCopies();
    const total = filtered.length;
    const corrigees = filtered.filter(
      (c) => c.note !== null && c.note !== undefined,
    ).length;
    const enAttente = total - corrigees;
    const moyenne =
      corrigees > 0
        ? (
            filtered.reduce((sum, c) => sum + (parseFloat(c.note) || 0), 0) /
            corrigees
          ).toFixed(1)
        : 0;

    return { total, corrigees, enAttente, moyenne };
  };

  const exportClassResults = async (examId, examTitle) => {
    try {
      const response = await api.get(`/exams/${examId}/export/class/csv`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `resultats_${examTitle}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export CSV réussi");
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'export");
    }
  };

  const stats = getStats();
  const filteredCopies = getFilteredCopies();

  if (loading) return <LoadingSpinner message="Chargement des copies..." />;

  return (
    <div
      className="corrections-container"
      style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}
    >
      {/* En-tête */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>
          Gestion des corrections
        </h1>
        <p style={{ color: "#64748b" }}>
          Consultez et corrigez les copies soumises par les étudiants
        </p>
      </div>

      {/* Cartes statistiques */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        <div
          className="stat-card"
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              color: "#3b82f6",
            }}
          >
            <FaFileAlt />
          </div>
          <div>
            <span
              style={{ fontSize: "28px", fontWeight: "bold", display: "block" }}
            >
              {stats.total}
            </span>
            <span style={{ color: "#64748b" }}>Total copies</span>
          </div>
        </div>
        <div
          className="stat-card clickable"
          onClick={() => setFilterStatus("corrigees")}
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#ecfdf5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              color: "#10b981",
            }}
          >
            <FaCheckCircle />
          </div>
          <div>
            <span
              style={{ fontSize: "28px", fontWeight: "bold", display: "block" }}
            >
              {stats.corrigees}
            </span>
            <span style={{ color: "#64748b" }}>Corrigées</span>
          </div>
        </div>
        <div
          className="stat-card clickable"
          onClick={() => setFilterStatus("en-attente")}
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#fffbeb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              color: "#f59e0b",
            }}
          >
            <FaClock />
          </div>
          <div>
            <span
              style={{ fontSize: "28px", fontWeight: "bold", display: "block" }}
            >
              {stats.enAttente}
            </span>
            <span style={{ color: "#64748b" }}>En attente</span>
          </div>
        </div>
        <div
          className="stat-card"
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#f3e8ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              color: "#9333ea",
            }}
          >
            <FaChartLine />
          </div>
          <div>
            <span
              style={{ fontSize: "28px", fontWeight: "bold", display: "block" }}
            >
              {stats.moyenne}/20
            </span>
            <span style={{ color: "#64748b" }}>Moyenne classe</span>
          </div>
        </div>
      </div>

      {/* Barre de filtres */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "16px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 16px",
            background: "#f8fafc",
            borderRadius: "40px",
            border: "1px solid #e2e8f0",
          }}
        >
          <FaSearch style={{ color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Rechercher par examen ou étudiant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              background: "none",
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            style={{
              padding: "8px 16px",
              borderRadius: "40px",
              border: "1px solid #e2e8f0",
              background: "white",
            }}
          >
            <option value="all">Tous les examens</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.titre} ({exam.matiere})
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setFilterStatus("all")}
              style={{
                padding: "8px 16px",
                borderRadius: "40px",
                border: "1px solid #e2e8f0",
                background: filterStatus === "all" ? "#3b82f6" : "white",
                color: filterStatus === "all" ? "white" : "#1e293b",
                cursor: "pointer",
              }}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilterStatus("corrigees")}
              style={{
                padding: "8px 16px",
                borderRadius: "40px",
                border: "1px solid #e2e8f0",
                background: filterStatus === "corrigees" ? "#10b981" : "white",
                color: filterStatus === "corrigees" ? "white" : "#1e293b",
                cursor: "pointer",
              }}
            >
              Corrigées
            </button>
            <button
              onClick={() => setFilterStatus("en-attente")}
              style={{
                padding: "8px 16px",
                borderRadius: "40px",
                border: "1px solid #e2e8f0",
                background: filterStatus === "en-attente" ? "#f59e0b" : "white",
                color: filterStatus === "en-attente" ? "white" : "#1e293b",
                cursor: "pointer",
              }}
            >
              En attente
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des copies */}
      {filteredCopies.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            background: "white",
            borderRadius: "16px",
          }}
        >
          <div style={{ fontSize: "24px", marginBottom: "16px" }}>□</div>
          <h3>Aucune copie trouvée</h3>
          <p style={{ color: "#64748b" }}>
            Aucune copie ne correspond à vos critères.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            overflowX: "auto",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "16px", textAlign: "left" }}>ID</th>
                <th style={{ padding: "16px", textAlign: "left" }}>Examen</th>
                <th style={{ padding: "16px", textAlign: "left" }}>Matière</th>
                <th style={{ padding: "16px", textAlign: "left" }}>Étudiant</th>
                <th style={{ padding: "16px", textAlign: "left" }}>Date</th>
                <th style={{ padding: "16px", textAlign: "left" }}>Note</th>
                <th style={{ padding: "16px", textAlign: "left" }}>Statut</th>
                <th style={{ padding: "16px", textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCopies.map((copie) => (
                <tr
                  key={copie.id}
                  style={{ borderBottom: "1px solid #e2e8f0" }}
                >
                  <td style={{ padding: "16px" }}>#{copie.id}</td>
                  <td style={{ padding: "16px" }}>{copie.exam_title}</td>
                  <td style={{ padding: "16px" }}>
                    {copie.exam_matiere || "-"}
                  </td>
                  <td style={{ padding: "16px" }}>#{copie.student_id}</td>
                  <td style={{ padding: "16px" }}>
                    {new Date(copie.date_soumission).toLocaleDateString()}
                  </td>
                  <td
                    style={{
                      padding: "16px",
                      fontWeight: "bold",
                      color: copie.note ? "#3b82f6" : "#94a3b8",
                    }}
                  >
                    {copie.note ? `${copie.note}/${copie.exam_points}` : "-"}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        background: copie.note ? "#d1fae5" : "#fef3c7",
                        color: copie.note ? "#10b981" : "#d97706",
                      }}
                    >
                      {copie.note ? "Corrigée" : "En attente"}
                    </span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Link
                        to={`/corrections/${copie.id}`}
                        state={{
                          copie: copie,
                          exam_id: copie.exam_id,
                          exam_title: copie.exam_title,
                          student_answer: copie.reponses || "aucune reponse",
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          background: "#eff6ff",
                          color: "#3b82f6",
                          textDecoration: "none",
                          fontSize: "12px",
                        }}
                      >
                        {copie.note ? <FaEye /> : <FaEdit />}
                        {copie.note ? "Voir" : "Corriger"}
                      </Link>
                      
                      <button
                        onClick={() =>
                          exportClassResults(copie.exam_id, copie.exam_title)
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          background: "#f1f5f9",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        <FaDownload /> Export
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bouton pour importer des copies - Avec sélection d'examen */}
      <div style={{ marginTop: "32px" }}>
        <h3 style={{ marginBottom: "16px", fontSize: "18px" }}>
          Importer des copies
        </h3>
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {exams.map((exam) => (
            <Link
              key={exam.id}
              to={`/exams/${exam.id}/upload`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: "#3b82f6",
                color: "white",
                textDecoration: "none",
                borderRadius: "10px",
                fontSize: "14px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#2563eb";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#3b82f6";
              }}
            >
              <FaUpload />{" "}
              {exam.titre.length > 30
                ? exam.titre.slice(0, 30) + "..."
                : exam.titre}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CorrectionsList;
