import React from 'react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

/**
 * Convertit une notation OCR en LaTeX valide pour KaTeX
 */
function toLatexInner(s) {
  s = s.replace(/\+inf\b/g, '+\\infty');
  s = s.replace(/-inf\b/g, '-\\infty');
  s = s.replace(/_\(([^)]+)\)/g, '_{$1}');
  s = s.replace(/\^\(([^)]+)\)/g, '^{$1}');
  return s;
}

function toLatex(s) {
  if (!s) return '';

  // 1. Fractions : (a)/(b) en premier
  s = s.replace(/\(([^)]+)\)\/\(([^)]+)\)/g, (_, a, b) =>
    `\\frac{${toLatexInner(a)}}{${toLatexInner(b)}}`
  );

  // 2. Indices avec parenthèses : u_(n+1) → u_{n+1}
  s = s.replace(/_\(([^)]+)\)/g, '_{$1}');

  // 3. Exposants avec parenthèses : e^(-2n) → e^{-2n}
  s = s.replace(/\^\(([^)]+)\)/g, '^{$1}');

  // 4. Racines
  s = s.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');

  // 5. Limites
  s = s.replace(/lim_\(([^)]+)->([^)]+)\)/g, (_, v, to) =>
    `\\lim_{${v}\\to ${toLatexInner(to)}}`
  );

  // 6. Infini
  s = s.replace(/\+inf\b/g, '+\\infty');
  s = s.replace(/-inf\b/g, '-\\infty');

  // 7. Ensembles
  s = s.replace(/\bIN\*/g, '\\mathbb{N}^*');
  s = s.replace(/\bIN\b/g, '\\mathbb{N}');
  s = s.replace(/\bIR\b/g, '\\mathbb{R}');
  s = s.replace(/\bIZ\b/g, '\\mathbb{Z}');

  // 8. Inégalités
  s = s.replace(/<=|≤/g, '\\leq');
  s = s.replace(/>=|≥/g, '\\geq');

  return s;
}

/**
 * Découpe le texte en segments texte/math
 */
function splitSegments(text) {
  if (!text) return [];

  // Pattern : détecte les fragments mathématiques dans le texte
  const mathRegex = /((?:\([^)]+\)\/\([^)]+\))|(?:lim_\([^)]+\))|(?:sqrt\([^)]+\))|(?:[a-zA-Z]+_\([^)]+\))|(?:[a-zA-Z]+\^\([^)]+\))|(?:[a-zA-Z]_[a-zA-Z0-9*+\-]+)|(?:[a-zA-Z]\^[a-zA-Z0-9*+\-]+)|(?:\+inf\b)|(?:-inf\b)|(?:\bIN\*)|(?:\bIN\b)|(?:\bIR\b)|(?:<=)|(?:>=)|(?:≤)|(?:≥))/g;

  const segments = [];
  let last = 0;
  let match;

  while ((match = mathRegex.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', content: text.slice(last, match.index) });
    }
    segments.push({ type: 'math', content: match[0] });
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    segments.push({ type: 'text', content: text.slice(last) });
  }

  return segments;
}

const MathText = ({ text }) => {
  if (!text) return null;

  const segments = splitSegments(text);

  if (segments.length === 0) return <span>{text}</span>;

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === 'math') {
          const latex = toLatex(seg.content);
          try {
            return <InlineMath key={i} math={latex} />;
          } catch {
            return <span key={i}>{seg.content}</span>;
          }
        }
        return <span key={i}>{seg.content}</span>;
      })}
    </span>
  );
};

export default MathText;