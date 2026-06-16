const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, PageBreak, LevelFormat, BorderStyle,
  WidthType, PageNumber, NumberFormat, TabStopType
} = require('docx');
const fs = require('fs');

const BLUE = "1F4E79";
const ACCENT = "2E75B6";
const GRAY = "595959";
const LIGHT_GRAY = "F2F2F2";

const styles = {
  default: {
    document: { run: { font: "Times New Roman", size: 24, color: "000000" } }
  },
  paragraphStyles: [
    {
      id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 32, bold: true, font: "Times New Roman", color: BLUE },
      paragraph: {
        spacing: { before: 480, after: 240 },
        outlineLevel: 0,
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 4 } }
      }
    },
    {
      id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 28, bold: true, font: "Times New Roman", color: ACCENT },
      paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 1 }
    },
    {
      id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 24, bold: true, font: "Times New Roman", color: GRAY },
      paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 }
    },
    {
      id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 24, bold: true, italics: true, font: "Times New Roman", color: GRAY },
      paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 3 }
    },
  ]
};

const numbering = {
  config: [
    {
      reference: "bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } }
      }]
    },
    {
      reference: "subbullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "-", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
      }]
    }
  ]
};

const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const h3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const h4 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun(t)] });

const p = (text, opts = {}) => new Paragraph({
  alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
  spacing: { after: 160, line: 360 },
  children: [new TextRun({ text, font: "Times New Roman", size: 24, ...opts })]
});

const pc = (text, opts = {}) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 160 },
  children: [new TextRun({ text, font: "Times New Roman", size: 24, ...opts })]
});

const sp = (n = 1) => new Paragraph({ spacing: { after: n * 240 }, children: [new TextRun("")] });
const br = () => new Paragraph({ children: [new PageBreak()] });

const bullet = (text, boldPart, rest) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 120, line: 360 },
  children: boldPart
    ? [new TextRun({ text: boldPart, bold: true, font: "Times New Roman", size: 24 }),
       new TextRun({ text: rest || "", font: "Times New Roman", size: 24 })]
    : [new TextRun({ text, font: "Times New Roman", size: 24 })]
});

const subbullet = (text) => new Paragraph({
  numbering: { reference: "subbullets", level: 0 },
  spacing: { after: 80, line: 360 },
  children: [new TextRun({ text, font: "Times New Roman", size: 22 })]
});

const chapterCover = (num, title) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 2000, after: 400 },
  border: {
    top: { style: BorderStyle.DOUBLE, size: 8, color: BLUE },
    bottom: { style: BorderStyle.DOUBLE, size: 8, color: BLUE },
    left: { style: BorderStyle.DOUBLE, size: 8, color: BLUE },
    right: { style: BorderStyle.DOUBLE, size: 8, color: BLUE }
  },
  children: [
    new TextRun({ text: num, size: 56, bold: true, color: BLUE, font: "Times New Roman", break: 1 }),
    new TextRun({ text: title, size: 32, italics: true, color: ACCENT, font: "Times New Roman", break: 1 }),
    new TextRun({ text: " ", break: 1 }),
  ]
});

const doc = new Document({
  styles,
  numbering,
  sections: [
    // PAGE DE GARDE
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 }
        }
      },
      children: [
        sp(2),
        pc("Royaume du Maroc", { bold: true, size: 22 }),
        pc("Établissement de Formation en Développement d'Applications Informatiques", { size: 20, color: GRAY }),
        sp(2),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 12, color: BLUE },
            bottom: { style: BorderStyle.SINGLE, size: 12, color: BLUE }
          },
          children: [
            new TextRun({ text: "RAPPORT DE PROJET DE FIN D'ÉTUDES", size: 44, bold: true, color: BLUE, font: "Times New Roman", break: 1 }),
            new TextRun({ text: "Filière : Développement d'Applications Informatiques", size: 24, color: GRAY, font: "Times New Roman", break: 1, italics: true }),
          ]
        }),
        sp(2),
        pc("EduCheck AI", { size: 56, bold: true, color: BLUE }),
        pc("Plateforme Web & Mobile Intelligente de Correction Automatique d'Examens", { size: 26, italics: true, color: ACCENT }),
        sp(),
        pc("par Intelligence Artificielle", { size: 26, italics: true, color: ACCENT }),
        sp(3),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [
            new TextRun({ text: "Réalisé par :", bold: true, size: 24, font: "Times New Roman" }),
          ]
        }),
        pc("Soukaina AOUDANE  &  Houssam NAHLI", { bold: true, size: 28, color: BLUE }),
        sp(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "Encadrant : Pr. El KHOUMRI", size: 24, font: "Times New Roman", color: GRAY })]
        }),
        sp(3),
        pc("Année Universitaire 2025 - 2026", { bold: true, size: 24 }),
        br()
      ]
    },
    // DÉDICACE
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } },
      children: [
        h1("Dédicace"),
        sp(),
        pc("~ À nos familles ~", { italics: true, size: 28, color: ACCENT }),
        sp(),
        p("Nous dédions ce travail à nos familles respectives, pour leur soutien indéfectible, leur patience et leurs encouragements tout au long de notre parcours académique. Leur confiance et leur amour ont été des sources essentielles de motivation et de persévérance."),
        sp(),
        p("Nous dédions également ce travail à nos professeurs et encadrants, en particulier Pr. El KHOUMRI, qui a guidé nos pas tout au long de la réalisation de ce projet avec bienveillance et expertise."),
        sp(),
        p("À nos amis et proches dont la présence bienveillante nous a accompagnés à chaque étape de ce projet, nous exprimons toute notre reconnaissance et notre affection."),
        sp(),
        p("Que ce modeste travail soit le reflet de toute l'énergie positive qui nous a portés jusqu'à son accomplissement, et qu'il constitue un humble témoignage de notre gratitude envers tous ceux qui ont cru en nous."),
        sp(2),
        pc("Soukaina & Houssam", { italics: true, bold: true, color: BLUE }),
        br()
      ]
    },
    // REMERCIEMENTS
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } },
      children: [
        h1("Remerciements"),
        sp(),
        p("Nous souhaitons exprimer notre profonde reconnaissance à toutes les personnes qui ont contribué, de près ou de loin, à la réalisation de ce projet de fin d'études."),
        sp(),
        p("Nos remerciements les plus sincères vont en premier lieu à notre encadrant Pr. El KHOUMRI, pour son accompagnement éclairé, sa disponibilité constante, ses conseils avisés et sa rigueur scientifique qui ont grandement enrichi notre démarche et amélioré la qualité de ce travail."),
        sp(),
        p("Nous remercions également l'ensemble du corps pédagogique et administratif de notre établissement pour la qualité de la formation dispensée tout au long de nos années d'études, et pour l'environnement intellectuel propice à l'apprentissage et à l'innovation qu'ils ont su créer."),
        sp(),
        p("Nous exprimons notre profonde gratitude envers nos familles respectives, dont le soutien moral et matériel indéfectible nous a permis de mener à bien ce projet ambitieux. Leur confiance en nos capacités a été une source inestimable de motivation."),
        sp(),
        p("Nous remercions aussi nos camarades de promotion pour les échanges enrichissants, les moments de collaboration et le soutien mutuel tout au long de cette formation."),
        sp(),
        p("Enfin, nous tenons à exprimer notre gratitude envers les équipes de développement des technologies open-source sur lesquelles repose notre projet : FastAPI, React, PostgreSQL, Groq, et toutes les bibliothèques utilisées, dont la documentation a été une aide précieuse."),
        br()
      ]
    },
    // RÉSUMÉ
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } },
      children: [
        h1("Résumé"),
        sp(),
        p("À l'ère du numérique et de l'intelligence artificielle, le secteur de l'éducation connaît une transformation profonde. La correction manuelle des examens représente une charge de travail considérable pour les enseignants, sujette à la fatigue et à la subjectivité, avec des délais souvent importants pour la communication des résultats aux étudiants."),
        sp(),
        p("Ce projet de fin d'études présente EduCheck AI, une plateforme web et mobile intelligente de correction automatique d'examens par intelligence artificielle. La solution repose sur une architecture microservices composée de huit services FastAPI indépendants, une interface web React dédiée aux enseignants et une application mobile pour les étudiants."),
        sp(),
        p("Le système intègre un pipeline IA complet : un service OCR basé sur Groq Vision pour la lecture des copies scannées, un service NLP exploitant les modèles LLaMA 4 via Groq pour la correction des questions ouvertes, un service mathématique pour les calculs, et un service dédié aux QCM. Un AI Gateway orchestre l'ensemble de ces services et agrège les résultats pour produire une note finale accompagnée d'un feedback personnalisé."),
        sp(),
        p("Les tests réalisés démontrent une précision de 100% pour les QCM, 75% pour les questions de calcul et 65% pour les questions ouvertes, avec un gain de temps estimé à plus de 70% par rapport à la correction manuelle traditionnelle."),
        sp(),
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: "Mots clés : ", bold: true, font: "Times New Roman", size: 24 }),
            new TextRun({ text: "Intelligence Artificielle, Microservices, FastAPI, React, OCR, LLaMA 4, Correction automatique, PostgreSQL, NLP.", font: "Times New Roman", size: 24 })
          ]
        }),
        sp(2),
        h1("Abstract"),
        sp(),
        p("In the era of digital technology and artificial intelligence, the education sector is undergoing a profound transformation. Manual exam grading represents a considerable workload for teachers, subject to fatigue and subjectivity, with often lengthy delays in communicating results to students."),
        sp(),
        p("This final-year project presents EduCheck AI, an intelligent web and mobile platform for automatic exam correction using artificial intelligence. The solution is built on a microservices architecture consisting of eight independent FastAPI services, a React web interface dedicated to teachers, and a mobile application for students."),
        sp(),
        p("The system integrates a complete AI pipeline: an OCR service based on Groq Vision for reading scanned papers, an NLP service leveraging LLaMA 4 models via Groq for correcting open-ended questions, a mathematical service for calculations, and a dedicated MCQ service. An AI Gateway orchestrates all these services and aggregates results to produce a final grade with personalized feedback."),
        sp(),
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: "Keywords: ", bold: true, font: "Times New Roman", size: 24 }),
            new TextRun({ text: "Artificial Intelligence, Microservices, FastAPI, React, OCR, LLaMA 4, Automatic Grading, PostgreSQL, NLP.", font: "Times New Roman", size: 24 })
          ]
        }),
        br()
      ]
    },
    // TABLE DES MATIÈRES
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } },
      children: [
        h1("Table des matières"),
        sp(),
        ...[
          ["Dédicace", "2", false],
          ["Remerciements", "3", false],
          ["Résumé / Abstract", "4", false],
          ["Table des matières", "5", false],
          ["Liste des abréviations", "6", false],
          ["Introduction Générale", "7", false],
          ["Chapitre 1 : Contexte général du projet", "9", true],
          ["   Introduction", "10", false],
          ["   1. Contexte et Objectifs", "10", false],
          ["   2. Problématique", "11", false],
          ["   3. Solution proposée — EduCheck AI", "12", false],
          ["   4. Fonctionnalités du site web et mobile", "13", false],
          ["   5. Étude de l'existant", "15", false],
          ["   Conclusion", "16", false],
          ["Chapitre 2 : Conception et Modélisation", "17", true],
          ["   Introduction", "18", false],
          ["   1. Méthodologies adoptées", "18", false],
          ["   2. Gestion de projet", "19", false],
          ["   3. Conception UML", "20", false],
          ["   4. Modélisation des données", "25", false],
          ["   Conclusion", "27", false],
          ["Chapitre 3 : Architecture Technique et Implémentation", "28", true],
          ["   Introduction", "29", false],
          ["   1. Architecture microservices", "29", false],
          ["   2. Stack technologique", "31", false],
          ["   3. Détail des services", "33", false],
          ["   4. Authentification et sécurité", "37", false],
          ["   Conclusion", "38", false],
          ["Chapitre 4 : Présentation des interfaces", "39", true],
          ["   Introduction", "40", false],
          ["   1. Interface d'authentification", "40", false],
          ["   2. Interface enseignant (web)", "41", false],
          ["   3. Gestion des examens et questions", "43", false],
          ["   4. Correction automatique", "45", false],
          ["   5. Statistiques et exports", "47", false],
          ["   6. Application mobile étudiant", "48", false],
          ["   Conclusion", "49", false],
          ["Chapitre 5 : Tests et Assurance Qualité", "50", true],
          ["   Introduction", "51", false],
          ["   1. Tests des API avec Postman", "51", false],
          ["   2. Tests de précision de l'IA", "54", false],
          ["   3. Tests de performance", "55", false],
          ["   Conclusion", "56", false],
          ["Conclusion Générale", "57", false],
          ["Webographie", "59", false],
        ].map(([title, page, isBold]) => new Paragraph({
          spacing: { after: 80 },
          tabStops: [{ type: TabStopType.RIGHT, position: 9026 }],
          children: [
            new TextRun({ text: title, size: title.startsWith("   ") ? 20 : 22, bold: isBold || !title.startsWith("   "), font: "Times New Roman" }),
            new TextRun({ text: `\t${page}`, size: 20, font: "Times New Roman" })
          ]
        })),
        br()
      ]
    },
    // ABRÉVIATIONS
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } },
      children: [
        h1("Liste des abréviations"),
        sp(),
        ...[
          ["AI / IA", "Artificial Intelligence / Intelligence Artificielle"],
          ["API", "Application Programming Interface"],
          ["CSS", "Cascading Style Sheets"],
          ["CORS", "Cross-Origin Resource Sharing"],
          ["DB", "Database / Base de données"],
          ["HTTP", "HyperText Transfer Protocol"],
          ["HTML", "HyperText Markup Language"],
          ["JSON", "JavaScript Object Notation"],
          ["JWT", "JSON Web Token"],
          ["LLM", "Large Language Model / Grand modèle de langage"],
          ["MCD", "Modèle Conceptuel de Données"],
          ["MLD", "Modèle Logique de Données"],
          ["NLP", "Natural Language Processing / Traitement du Langage Naturel"],
          ["OCR", "Optical Character Recognition / Reconnaissance Optique de Caractères"],
          ["ORM", "Object-Relational Mapping"],
          ["PFE", "Projet de Fin d'Études"],
          ["QCM", "Questionnaire à Choix Multiple"],
          ["REST", "Representational State Transfer"],
          ["SQL", "Structured Query Language"],
          ["UML", "Unified Modeling Language"],
          ["URL", "Uniform Resource Locator"],
        ].map(([abbr, def]) => new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: `${abbr} : `, bold: true, font: "Times New Roman", size: 24 }),
            new TextRun({ text: def, font: "Times New Roman", size: 24 })
          ]
        })),
        br()
      ]
    },
    // INTRODUCTION GÉNÉRALE
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } },
      children: [
        h1("Introduction Générale"),
        sp(),
        p("L'éducation constitue le pilier fondamental du développement intellectuel et social de toute nation. Dans un monde en constante mutation technologique, les établissements d'enseignement font face à des défis croissants pour maintenir la qualité de l'évaluation des apprenants tout en gérant des volumes de travail toujours plus importants."),
        sp(),
        p("La correction d'examens représente l'une des tâches les plus chronophages dans le quotidien des enseignants. Un professeur en charge de plusieurs classes peut consacrer plusieurs dizaines d'heures par semaine à la seule correction de copies, au détriment du temps qu'il pourrait consacrer à la préparation de ses cours, à l'innovation pédagogique ou à l'accompagnement personnalisé de ses étudiants."),
        sp(),
        p("Les avancées récentes dans le domaine de l'intelligence artificielle, notamment en traitement du langage naturel (NLP), en reconnaissance optique de caractères (OCR) et en modèles de langage de grande taille (LLM), ouvrent des perspectives révolutionnaires pour l'automatisation de ce processus. Des modèles comme LLaMA 4, accessibles via des APIs performantes telles que Groq, permettent désormais d'évaluer automatiquement des réponses textuelles avec une précision remarquable."),
        sp(),
        p("C'est dans ce contexte que s'inscrit notre projet de fin d'études : EduCheck AI, une plateforme web et mobile intelligente de correction automatique d'examens. Notre ambition est de proposer aux enseignants un outil complet, intuitif et performant qui automatise la correction de trois types de questions : les questions à choix multiples (QCM), les questions ouvertes nécessitant une évaluation sémantique, et les questions de calcul nécessitant une vérification mathématique."),
        sp(),
        p("La solution repose sur une architecture microservices moderne, garantissant la scalabilité et la maintenabilité du système. Une interface web React dédiée aux enseignants leur permet de créer des examens, d'importer des copies et d'obtenir des corrections détaillées avec feedback. Une application mobile pour les étudiants complète l'écosystème en leur permettant de consulter leurs résultats et de soumettre leurs copies directement depuis leur smartphone."),
        sp(),
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: "Ce rapport est organisé en cinq chapitres :", bold: true, font: "Times New Roman", size: 24 })]
        }),
        bullet(null, "Chapitre 1 : ", "présente le contexte général du projet, la problématique identifiée, les objectifs visés et une étude comparative des solutions existantes."),
        bullet(null, "Chapitre 2 : ", "décrit la conception et la modélisation du système à travers des diagrammes UML et la modélisation des données."),
        bullet(null, "Chapitre 3 : ", "détaille l'architecture technique microservices, la stack technologique choisie et les détails d'implémentation de chaque service."),
        bullet(null, "Chapitre 4 : ", "présente les différentes interfaces de la plateforme web et de l'application mobile."),
        bullet(null, "Chapitre 5 : ", "couvre les tests et la validation du système, incluant les tests d'API, de précision de l'IA et de performance."),
        sp(),
        p("Ce projet représente l'aboutissement de notre formation en développement d'applications informatiques et témoigne de notre capacité à concevoir et réaliser une solution logicielle complète, intégrant les technologies les plus avancées du domaine."),
        br()
      ]
    },
    // CHAPITRE 1
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } },
      children: [
        chapterCover("Chapitre 1", "Contexte général du projet"),
        br(),
        h2("Introduction"),
        p("Ce premier chapitre présente le contexte dans lequel s'inscrit le projet EduCheck AI. Nous y exposons la problématique de la correction manuelle des examens, les objectifs que nous nous sommes fixés, et une analyse des solutions existantes sur le marché afin de situer la valeur ajoutée de notre contribution."),
        sp(),
        h2("1. Contexte et Objectifs"),
        p("Le contexte éducatif marocain, comme dans de nombreux pays en voie de développement numérique, se caractérise par des classes à effectifs importants et un corps enseignant confronté à des charges de travail administratives croissantes. Dans ce contexte, la correction d'examens constitue une activité récurrente et particulièrement consommatrice de temps."),
        sp(),
        p("Selon plusieurs études sur la charge de travail enseignant, un professeur peut consacrer en moyenne 8 à 15 heures par semaine à la seule correction de travaux et d'examens. Cette charge est non seulement physiquement épuisante, mais elle introduit également des biais cognitifs liés à la fatigue : les corrections effectuées en fin de pile tendent à être plus sévères ou plus indulgentes que celles du début, compromettant l'équité de l'évaluation."),
        sp(),
        p("De plus, les étudiants attendent souvent plusieurs semaines avant de recevoir leurs résultats et les corrections détaillées de leurs erreurs. Cette latence dans le feedback nuit considérablement à l'apprentissage, car les étudiants ont perdu le fil de leur raisonnement au moment où ils reçoivent les corrections."),
        sp(),
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: "Les objectifs principaux d'EduCheck AI sont :", bold: true, font: "Times New Roman", size: 24 })]
        }),
        bullet("Automatiser la correction des trois types principaux de questions d'examen"),
        bullet("Réduire significativement le temps de correction (objectif : gain de 70% ou plus)"),
        bullet("Garantir une cohérence et une objectivité dans la notation"),
        bullet("Fournir un feedback détaillé et personnalisé à chaque étudiant"),
        bullet("Offrir une interface web intuitive pour les enseignants"),
        bullet("Développer une application mobile pour les étudiants"),
        bullet("Concevoir une architecture scalable et maintenable"),
        sp(),
        h2("2. Problématique"),
        p("La problématique centrale de ce projet peut être formulée ainsi : comment concevoir et développer un système intelligent capable de corriger automatiquement des examens incluant des questions de natures différentes (QCM, questions ouvertes, calculs), de traiter des copies scannées ou photographiées, et de fournir un feedback pédagogique pertinent, tout en restant accessible et facile d'utilisation pour les enseignants ?"),
        sp(),
        p("Cette problématique se décline en plusieurs sous-problèmes techniques :"),
        sp(),
        bullet(null, "Traitement des copies physiques : ", "Comment extraire le texte manuscrit ou tapé d'une copie scannée ou photographiée avec une précision suffisante pour permettre une correction automatique fiable ?"),
        bullet(null, "Évaluation sémantique : ", "Comment évaluer la pertinence d'une réponse textuelle ouverte qui peut être correcte sans être identique à la réponse de référence ?"),
        bullet(null, "Vérification mathématique : ", "Comment évaluer des démonstrations et calculs mathématiques qui peuvent emprunter différents chemins de résolution ?"),
        bullet(null, "Architecture distribuée : ", "Comment concevoir un système capable de gérer plusieurs types de corrections en parallèle, de manière fiable et performante ?"),
        bullet(null, "Interopérabilité multi-plateforme : ", "Comment partager l'authentification entre une application web et une application mobile fonctionnant sur des ports différents ?"),
        sp(),
        h2("3. Solution proposée — EduCheck AI"),
        p("Pour répondre à ces problématiques, nous proposons EduCheck AI, une solution complète organisée autour de trois composantes principales :"),
        sp(),
        h3("3.1. Pipeline IA de correction"),
        p("Le cœur de notre solution est un pipeline d'intelligence artificielle composé de plusieurs services spécialisés. Le traitement des copies scannées repose sur un service OCR exploitant la vision des modèles Groq. La correction des questions ouvertes utilise les capacités de compréhension du langage naturel de LLaMA 4 pour évaluer la pertinence sémantique des réponses. La correction des calculs mathématiques fait appel au même modèle avec un prompt spécialisé en mathématiques. La correction des QCM utilise un algorithme de correspondance d'index simple mais efficace."),
        sp(),
        h3("3.2. Architecture microservices"),
        p("Pour garantir la scalabilité et la maintenabilité du système, nous avons adopté une architecture microservices. Chaque service est indépendant, déployable séparément, et communique avec les autres via des API REST. Un AI Gateway orchestre l'ensemble du pipeline de correction en distribuant les questions aux services appropriés selon leur type."),
        sp(),
        h3("3.3. Interfaces utilisateur"),
        p("L'interface web React destinée aux enseignants leur offre un tableau de bord complet avec toutes les fonctionnalités nécessaires à la gestion des examens et à la visualisation des résultats. L'application mobile destinée aux étudiants leur permet de consulter leurs notes et d'accéder au feedback détaillé de leurs copies."),
        sp(),
        h2("4. Fonctionnalités du site web et mobile"),
        h3("4.1. Interface Enseignant (Web)"),
        p("L'interface enseignant constitue le point d'entrée principal de la plateforme. Elle est conçue pour être intuitive et efficace, permettant à l'enseignant d'accomplir toutes ses tâches en un minimum de clics."),
        sp(),
        bullet("Authentification sécurisée avec gestion des rôles (enseignant / étudiant)"),
        bullet("Tableau de bord avec métriques en temps réel : nombre d'examens, copies soumises, moyenne générale"),
        bullet("Création et gestion complète des examens avec titre, matière, description et total de points"),
        bullet("Gestion des questions avec trois types supportés : QCM, questions ouvertes et calculs"),
        bullet("Import d'examens depuis fichiers PDF, Word ou images avec extraction automatique du contenu par OCR"),
        bullet("Publication des examens pour les rendre accessibles aux étudiants"),
        bullet("Upload de copies par lot (PDF, JPG, PNG) avec correction automatique immédiate"),
        bullet("Consultation des corrections avec détail question par question et feedback IA"),
        bullet("Correction manuelle en complément ou en remplacement de la correction automatique"),
        bullet("Export des résultats en PDF, CSV et JSON"),
        bullet("Page de statistiques avec visualisation de la répartition des examens par matière et moyennes"),
        sp(),
        h3("4.2. Interface Étudiant (Mobile)"),
        p("L'application mobile est conçue pour offrir aux étudiants un accès simple et rapide à leurs résultats depuis n'importe quel appareil."),
        sp(),
        bullet("Authentification sécurisée avec accès réservé aux étudiants"),
        bullet("Consultation des examens publiés par les enseignants"),
        bullet("Soumission des copies via photo ou fichier PDF"),
        bullet("Consultation des notes et du feedback détaillé par question"),
        bullet("Historique complet des examens passés"),
        sp(),
        h3("4.3. Pipeline de correction IA"),
        p("Le pipeline IA est le composant central qui différencie EduCheck AI des solutions classiques. Il est conçu pour traiter trois types de questions différents de manière optimale."),
        sp(),
        bullet(null, "Service OCR : ", "Extraction du texte des copies scannées ou photographiées. Utilise Groq Vision et LLaMA 4 pour identifier et extraire les réponses manuscrites en distinguant les énoncés imprimés des réponses manuscrites de l'étudiant."),
        bullet(null, "Service QCM : ", "Correction par correspondance d'index. Analyse la structure JSON de la réponse correcte et compare avec l'index choisi par l'étudiant. Précision de 100% pour ce type de questions."),
        bullet(null, "Service NLP : ", "Évaluation sémantique des questions ouvertes via Groq/LLaMA 4. Le service envoie un prompt structuré incluant l'énoncé, la réponse de référence et la réponse de l'étudiant. Retourne les points obtenus, un pourcentage de réussite et un feedback explicatif en français."),
        bullet(null, "Service Math : ", "Évaluation des questions de calcul et de démonstration via Groq/LLaMA 4 avec un contexte mathématique spécialisé. Capable d'évaluer différents chemins de résolution menant au même résultat."),
        bullet(null, "AI Gateway : ", "Orchestre l'ensemble du pipeline en distribuant les questions aux services appropriés, en gérant les appels parallèles et en agrégeant les résultats via le Results Service."),
        sp(),
        h3("4.4. Exigences non fonctionnelles"),
        bullet(null, "Sécurité : ", "Authentification par cookies HTTP, hachage bcrypt des mots de passe, protection des routes React, variables d'environnement sécurisées."),
        bullet(null, "Performance : ", "Architecture asynchrone FastAPI, correction d'un QCM en moins d'une seconde, pipeline IA complète en moins de 30 secondes."),
        bullet(null, "Maintenabilité : ", "Architecture microservices, code documenté, séparation claire des responsabilités entre services."),
        bullet(null, "Évolutivité : ", "Chaque service peut être mis à l'échelle indépendamment selon la charge."),
        sp(),
        h2("5. Étude de l'existant"),
        h3("5.1. Solutions existantes"),
        p("Avant de développer notre solution, nous avons analysé les principales plateformes existantes de correction automatique d'examens afin d'identifier leurs forces et leurs limites."),
        sp(),
        p("Gradescope est une plateforme américaine développée par Turnitin, spécialisée dans la correction assistée par IA. Elle propose une interface intuitive pour la gestion des examens et supporte la correction de QCM ainsi que certains types de questions ouvertes. Cependant, elle présente plusieurs limitations dans notre contexte : son coût élevé la rend inaccessible pour la plupart des établissements marocains, elle offre un support limité pour le français et ne supporte pas l'arabe, et ses capacités de correction de questions ouvertes restent basiques comparées aux derniers modèles LLM."),
        sp(),
        p("Google Forms combiné à Google Sheets représente une solution gratuite et largement adoptée pour les QCM simples. Bien qu'accessible et facile à utiliser, cette solution ne supporte aucune correction de questions ouvertes, ne dispose pas de capacité OCR pour les copies scannées, et ne fournit aucun feedback pédagogique détaillé."),
        sp(),
        p("Diverses solutions développées localement dans les établissements d'enseignement marocains existent, mais elles se limitent généralement à la correction de QCM et ne bénéficient pas des avancées récentes en IA."),
        sp(),
        h3("5.2. Valeur ajoutée d'EduCheck AI"),
        p("Notre solution se distingue de l'existant par plusieurs aspects innovants qui répondent directement aux lacunes identifiées."),
        sp(),
        bullet("Pipeline IA complète supportant simultanément QCM, questions ouvertes et calculs mathématiques dans un même examen"),
        bullet("Intégration OCR avancée basée sur les derniers modèles Groq Vision pour la lecture fiable des copies scannées"),
        bullet("Utilisation de LLaMA 4, l'un des modèles LLM les plus performants disponibles, pour une évaluation sémantique précise"),
        bullet("Architecture microservices scalable permettant une montée en charge progressive selon les besoins"),
        bullet("Support natif du français avec adaptation au contexte éducatif marocain"),
        bullet("Application mobile dédiée aux étudiants pour la consultation des résultats"),
        bullet("Coût minimal grâce aux technologies open-source et à l'API Groq"),
        bullet("Feedback détaillé et personnalisé question par question pour aider les étudiants dans leur progression"),
        sp(),
        h2("Conclusion"),
        p("Ce premier chapitre a permis d'établir le contexte dans lequel s'inscrit notre projet EduCheck AI. La problématique de la correction manuelle des examens est réelle et impacte directement la qualité de l'enseignement. Notre analyse de l'existant a révélé un manque de solutions adaptées au contexte éducatif marocain, intégrant les dernières avancées en intelligence artificielle. EduCheck AI se positionne comme une réponse innovante et complète à ces défis. Le chapitre suivant présentera la conception et la modélisation détaillée du système."),
        br()
      ]
    },
    // CHAPITRE 2
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } },
      children: [
        chapterCover("Chapitre 2", "Conception et Modélisation"),
        br(),
        h2("Introduction"),
        p("Ce chapitre présente la conception et la modélisation du système EduCheck AI. Nous y décrivons la méthodologie de développement adoptée, la gestion du projet, et les différents modèles conceptuels réalisés pour formaliser la structure et le comportement de notre application. La conception rigoureuse d'un système aussi complexe qu'EduCheck AI est une étape indispensable pour garantir la cohérence et la qualité de l'implémentation."),
        sp(),
        h2("1. Méthodologies Adoptées"),
        h3("1.1. Méthode de modélisation UML"),
        p("Pour la modélisation du système, nous avons adopté UML (Unified Modeling Language), le standard industriel pour la conception orientée objet. UML nous a permis de représenter les différentes vues du système à travers plusieurs types de diagrammes complémentaires : diagramme de cas d'utilisation pour les besoins fonctionnels, diagramme de classes pour la structure statique, diagrammes de séquence pour les interactions dynamiques, et diagramme d'état-transition pour le cycle de vie des objets."),
        sp(),
        h3("1.2. Méthode Merise pour la base de données"),
        p("Pour la modélisation de la base de données, nous avons utilisé la méthode Merise, particulièrement adaptée à la conception de bases de données relationnelles. Cette méthode nous a permis de produire successivement un Modèle Conceptuel de Données (MCD), un Modèle Logique de Données (MLD) et un Modèle Physique de Données (MPD) correspondant à l'implémentation PostgreSQL."),
        sp(),
        h2("2. Gestion de projet"),
        h3("2.1. Méthodologie Agile / Scrum"),
        p("Pour la gestion de ce projet, nous avons adopté une méthodologie agile inspirée de Scrum. Cette approche itérative et incrémentale nous a permis de livrer des fonctionnalités de manière régulière tout en restant flexibles face aux évolutions des besoins. Le projet a été organisé en sprints de deux semaines, chacun se terminant par une revue et une démonstration des fonctionnalités développées."),
        sp(),
        bullet(null, "Sprint 1-2 : ", "Analyse des besoins, étude de l'existant, définition de l'architecture microservices."),
        bullet(null, "Sprint 3-4 : ", "Conception UML complète, modélisation de la base de données, mise en place de l'environnement de développement."),
        bullet(null, "Sprint 5-7 : ", "Développement des services backend : auth-service, exam-service, base de données."),
        bullet(null, "Sprint 8-10 : ", "Développement du pipeline IA : OCR, QCM, NLP, Math, Results, AI Gateway."),
        bullet(null, "Sprint 11-12 : ", "Développement du frontend React (interface enseignant)."),
        bullet(null, "Sprint 13 : ", "Tests, correction des bugs, mise en production, rédaction du rapport."),
        sp(),
        h3("2.2. Planning global du projet"),
        p("Le planning du projet s'est étalé sur une période de 28 semaines, de novembre 2025 à juin 2026, avec les phases suivantes :"),
        sp(),
        bullet(null, "Phase 1 — Cahier des charges (semaines 1-4) : ", "Définition du périmètre, analyse des besoins, étude de faisabilité."),
        bullet(null, "Phase 2 — Conception (semaines 5-8) : ", "Modélisation UML, conception de la base de données, architecture technique."),
        bullet(null, "Phase 3 — Développement Phase 1 (semaines 9-18) : ", "Backend microservices et pipeline IA."),
        bullet(null, "Phase 4 — Développement Phase 2 (semaines 19-24) : ", "Frontends React et mobile."),
        bullet(null, "Phase 5 — Tests (semaines 25-26) : ", "Tests d'intégration, de performance et de précision."),
        bullet(null, "Phase 6 — Rapport et soutenance (semaines 27-28) : ", "Rédaction du rapport final et préparation de la soutenance."),
        sp(),
        h2("3. Conception UML"),
        h3("3.1. Identification des acteurs"),
        p("Le système EduCheck AI fait intervenir trois catégories d'acteurs principaux, chacun disposant de droits et de fonctionnalités spécifiques."),
        sp(),
        bullet(null, "Enseignant (Teacher) : ", "Acteur principal du système. Il crée et gère les examens, importe les copies des étudiants, consulte les corrections automatiques et peut effectuer des corrections manuelles. Il accède à la plateforme via l'interface web React."),
        bullet(null, "Étudiant (Student) : ", "Acteur secondaire. Il consulte les examens qui lui sont destinés, soumet ses copies via l'application mobile, et accède à ses résultats et feedback. Il est identifié par son nom lors de l'upload de copie."),
        bullet(null, "Administrateur : ", "Acteur de supervision. Il gère les comptes utilisateurs et surveille le bon fonctionnement de la plateforme."),
        sp(),
        h3("3.2. Diagramme de cas d'utilisation"),
        p("Le diagramme de cas d'utilisation représente l'ensemble des interactions possibles entre les acteurs et le système. Les cas d'utilisation principaux sont les suivants."),
        sp(),
        p("Pour l'enseignant : s'authentifier, créer un examen, modifier/supprimer un examen, ajouter des questions (QCM, ouverte, calcul), importer un examen depuis un fichier, publier un examen, uploader des copies, lancer la correction automatique, consulter les corrections, effectuer une correction manuelle, exporter les résultats, et consulter les statistiques."),
        sp(),
        p("Pour l'étudiant : s'authentifier, consulter les examens disponibles, soumettre une copie, consulter ses notes et feedback, et accéder à l'historique de ses résultats."),
        sp(),
        h3("3.3. Diagramme de classes"),
        p("Le diagramme de classes représente la structure statique du système EduCheck AI. Les classes principales sont les suivantes."),
        sp(),
        bullet(null, "User : ", "Représente tout utilisateur du système (enseignant ou étudiant). Attributs : id, full_name, email, password (haché), role."),
        bullet(null, "Examen : ", "Représente un examen créé par un enseignant. Attributs : id, titre, description, matiere, id_enseignant, points_totaux, statut, contenu_brut, date_creation."),
        bullet(null, "Question : ", "Représente une question d'examen. Attributs : id, exam_id, texte, points, type_question (qcm/ouverte/calcul), ordre, reponse_correcte."),
        bullet(null, "CopieEtudiant : ", "Représente la copie soumise par un étudiant. Attributs : id, exam_id, student_id, student_name, contenu_brut, reponses (JSON), note, date_soumission."),
        bullet(null, "CorrectionDetail : ", "Détail de la correction par question. Attributs : id, copie_id, question_id, points_obtenus, points_possibles, correct, statut, feedback, similarity_score."),
        sp(),
        p("Les relations entre ces classes sont les suivantes : un User (enseignant) crée plusieurs Examens (1,N) ; un Examen contient plusieurs Questions (1,N) ; un User (étudiant) soumet plusieurs CopiesEtudiant (1,N) ; une CopieEtudiant est associée à un Examen (N,1) ; une CopieEtudiant génère plusieurs CorrectionDetails (1,N)."),
        sp(),
        h3("3.4. Diagrammes de séquence"),
        p("Les diagrammes de séquence représentent les interactions chronologiques entre les composants du système pour les scénarios principaux."),
        sp(),
        h4("3.4.1. Séquence d'authentification"),
        p("Le scénario d'authentification se déroule comme suit : l'utilisateur saisit ses identifiants dans le formulaire de connexion du frontend auth-service (port 3000). Le frontend envoie une requête POST à l'auth-service (port 8000) avec l'email et le mot de passe. L'auth-service vérifie les identifiants en interrogeant la base de données PostgreSQL via bcrypt. En cas de succès, il retourne les informations utilisateur et crée des cookies HTTP (user_id, user_role, user_name, user_email). Le frontend stocke les informations dans le localStorage et redirige vers l'interface appropriée selon le rôle."),
        sp(),
        h4("3.4.2. Séquence de correction automatique"),
        p("Le scénario de correction automatique est le plus complexe du système. L'enseignant sélectionne une copie et la soumet via l'interface upload. L'exam-service (port 8002) reçoit le fichier et détermine s'il s'agit d'un PDF avec texte intégré ou d'une image. Si c'est une image ou un PDF scanné, le fichier est envoyé à l'OCR-service (port 8003) qui extrait le texte via Groq Vision. L'exam-service invoque ensuite la fonction d'extraction de réponses qui utilise Groq/LLaMA 4 pour identifier les réponses de l'étudiant en distinguant les énoncés imprimés des réponses manuscrites. Les réponses extraites sont envoyées à l'AI Gateway (port 8014) avec les questions de l'examen. L'AI Gateway distribue les questions par type : QCM vers le service 8010, questions ouvertes vers le NLP Service (8011), et calculs vers le Math Service (8012). Chaque service retourne ses résultats au Gateway qui les transmet au Results Service (8013) pour agrégation. La note finale est sauvegardée dans la base de données et retournée à l'enseignant."),
        sp(),
        h4("3.4.3. Séquence d'export PDF"),
        p("Pour l'export d'une correction en PDF : l'enseignant clique sur le bouton d'export depuis la page des corrections. L'exam-service génère un rapport PDF via ReportLab incluant les informations de l'examen, les informations de la copie (étudiant, date), la note finale sur le total, et le détail question par question avec feedback. Le fichier PDF est retourné au navigateur pour téléchargement."),
        sp(),
        h3("3.5. Diagramme d'activité"),
        p("Le diagramme d'activité du processus de correction automatique décrit les étapes séquentielles et les décisions dans le workflow. Le processus débute lorsque l'enseignant uploade une copie. La première décision porte sur le type de fichier : si c'est un PDF avec texte intégré, le texte est extrait directement ; sinon, l'OCR est invoqué. Une fois le texte extrait, Groq identifie les réponses par question. Pour chaque question, le type est évalué : QCM, ouverte ou calcul. Le service IA approprié est appelé pour chaque type. Les résultats sont agrégés et la note finale calculée. La correction est sauvegardée et l'enseignant est notifié."),
        sp(),
        h3("3.6. Diagramme d'état-transition de la copie"),
        p("L'objet CopieEtudiant passe par plusieurs états au cours de son cycle de vie. À la création de la copie lors de l'upload, elle est dans l'état 'En attente OCR'. Après le traitement OCR réussi, elle passe à l'état 'OCR terminé'. Lors de l'extraction des réponses par Groq, elle est en état 'Extraction en cours'. Quand les réponses sont envoyées au pipeline IA pour correction, elle est en état 'Correction en cours'. Après réception des résultats et calcul de la note, elle passe à l'état 'Corrigée automatiquement'. Si l'enseignant modifie manuellement la correction, elle passe à l'état 'Corrigée manuellement'. Une copie dans l'état 'Corrigée' peut être exportée en PDF."),
        sp(),
        h2("4. Modélisation des données"),
        h3("4.1. Modèle Conceptuel de Données (MCD)"),
        p("Le MCD d'EduCheck AI représente les entités et leurs associations au niveau conceptuel, indépendamment de toute considération technique d'implémentation."),
        sp(),
        p("Les entités identifiées sont : UTILISATEUR (id, nom_complet, email, mot_de_passe, rôle), EXAMEN (id, titre, description, matière, points_totaux, statut, contenu_brut, date_création), QUESTION (id, texte, points, type, ordre, réponse_correcte), COPIE (id, contenu_brut, réponses, note, date_soumission), et DÉTAIL_CORRECTION (id, points_obtenus, points_possibles, correct, statut, feedback)."),
        sp(),
        p("Les associations sont : CRÉE entre UTILISATEUR (enseignant) et EXAMEN avec cardinalité (1,N) ; CONTIENT entre EXAMEN et QUESTION avec cardinalité (1,N) ; SOUMET entre UTILISATEUR (étudiant) et COPIE avec cardinalité (1,N) ; CONCERNE entre COPIE et EXAMEN avec cardinalité (N,1) ; DÉTAILLE entre COPIE et DÉTAIL_CORRECTION avec cardinalité (1,N) ; PORTE_SUR entre DÉTAIL_CORRECTION et QUESTION avec cardinalité (N,1)."),
        sp(),
        h3("4.2. Modèle Logique de Données (MLD)"),
        p("Le MLD traduit le MCD en un schéma relationnel adapté à PostgreSQL. Deux schémas distincts sont utilisés pour séparer les données des deux microservices principaux."),
        sp(),
        bullet("users (id SERIAL PK, full_name VARCHAR, email VARCHAR UNIQUE, password VARCHAR, role VARCHAR) — schéma public"),
        bullet("exams (id SERIAL PK, titre VARCHAR, description TEXT, matiere VARCHAR, id_enseignant INT FK→users.id, points_totaux DECIMAL, statut VARCHAR, contenu_brut TEXT, date_creation TIMESTAMP) — schéma exam"),
        bullet("questions (id SERIAL PK, exam_id INT FK→exams.id CASCADE, texte TEXT, points DECIMAL, type_question VARCHAR, ordre INT, reponse_correcte TEXT) — schéma exam"),
        bullet("copies (id SERIAL PK, exam_id INT FK→exams.id, student_id INT, student_name VARCHAR, contenu_brut TEXT, reponses JSON, note DECIMAL, date_soumission TIMESTAMP) — schéma exam"),
        bullet("correction_details (id SERIAL PK, copie_id INT FK→copies.id, question_id INT FK→questions.id, points_obtenus DECIMAL, points_possibles DECIMAL, correct BOOLEAN, statut VARCHAR, feedback TEXT, similarity_score DECIMAL, reponse_etudiant TEXT, bonne_reponse TEXT) — schéma exam"),
        sp(),
        h3("4.3. Modèle Physique de Données (MPD)"),
        p("Le MPD représente l'implémentation physique dans PostgreSQL 15. Deux schémas distincts ont été créés : le schéma public pour les données d'authentification (géré par l'auth-service) et le schéma exam pour toutes les données liées aux examens (géré par l'exam-service). Cette séparation physique garantit l'isolation des données entre microservices et facilite les éventuelles migrations futures. Des index ont été créés sur les colonnes fréquemment requêtées : email dans la table users, exam_id dans copies, et copie_id dans correction_details."),
        sp(),
        h2("Conclusion"),
        p("Ce chapitre a présenté la conception complète et rigoureuse du système EduCheck AI. Les diagrammes UML réalisés permettent de comprendre clairement les interactions entre les différents acteurs et composants. L'architecture microservices a été conçue pour maximiser l'indépendance et la scalabilité des services. La modélisation des données avec deux schémas distincts garantit une séparation claire des responsabilités entre les services d'authentification et de gestion des examens. Le chapitre suivant présentera les détails techniques de l'implémentation."),
        br()
      ]
    },
    // CHAPITRE 3
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } },
      children: [
        chapterCover("Chapitre 3", "Architecture Technique et Implémentation"),
        br(),
        h2("Introduction"),
        p("Ce chapitre présente l'architecture technique d'EduCheck AI et les détails de son implémentation. Nous décrivons l'environnement de développement utilisé, la stack technologique choisie, le détail de chaque microservice, et les mécanismes d'authentification et de sécurité mis en place. Ce chapitre constitue la documentation technique principale du projet."),
        sp(),
        h2("1. Architecture microservices"),
        p("L'architecture microservices est le choix architectural central d'EduCheck AI. Contrairement à une architecture monolithique où toutes les fonctionnalités sont regroupées dans une seule application, l'approche microservices décompose le système en services indépendants, chacun responsable d'un périmètre fonctionnel précis."),
        sp(),
        p("Cette approche offre plusieurs avantages pour notre projet : chaque service peut être développé, testé et déployé indépendamment ; les services peuvent être mis à l'échelle séparément selon la charge ; une panne dans un service n'affecte pas nécessairement les autres ; et différentes technologies peuvent être utilisées pour chaque service si nécessaire."),
        sp(),
        p("Notre architecture comprend huit microservices backend, chacun exposant une API REST sur un port dédié."),
        sp(),
        bullet(null, "auth-service (port 8000) : ", "Gestion de l'authentification et des utilisateurs. Endpoints : POST /auth/register, POST /auth/login, POST /auth/logout, GET /auth/me. Utilise PostgreSQL pour le stockage des utilisateurs et bcrypt pour le hachage des mots de passe."),
        bullet(null, "exam-service (port 8002) : ", "Service principal de gestion des examens, questions et copies. C'est le service le plus complexe, gérant le workflow complet de correction."),
        bullet(null, "ocr-service (port 8003) : ", "Service de reconnaissance optique de caractères. Reçoit des images ou PDFs et retourne le texte extrait via Groq Vision."),
        bullet(null, "qcm-service (port 8010) : ", "Correction automatique des questions à choix multiples par correspondance d'index."),
        bullet(null, "nlp-service (port 8011) : ", "Évaluation sémantique des questions ouvertes via Groq/LLaMA 4."),
        bullet(null, "math-service (port 8012) : ", "Évaluation des questions de calcul et de démonstration via Groq/LLaMA 4."),
        bullet(null, "results-service (port 8013) : ", "Agrégation des résultats de tous les services de correction pour calculer la note finale, le pourcentage et la mention."),
        bullet(null, "ai-gateway (port 8014) : ", "Orchestrateur du pipeline IA. Reçoit une demande de correction complète, distribue les questions aux services appropriés et agrège les résultats."),
        sp(),
        p("Côté frontend, deux applications React coexistent : l'auth-service frontend (port 3000) héberge les pages de connexion et d'inscription, et l'exam-service frontend (port 3001) héberge l'interface complète de l'enseignant."),
        sp(),
        h2("2. Stack technologique"),
        h3("2.1. Backend — Python et FastAPI"),
        p("FastAPI a été choisi comme framework backend pour tous les microservices Python. Ce choix se justifie par plusieurs raisons : FastAPI est le framework Python le plus performant pour les APIs REST grâce à sa nature asynchrone basée sur Starlette et ASGI ; il génère automatiquement une documentation interactive Swagger/OpenAPI ; sa validation des données via Pydantic est puissante et type-safe ; et sa syntaxe moderne basée sur les décorateurs est intuitive et lisible."),
        sp(),
        p("SQLAlchemy est utilisé comme ORM pour toutes les interactions avec PostgreSQL. Il offre une abstraction de haut niveau sur les requêtes SQL tout en permettant l'utilisation de SQL brut pour les cas complexes. Pydantic assure la validation et la sérialisation des données à l'entrée et à la sortie de chaque endpoint. La bibliothèque httpx permet les appels HTTP asynchrones inter-services. python-dotenv et pydantic-settings gèrent la configuration via les variables d'environnement."),
        sp(),
        h3("2.2. Intelligence Artificielle — Groq et LLaMA 4"),
        p("Groq est la plateforme d'inférence IA choisie pour ce projet. Elle offre des temps de latence extrêmement faibles pour les modèles LLM, une API compatible OpenAI facilitant l'intégration, et un accès aux modèles LLaMA 4 de Meta qui représentent l'état de l'art en matière de compréhension du langage."),
        sp(),
        p("Le modèle LLaMA 4 Scout (17B paramètres) est utilisé pour la correction des questions ouvertes et des calculs. Ce modèle offre un excellent équilibre entre performance et précision pour les tâches d'évaluation textuelle et mathématique. Pour l'OCR et l'extraction de réponses, nous exploitons les capacités de compréhension contextuelle de LLaMA 4 via des prompts structurés."),
        sp(),
        h3("2.3. Frontend Web — React.js"),
        p("React.js a été choisi pour le développement des deux applications frontend. Sa popularité garantit un écosystème riche, sa gestion du DOM virtuel offre des performances optimales, et ses hooks modernes permettent une gestion d'état propre et efficace."),
        sp(),
        p("Les bibliothèques principales utilisées sont : React Router pour la navigation SPA, Axios pour les appels API avec gestion automatique des cookies, React Hot Toast pour les notifications, React Icons pour les icônes, Framer Motion pour les animations, et Tailwind CSS pour le styling utilitaire dans l'auth-service frontend."),
        sp(),
        h3("2.4. Base de données — PostgreSQL"),
        p("PostgreSQL 15 a été choisi comme système de gestion de base de données pour plusieurs raisons : sa robustesse et sa fiabilité reconnues, son support natif du type JSON pour le stockage des réponses structurées, sa gestion avancée des schémas permettant d'isoler les données des différents services, et ses performances pour les requêtes complexes."),
        sp(),
        p("La base de données utilise deux schémas distincts : public pour les tables d'authentification et exam pour les tables de gestion des examens. Cette séparation logique renforce l'isolation entre les services et facilite la maintenance."),
        sp(),
        h3("2.5. Outils de développement"),
        bullet(null, "Visual Studio Code : ", "Éditeur de code principal avec extensions Python et React."),
        bullet(null, "Git et GitHub : ", "Versioning du code et collaboration."),
        bullet(null, "Postman : ", "Tests des API et documentation des endpoints."),
        bullet(null, "pgAdmin 4 : ", "Administration et visualisation de la base de données PostgreSQL."),
        bullet(null, "Python venv : ", "Environnements virtuels isolés pour chaque service backend."),
        sp(),
        h2("3. Détail des services"),
        h3("3.1. auth-service"),
        p("L'auth-service est le gardien de la sécurité du système. Il gère l'inscription et la connexion des utilisateurs pour les deux rôles : enseignant (teacher) et étudiant (student). Lors de la connexion réussie, il crée quatre cookies HTTP sur le domaine localhost, permettant leur partage entre les applications sur différents ports : user_id contenant l'identifiant unique, user_role contenant le rôle, user_name contenant le nom complet, et user_email contenant l'adresse email."),
        sp(),
        p("Ce mécanisme de cookies a été préféré au JWT classique stocké dans le localStorage car il résout élégamment le problème de partage d'état d'authentification entre les deux frontends (port 3000 et port 3001). En effet, chaque port dispose de son propre localStorage isolé, tandis que les cookies sont partagés sur le domaine localhost."),
        sp(),
        h3("3.2. exam-service"),
        p("L'exam-service est le service central de l'application. Il orchestre l'ensemble du workflow de correction et expose les endpoints pour la gestion des examens, des questions et des copies. Ses responsabilités principales sont la gestion CRUD des examens et questions, l'upload et le traitement des copies étudiants, l'orchestration du pipeline de correction via l'AI Gateway, et la gestion des corrections manuelles."),
        sp(),
        p("La route POST /copies/upload-et-corriger est l'endpoint le plus complexe du service. Elle reçoit le fichier de copie, l'exam_id et le student_name, effectue l'OCR si nécessaire, invoque Groq pour l'extraction des réponses, appelle l'AI Gateway pour la correction, sauvegarde les résultats et retourne la note finale avec tous les détails."),
        sp(),
        h3("3.3. Service OCR"),
        p("Le service OCR (port 8003) est responsable de l'extraction du texte des copies scannées ou photographiées. Il utilise les capacités vision de Groq pour analyser les images et en extraire le texte avec une précision élevée. Le service gère différents formats d'entrée : JPEG, PNG et PDF. Pour les PDFs contenant du texte intégré (PDFs numériques), l'extraction se fait directement via PyPDF2 sans recourir à l'OCR visuel."),
        sp(),
        h3("3.4. Pipeline de correction IA"),
        p("Le pipeline IA est composé de quatre services spécialisés orchestrés par l'AI Gateway."),
        sp(),
        p("Le QCM Service (port 8010) implémente un algorithme de correction par correspondance d'index. Pour chaque question QCM, il parse la structure JSON de la réponse correcte (contenant les choix et l'index de la bonne réponse), compare avec l'index soumis par l'étudiant, et retourne le résultat binaire correct/incorrect avec les points correspondants. Ce service atteint une précision de 100% pour les réponses valides."),
        sp(),
        p("Le NLP Service (port 8011) évalue sémantiquement les questions ouvertes. Pour chaque question, il construit un prompt structuré incluant le texte de la question, la réponse correcte de référence (si disponible) et la réponse de l'étudiant. Ce prompt est envoyé à Groq/LLaMA 4 avec une instruction de retourner uniquement un objet JSON contenant les points obtenus, le pourcentage de réussite, un booléen correct, et un feedback explicatif en français. Un mode sans réponse de référence est disponible pour les questions sans corrigé, dans lequel le modèle évalue la pertinence, la justesse et la complétude de la réponse."),
        sp(),
        p("Le Math Service (port 8012) fonctionne selon le même principe que le NLP Service mais avec un prompt spécialisé en mathématiques. Le contexte fourni au modèle l'oriente vers une évaluation mathématique rigoureuse, capable de reconnaître différentes formes d'une même réponse correcte (par exemple, différentes notations ou chemins de démonstration)."),
        sp(),
        p("Le Results Service (port 8013) agrège les résultats des trois sections (QCM, ouvertes, calculs) pour calculer la note totale, le pourcentage global et la mention correspondante. La mention est calculée selon les seuils suivants : Excellent pour 85% et plus, Bien pour 70% à 84%, Assez bien pour 55% à 69%, Passable pour 40% à 54%, et Insuffisant en dessous de 40%."),
        sp(),
        h2("4. Authentification et sécurité"),
        h3("4.1. Système de cookies"),
        p("Le choix du système de cookies pour l'authentification répond à une contrainte architecturale spécifique : le partage de l'état d'authentification entre deux applications React sur des ports différents. Les cookies HTTP, contrairement au localStorage, sont partagés entre toutes les applications sur le même domaine, indépendamment du port. Ainsi, après connexion sur le port 3000, les cookies créés par l'auth-service sont automatiquement envoyés dans les requêtes vers l'exam-service (port 8002) et visibles depuis l'application frontend sur le port 3001."),
        sp(),
        h3("4.2. Protection des routes React"),
        p("Côté frontend, un composant ProtectedRoute protège toutes les routes de l'interface enseignant. Avant d'afficher une page, ce composant vérifie la présence du userId dans le localStorage et valide que le rôle correspond à celui requis par la route. Si l'utilisateur n'est pas authentifié ou n'a pas le bon rôle, il est redirigé vers la page de connexion. Ce mécanisme est complété par la vérification côté backend via le Depends(get_current_teacher) FastAPI."),
        sp(),
        h3("4.3. Gestion des secrets"),
        p("Toutes les clés et configurations sensibles sont externalisées dans des fichiers .env séparés pour chaque service, non versionnés sur GitHub. Les secrets incluent la clé API Groq (GROQ_API_KEY), la clé secrète JWT (JWT_SECRET_KEY), l'URL de connexion à la base de données (DATABASE_URL), et les URLs des services internes. Un fichier .env.example documente les variables requises pour faciliter l'installation par de nouveaux développeurs."),
        sp(),
        h2("Conclusion"),
        p("Ce chapitre a détaillé l'architecture technique et l'implémentation d'EduCheck AI. L'architecture microservices choisie, bien que plus complexe à mettre en place qu'une architecture monolithique, offre des avantages significatifs en termes de scalabilité, de maintenabilité et d'évolution future. La stack technologique, centrée sur FastAPI et React avec l'intégration de Groq/LLaMA 4, permet d'atteindre des performances et une précision remarquables pour la correction automatique. Le chapitre suivant présentera les interfaces de l'application."),
        br()
      ]
    },
    // CHAPITRE 4
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } },
      children: [
        chapterCover("Chapitre 4", "Présentation des interfaces"),
        br(),
        h2("Introduction"),
        p("Ce chapitre présente les différentes interfaces de la plateforme EduCheck AI. Pour chaque interface, nous décrivons les fonctionnalités disponibles, les choix de design adoptés et l'expérience utilisateur visée. Les interfaces ont été conçues selon les principes de l'UX/UI moderne : clarté, efficacité et accessibilité."),
        sp(),
        h2("1. Interface d'authentification"),
        h3("1.1. Page de connexion et d'inscription"),
        p("La page d'authentification constitue le point d'entrée de la plateforme. Elle est commune aux enseignants et aux étudiants, avec une redirection automatique vers l'interface appropriée après connexion réussie selon le rôle."),
        sp(),
        p("L'interface est divisée en deux parties. La partie gauche, visible uniquement sur les grands écrans, présente le branding EduCheck AI avec le nom de la plateforme, une description synthétique des fonctionnalités, et un témoignage simulé d'un enseignant utilisateur. Cette section est réalisée avec un dégradé bleu et des animations d'arrière-plan subtiles. La partie droite contient le formulaire d'authentification adaptatif, qui bascule entre mode connexion et mode inscription via un bouton de toggle animé."),
        sp(),
        p("Le formulaire d'inscription inclut un champ de nom complet, un champ email, un champ mot de passe avec compteur de bytes (maximum 72 bytes pour la compatibilité bcrypt), et un sélecteur de rôle graphique avec deux options : Enseignant (icône diplôme) et Étudiant (icône école). Toutes les transitions entre connexion et inscription sont animées via Framer Motion."),
        sp(),
        p("Après connexion réussie, le frontend stocke les informations utilisateur dans le localStorage et effectue une redirection : les enseignants sont dirigés vers l'interface d'examen (port 3001) avec les paramètres userId, userName et userRole passés dans l'URL pour contourner la limitation du localStorage entre ports différents."),
        sp(),
        h2("2. Interface enseignant (Web)"),
        h3("2.1. Sidebar de navigation"),
        p("La sidebar constitue l'élément de navigation principal de l'interface enseignant. Elle est présente sur toutes les pages et propose sept entrées de navigation : Tableau de bord (redirection vers l'auth-service), Mes examens, Créer un examen, Importer, Corrections, Statistiques, et Paramètres."),
        sp(),
        p("La sidebar est collapsible (réductible) pour maximiser l'espace de travail sur les petits écrans. En mode réduit, seules les icônes sont affichées avec des tooltips au survol. Sur mobile, la sidebar se transforme en menu hamburger avec overlay. L'entrée active est mise en évidence par une couleur de fond distincte."),
        sp(),
        h3("2.2. Tableau de bord"),
        p("Le tableau de bord de l'enseignant affiche un message de bienvenue personnalisé avec le nom de l'enseignant récupéré depuis le localStorage. Il constitue le point de départ depuis lequel l'enseignant peut naviguer vers toutes les fonctionnalités de la plateforme."),
        sp(),
        h2("3. Gestion des examens et questions"),
        h3("3.1. Page de liste des examens"),
        p("La page de liste des examens est la page principale de l'interface enseignant. Elle affiche uniquement les examens créés par l'enseignant connecté (filtrage par id_enseignant côté backend). En haut de la page, trois cartes de statistiques affichent le nombre total d'examens, le nombre d'examens publiés et le nombre de brouillons. Ces cartes sont interactives : un clic sur 'Publiés' ou 'Brouillons' active automatiquement le filtre correspondant."),
        sp(),
        p("Une barre de recherche et des boutons de filtre permettent de retrouver rapidement un examen par titre ou matière. Les examens sont présentés sous forme de cartes avec le titre, la matière, les points totaux, le statut (badge coloré), la date de création et les actions disponibles : Voir détails, Modifier, Exporter PDF, Supprimer. Pour les brouillons, un bouton de publication est disponible directement sur la carte."),
        sp(),
        h3("3.2. Création et modification d'examen"),
        p("Le formulaire de création d'examen permet de définir le titre, la matière, le total de points, une description optionnelle et le statut initial. Une contrainte de sécurité vérifie côté backend que l'id_enseignant fourni correspond bien à l'utilisateur connecté via le cookie, empêchant tout contournement."),
        sp(),
        h3("3.3. Gestion des questions"),
        p("La page de détail d'un examen présente les informations générales en haut puis la liste de toutes ses questions. Chaque question est affichée avec son numéro, son type (badge coloré), son texte et ses points. Pour les questions contenant des formules mathématiques LaTeX, un composant MathText assure le rendu correct des équations."),
        sp(),
        p("Le formulaire d'ajout de question s'ouvre en modal overlay. Il propose trois types via des boutons graphiques : Ouvertes (icône O), Calcul (icône #), et QCM (icône diamant). Pour les QCM, une interface dynamique permet d'ajouter jusqu'à 6 choix de réponse, de marquer la bonne réponse en cliquant sur la lettre correspondante, et de supprimer des choix. Un compteur de points avec boutons plus/moins et un champ d'ordre d'affichage complètent le formulaire."),
        sp(),
        h3("3.4. Import d'examen depuis fichier"),
        p("La fonctionnalité d'import permet de créer un examen à partir d'un fichier existant. L'enseignant upload un fichier PDF, Word ou image. L'exam-service extrait le texte (OCR si nécessaire) puis invoque Groq pour parser automatiquement le contenu et identifier le titre, la matière et les questions. Un aperçu est affiché avant création définitive. Si l'extraction automatique est imparfaite, l'enseignant peut compléter manuellement les questions après import."),
        sp(),
        h2("4. Correction automatique"),
        h3("4.1. Upload des copies"),
        p("La page d'upload des copies permet à l'enseignant de soumettre les copies des étudiants pour correction automatique. Elle intègre une zone de drop avec glisser-déposer et un input de sélection multiple. Pour chaque fichier sélectionné, le nom, la taille et le statut sont affichés. Un champ de nom d'étudiant permet d'identifier chaque copie."),
        sp(),
        p("Lors du traitement, chaque fichier affiche un indicateur de progression en temps réel : 'OCR en cours' pendant l'extraction du texte, puis la note obtenue sur le total après correction. Un toast de notification confirme chaque correction réussie avec la note."),
        sp(),
        h3("4.2. Page des corrections"),
        p("La page des corrections centralise toutes les copies soumises pour tous les examens de l'enseignant. En haut, trois métriques affichent le total de copies, le nombre corrigées et le nombre en attente. Un filtre par examen permet de se concentrer sur un examen spécifique. Chaque copie est présentée en carte avec le statut (badge vert 'Corrigée' ou orange 'En attente'), le nom de l'étudiant, la date de soumission, la note obtenue, et des boutons d'action pour exporter en PDF ou voir le détail de l'examen."),
        sp(),
        h3("4.3. Correction manuelle"),
        p("La page de correction manuelle permet à l'enseignant de réviser ou compléter la correction automatique. Pour chaque question, la réponse de l'étudiant est affichée, accompagnée de la proposition de note et du feedback générés par l'IA. L'enseignant peut modifier la note manuellement via un champ numérique, éditer le feedback textuel, et déclencher une nouvelle correction IA pour une question spécifique via le bouton 'Corriger avec IA'. Un champ permet également de saisir la réponse correcte de référence pour améliorer les futures corrections."),
        sp(),
        h2("5. Statistiques et exports"),
        h3("5.1. Page des statistiques"),
        p("La page de statistiques offre une vue synthétique des performances de la plateforme pour l'enseignant connecté. Quatre cartes de métriques affichent le nombre total d'examens créés, le nombre total de copies soumises, le nombre total de questions créées, et la moyenne générale sur 20 de toutes les copies corrigées. Un graphique en barres horizontales représente la répartition des examens par matière avec le pourcentage de chaque matière."),
        sp(),
        h3("5.2. Exports"),
        p("Plusieurs formats d'export sont disponibles. L'export PDF génère un rapport de correction complet avec les informations de l'examen, les informations de la copie, la note finale et le détail par question. L'export CSV génère un fichier tabulaire avec pour chaque question la réponse de l'étudiant, la bonne réponse, les points obtenus et le feedback. L'export JSON retourne les données structurées de la correction pour intégration externe. Un export CSV de classe permet d'exporter les notes de tous les étudiants pour un examen donné."),
        sp(),
        h2("6. Application mobile étudiant"),
        p("L'application mobile destinée aux étudiants est développée pour être accessible via le frontend exam-service sur mobile. Elle est conçue avec une interface responsive adaptée aux petits écrans."),
        sp(),
        bullet("Écran de connexion identique à la version web mais optimisé pour mobile"),
        bullet("Dashboard étudiant affichant un résumé des examens disponibles et des derniers résultats"),
        bullet("Liste des examens publiés par les enseignants avec titre, matière et date"),
        bullet("Soumission de copie via upload de photo ou fichier PDF"),
        bullet("Consultation des résultats avec note, pourcentage, mention et feedback par question"),
        bullet("Historique complet des examens passés"),
        sp(),
        h2("Conclusion"),
        p("Ce chapitre a présenté les interfaces de la plateforme EduCheck AI. Le design adopte les principes modernes de l'UX/UI avec une attention particulière portée à la clarté, à l'efficacité et à l'accessibilité. L'interface enseignant offre toutes les fonctionnalités nécessaires à la gestion complète des examens et des corrections. L'application mobile étudiant complète l'écosystème en offrant un accès simple aux résultats. Le dernier chapitre présentera les tests et l'assurance qualité du système."),
        br()
      ]
    },
    // CHAPITRE 5
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } },
      children: [
        chapterCover("Chapitre 5", "Tests et Assurance Qualité"),
        br(),
        h2("Introduction"),
        p("Ce chapitre présente la démarche de tests et de validation mise en œuvre pour garantir la qualité et la fiabilité de la plateforme EduCheck AI. Les tests ont été réalisés à plusieurs niveaux : tests des endpoints API via Postman, tests de précision du pipeline IA, et tests de performance globale du système."),
        sp(),
        h2("1. Tests des API avec Postman"),
        p("Postman a été l'outil principal utilisé pour tester l'ensemble des endpoints de l'application. Des collections de tests ont été créées pour chaque microservice, permettant une exécution automatisée et reproductible."),
        sp(),
        h3("1.1. Tests de l'auth-service"),
        p("Le service d'authentification a été testé exhaustivement pour valider tous les cas nominaux et les cas d'erreur."),
        sp(),
        p("Pour l'endpoint POST /auth/register : le test avec des données valides (nom, email, mot de passe, rôle enseignant) retourne 200 OK avec le message 'Compte créé avec succès'. Le test avec un email déjà enregistré retourne 400 Bad Request avec le message 'Email déjà utilisé'. Le test avec un email au format invalide retourne 422 Unprocessable Entity avec les détails de validation Pydantic."),
        sp(),
        p("Pour l'endpoint POST /auth/login : le test avec des identifiants corrects retourne 200 OK avec les informations utilisateur et crée les quatre cookies (user_id, user_role, user_name, user_email) sur le domaine localhost. Le test avec un mot de passe incorrect retourne 401 Unauthorized. Le test avec un email inexistant retourne également 401 Unauthorized pour éviter l'énumération d'emails."),
        sp(),
        p("Pour l'endpoint GET /auth/me : le test avec les cookies valides présents dans la requête retourne 200 OK avec les informations de l'utilisateur connecté. Le test sans cookies retourne 401 Unauthorized."),
        sp(),
        h3("1.2. Tests de l'exam-service"),
        p("L'exam-service a fait l'objet de tests approfondis en raison de sa complexité."),
        sp(),
        p("Pour GET /exams : le test authentifié avec un cookie user_id valide retourne uniquement les examens de l'enseignant connecté. La vérification que les examens d'autres enseignants ne sont pas retournés a été effectuée avec deux comptes distincts. Le test non authentifié retourne 401 Unauthorized."),
        sp(),
        p("Pour POST /exams : le test de création d'examen avec les données complètes retourne 200 OK avec l'objet examen créé incluant son id et sa date de création. Le test de création avec un id_enseignant différent de l'utilisateur connecté retourne 403 Forbidden, validant la protection contre la création d'examens au nom d'un autre enseignant."),
        sp(),
        p("Pour POST /copies/upload-et-corriger : le test avec un fichier PDF valide et un exam_id existant déclenche le pipeline complet OCR → extraction → correction IA. Le résultat retourné inclut copie_id, exam_id, student_id, note, total, pourcentage, mention et details. Le test avec un fichier de format invalide retourne 400 Bad Request."),
        sp(),
        h3("1.3. Tests du pipeline IA"),
        p("Chaque service du pipeline IA a été testé indépendamment via Postman pour valider son comportement."),
        sp(),
        p("Pour POST /qcm/correct : le test avec une réponse correcte (index correspondant à la bonne réponse) retourne points_obtenus égal à points_question et correct à true. Le test avec une mauvaise réponse retourne points_obtenus à 0 et correct à false. Le test avec une réponse manquante retourne statut à 'non_repondu'. La précision mesurée est de 100% pour les réponses valides."),
        sp(),
        p("Pour POST /nlp/correct-open-ended : le test avec une réponse complète et une réponse de référence fournie retourne une évaluation précise avec feedback détaillé. Le test sans réponse de référence active le mode d'évaluation par pertinence. Le test avec une réponse vide retourne 0 points et le feedback 'Aucune réponse fournie'."),
        sp(),
        p("Pour POST /ai/correct (AI Gateway) : le test complet avec un examen mixte (QCM + ouvertes + calculs) valide l'orchestration correcte entre les services. Les résultats de chaque section sont bien agrégés par le Results Service avec la note totale, le pourcentage et la mention corrects."),
        sp(),
        h2("2. Tests de précision de l'IA"),
        p("La précision du pipeline de correction IA a été évaluée sur un ensemble de copies types représentatives des différents niveaux de qualité de réponse."),
        sp(),
        h3("2.1. Méthodologie d'évaluation"),
        p("Pour évaluer la précision, nous avons constitué un jeu de données de test composé de copies corrigées manuellement par un enseignant référent. Pour chaque question, la note attribuée manuellement a été comparée à la note attribuée automatiquement par le système."),
        sp(),
        h3("2.2. Résultats par type de question"),
        p("Pour les questions QCM, le système atteint une précision parfaite de 100% puisque la correction est déterministe (correspondance d'index). Aucune erreur n'est possible pour une réponse soumise dans le bon format."),
        sp(),
        p("Pour les questions de calcul, le système atteint une précision de 75%. Les cas d'erreur concernent principalement les démonstrations incomplètes où le modèle a accordé des points partiels différemment d'un correcteur humain, et les cas de notation intermédiaire où la subjectivité du correcteur joue un rôle important."),
        sp(),
        p("Pour les questions ouvertes, le système atteint une précision de 65%. Les principaux facteurs d'erreur sont les réponses formulées différemment de la réponse de référence mais sémantiquement équivalentes, les réponses partiellement correctes nécessitant une appréciation nuancée, et les questions sans réponse de référence où l'évaluation par pertinence seule est plus aléatoire."),
        sp(),
        h2("3. Tests de performance"),
        p("Les tests de performance ont été réalisés pour évaluer les temps de réponse du système dans des conditions représentatives d'utilisation réelle."),
        sp(),
        bullet(null, "Correction d'un QCM (10 questions) : ", "Moins de 1 seconde. La correction QCM étant purement algorithmique sans appel IA, elle est quasi-instantanée."),
        bullet(null, "Correction de questions ouvertes via Groq (5 questions) : ", "Entre 2 et 5 secondes selon la charge du service Groq. Les appels sont effectués séquentiellement pour éviter les limitations de taux."),
        bullet(null, "OCR sur une image A4 de bonne qualité : ", "Entre 3 et 6 secondes."),
        bullet(null, "OCR sur une image de mauvaise qualité : ", "Entre 8 et 15 secondes avec parfois des erreurs d'extraction."),
        bullet(null, "Pipeline complète (upload → OCR → extraction → correction → note finale) : ", "Entre 15 et 35 secondes selon le type et le nombre de questions."),
        bullet(null, "Export PDF d'une correction : ", "Moins de 2 secondes via ReportLab."),
        sp(),
        p("Ces performances sont jugées satisfaisantes pour un usage en conditions réelles. L'enseignant soumettant plusieurs copies simultanément verra les corrections arriver progressivement, chacune en moins d'une minute. Une optimisation future pourrait introduire des files d'attente et des traitements parallèles pour améliorer davantage les performances."),
        sp(),
        h2("Conclusion"),
        p("Ce chapitre a présenté la démarche de tests et de validation d'EduCheck AI. Les tests des API ont validé le bon fonctionnement de l'ensemble des endpoints dans les cas nominaux et les cas d'erreur. Les tests de précision ont montré des performances satisfaisantes du pipeline IA, en particulier pour les QCM. Les tests de performance ont confirmé la viabilité du système pour un usage en production. Ces résultats valident la qualité de la solution développée et sa capacité à répondre aux besoins identifiés."),
        br()
      ]
    },
    // CONCLUSION GÉNÉRALE
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } },
      children: [
        h1("Conclusion Générale"),
        sp(),
        p("Ce projet de fin d'études nous a permis de concevoir, développer et valider EduCheck AI, une plateforme web et mobile intelligente de correction automatique d'examens. Tout au long de ce travail de plusieurs mois, nous avons mobilisé et approfondi les compétences acquises durant notre formation en développement d'applications informatiques, en les enrichissant de nouvelles connaissances dans des domaines aussi divers que l'intelligence artificielle, les architectures microservices et le développement mobile."),
        sp(),
        p("La problématique initiale — comment automatiser la correction d'examens incluant différents types de questions tout en fournissant un feedback pédagogique pertinent — a trouvé une réponse concrète et fonctionnelle dans notre solution. L'architecture microservices composée de huit services indépendants, le pipeline IA intégrant Groq/LLaMA 4, et les interfaces React web et mobile constituent ensemble un écosystème complet et cohérent."),
        sp(),
        p("Les résultats obtenus sont encourageants. Sur le plan technique, nous avons réussi à implémenter un pipeline de correction automatique fonctionnel pour trois types de questions, avec des précisions de 100% pour les QCM, 75% pour les calculs et 65% pour les questions ouvertes. Sur le plan de la performance, le pipeline complet s'exécute en moins de 35 secondes, représentant un gain de temps d'environ 70% par rapport à la correction manuelle traditionnelle."),
        sp(),
        p("Ce projet nous a également permis de développer des compétences techniques précieuses. La conception et l'implémentation d'une architecture microservices nous a familiarisés avec les défis de la communication inter-services, de la gestion des authentifications distribuées et de l'orchestration de pipelines complexes. L'intégration des APIs Groq et LLaMA 4 nous a ouvert à l'univers des grands modèles de langage et à leur ingénierie de prompts. Le développement du frontend React avec les problématiques d'authentification cross-port nous a confrontés à des problèmes réels de développement web moderne."),
        sp(),
        p("Nous avons également rencontré plusieurs défis au cours du projet. La distinction entre les énoncés imprimés et les réponses manuscrites dans les copies scannées s'est avérée plus complexe que prévu, nécessitant une ingénierie de prompts Groq sophistiquée. La gestion de l'authentification entre deux frontends sur des ports différents a requis une solution créative avec les cookies HTTP. Les performances de l'OCR sur des copies de mauvaise qualité restent perfectibles."),
        sp(),
        p("Les perspectives d'amélioration et d'évolution du projet sont nombreuses. À court terme, nous envisageons la finalisation de l'application mobile React Native avec toutes les fonctionnalités prévues, la mise en place de Docker Compose pour simplifier le déploiement, et l'ajout de tests unitaires et d'intégration automatisés. À moyen terme, le support multilingue (arabe en particulier), un système de notifications en temps réel, et un tableau de bord analytique avancé pour les établissements constituent des axes d'amélioration majeurs. À long terme, un déploiement cloud sur AWS ou Azure, l'intégration d'un système anti-plagiat, et l'extension aux évaluations orales via la reconnaissance vocale représentent des évolutions ambitieuses."),
        sp(),
        p("Ce projet représente bien plus qu'un simple exercice académique. Il constitue une démonstration concrète de notre capacité à mener à bien un projet d'ingénierie logicielle complet, de la conception à la mise en production, en mobilisant des technologies de pointe. Nous espérons qu'EduCheck AI pourra, dans une version future, contribuer réellement à améliorer les conditions de travail des enseignants et la qualité du feedback pédagogique pour les étudiants."),
        br()
      ]
    },
    // WEBOGRAPHIE
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } },
      children: [
        h1("Webographie"),
        sp(),
        h2("Documentation officielle des frameworks et bibliothèques"),
        bullet("FastAPI — Documentation officielle : https://fastapi.tiangolo.com/"),
        bullet("React.js — Documentation officielle : https://react.dev/"),
        bullet("React Native — Documentation officielle : https://reactnative.dev/"),
        bullet("SQLAlchemy — Documentation ORM : https://www.sqlalchemy.org/"),
        bullet("Pydantic — Documentation validation : https://docs.pydantic.dev/"),
        bullet("pydantic-settings — Gestion configuration : https://docs.pydantic.dev/latest/concepts/pydantic_settings/"),
        bullet("React Router — Navigation React : https://reactrouter.com/"),
        bullet("Axios — Client HTTP : https://axios-http.com/docs/"),
        bullet("Framer Motion — Animations React : https://www.framer.com/motion/"),
        bullet("Tailwind CSS — Framework CSS : https://tailwindcss.com/docs/"),
        bullet("ReportLab — Génération PDF Python : https://www.reportlab.com/"),
        sp(),
        h2("Intelligence Artificielle et modèles LLM"),
        bullet("Groq — Plateforme d'inférence IA : https://console.groq.com/docs/"),
        bullet("LLaMA 4 Meta AI — Modèles de langage : https://ai.meta.com/blog/llama-4/"),
        bullet("Groq API Reference : https://console.groq.com/docs/api-reference"),
        bullet("Prompt Engineering Guide : https://www.promptingguide.ai/"),
        sp(),
        h2("Base de données"),
        bullet("PostgreSQL 15 — Documentation officielle : https://www.postgresql.org/docs/15/"),
        bullet("pgAdmin 4 — Interface d'administration : https://www.pgadmin.org/docs/"),
        bullet("SQLAlchemy Core et ORM : https://docs.sqlalchemy.org/"),
        sp(),
        h2("Sécurité et authentification"),
        bullet("Passlib — Hachage de mots de passe : https://passlib.readthedocs.io/"),
        bullet("FastAPI Security — Guide sécurité : https://fastapi.tiangolo.com/tutorial/security/"),
        bullet("OWASP — Bonnes pratiques sécurité web : https://owasp.org/"),
        sp(),
        h2("Architecture et bonnes pratiques"),
        bullet("Microservices.io — Patterns microservices : https://microservices.io/"),
        bullet("REST API Best Practices : https://restfulapi.net/"),
        bullet("12-Factor App — Principes d'application cloud-native : https://12factor.net/"),
        bullet("FastAPI Best Practices GitHub : https://github.com/zhanymkanov/fastapi-best-practices"),
        sp(),
        h2("Outils de développement"),
        bullet("Git — Documentation officielle : https://git-scm.com/doc"),
        bullet("Postman — Documentation API testing : https://learning.postman.com/docs/"),
        bullet("Visual Studio Code : https://code.visualstudio.com/docs"),
        bullet("httpx — Client HTTP asynchrone Python : https://www.python-httpx.org/"),
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('Rapport_PFE_EduCheck_AI_Final.docx', buffer);
  console.log('Rapport genere avec succes !');
}).catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});