import axios from "axios";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercepteur pour gérer les erreurs 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Déconnexion
      fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
      });
      window.location.href = "/login";
    } else if (error.response?.status === 404) {
      toast.error("Ressource non trouvée");
    } else if (error.response?.status === 500) {
      toast.error("Erreur serveur");
    }
    return Promise.reject(error);
  },
);

// Fonction pour vérifier si l'utilisateur est connecté
export const checkAuth = async () => {
  try {
    const response = await api.get("/auth/me");
    return response.data;
  } catch (error) {
    console.error("checkAuth error:", error);
    return null;
  }
};

// Fonction de login
export const login = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
};

// Fonction de logout
export const logout = async () => {
  await api.post("/auth/logout");
  localStorage.clear();
  window.location.href = "/login";
};

// ── Examens ──

export const getExams = async () => {
  const response = await api.get("/exams"); // Note: /exam/ prefix
  return response.data;
};

export const getExam = async (id) => {
  const response = await api.get(`/exams/${id}`);
  return response.data;
};

export const createExam = async (examData) => {
  const response = await api.post("/exams", examData);
  return response.data;
};

export const updateExam = async (id, examData) => {
  const response = await api.put(`/exams/${id}`, examData);
  return response.data;
};

export const deleteExam = async (id) => {
  const response = await api.delete(`/exams/${id}`);
  return response.data;
};

export const publishExam = async (id) => {
  const response = await api.put(`/exams/${id}/publish`);
  return response.data;
};

export const importExam = async (file, autoCreate = true) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(
    `/exams/import?auto_create=${autoCreate}`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data;
};

// ── Export PDF ──

export const exportExamPDF = async (id) => {
  const response = await api.get(`/exams/${id}/pdf`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `examen_${id}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── Export contenu brut ──

export const exportExamBrut = async (id) => {
  const response = await api.get(`/exams/${id}/contenu-brut`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `examen_${id}_brut.txt`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── Questions ──

export const getExamQuestions = async (examId) => {
  const response = await api.get(`/exams/${examId}/questions`);
  return response.data;
};

export const createQuestion = async (questionData) => {
  const response = await api.post("/exam/questions", questionData);
  return response.data;
};

export const updateQuestion = async (id, questionData) => {
  const response = await api.put(`/exam/questions/${id}`, questionData);
  return response.data;
};

export const deleteQuestion = async (id) => {
  const response = await api.delete(`/exam/questions/${id}`);
  return response.data;
};

// Attacher les fonctions à l'instance axios
api.getExams = getExams;
api.getExam = getExam;
api.createExam = createExam;
api.updateExam = updateExam;
api.deleteExam = deleteExam;
api.publishExam = publishExam;
api.importExam = importExam;
api.exportExamPDF = exportExamPDF;
api.exportExamBrut = exportExamBrut;
api.getExamQuestions = getExamQuestions;
api.createQuestion = createQuestion;
api.updateQuestion = updateQuestion;
api.deleteQuestion = deleteQuestion;
api.checkAuth = checkAuth;
export default api;
