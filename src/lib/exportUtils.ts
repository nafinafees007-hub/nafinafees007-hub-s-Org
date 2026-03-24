import { ResearchResult } from '../services/gemini';
import { jsPDF } from 'jspdf';

export function exportToMarkdown(result: ResearchResult) {
  let md = `# Research Report: ${result.overview.split('\n')[0].replace('#', '').trim()}\n\n`;
  
  md += `## Overview\n${result.overview}\n\n`;
  
  md += `## Simplified Concept\n${result.simplifiedConcept}\n\n`;
  
  md += `## Research Gap\n${result.researchGap}\n\n`;
  
  md += `## Current Study\n${result.currentStudy}\n\n`;
  
  md += `## Process Flowchart (Mermaid)\n\`\`\`mermaid\n${result.flowchart}\n\`\`\`\n\n`;
  
  md += `## Presentation Slides\n`;
  result.slides.forEach((slide, i) => {
    md += `### Slide ${i + 1}: ${slide.title}\n`;
    slide.content.forEach(item => {
      md += `- ${item}\n`;
    });
    md += '\n';
  });
  
  md += `## Citations\n`;
  result.citations.forEach(citation => {
    md += `- **${citation.title}**\n`;
    md += `  - Journal: ${citation.journal}\n`;
    md += `  - Date: ${citation.date}\n`;
    md += `  - Authors: ${citation.authors.join(', ')}\n`;
    md += `  - URL: ${citation.url}\n\n`;
  });
  
  md += `## Further Research Ideas\n`;
  md += `### Ideas\n${result.furtherResearch.ideas}\n\n`;
  md += `### Research Workflow (Mermaid)\n\`\`\`mermaid\n${result.furtherResearch.workflow}\n\`\`\`\n`;

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `research-report-${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPDF(result: ResearchResult) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = 20;

  const addText = (text: string, fontSize: number, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(color[0], color[1], color[2]);
    
    const lines = doc.splitTextToSize(text, contentWidth);
    
    // Check for page break
    if (y + (lines.length * (fontSize / 2)) > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
    
    doc.text(lines, margin, y);
    y += (lines.length * (fontSize / 2)) + 5;
  };

  // Title
  addText("Explore And Notion: Research Report", 24, true, [249, 115, 22]); // Orange
  y += 5;

  // Overview
  addText("Overview", 18, true);
  addText(result.overview, 11);
  y += 5;

  // Simplified Concept
  addText("Simplified Concept", 18, true);
  addText(result.simplifiedConcept, 11);
  y += 5;

  // Research Gap
  addText("Research Gap", 18, true, [249, 115, 22]);
  addText(result.researchGap, 11);
  y += 5;

  // Current Study
  addText("Current Study", 18, true);
  addText(result.currentStudy, 11);
  y += 5;

  // Slides
  addText("Presentation Slides", 18, true);
  result.slides.forEach((slide, i) => {
    addText(`Slide ${i + 1}: ${slide.title}`, 14, true);
    slide.content.forEach(item => {
      addText(`• ${item}`, 11);
    });
    y += 2;
  });
  y += 5;

  // Citations
  addText("Citations", 18, true);
  result.citations.forEach(citation => {
    addText(citation.title, 12, true);
    addText(`${citation.journal} • ${citation.date}`, 10, false, [100, 100, 100]);
    addText(`Authors: ${citation.authors.join(', ')}`, 10, false, [100, 100, 100]);
    addText(`URL: ${citation.url}`, 9, false, [0, 0, 255]);
    y += 3;
  });

  // Further Research Ideas
  addText("Further Research Ideas", 18, true);
  addText(result.furtherResearch.ideas, 11);

  doc.save(`research-report-${new Date().toISOString().split('T')[0]}.pdf`);
}
