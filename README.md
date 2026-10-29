# 🎓 EduCheck AI

<div align="center">

### Smarter Exam Correction. Better Learning Experiences.

**An AI-powered web and mobile platform for automated exam assessment.**

[![React](https://img.shields.io/badge/React-2025?style=for-the-badge&logo=react&logoColor=61DAFB&color=191B35)](https://react.dev/)
[![React Native](https://img.shields.io/badge/React_Native-Mobile-F6A6C8?style=for-the-badge&logo=react&logoColor=white)](https://reactnative.dev/)
[![Python](https://img.shields.io/badge/Python-Backend-C4B5FD?style=for-the-badge&logo=python&logoColor=191B35)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Microservices-191B35?style=for-the-badge&logo=fastapi&logoColor=F6A6C8)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-C4B5FD?style=for-the-badge&logo=postgresql&logoColor=191B35)](https://www.postgresql.org/)

*Built with passion, designed for education. 💗*

</div>

---

## 💡 About the Project

Correcting exams takes time. Evaluating open-ended answers consistently can be challenging, and students often have to wait to understand their mistakes.

**EduCheck AI** explores a smarter approach to academic assessment by combining document processing, artificial intelligence, and automated grading in one platform.

Developed as a **Final Year Project (PFE)** during the 2025–2026 academic year in the *Application Development (DAI)* program, EduCheck AI brings together a web interface for teachers and a mobile application for students.

Its main idea is simple: **automate the correction process while giving students more meaningful feedback on their answers.**

## ✨ What Can EduCheck AI Do?

<table>
<tr>
<td width="50%" valign="top">

### 👩‍🏫 For Teachers

- 🔐 Secure authentication and role management
- 📝 Create, edit, publish, and manage exams
- 📄 Import exam documents and scanned copies
- 🤖 Automatically correct submitted answers
- ✍️ Review and adjust AI-generated corrections
- 📊 Explore grades and class performance statistics
- 📥 Export results in PDF, CSV, and JSON formats where supported

</td>
<td width="50%" valign="top">

### 🎓 For Students

- 🔑 Sign in to the mobile application
- 📱 Submit copies using a camera, gallery, or PDF
- 📈 View grades, percentages, and mentions
- 💬 Access question-by-question feedback
- 🗂️ Review previous exam results
- 📧 Receive email notifications after correction

</td>
</tr>
</table>

## 🧠 Three Ways to Correct an Exam

EduCheck AI adapts the evaluation method to the type of question instead of treating every answer the same way.

<details>
<summary><b>🌸 1. Multiple-choice questions (QCM)</b></summary>

Answers are evaluated by comparing the selected answer indexes with the expected answers.

</details>

<details>
<summary><b>💜 2. Open-ended questions</b></summary>

Sentence-BERT is used to evaluate semantic similarity between a student's answer and the expected answer, helping assess meaning rather than relying only on exact word matching.

</details>

<details>
<summary><b>🔷 3. Mathematical questions</b></summary>

SymPy supports symbolic mathematical evaluation, allowing the system to assess mathematical expressions according to the implemented correction logic.

</details>

### 📷 From a scanned copy to useful feedback

The correction workflow starts with a document and ends with a detailed assessment.

1. The teacher uploads a scanned or photographed copy.
2. The OCR service extracts the text, using Groq Vision by default or Tesseract as an option.
3. The AI Gateway routes the questions and extracted answers to the appropriate correction services.
4. The QCM, NLP, and Math services evaluate the answers.
5. The Results Service aggregates the scores, percentage, and mention.
6. The correction is stored in PostgreSQL.
7. The Notification Service emails the student with their result and a link to the detailed feedback.

## 🏗️ Microservices Architecture

EduCheck AI follows a **microservices architecture** built around nine independent FastAPI backend services. Each service has a specific responsibility, making the application easier to organize and maintain.

<div align="center">
  <img src="docs/images/architecture.png" alt="Architecture microservices d'EduCheck AI" width="800"/>
</div>

### 🔌 Backend Services

| Service | Port | Responsibility |
|---|---:|---|
| Auth Service | `8000` | Authentication and user management |
| Exam Service | `8002` | Exams, questions, and submitted copies |
| OCR Service | `8003` | Text extraction from scanned documents |
| Notification Service | `8004` | Email notifications |
| QCM Service | `8010` | Multiple-choice grading |
| NLP Service | `8011` | Semantic evaluation using Sentence-BERT |
| Math Service | `8012` | Mathematical evaluation using SymPy |
| Results Service | `8013` | Score aggregation and feedback details |
| AI Gateway | `8014` | Orchestration of the correction pipeline |

## 🛠️ Tech Stack

<div align="center">

| Category | Technologies |
|---|---|
| 🌐 Web Frontend | React.js, Tailwind CSS, Chart.js, Axios, React Router |
| 📱 Mobile | React Native |
| ⚙️ Backend | Python, FastAPI, Pydantic, httpx, SQLAlchemy |
| 🧠 AI & NLP | Sentence-BERT, Groq API, LLaMA 4 Scout |
| 📷 OCR | Groq Vision, Tesseract (optional) |
| ➗ Mathematical Evaluation | SymPy |
| 🗄️ Database | PostgreSQL |
| 📄 PDF Export | ReportLab |
| 📧 Notifications | SMTP, Gmail |
| 🔒 Security | bcrypt password hashing, cookie- and header-based authentication |
| 🔧 Development Tools | Git, GitHub, Postman, pgAdmin, VS Code |

</div>

## 🗃️ Data Model

The main PostgreSQL tables support user management, exam configuration, submissions, and detailed grading.

| Table | Purpose |
|---|---|
| `users` | User accounts, credentials, and roles |
| `exams` | Exam details, subjects, status, and total points |
| `questions` | Question text, type, order, and expected answers |
| `copies` | Student submissions, answers, and final grades |
| `correction_details` | Points, correctness, similarity scores, and feedback |

The database uses the `public` and `exam` schemas, with indexes on key fields such as email, exam ID, and copy ID.

## 🚀 Getting Started

### Prerequisites

- Python 3.10 or later
- Node.js 18 or later
- PostgreSQL
- A Groq API key for the configured AI and vision integrations
- Gmail application credentials for email notifications
- Tesseract, if using the optional local OCR engine

### 1. Clone the repository

Replace the placeholder with the actual Git repository URL.

```bash
git clone EDUCHECK-AI
cd EDUCHECK-AI
```

### 2. Configure the environment

Create the environment variables required by your services. For example:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/educheck
GROQ_API_KEY=your_groq_api_key
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

Use the actual variable names expected by your source code. Keep credentials in local environment files and **never commit real API keys or passwords to GitHub**.

### 3. Set up the database

Create the PostgreSQL database and the schemas required by the application. The project uses `public` and `exam`; verify the SQL scripts in your repository for the complete table definitions.

### 4. Start the backend services

Install the dependencies and start each service according to its own configuration. For FastAPI services, the general command pattern is:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port <PORT>
```

The entry-point filename and dependency file may differ between services. Replace the placeholders with the actual values for each service.

### 5. Start the web frontend

From the web frontend directory:

```bash
npm install
npm start
```

### 6. Start the mobile application

Follow the React Native setup instructions for the mobile project, including its required Android or iOS development environment.

> **Note:** These are general setup steps. Confirm directory names, environment variables, and startup scripts against the actual repository before using them as a complete installation guide.

## 🎯 What Makes EduCheck AI Interesting?

- **Multiple correction methods:** one platform for QCM, open-ended questions, and mathematical exercises.
- **AI-assisted assessment:** combines semantic analysis, symbolic computation, and OCR.
- **Modular design:** nine backend services with dedicated responsibilities.
- **Two user experiences:** a web interface for teachers and a mobile application for students.
- **Actionable feedback:** presents detailed results instead of only a final grade.
- **Educational focus:** designed around the exam correction and feedback workflow.

## 🔮 Future Improvements

Potential directions for further development include:

- Improving the accuracy and consistency of AI-assisted grading.
- Expanding supported question formats and document types.
- Enhancing evaluation transparency and feedback quality.
- Extending performance monitoring and testing across microservices.

These are possible future directions, not claims about existing functionality.

## 👥 Team & Academic Context

**Developed by:**

- **Soukaina AOUDANE**
- **Houssam EN-NAHLY**

**Academic supervisor:** Pr. A. ELKHOUMRI

**Program:** BTS — Application Development (DAI)  
**Academic year:** 2025–2026  
**Project:** Final Year Project (PFE)

## 💗 A Final Note

EduCheck AI was built around a simple idea: technology should help educators spend less time on repetitive correction and give students a clearer understanding of their results.

This project brought together web development, mobile development, microservices, document processing, and AI-assisted assessment in one educational application.

<div align="center">

**Made with dedication by Soukaina & Houssam** 🎓

*From code to smarter assessment.*

</div>
