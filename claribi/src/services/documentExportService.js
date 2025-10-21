import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

/**
 * Document Export Service
 * Handles PDF and Word document generation with markdown formatting support
 */
class DocumentExportService {
    /**
     * Parse markdown content for document generation
     * @param {string} content - Markdown content to parse
     * @returns {Array} Array of parsed elements with type and text
     */
    parseMarkdownForDocument(content) {
        if (!content) return [];
        
        const lines = content.split('\n');
        const elements = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('# ')) {
                elements.push({ type: 'h1', text: line.substring(2) });
            } else if (line.startsWith('## ')) {
                elements.push({ type: 'h2', text: line.substring(3) });
            } else if (line.startsWith('### ')) {
                elements.push({ type: 'h3', text: line.substring(4) });
            } else if (line.startsWith('#### ')) {
                elements.push({ type: 'h4', text: line.substring(5) });
            } else if (line.startsWith('- ') || line.startsWith('* ')) {
                elements.push({ type: 'list', text: line.substring(2) });
            } else if (line.startsWith('1. ')) {
                elements.push({ type: 'numbered', text: line.substring(3) });
            } else if (line.startsWith('```')) {
                // Code block - collect all lines until closing ```
                const codeLines = [];
                i++;
                while (i < lines.length && !lines[i].trim().startsWith('```')) {
                    codeLines.push(lines[i]);
                    i++;
                }
                elements.push({ type: 'code', text: codeLines.join('\n') });
            } else if (line.length > 0) {
                // Preserve markdown formatting for document generation
                elements.push({ type: 'paragraph', text: line });
            } else {
                elements.push({ type: 'empty' });
            }
        }
        
        return elements;
    }

    /**
     * Parse inline markdown formatting (bold, italic, code)
     * @param {string} text - Text to parse
     * @returns {Array} Array of TextRun objects with formatting
     */
    parseInlineFormatting(text) {
        const runs = [];
        
        // Enhanced regex patterns for markdown formatting
        const patterns = [
            { regex: /\*\*(.*?)\*\*/g, style: 'bold' },
            { regex: /\*(.*?)\*/g, style: 'italic' },
            { regex: /`(.*?)`/g, style: 'code' }
        ];
        
        const matches = [];
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[1],
                    style: pattern.style,
                    fullMatch: match[0]
                });
            }
        });
        
        // Sort matches by start position
        matches.sort((a, b) => a.start - b.start);
        
        let lastIndex = 0;
        matches.forEach(match => {
            // Add text before the match
            if (match.start > lastIndex) {
                const beforeText = text.substring(lastIndex, match.start);
                if (beforeText) {
                    runs.push(new TextRun({
                        text: beforeText
                    }));
                }
            }
            
            // Add the formatted text
            const runOptions = { text: match.text };
            if (match.style === 'bold') {
                runOptions.bold = true;
            } else if (match.style === 'italic') {
                runOptions.italics = true;
            } else if (match.style === 'code') {
                runOptions.font = { name: 'Courier New' };
                runOptions.size = 20;
                runOptions.shading = { fill: 'F5F5F5' }; // Light gray background for code
            }
            
            runs.push(new TextRun(runOptions));
            lastIndex = match.end;
        });
        
        // Add remaining text
        if (lastIndex < text.length) {
            const remainingText = text.substring(lastIndex);
            if (remainingText) {
                runs.push(new TextRun({
                    text: remainingText
                }));
            }
        }
        
        return runs.length > 0 ? runs : [new TextRun({ text: text })];
    }

    /**
     * Create Word document from parsed elements
     * @param {string} title - Document title
     * @param {Array} elements - Parsed markdown elements
     * @returns {Document} Word document object
     */
    createWordDocument(title, elements) {
        const children = [];
        
        // Add title
        children.push(
            new Paragraph({
                text: title,
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
            })
        );
        
        elements.forEach(element => {
            switch (element.type) {
                case 'h1':
                    children.push(
                        new Paragraph({
                            children: this.parseInlineFormatting(element.text),
                            heading: HeadingLevel.HEADING_1,
                            spacing: { before: 400, after: 200 }
                        })
                    );
                    break;
                case 'h2':
                    children.push(
                        new Paragraph({
                            children: this.parseInlineFormatting(element.text),
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 300, after: 150 }
                        })
                    );
                    break;
                case 'h3':
                    children.push(
                        new Paragraph({
                            children: this.parseInlineFormatting(element.text),
                            heading: HeadingLevel.HEADING_3,
                            spacing: { before: 200, after: 100 }
                        })
                    );
                    break;
                case 'h4':
                    children.push(
                        new Paragraph({
                            children: this.parseInlineFormatting(element.text),
                            heading: HeadingLevel.HEADING_4,
                            spacing: { before: 150, after: 100 }
                        })
                    );
                    break;
                case 'list':
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: '• ' }),
                                ...this.parseInlineFormatting(element.text)
                            ],
                            spacing: { before: 100, after: 50 }
                        })
                    );
                    break;
                case 'numbered':
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: '1. ' }),
                                ...this.parseInlineFormatting(element.text)
                            ],
                            spacing: { before: 100, after: 50 }
                        })
                    );
                    break;
                case 'code':
                    children.push(
                        new Paragraph({
                            text: element.text,
                            spacing: { before: 100, after: 100 },
                            children: [
                                new TextRun({
                                    text: element.text,
                                    font: { name: 'Courier New' },
                                    size: 20
                                })
                            ]
                        })
                    );
                    break;
                case 'paragraph':
                    // Parse inline formatting and preserve markdown
                    const textRuns = this.parseInlineFormatting(element.text);
                    children.push(
                        new Paragraph({
                            children: textRuns,
                            spacing: { before: 100, after: 100 }
                        })
                    );
                    break;
                case 'empty':
                    children.push(new Paragraph({ text: '' }));
                    break;
            }
        });
        
        return new Document({
            sections: [{
                properties: {},
                children: children
            }]
        });
    }

    /**
     * Parse markdown text into parts with formatting for PDF
     * @param {string} text - Text to parse
     * @returns {Array} Array of text parts with formatting info
     */
    parseMarkdownText(text) {
        const parts = [];
        let currentText = text;
        let lastIndex = 0;
        
        // Find all markdown patterns
        const patterns = [
            { regex: /\*\*(.*?)\*\*/g, style: 'bold' },
            { regex: /\*(.*?)\*/g, style: 'italic' },
            { regex: /`(.*?)`/g, style: 'code' }
        ];
        
        const matches = [];
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[1],
                    style: pattern.style,
                    fullMatch: match[0]
                });
            }
        });
        
        // Sort matches by start position
        matches.sort((a, b) => a.start - b.start);
        
        // Build parts array
        matches.forEach(match => {
            // Add text before the match
            if (match.start > lastIndex) {
                const beforeText = text.substring(lastIndex, match.start);
                if (beforeText) {
                    parts.push({ text: beforeText, style: 'normal' });
                }
            }
            
            // Add the formatted text
            parts.push({ text: match.text, style: match.style });
            lastIndex = match.end;
        });
        
        // Add remaining text
        if (lastIndex < text.length) {
            const remainingText = text.substring(lastIndex);
            if (remainingText) {
                parts.push({ text: remainingText, style: 'normal' });
            }
        }
        
        return parts.length > 0 ? parts : [{ text: text, style: 'normal' }];
    }

    /**
     * Create PDF document from parsed elements
     * @param {string} title - Document title
     * @param {Array} elements - Parsed markdown elements
     * @returns {jsPDF} PDF document object
     */
    createPDFDocument(title, elements) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);
        let yPosition = margin;
        
        // Helper function to check if we need a new page
        const checkPageBreak = (requiredHeight) => {
            if (yPosition + requiredHeight > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
                return true;
            }
            return false;
        };
        
        // Helper function to add text with proper wrapping and markdown formatting
        const addText = (text, x, y, maxWidth, fontSize = 10, fontStyle = 'normal') => {
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', fontStyle);
            const lines = doc.splitTextToSize(text, maxWidth);
            doc.text(lines, x, y);
            return lines.length * (fontSize * 0.35); // Approximate line height
        };

        // Helper function to add formatted text with markdown support
        const addFormattedText = (text, x, y, maxWidth, fontSize = 10) => {
            // Parse markdown formatting and add text with different styles
            const parts = this.parseMarkdownText(text);
            let currentX = x;
            let currentY = y;
            let lineHeight = fontSize * 0.35;
            
            parts.forEach(part => {
                if (currentX + doc.getTextWidth(part.text) > x + maxWidth) {
                    // Move to next line
                    currentY += lineHeight;
                    currentX = x;
                }
                
                doc.setFontSize(fontSize);
                if (part.style === 'bold') {
                    doc.setFont('helvetica', 'bold');
                } else if (part.style === 'italic') {
                    doc.setFont('helvetica', 'italic');
                } else if (part.style === 'code') {
                    doc.setFont('courier', 'normal');
                    doc.setFontSize(fontSize - 1);
                } else {
                    doc.setFont('helvetica', 'normal');
                }
                
                doc.text(part.text, currentX, currentY);
                currentX += doc.getTextWidth(part.text);
            });
            
            return currentY - y + lineHeight;
        };
        
        // Add title
        checkPageBreak(25);
        const titleHeight = addText(title, margin, yPosition, maxWidth, 20, 'bold');
        yPosition += titleHeight + 10;
        
        // Add content
        elements.forEach(element => {
            let elementHeight = 0;
            
            switch (element.type) {
                case 'h1':
                    elementHeight = addFormattedText(element.text, margin, yPosition, maxWidth, 16);
                    yPosition += elementHeight + 5;
                    break;
                case 'h2':
                    elementHeight = addFormattedText(element.text, margin, yPosition, maxWidth, 14);
                    yPosition += elementHeight + 5;
                    break;
                case 'h3':
                    elementHeight = addFormattedText(element.text, margin, yPosition, maxWidth, 12);
                    yPosition += elementHeight + 4;
                    break;
                case 'h4':
                    elementHeight = addFormattedText(element.text, margin, yPosition, maxWidth, 11);
                    yPosition += elementHeight + 3;
                    break;
                case 'list':
                    // Handle bullet points with proper indentation and markdown formatting
                    const listText = `• ${element.text}`;
                    elementHeight = addFormattedText(listText, margin + 10, yPosition, maxWidth - 10, 10);
                    yPosition += elementHeight + 3;
                    break;
                case 'numbered':
                    // Handle numbered lists with proper indentation and markdown formatting
                    const numberedText = `1. ${element.text}`;
                    elementHeight = addFormattedText(numberedText, margin + 10, yPosition, maxWidth - 10, 10);
                    yPosition += elementHeight + 3;
                    break;
                case 'code':
                    // Handle code blocks with monospace font and proper wrapping
                    checkPageBreak(20);
                    doc.setFontSize(9);
                    doc.setFont('courier', 'normal');
                    const codeLines = doc.splitTextToSize(element.text, maxWidth - 20);
                    doc.text(codeLines, margin + 10, yPosition);
                    elementHeight = codeLines.length * 3.5; // Monospace line height
                    yPosition += elementHeight + 5;
                    break;
                case 'paragraph':
                    // Handle regular paragraphs with markdown formatting
                    elementHeight = addFormattedText(element.text, margin, yPosition, maxWidth, 10);
                    yPosition += elementHeight + 4;
                    break;
                case 'empty':
                    yPosition += 5;
                    break;
            }
            
            // Check if we need a new page after adding content
            if (yPosition > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
            }
        });
        
        return doc;
    }

    /**
     * Export content as Word document
     * @param {string} title - Document title
     * @param {string} content - Markdown content
     * @returns {Promise<Blob>} Word document blob
     */
    async exportAsWord(title, content) {
        const elements = this.parseMarkdownForDocument(content);
        const doc = this.createWordDocument(title, elements);
        
        try {
            // Use toBase64String for better browser compatibility
            const base64 = await Packer.toBase64String(doc);
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return new Blob([bytes], { 
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            });
        } catch (error) {
            console.error('Word export failed:', error);
            throw new Error(`Failed to generate Word document: ${error.message}`);
        }
    }

    /**
     * Export content as PDF document
     * @param {string} title - Document title
     * @param {string} content - Markdown content
     * @returns {jsPDF} PDF document object
     */
    exportAsPDF(title, content) {
        const elements = this.parseMarkdownForDocument(content);
        return this.createPDFDocument(title, elements);
    }

    /**
     * Export content as HTML document
     * @param {string} title - Document title
     * @param {string} content - Markdown content
     * @returns {Blob} HTML document blob
     */
    exportAsHTML(title, content) {
        const htmlContent = content
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        const fileContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.6;
        }
        h1 { 
            color: #333; 
            border-bottom: 2px solid #333; 
            padding-bottom: 10px;
        }
        h2 { 
            color: #666; 
            margin-top: 30px;
        }
        h3 { color: #888; }
        p { margin-bottom: 15px; }
        code { 
            background-color: #f4f4f4; 
            padding: 2px 4px; 
            border-radius: 3px; 
        }
        strong { color: #333; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <p>${htmlContent}</p>
</body>
</html>`;
        
        return new Blob([fileContent], { type: 'text/html' });
    }

    /**
     * Download a blob as a file
     * @param {Blob} blob - File blob to download
     * @param {string} filename - Name of the file to download
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Main export function that handles all export formats
     * @param {string} sectionName - Name of the section
     * @param {string} content - Markdown content to export
     * @param {string} format - Export format ('html', 'word', 'pdf')
     * @param {string} sectionTitle - Display title for the section
     * @returns {Promise<void>}
     */
    async exportSection(sectionName, content, format = 'html', sectionTitle = null) {
        if (!content) {
            throw new Error('No content to export. Please generate the section first.');
        }

        const title = sectionTitle || sectionName;
        
        try {
            console.log(`Starting ${format.toUpperCase()} export for:`, title);
            
            switch (format) {
                case 'word':
                    console.log('Generating Word document...');
                    const wordBlob = await this.exportAsWord(title, content);
                    console.log('Word document generated, downloading...');
                    this.downloadBlob(wordBlob, `${title.replace(/\s+/g, '_')}_Documentation.docx`);
                    console.log('Word document download initiated');
                    break;
                    
                case 'pdf':
                    console.log('Generating PDF document...');
                    const pdfDoc = this.exportAsPDF(title, content);
                    console.log('PDF document generated, downloading...');
                    pdfDoc.save(`${title.replace(/\s+/g, '_')}_Documentation.pdf`);
                    console.log('PDF document download initiated');
                    break;
                    
                case 'html':
                default:
                    console.log('Generating HTML document...');
                    const htmlBlob = this.exportAsHTML(title, content);
                    console.log('HTML document generated, downloading...');
                    this.downloadBlob(htmlBlob, `${title.replace(/\s+/g, '_')}_Documentation.html`);
                    console.log('HTML document download initiated');
                    break;
            }
        } catch (error) {
            console.error('Export error:', error);
            throw new Error(`Failed to export ${format.toUpperCase()} document: ${error.message}`);
        }
    }
}

// Export singleton instance
export default new DocumentExportService();
