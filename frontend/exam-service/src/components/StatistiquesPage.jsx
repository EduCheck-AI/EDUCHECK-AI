import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import api from "../services/api";
import LoadingSpinner from "./LoadingSpinner";
import {
  FaBook,
  FaCopy,
  FaChartLine,
  FaGraduationCap,
  FaTrophy,
  FaArrowUp,
} from "react-icons/fa";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

const StatistiquesAvancees = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    exams: [],
    copies: [],
    notesParMatiere: {},
    evolutionNotes: [],
    distributionNotes: [],
    tauxReussite: 0,
    moyenneGenerale: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const exams = await api.getExams();
      let allCopies = [];
      let notesParMatiere = {};
      let evolutionNotes = [];
      let toutesNotes = [];
      let sommeNotes = 0;
      let nbNotes = 0;

      for (const exam of exams) {
        const copies = await api.get(`/copies/exam/${exam.id}`).then(res => res.data);
        allCopies = [...allCopies, ...copies];

        const matiere = exam.matiere || "Autre";
        if (!notesParMatiere[matiere]) {
          notesParMatiere[matiere] = { total: 0, count: 0, notes: [] };
        }

        for (const copy of copies) {
          if (copy.note) {
            const note = parseFloat(copy.note);
            const total = parseFloat(exam.points_totaux);
            const pourcentage = (note / total) * 100;
            
            notesParMatiere[matiere].total += note;
            notesParMatiere[matiere].count++;
            notesParMatiere[matiere].notes.push(pourcentage);
            toutesNotes.push(pourcentage);
            sommeNotes += note;
            nbNotes++;

            evolutionNotes.push({
              date: new Date(copy.date_soumission),
              note: pourcentage,
              matiere: matiere,
            });
          }
        }
      }

      const moyennesParMatiere = {};
      for (const [matiere, data] of Object.entries(notesParMatiere)) {
        moyennesParMatiere[matiere] = data.count > 0 ? (data.total / data.count).toFixed(1) : 0;
      }

      const distribution = [0, 0, 0, 0, 0];
      toutesNotes.forEach(n => {
        if (n < 20) distribution[0]++;
        else if (n < 40) distribution[1]++;
        else if (n < 60) distribution[2]++;
        else if (n < 80) distribution[3]++;
        else distribution[4]++;
      });

      const tauxReussite = toutesNotes.length ? (toutesNotes.filter(n => n >= 50).length / toutesNotes.length * 100) : 0;
      const moyenneGenerale = nbNotes ? (sommeNotes / nbNotes).toFixed(1) : 0;

      evolutionNotes.sort((a, b) => a.date - b.date);
      const evolutionParJour = {};
      evolutionNotes.forEach(e => {
        const jour = e.date.toISOString().split('T')[0];
        if (!evolutionParJour[jour]) {
          evolutionParJour[jour] = { total: 0, count: 0 };
        }
        evolutionParJour[jour].total += e.note;
        evolutionParJour[jour].count++;
      });
      
      const evolutionData = Object.entries(evolutionParJour).map(([date, data]) => ({
        date: date.slice(5),
        moyenne: data.total / data.count,
      }));

      setStats({
        exams: exams,
        copies: allCopies,
        notesParMatiere: moyennesParMatiere,
        evolutionNotes: evolutionData,
        distributionNotes: distribution,
        tauxReussite: tauxReussite,
        moyenneGenerale: moyenneGenerale,
      });
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const barChartData = {
    labels: Object.keys(stats.notesParMatiere),
    datasets: [
      {
        label: "Moyenne (/20)",
        data: Object.values(stats.notesParMatiere),
        backgroundColor: "rgba(99, 102, 241, 0.7)",
        borderRadius: 8,
        barPercentage: 0.65,
        categoryPercentage: 0.8,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#1e293b", titleColor: "#f1f5f9", bodyColor: "#cbd5e1" },
    },
    scales: {
      y: { grid: { color: "#e2e8f0" }, title: { display: true, text: "Note /20", font: { weight: "500" } } },
      x: { grid: { display: false } },
    },
  };

  const distributionData = {
    labels: ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"],
    datasets: [
      {
        data: stats.distributionNotes,
        backgroundColor: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"],
        borderRadius: 8,
      },
    ],
  };

  const distributionOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { backgroundColor: "#1e293b" } },
  };

  const evolutionDataConfig = {
    labels: stats.evolutionNotes.map(e => e.date),
    datasets: [
      {
        label: "Performance moyenne",
        data: stats.evolutionNotes.map(e => e.moyenne),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.08)",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: "#6366f1",
        pointBorderColor: "white",
        borderWidth: 2.5,
      },
    ],
  };

  const evolutionOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { position: "top", labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { backgroundColor: "#1e293b" } },
    scales: { y: { title: { display: true, text: "Moyenne (%)" }, grid: { color: "#e2e8f0" } }, x: { title: { display: true, text: "Date" }, grid: { display: false } } },
  };

  const doughnutData = {
    labels: ["Réussite (≥50%)", "Échec (<50%)"],
    datasets: [
      {
        data: [stats.tauxReussite, 100 - stats.tauxReussite],
        backgroundColor: ["#22c55e", "#ef4444"],
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: "65%",
    plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw.toFixed(1)}%` } } },
  };

  if (loading) return <LoadingSpinner message="Chargement des statistiques..." />;

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px" }}>
      
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: "600", marginBottom: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
          <FaChartLine style={{ color: "#6366f1" }} /> Statistiques avancées
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px" }}>Analyse des performances et visualisation des données</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
        {[
          { icon: <FaBook />, label: "Examens", value: stats.exams.length, color: "#6366f1", bg: "#eef2ff" },
          { icon: <FaCopy />, label: "Copies corrigées", value: stats.copies.length, color: "#10b981", bg: "#ecfdf5" },
          { icon: <FaGraduationCap />, label: "Moyenne générale", value: `${stats.moyenneGenerale}/20`, color: "#f59e0b", bg: "#fffbeb" },
          { icon: <FaTrophy />, label: "Taux de réussite", value: `${stats.tauxReussite.toFixed(1)}%`, color: "#ef4444", bg: "#fef2f2" },
        ].map((kpi, i) => (
          <div key={i} style={{ background: "white", borderRadius: "20px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f0f1f3" }}>
            <div>
              <div style={{ fontSize: "26px", fontWeight: "700", color: "#0f172a" }}>{kpi.value}</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>{kpi.label}</div>
            </div>
            <div style={{ width: "44px", height: "44px", borderRadius: "24px", background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: kpi.color }}>{kpi.icon}</div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
        
        {/* Moyennes par matière */}
        <div style={{ background: "white", borderRadius: "20px", padding: "18px", border: "1px solid #f0f1f3" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}><FaBook style={{ color: "#6366f1" }} /> Moyennes par matière</h3>
            <span style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 10px", borderRadius: "20px", color: "#475569" }}>sur 20</span>
          </div>
          <Bar data={barChartData} options={barChartOptions} height={200} />
        </div>

        {/* Taux de réussite */}
        <div style={{ background: "white", borderRadius: "20px", padding: "18px", border: "1px solid #f0f1f3" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}><FaTrophy style={{ color: "#f59e0b" }} /> Taux de réussite global</h3>
          <div style={{ width: "220px", margin: "0 auto" }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
            <div style={{ textAlign: "center", marginTop: "12px" }}>
              <span style={{ fontSize: "26px", fontWeight: "700", color: stats.tauxReussite >= 50 ? "#22c55e" : "#ef4444" }}>{stats.tauxReussite.toFixed(1)}%</span>
              <p style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>de réussite</p>
            </div>
          </div>
        </div>

        {/* Distribution des notes */}
        <div style={{ background: "white", borderRadius: "20px", padding: "18px", border: "1px solid #f0f1f3" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}><FaArrowUp style={{ color: "#10b981" }} /> Distribution des notes</h3>
          <Bar data={distributionData} options={distributionOptions} height={180} />
        </div>

        {/* Évolution des performances */}
        {stats.evolutionNotes.length > 0 && (
          <div style={{ background: "white", borderRadius: "20px", padding: "18px", border: "1px solid #f0f1f3" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}><FaChartLine style={{ color: "#6366f1" }} /> Évolution des performances</h3>
            <Line data={evolutionDataConfig} options={evolutionOptions} height={180} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatistiquesAvancees;