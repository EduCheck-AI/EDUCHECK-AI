import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  School
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthPage() {
    const navigate = useNavigate(); // 👈 ICI (dans le composant)

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // État du formulaire
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'teacher' // 'teacher' ou 'student'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  // Fonction pour valider la taille du mot de passe (max 72 bytes)
  const validatePassword = (password) => {
    // Calculer la taille en bytes UTF-8
    const byteLength = new TextEncoder().encode(password).length;
    
    if (byteLength > 72) {
      setError(`Le mot de passe est trop long (${byteLength} bytes). Maximum: 72 bytes.`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
     navigate("/dashbord");

    // Valider la taille du mot de passe avant l'envoi
    if (!validatePassword(formData.password)) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = isLogin
        ? "http://127.0.0.1:8000/auth/login"
        : "http://127.0.0.1:8000/auth/register";

      const bodyData = isLogin
        ? {
            email: formData.email,
            password: formData.password
          }
        : {
            full_name: formData.fullName,
            email: formData.email,
            password: formData.password,
            role: formData.role
          };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();

     if (response.ok) {
  const userName = data.user.full_name || data.user.name;

  localStorage.setItem("userName", userName);

  navigate("/dashbord");
}
      else {
        // Gestion des erreurs Pydantic (tableau d'objets)
        if (Array.isArray(data.detail)) {
          const errorMessages = data.detail
            .map(err => `${err.loc[err.loc.length - 1]}: ${err.msg}`)
            .join(", ");
          setError(errorMessages);
        } else {
          setError(data.detail || "Erreur serveur");
        }
      }
    } catch (err) {
      setError("Impossible de contacter le serveur");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      
      {/* Section Gauche : Visuel & Branding (Masqué sur mobile) */}
      <div className="hidden lg:flex w-1/2 bg-blue-600 relative overflow-hidden items-center justify-center">
        {/* Cercles décoratifs d'arrière-plan */}
        <div className="absolute w-[800px] h-[800px] bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -top-20 -left-20 animate-pulse"></div>
        <div className="absolute w-[600px] h-[600px] bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 bottom-20 right-20 animate-pulse delay-700"></div>
        
        <div className="relative z-10 text-white p-12 max-w-xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 font-bold text-2xl shadow-lg">E</div>
            <h1 className="text-4xl font-bold tracking-tight">EduCheck AI</h1>
          </div>
          <h2 className="text-3xl font-semibold mb-6">
            {isLogin ? "Ravi de vous revoir !" : "Rejoignez l'avenir de l'éducation"}
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed mb-8">
            {isLogin 
              ? "Accédez à votre tableau de bord pour corriger vos examens en un temps record grâce à notre IA avancée." 
              : "Créez un compte pour commencer à automatiser la correction de vos copies et obtenir des analyses détaillées."}
          </p>
          
          {/* Carte de témoignage simulée */}
          <div className="bg-blue-700/50 backdrop-blur-sm p-6 rounded-2xl border border-blue-500/30">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center">
                <span className="font-bold">JD</span>
              </div>
              <div>
                <p className="font-semibold">Prof Khomri</p>
                <p className="text-xs text-blue-200">Professeur de programmation python</p>
              </div>
            </div>
            <p className="italic text-sm text-blue-100">"EduCheck a réduit mon temps de correction de 70%. Je peux enfin me concentrer sur l'accompagnement de mes étudiants."</p>
          </div>
        </div>
      </div>

      {/* Section Droite : Formulaire */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          
          {/* En-tête Mobile (Visible uniquement sur petits écrans) */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl text-white font-bold text-2xl mb-4">E</div>
            <h2 className="text-2xl font-bold text-gray-900">EduCheck AI</h2>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              {isLogin ? "Connexion" : "Créer un compte"}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isLogin ? "Entrez vos identifiants pour accéder à votre espace." : "Remplissez le formulaire pour commencer."}
            </p>
          </div>

          {/* Gestion des erreurs / succès */}
          <AnimatePresence mode='wait'>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm"
              >
                <CheckCircle size={16} />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              
              {/* Champ Nom Complet (Inscription uniquement) */}
              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User size={18} className="text-gray-400" />
                      </div>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required={!isLogin}
                        className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Ex: Marie Curie"
                        value={formData.fullName}
                        onChange={handleChange}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Champ Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="nom@exemple.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Champ Mot de passe */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mot de passe</label>
                  {isLogin && (
                    <div className="text-sm">
                      <button
                        type="button"
                        onClick={() => alert("Fonctionnalité à venir")}
                        className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition-colors"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum 72 caractères
                </p>
              </div>

              {/* Sélection du Rôle (Inscription uniquement) */}
              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden pt-2"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2">Je suis un(e) :</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, role: 'teacher'})}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                          formData.role === 'teacher' 
                            ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' 
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <GraduationCap size={18} />
                        <span className="text-sm font-medium">Enseignant</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, role: 'student'})}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                          formData.role === 'student' 
                            ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' 
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <School size={18} />
                        <span className="text-sm font-medium">Étudiant</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <ArrowRight className="h-5 w-5 text-blue-500 group-hover:text-blue-400 transition-colors" />
                </span>
              )}
              {isLoading ? "Traitement..." : (isLogin ? "Se connecter" : "S'inscrire")}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                }}
                className="ml-2 font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition-colors"
              >
                {isLogin ? "Inscrivez-vous gratuitement" : "Connectez-vous"}
              </button>
            </p>
          </div>

          {/* Séparateur Social Login */}
          <div className="relative mt-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Ou continuer avec</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button 
              type="button"
              className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <span className="sr-only">Google</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
            </button>
            <button 
              type="button"
              className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <span className="sr-only">Microsoft</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}