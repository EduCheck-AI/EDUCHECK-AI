#!/usr/bin/env node

const fs = require('fs');
const { createCanvas } = require('canvas');

// Configuration des couleurs
const COLORS = {
    system: '#F5F5F5',
    auth_package: '#FFF9C4',
    teacher_package: '#E3F2FD',
    student_package: '#E8F5E9',
    uc_common: '#FFE082',
    uc_teacher: '#BBDEFB',
    uc_student: '#C8E6C9',
    teacher_actor: '#64B5F6',
    student_actor: '#81C784',
    border: '#757575',
    association: '#9E9E9E'
};

// Dessiner un acteur (stickman)
function drawActor(ctx, x, y, name, color, emoji) {
    ctx.save();
    
    // Tête
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Corps
    ctx.beginPath();
    ctx.moveTo(x, y + 12);
    ctx.lineTo(x, y + 36);
    ctx.stroke();
    
    // Bras
    ctx.beginPath();
    ctx.moveTo(x - 14, y + 22);
    ctx.lineTo(x + 14, y + 22);
    ctx.stroke();
    
    // Jambes
    ctx.beginPath();
    ctx.moveTo(x, y + 36);
    ctx.lineTo(x - 14, y + 50);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x, y + 36);
    ctx.lineTo(x + 14, y + 50);
    ctx.stroke();
    
    // Nom
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#000';
    ctx.fillText(name, x - 30, y + 65);
    ctx.font = '14px Arial';
    ctx.fillText(emoji, x - 8, y + 58);
    
    ctx.restore();
}

// Dessiner un cas d'utilisation
function drawUsecase(ctx, x, y, width, height, name, color) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, width / 2, height / 2, 0, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.font = '10px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Wrapping du texte
    const words = name.split(' ');
    let lines = [];
    let line = '';
    
    for (let word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > width - 20 && line) {
            lines.push(line);
            line = word;
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    
    const lineHeight = 12;
    const startY = y - (lines.length - 1) * lineHeight / 2;
    
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x, startY + i * lineHeight);
    }
    
    ctx.restore();
}

// Dessiner un package
function drawPackage(ctx, x, y, width, height, name, color) {
    ctx.save();
    
    // Corps du package
    ctx.fillStyle = color;
    ctx.fillRect(x - width / 2, y - height / 2, width, height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - width / 2, y - height / 2, width, height);
    
    // Onglet
    ctx.fillStyle = color;
    ctx.fillRect(x - width / 2, y - height / 2 - 10, 60, 20);
    ctx.strokeRect(x - width / 2, y - height / 2 - 10, 60, 20);
    
    // Titre
    ctx.font = 'bold 10px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText(name, x - width / 2 + 30, y - height / 2);
    
    ctx.restore();
}

// Dessiner le système
function drawSystem(ctx, x, y, width, height, name) {
    ctx.save();
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(x - width / 2, y - height / 2, width, height);
    ctx.setLineDash([]);
    
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText(name, x, y - height / 2 + 20);
    ctx.restore();
}

function main() {
    // Créer le canvas
    const width = 1200;
    const height = 900;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Fond blanc
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    
    // Définir les éléments (à adapter selon votre JSON)
    const elements = {
        actors: [
            { name: 'Enseignant', x: 100, y: 300, color: COLORS.teacher_actor, emoji: '👨‍🏫' },
            { name: 'Étudiant', x: 100, y: 550, color: COLORS.student_actor, emoji: '👨‍🎓' }
        ],
        packages: [
            { name: '🔐 Authentification', x: 400, y: 150, width: 180, height: 80, color: COLORS.auth_package },
            { name: '✏️ Actions Enseignant', x: 400, y: 380, width: 650, height: 300, color: COLORS.teacher_package },
            { name: '📚 Actions Étudiant', x: 400, y: 650, width: 500, height: 120, color: COLORS.student_package }
        ],
        usecases: [
            { name: 'Se connecter', x: 490, y: 150, width: 100, height: 40, color: COLORS.uc_common },
            { name: 'Créer examen', x: 250, y: 300, width: 100, height: 40, color: COLORS.uc_teacher },
            { name: 'Ajouter questions', x: 400, y: 300, width: 100, height: 40, color: COLORS.uc_teacher },
            { name: 'Importer examen', x: 550, y: 300, width: 100, height: 40, color: COLORS.uc_teacher },
            { name: 'Publier examen', x: 250, y: 370, width: 100, height: 40, color: COLORS.uc_teacher },
            { name: 'Uploader copies', x: 400, y: 370, width: 100, height: 40, color: COLORS.uc_teacher },
            { name: 'Lancer correction', x: 550, y: 370, width: 100, height: 40, color: COLORS.uc_teacher },
            { name: 'Consulter corrections', x: 250, y: 440, width: 100, height: 40, color: COLORS.uc_teacher },
            { name: 'Corriger manuelle', x: 400, y: 440, width: 100, height: 40, color: COLORS.uc_teacher },
            { name: 'Exporter résultats', x: 550, y: 440, width: 100, height: 40, color: COLORS.uc_teacher },
            { name: 'Consulter stats', x: 400, y: 510, width: 100, height: 40, color: COLORS.uc_teacher },
            { name: 'Consulter notes', x: 350, y: 650, width: 100, height: 40, color: COLORS.uc_student },
            { name: 'Consulter feedback', x: 550, y: 650, width: 100, height: 40, color: COLORS.uc_student }
        ]
    };
    
    // Dessiner le système
    drawSystem(ctx, 550, 450, 800, 600, '📦 Système EduCheck AI');
    
    // Dessiner les packages
    for (const pkg of elements.packages) {
        drawPackage(ctx, pkg.x, pkg.y, pkg.width, pkg.height, pkg.name, pkg.color);
    }
    
    // Dessiner les cas d'utilisation
    for (const uc of elements.usecases) {
        drawUsecase(ctx, uc.x, uc.y, uc.width, uc.height, uc.name, uc.color);
    }
    
    // Dessiner les acteurs
    for (const actor of elements.actors) {
        drawActor(ctx, actor.x, actor.y, actor.name, actor.color, actor.emoji);
    }
    
    // Dessiner les associations (lignes)
    ctx.beginPath();
    ctx.strokeStyle = COLORS.association;
    ctx.lineWidth = 1.5;
    
    // Enseignant → UC
    const teacherLines = [
        [130, 300, 200, 300], [130, 300, 200, 370], [130, 300, 200, 440],
        [130, 300, 350, 300], [130, 300, 350, 370], [130, 300, 350, 440],
        [130, 300, 500, 300], [130, 300, 500, 370], [130, 300, 500, 440],
        [130, 300, 350, 510]
    ];
    
    for (const line of teacherLines) {
        ctx.beginPath();
        ctx.moveTo(line[0], line[1]);
        ctx.lineTo(line[2], line[3]);
        ctx.stroke();
    }
    
    // Étudiant → UC
    ctx.beginPath();
    ctx.moveTo(130, 550);
    ctx.lineTo(490, 170);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(130, 550);
    ctx.lineTo(350, 670);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(130, 550);
    ctx.lineTo(550, 670);
    ctx.stroke();
    
    // Titre
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText('Diagramme de cas d\'utilisation - EduCheck AI', width / 2, 30);
    
    // Sauvegarde
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('usecase_diagram.png', buffer);
    console.log('✅ Diagramme généré : usecase_diagram.png');
}

main();