import React, { useState, useEffect } from "react";
import { 
  FaUser, 
  FaEnvelope, 
  FaGraduationCap, 
  FaCalendar, 
  FaEdit, 
  FaSave, 
  FaTimes,
  FaSchool,
  FaChartLine,
  FaFileAlt,
  FaCheckCircle,
  FaClock,
  FaUserCircle,
  FaPhone,
  FaMapMarkerAlt,
  FaGlobe,
  FaShieldAlt
} from "react-icons/fa";
import "../styles/ProfilePage.css"
import toast from "react-hot-toast";

const ProfilePage = () => {
  const [user, setUser] = useState({
    id: "",
    name: "",
    email: "",
    role: "",
    joinedDate: "",
    phone: "",
    location: "",
    website: "",
    bio: ""
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [stats, setStats] = useState({
    totalExams: 0,
    totalCorrections: 0,
    completedExams: 0,
    pendingExams: 0,
    averageScore: 0
  });

  useEffect(() => {
    loadUserData();
    loadStats();
  }, []);

  const loadUserData = () => {
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName");
    const userRole = localStorage.getItem("userRole");
    const userEmail = localStorage.getItem("userEmail");
    const userPhone = localStorage.getItem("userPhone");
    const userLocation = localStorage.getItem("userLocation");
    const userWebsite = localStorage.getItem("userWebsite");
    const userBio = localStorage.getItem("userBio");
    
    setUser({
      id: userId || "N/A",
      name: userName || "Utilisateur",
      email: userEmail || "non-renseigné@example.com",
      role: userRole === "teacher" ? "Enseignant" : "Étudiant",
      joinedDate: localStorage.getItem("userJoinedDate") || new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      phone: userPhone || "",
      location: userLocation || "",
      website: userWebsite || "",
      bio: userBio || ""
    });
    
    setEditForm({
      name: userName || "Utilisateur",
      email: userEmail || "",
      phone: userPhone || "",
      location: userLocation || "",
      website: userWebsite || "",
      bio: userBio || ""
    });
  };

  const loadStats = async () => {
    try {
      // Simulation de stats - à remplacer par vos vrais appels API
      const exams = JSON.parse(localStorage.getItem("exams") || "[]");
      const corrections = JSON.parse(localStorage.getItem("corrections") || "[]");
      
      setStats({
        totalExams: exams.length,
        totalCorrections: corrections.length,
        completedExams: corrections.filter(c => c.status === "completed").length,
        pendingExams: corrections.filter(c => c.status === "pending").length,
        averageScore: 14.5
      });
    } catch (error) {
      console.error("Erreur chargement stats:", error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      website: user.website,
      bio: user.bio
    });
  };

  const handleSave = () => {
    if (editForm.name.trim()) {
      localStorage.setItem("userName", editForm.name);
      localStorage.setItem("userEmail", editForm.email);
      localStorage.setItem("userPhone", editForm.phone);
      localStorage.setItem("userLocation", editForm.location);
      localStorage.setItem("userWebsite", editForm.website);
      localStorage.setItem("userBio", editForm.bio);
      
      setUser({
        ...user,
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        location: editForm.location,
        website: editForm.website,
        bio: editForm.bio
      });
      
      setIsEditing(false);
      toast.success("Profil mis à jour avec succès !");
    } else {
      toast.error("Le nom ne peut pas être vide");
    }
  };

  const handleChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  const getRoleIcon = () => {
    return user.role === "Enseignant" ? <FaGraduationCap /> : <FaSchool />;
  };

  const getRoleColor = () => {
    return user.role === "Enseignant" ? "var(--primary)" : "var(--success)";
  };

  const getInitials = () => {
    return user.name.charAt(0).toUpperCase();
  };

  return (
    <div className="profile-container fade-in">
      {/* En-tête avec bannière */}
      <div className="profile-banner">
        <div className="profile-banner-content">
          <div className="profile-avatar-large">
            <div className="avatar-large-circle">
              {getInitials()}
            </div>
            <div className="avatar-badge" style={{ backgroundColor: getRoleColor() }}>
              {getRoleIcon()}
            </div>
          </div>
          <div className="profile-banner-info">
            <h1>{user.name}</h1>
            <p className="profile-role">{user.role}</p>
            <p className="profile-member-since">Membre depuis {user.joinedDate}</p>
          </div>
        </div>
      </div>

      <div className="profile-content">
        {/* Statistiques */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <FaFileAlt />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalExams}</span>
              <span className="stat-label">Examens</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <FaCheckCircle />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.completedExams}</span>
              <span className="stat-label">Corrigés</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">
              <FaClock />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.pendingExams}</span>
              <span className="stat-label">En attente</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <FaChartLine />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.averageScore}/20</span>
              <span className="stat-label">Moyenne</span>
            </div>
          </div>
        </div>

        <div className="profile-two-columns">
          {/* Informations personnelles */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h2>
                <FaUserCircle className="header-icon" />
                Informations personnelles
              </h2>
              {!isEditing && (
                <button onClick={handleEdit} className="edit-btn">
                  <FaEdit /> Modifier
                </button>
              )}
            </div>

            <div className="profile-info">
              <div className="info-group">
                <div className="info-row">
                  <div className="info-label">
                    <FaUser className="info-icon" />
                    <span>Nom complet</span>
                  </div>
                  <div className="info-value">
                    {isEditing ? (
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleChange}
                        className="profile-input"
                      />
                    ) : (
                      <span>{user.name}</span>
                    )}
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-label">
                    <FaEnvelope className="info-icon" />
                    <span>Email</span>
                  </div>
                  <div className="info-value">
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleChange}
                        className="profile-input"
                        placeholder="votre@email.com"
                      />
                    ) : (
                      <span>{user.email}</span>
                    )}
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-label">
                    <FaPhone className="info-icon" />
                    <span>Téléphone</span>
                  </div>
                  <div className="info-value">
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={editForm.phone}
                        onChange={handleChange}
                        className="profile-input"
                        placeholder="+33 6 12 34 56 78"
                      />
                    ) : (
                      <span>{user.phone || "Non renseigné"}</span>
                    )}
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-label">
                    <FaMapMarkerAlt className="info-icon" />
                    <span>Localisation</span>
                  </div>
                  <div className="info-value">
                    {isEditing ? (
                      <input
                        type="text"
                        name="location"
                        value={editForm.location}
                        onChange={handleChange}
                        className="profile-input"
                        placeholder="Ville, Pays"
                      />
                    ) : (
                      <span>{user.location || "Non renseigné"}</span>
                    )}
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-label">
                    <FaGlobe className="info-icon" />
                    <span>Site web</span>
                  </div>
                  <div className="info-value">
                    {isEditing ? (
                      <input
                        type="url"
                        name="website"
                        value={editForm.website}
                        onChange={handleChange}
                        className="profile-input"
                        placeholder="https://..."
                      />
                    ) : (
                      user.website ? (
                        <a href={user.website} target="_blank" rel="noopener noreferrer">
                          {user.website}
                        </a>
                      ) : (
                        <span>Non renseigné</span>
                      )
                    )}
                  </div>
                </div>

                <div className="info-row bio-row">
                  <div className="info-label">
                    <FaUserCircle className="info-icon" />
                    <span>Bio</span>
                  </div>
                  <div className="info-value">
                    {isEditing ? (
                      <textarea
                        name="bio"
                        value={editForm.bio}
                        onChange={handleChange}
                        className="profile-textarea"
                        rows="4"
                        placeholder="Parlez-nous un peu de vous..."
                      />
                    ) : (
                      <p className="profile-bio">{user.bio || "Aucune biographie pour le moment."}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="profile-actions">
                <button onClick={handleSave} className="profile-btn save">
                  <FaSave /> Enregistrer
                </button>
                <button onClick={handleCancel} className="profile-btn cancel">
                  <FaTimes /> Annuler
                </button>
              </div>
            )}
          </div>

          {/* Activité récente */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h2>
                <FaChartLine className="header-icon" />
                Activité récente
              </h2>
            </div>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon green">
                  <FaCheckCircle />
                </div>
                <div className="activity-details">
                  <p className="activity-title">Dernière correction effectuée</p>
                  <p className="activity-date">Aujourd'hui, 14:30</p>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon blue">
                  <FaFileAlt />
                </div>
                <div className="activity-details">
                  <p className="activity-title">Nouvel examen créé</p>
                  <p className="activity-date">Hier, 10:15</p>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon purple">
                  <FaGraduationCap />
                </div>
                <div className="activity-details">
                  <p className="activity-title">Examen publié</p>
                  <p className="activity-date">Il y a 2 jours</p>
                </div>
              </div>
            </div>

            <div className="profile-security">
              <h3>
                <FaShieldAlt className="security-icon" />
                Sécurité
              </h3>
              <button className="security-btn">
                Changer le mot de passe
              </button>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
};

export default ProfilePage;