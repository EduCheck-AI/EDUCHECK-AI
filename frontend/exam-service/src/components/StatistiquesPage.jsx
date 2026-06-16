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
  Filler,
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
        const copies = await api
          .get(`/copies/exam/${exam.id}`)
          .then((res) => res.data);
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
        moyennesParMatiere[matiere] =
          data.count > 0 ? (data.total / data.count).toFixed(1) : 0;
      }

      const distribution = [0, 0, 0, 0, 0];
      toutesNotes.forEach((n) => {
        if (n < 20) distribution[0]++;
        else if (n < 40) distribution[1]++;
        else if (n < 60) distribution[2]++;
        else if (n < 80) distribution[3]++;
        else distribution[4]++;
      });

      const tauxReussite = toutesNotes.length
        ? (toutesNotes.filter((n) => n >= 50).length / toutesNotes.length) * 100
        : 0;
      const moyenneGenerale = nbNotes ? (sommeNotes / nbNotes).toFixed(1) : 0;

      evolutionNotes.sort((a, b) => a.date - b.date);

      // ✅ GROUPER PAR SEMAINE
      const evolutionParSemaine = {};
      evolutionNotes.forEach((e) => {
        // Obtenir le numéro de la semaine
        const date = new Date(e.date);
        const year = date.getFullYear();
        const firstDayOfYear = new Date(year, 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        const weekNumber = Math.ceil(
          (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7,
        );
        const semaineKey = `${year}-S${String(weekNumber).padStart(2, "0")}`;

        if (!evolutionParSemaine[semaineKey]) {
          evolutionParSemaine[semaineKey] = { total: 0, count: 0, notes: [] };
        }
        evolutionParSemaine[semaineKey].total += e.note;
        evolutionParSemaine[semaineKey].count++;
        evolutionParSemaine[semaineKey].notes.push(e.note);
      });

      // Convertir en tableau et trier par semaine
      const evolutionData = Object.entries(evolutionParSemaine)
        .map(([semaine, data]) => ({
          semaine: semaine,
          moyenne: data.total / data.count,
          count: data.count,
          notes: data.notes,
        }))
        .sort((a, b) => a.semaine.localeCompare(b.semaine));

      // Limiter aux 12 dernières semaines pour plus de lisibilité
      const last12Weeks = evolutionData.slice(-12);

      setStats({
        exams: exams,
        copies: allCopies,
        notesParMatiere: moyennesParMatiere,
        evolutionNotes: last12Weeks,
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
        backgroundColor: "rgba(44, 76, 107, 0.7)",
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
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f1f5f9",
        bodyColor: "#cbd5e1",
      },
    },
    scales: {
      y: {
        grid: { color: "#e2e8f0" },
        title: { display: true, text: "Note /20", font: { weight: "500" } },
      },
      x: { grid: { display: false } },
    },
  };

  const distributionData = {
    labels: ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"],
    datasets: [
      {
        data: stats.distributionNotes,
        backgroundColor: [
          "#ef4444",
          "#f97316",
          "#eab308",
          "#22c55e",
          "#10b981",
        ],
        borderRadius: 8,
      },
    ],
  };

  const distributionOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 12, font: { size: 11 } },
      },
      tooltip: { backgroundColor: "#1e293b" },
    },
  };

  // ✅ CONFIGURATION ÉVOLUTION PAR SEMAINE
  const evolutionDataConfig = {
    labels: stats.evolutionNotes.map((e) => e.semaine),
    datasets: [
      {
        label: "Performance moyenne",
        data: stats.evolutionNotes.map((e) => e.moyenne),
        borderColor: "#2c4c6b",
        backgroundColor: "rgba(44, 76, 107, 0.08)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: "#2c4c6b",
        pointBorderColor: "white",
        borderWidth: 2.5,
      },
      {
        label: "Nombre de copies",
        data: stats.evolutionNotes.map((e) => e.count),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.08)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "white",
        borderWidth: 2,
        yAxisID: "y1",
      },
    ],
  };

  const evolutionOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 12,
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        callbacks: {
          label: function (context) {
            if (context.dataset.label === "Performance moyenne") {
              return `Moyenne: ${context.parsed.y.toFixed(1)}%`;
            } else {
              return `Copies: ${context.parsed.y}`;
            }
          },
        },
      },
    },
    scales: {
      y: {
        title: { display: true, text: "Moyenne (%)" },
        grid: { color: "#e2e8f0" },
        min: 0,
        max: 100,
      },
      y1: {
        position: "right",
        title: { display: true, text: "Nombre de copies" },
        grid: { display: false },
        min: 0,
      },
      x: {
        title: { display: true, text: "Semaine" },
        grid: { display: false },
      },
    },
  };

  const doughnutData = {
    labels: ["Réussite (≥50%)", "Échec (<50%)"],
    datasets: [
      {
        data: [stats.tauxReussite, 100 - stats.tauxReussite],
        backgroundColor: ["#10b981", "#ef4444"],
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 10, font: { size: 11 } },
      },
      tooltip: {
        callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw.toFixed(1)}%` },
      },
    },
  };

  if (loading)
    return <LoadingSpinner message="Chargement des statistiques..." />;

  const kpiData = [
    {
      icon: <FaBook />,
      label: "Examens",
      value: stats.exams.length,
      color: "text-bleu-profond-600",
      bg: "bg-bleu-profond-50",
    },
    {
      icon: <FaCopy />,
      label: "Copies corrigées",
      value: stats.copies.length,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: <FaGraduationCap />,
      label: "Moyenne générale",
      value: `${stats.moyenneGenerale}/20`,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      icon: <FaTrophy />,
      label: "Taux de réussite",
      value: `${stats.tauxReussite.toFixed(1)}%`,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gris-chaud-50 p-6">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-bleu-profond-50 flex items-center justify-center text-bleu-profond-600">
            <FaChartLine size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
              Statistiques avancées
            </h1>
            <p className="text-sm text-stone-500 mt-0.5">
              Analyse des performances et visualisation des données
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiData.map((kpi, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-bleu-profond-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-stone-900">{kpi.value}</p>
                <p className="text-sm text-stone-500 mt-1">{kpi.label}</p>
              </div>
              <div
                className={`w-12 h-12 rounded-2xl ${kpi.bg} flex items-center justify-center text-xl ${kpi.color}`}
              >
                {kpi.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Moyennes par matière */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 hover:border-bleu-profond-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
              <FaBook className="text-bleu-profond-600" />
              Moyennes par matière
            </h3>
            <span className="text-xs bg-stone-100 text-stone-500 px-3 py-1 rounded-full">
              sur 20
            </span>
          </div>
          <div className="h-[220px]">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

        {/* Taux de réussite */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 hover:border-bleu-profond-300 transition-all duration-200">
          <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2 mb-4">
            <FaTrophy className="text-amber-500" />
            Taux de réussite global
          </h3>
          <div className="flex flex-col items-center">
            <div className="w-[200px] h-[200px]">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
            <div className="mt-4 text-center">
              <span
                className={`text-3xl font-bold ${
                  stats.tauxReussite >= 50
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {stats.tauxReussite.toFixed(1)}%
              </span>
              <p className="text-sm text-stone-500 mt-1">de réussite</p>
            </div>
          </div>
        </div>

        {/* Distribution des notes */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 hover:border-bleu-profond-300 transition-all duration-200">
          <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2 mb-4">
            <FaArrowUp className="text-emerald-500" />
            Distribution des notes
          </h3>
          <div className="h-[200px]">
            <Bar data={distributionData} options={distributionOptions} />
          </div>
        </div>

        {/* Évolution des performances par semaine */}
        {stats.evolutionNotes.length > 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-stone-200 hover:border-bleu-profond-300 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <FaChartLine className="text-bleu-profond-600" />
                Évolution hebdomadaire
              </h3>
              <span className="text-xs bg-stone-100 text-stone-500 px-3 py-1 rounded-full">
                {stats.evolutionNotes.length} semaines
              </span>
            </div>
            <div className="h-[200px]">
              <Line data={evolutionDataConfig} options={evolutionOptions} />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-stone-200 flex items-center justify-center min-h-[280px]">
            <div className="text-center">
              <FaChartLine className="text-stone-300 text-4xl mx-auto mb-3" />
              <p className="text-sm text-stone-500">
                Aucune donnée hebdomadaire disponible
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Message si aucune donnée */}
      {stats.exams.length === 0 && (
        <div className="mt-8 bg-white rounded-2xl p-12 text-center border border-dashed border-stone-300">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-stone-50 flex items-center justify-center text-3xl mb-4 border border-stone-200">
              <FaChartLine className="text-stone-300" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 mb-2">
              Aucune donnée disponible
            </h3>
            <p className="text-sm text-stone-500 max-w-md">
              Les statistiques s'afficheront automatiquement une fois que vous
              aurez créé des examens et corrigé des copies.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatistiquesAvancees;
