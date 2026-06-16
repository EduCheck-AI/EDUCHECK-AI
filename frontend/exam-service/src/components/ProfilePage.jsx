import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaEnvelope,
  FaGraduationCap,
  FaEdit,
  FaSave,
  FaTimes,
  FaSchool,
  FaChartLine,
  FaFileAlt,
  FaCheckCircle,
  FaClock,
  FaPhone,
  FaMapMarkerAlt,
  FaGlobe,
  FaShieldAlt,
} from "react-icons/fa";
import LoadingSpinner from "./LoadingSpinner";
import toast from "react-hot-toast";
import api from "../services/api";


const ProfilePage = () => {
  const [user, setUser] = useState({
    id: "", name: "", email: "", role: "", joinedDate: "",
    phone: "", location: "", website: "", bio: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
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
    loadUserData();
    loadStats();
  }, []);

  const loadUserData = () => {
    const data = {
      id: localStorage.getItem("userId") || "N/A",
      name: localStorage.getItem("userName") || "Utilisateur",
      email: localStorage.getItem("userEmail") || "",
      role: localStorage.getItem("userRole") === "teacher" ? "Enseignant" : "Étudiant",
      joinedDate: localStorage.getItem("userJoinedDate") || new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      phone: localStorage.getItem("userPhone") || "",
      location: localStorage.getItem("userLocation") || "",
      website: localStorage.getItem("userWebsite") || "",
      bio: localStorage.getItem("userBio") || "",
    };
    setUser(data);
    setEditForm({ name: data.name, email: data.email, phone: data.phone, location: data.location, website: data.website, bio: data.bio });
  };

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

  const handleSave = () => {
    if (!editForm.name.trim()) { toast.error("Le nom ne peut pas être vide"); return; }
    Object.entries(editForm).forEach(([k, v]) => localStorage.setItem(`user${k.charAt(0).toUpperCase() + k.slice(1)}`, v));
    setUser({ ...user, ...editForm });
    setIsEditing(false);
    toast.success("Profil mis à jour !");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({ name: user.name, email: user.email, phone: user.phone, location: user.location, website: user.website, bio: user.bio });
  };

  const handleChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const initials = user.name.charAt(0).toUpperCase();
  const isTeacher = user.role === "Enseignant";

  const statCards = [
    { icon: <FaFileAlt size={14} />, value: stats.exams.length, label: "Examens", color: "text-blue-500 bg-blue-50" },
    { icon: <FaCheckCircle size={14} />, value: stats.copies.length, label: "Corrigés", color: "text-emerald-500 bg-emerald-50" },
    { icon: <FaClock size={14} />, value:`${stats.moyenneGenerale}/20`, label: "Moyenne Générale", color: "text-amber-500 bg-amber-50" },
    { icon: <FaChartLine size={14} />, value: `${stats.tauxReussite.toFixed(1)}%`, label: "Taux de réussite", color: "text-violet-500 bg-violet-50" },
  ];

  const infoRows = [
    { icon: <FaUser size={12} />, label: "Nom complet", field: "name", type: "text", placeholder: "Votre nom" },
    { icon: <FaEnvelope size={12} />, label: "Email", field: "email", type: "email", placeholder: "votre@email.com" },
    { icon: <FaPhone size={12} />, label: "Téléphone", field: "phone", type: "tel", placeholder: "+212 6 00 00 00 00" },
    { icon: <FaMapMarkerAlt size={12} />, label: "Localisation", field: "location", type: "text", placeholder: "Ville, Pays" },
    { icon: <FaGlobe size={12} />, label: "Site web", field: "website", type: "url", placeholder: "https://..." },
  ];

  const activities = [
    { icon: <FaCheckCircle size={12} />, color: "text-emerald-500 bg-emerald-50", title: "Dernière correction effectuée", date: "Aujourd'hui, 14:30" },
    { icon: <FaFileAlt size={12} />, color: "text-blue-500 bg-blue-50", title: "Nouvel examen créé", date: "Hier, 10:15" },
    { icon: <FaGraduationCap size={12} />, color: "text-violet-500 bg-violet-50", title: "Examen publié", date: "Il y a 2 jours" },
  ];

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {/* Banner */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {initials}
              </div>
              <div className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] ${isTeacher ? "bg-violet-500" : "bg-emerald-500"}`}>
                {isTeacher ? <FaGraduationCap size={10} /> : <FaSchool size={10} />}
              </div>
            </div>

            {/* Info */}
            <div>
              <h1 className="text-xl font-bold text-stone-900">{user.name}</h1>
              <p className="text-sm text-stone-500 mt-0.5">{user.role}</p>
              <p className="text-xs text-stone-400 mt-0.5">Membre depuis {user.joinedDate}</p>
            </div>

            {/* Edit btn desktop */}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 bg-white text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <FaEdit size={12} /> Modifier
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200 px-4 py-4 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-lg font-bold text-stone-900 leading-none">{s.value}</p>
                <p className="text-xs text-stone-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Infos personnelles */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <h2 className="text-sm font-semibold text-stone-800">Informations personnelles</h2>
            </div>

            <div className="divide-y divide-stone-100">
              {infoRows.map((row) => (
                <div key={row.field} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="flex items-center gap-2 w-36 flex-shrink-0">
                    <span className="text-stone-400">{row.icon}</span>
                    <span className="text-xs text-stone-500">{row.label}</span>
                  </div>
                  {isEditing ? (
                    <input
                      type={row.type}
                      name={row.field}
                      value={editForm[row.field]}
                      onChange={handleChange}
                      placeholder={row.placeholder}
                      className="flex-1 px-3 py-1.5 text-sm border-[1.5px] border-stone-200 rounded-lg outline-none bg-stone-50 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-stone-300"
                    />
                  ) : (
                    <span className="text-sm text-stone-700">
                      {row.field === "website" && user[row.field] ? (
                        <a href={user[row.field]} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {user[row.field]}
                        </a>
                      ) : (
                        user[row.field] || <span className="text-stone-300">Non renseigné</span>
                      )}
                    </span>
                  )}
                </div>
              ))}

              {/* Bio */}
              <div className="flex gap-4 px-6 py-4">
                <div className="flex items-start gap-2 w-36 flex-shrink-0 pt-0.5">
                  <span className="text-stone-400"><FaUser size={12} /></span>
                  <span className="text-xs text-stone-500">Bio</span>
                </div>
                {isEditing ? (
                  <textarea
                    name="bio"
                    value={editForm.bio}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Parlez-nous un peu de vous..."
                    className="flex-1 px-3 py-2 text-sm border-[1.5px] border-stone-200 rounded-lg outline-none bg-stone-50 resize-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-stone-300"
                  />
                ) : (
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {user.bio || <span className="text-stone-300">Aucune biographie pour le moment.</span>}
                  </p>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-2 px-6 py-4 border-t border-stone-100 bg-stone-50">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  <FaSave size={12} /> Enregistrer
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
                >
                  <FaTimes size={12} /> Annuler
                </button>
              </div>
            )}
          </div>

          {/* Colonne droite */}
          <div className="flex flex-col gap-4">
            {/* Activité */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-100">
                <h2 className="text-sm font-semibold text-stone-800">Activité récente</h2>
              </div>
              <div className="divide-y divide-stone-100">
                {activities.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>
                      {a.icon}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-stone-700">{a.title}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{a.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sécurité */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-100">
                <h2 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                  <FaShieldAlt size={12} className="text-stone-400" /> Sécurité
                </h2>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-stone-500 mb-3">
                  Gardez votre compte sécurisé en mettant régulièrement à jour votre mot de passe.
                </p>
                <button className="w-full py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                  Changer le mot de passe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;