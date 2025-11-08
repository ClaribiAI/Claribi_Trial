import { marked } from 'marked';
import html2pdf from 'html2pdf.js';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    Table,
    TableCell,
    TableRow,
    WidthType,
    BorderStyle
} from 'docx';

/**
 * Document Export Service
 * Handles PDF, Word, and HTML document generation from markdown content.
 *
 * This refactored service uses 'marked' for robust markdown parsing
 * and 'html2pdf.js' for reliable PDF layout, replacing manual
 * regex and PDF text-flow logic.
 */
class DocumentExportService {

    /**
     * Main export function that handles all export formats.
     * @param {string} sectionName - Name of the section
     * @param {string} content - Markdown content to export
     * @param {string} format - Export format ('html', 'word', 'pdf')
     * @param {string} sectionTitle - Display title for the section
     * @param {string} pbixFileName - PBIX file name (used for PDF header)
     * @returns {Promise<void>}
     */
    async exportSection(sectionName, content, format = 'html', sectionTitle = null, pbixFileName = null) {
        if (!content) {
            throw new Error('No content to export. Please generate the section first.');
        }

        const title = sectionTitle || sectionName;
        const filename = `${title.replace(/\s+/g, '_')}_Documentation`;

        try {
            console.log(`Starting ${format.toUpperCase()} export for:`, title);

            switch (format) {
                case 'word':
                    const wordBlob = await this.exportAsWord(title, content);
                    this.downloadBlob(wordBlob, `${filename}.docx`);
                    break;

                case 'pdf':
                    // html2pdf.js handles its own download/save process
                    await this.exportAsPDF(title, content, filename, pbixFileName);
                    break;

                case 'html':
                default:
                    const htmlBlob = this.exportAsHTML(title, content);
                    this.downloadBlob(htmlBlob, `${filename}.html`);
                    break;
            }
            console.log(`${format.toUpperCase()} export download initiated.`);

        } catch (error) {
            console.error('Export error:', error);
            throw new Error(`Failed to export ${format.toUpperCase()} document: ${error.message}`);
        }
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

    // --- HTML Exporter ---

    /**
     * Export content as HTML document
     * @param {string} title - Document title
     * @param {string} content - Markdown content
     * @returns {Blob} HTML document blob
     */
    exportAsHTML(title, content) {
        // Use marked to parse the markdown content into HTML
        const htmlContent = marked.parse(content);

        const fileContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1, h2, h3, h4 { page-break-after: avoid; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 1em; page-break-inside: avoid; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background-color: #f4f4f4; }
        code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: 'Courier New', monospace; }
        pre { background-color: #f4f4f4; padding: 10px; border-radius: 3px; overflow-x: auto; page-break-inside: avoid; }
        blockquote { border-left: 4px solid #ddd; padding-left: 10px; color: #555; margin-left: 0; }
        @media print { body { margin: 0; max-width: 100%; } }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${htmlContent}
</body>
</html>`;

        return new Blob([fileContent], { type: 'text/html' });
    }

/**
     * Export content as PDF document
     * This now uses html2pdf.js, which leverages the browser's
     * rendering engine for perfect, reliable layout.
     * @param {string} title - Document title
     * @param {string} content - Markdown content
     * @param {string} filename - Filename for download
     * @param {string} pbixFileName - PBIX file name for header
     * @returns {Promise<void>}
     */
async exportAsPDF(title, content, filename, pbixFileName = '') {
    // 1. Get robust HTML from marked
    const htmlContent = marked.parse(content);

    // 2. Create a full HTML document string to pass to html2pdf
    // We include styles for layout and page-breaking
    const fullHtml = `
        <html>
        <head>
            <style>
                /* * FIX 1: Restored !important rules.
                 * This is required to override browser/OS dark modes
                 * which html2canvas can accidentally pick up.
                 */
                * { color: #000000 !important; }
                body { 
                    font-family: Arial, sans-serif; 
                    line-height: 1.6; 
                    color: #000000;
                    background-color: #ffffff;
                }
                h1, h2, h3, h4, h5, h6 { 
                    page-break-after: avoid; 
                    color: #000000 !important; 
                }
                h1 { 
                    font-size: 24pt; 
                    border-bottom: 1px solid #999; 
                    color: #000000 !important;
                }
                h2 { 
                    font-size: 18pt; 
                    color: #000000 !important;
                }
                h3 { 
                    font-size: 14pt; 
                    color: #000000 !important;
                }
                p { 
                    page-break-inside: avoid; 
                    color: #000000 !important;
                }
                table { 
                    border-collapse: collapse; 
                    width: 100%; 
                    page-break-inside: avoid; 
                }
                th, td { 
                    border: 1px solid #ccc; 
                    padding: 6px; 
                    text-align: left; 
                    color: #000000 !important;
                }
                th { 
                    background-color: #f2f2f2; 
                    color: #000000 !important;
                }
                ul, ol { 
                    page-break-inside: avoid;
                    margin: 10px 0;
                    padding-left: 30px;
                    color: #000000 !important;
                }
                ul {
                    list-style-type: disc;
                }
                ol {
                    list-style-type: decimal;
                }
                li {
                    color: #000000 !important;
                    margin: 5px 0;
                    line-height: 1.6;
                    padding-left: 5px;
                }
                ul ul, ol ol, ul ol, ol ul {
                    margin-top: 5px;
                    margin-bottom: 5px;
                }
                ul ul {
                    list-style-type: circle;
                }
                ul ul ul {
                    list-style-type: square;
                }

                /* * FIX 2: Reverted <code> style to be INLINE.
                 * This fixes the 42-page layout bug. It will no longer
                 * force inline code (like 'Fact') onto a new line.
                 * This ALSO means your multi-line DAX will be unreadable again.
                 * See the explanation below this code block.
                 */
                code { 
                    background-color: #f4f4f4; 
                    padding: 2px 4px; 
                    border-radius: 3px; 
                    font-family: 'Courier New', monospace; 
                    color: #000000 !important;
                    white-space: nowrap; /* Prevent inline code from wrapping */
                }

                /* * This is the style for CORRECTLY formatted code blocks.
                 * It will be used when you fix the markdown generation.
                 */
                pre { 
                    background-color: #f4f4f4; 
                    padding: 10px; 
                    border-radius: 3px; 
                    overflow-x: auto; 
                    page-break-inside: avoid; 
                    white-space: pre-wrap; /* This makes code blocks readable */
                    word-wrap: break-word; 
                    color: #000000 !important;
                }
                pre code {
                    /* Reset styles for <code> inside <pre> */
                    background-color: transparent !important;
                    padding: 0;
                    white-space: pre-wrap !important; /* Allow wrapping inside pre */
                }
                blockquote { 
                    border-left: 4px solid #ddd; 
                    padding-left: 10px; 
                    color: #000000 !important; 
                    margin-left: 0; 
                }
                .pdf-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 0;
                    margin-bottom: 20px;
                    border-bottom: 1px solid #ddd;
                }
                .pdf-header-left {
                    display: flex;
                    align-items: center;
                    font-size: 16pt;
                    font-weight: normal;
                    color: #000000 !important;
                }
                .pdf-header-logo {
                    height: 30px;
                    width: auto;
                }
            </style>
        </head>
        <body style="color: #000000; background-color: #ffffff;">
            <div class="pdf-header">
                <div class="pdf-header-left">
                    <span>Clar</span><span style="color: #FFCC00 !important;">bi </span><span> Console</span>
                </div>
                <img src="/claribi_icon_logo_light.png" alt="Claribi Logo" class="pdf-header-logo" />
            </div>
            <h1 style="color: #000000 !important;">${title}</h1>
            ${pbixFileName ? `<p style="color: #000000 !important; font-size: 10pt;">Source File: ${pbixFileName}</p>` : ''}
            ${htmlContent}
        </body>
        </html>`;

    // 3. Configure html2pdf.js
    const options = {
        margin: [0.75, 0.75, 0.75, 0.75], // top, left, bottom, right (in inches)
        filename: `${filename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            backgroundColor: '#ffffff', // Explicitly set background
            logging: false,
            letterRendering: true
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // 4. Run the export with page numbering
    // Get the jsPDF instance and add page numbers before saving
    return html2pdf()
        .set(options)
        .from(fullHtml)
        .toPdf()
        .get('pdf')
        .then((pdfDoc) => {
            const totalPages = pdfDoc.internal.pages.length - 1;
            const pageWidth = pdfDoc.internal.pageSize.getWidth();
            const pageHeight = pdfDoc.internal.pageSize.getHeight();
            
            // Add page numbers to each page
            for (let i = 1; i <= totalPages; i++) {
                pdfDoc.setPage(i);
                pdfDoc.setFontSize(10);
                pdfDoc.setTextColor(102, 102, 102); // Gray color
                pdfDoc.setFont('helvetica', 'normal');
                
                const pageText = `Page ${i} of ${totalPages}`;
                const textWidth = pdfDoc.getTextWidth(pageText);
                const x = (pageWidth - textWidth) / 2; // Center horizontally
                const y = pageHeight - 0.5; // 0.5 inches from bottom
                
                pdfDoc.text(pageText, x, y);
            }
            
            // Save the PDF
            pdfDoc.save(`${filename}.pdf`);
        });
}

    // --- Word (DOCX) Exporter ---

    /**
     * Export content as Word document
     * @param {string} title - Document title
     * @param {string} content - Markdown content
     * @returns {Promise<Blob>} Word document blob
     */
    async exportAsWord(title, content) {
        // 1. Parse the markdown into an Abstract Syntax Tree (AST)
        const ast = marked.lexer(content);

        // 2. Create the Word document structure from the AST
        const doc = this.createWordDocument(title, ast);

        // 3. Use Packer.toBlob() - it's async and returns a Blob directly
        try {
            const blob = await Packer.toBlob(doc);
            return blob;
        } catch (error) {
            console.error('Word export failed:', error);
            throw new Error(`Failed to generate Word document: ${error.message}`);
        }
    }

    /**
     * Create Word document from marked's AST
     * @param {string} title - Document title
     * @param {Array} ast - Parsed markdown token stream from marked.lexer()
     * @returns {Document} Word document object
     */
    createWordDocument(title, ast) {
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
        
        // Loop through the AST tokens and build docx components
        ast.forEach(token => {
            switch (token.type) {
                case 'heading':
                    children.push(
                        new Paragraph({
                            children: this.parseInlineTokens(token.tokens),
                            heading: this.getDocxHeading(token.depth),
                            spacing: { before: 200, after: 100 }
                        })
                    );
                    break;

                case 'paragraph':
                    children.push(
                        new Paragraph({
                            children: this.parseInlineTokens(token.tokens),
                            spacing: { before: 100, after: 100 }
                        })
                    );
                    break;

                case 'list':
                    token.items.forEach(item => {
                        // Access the text tokens correctly
                        const inlineTokens = item.tokens && item.tokens.length > 0 ? item.tokens[0].tokens : [{ type: 'text', raw: item.text, text: item.text }];
                    children.push(
                        new Paragraph({
                                children: this.parseInlineTokens(inlineTokens),
                                bullet: { level: token.depth || 0 },
                                indent: { left: (token.depth || 0) * 400 }
                            })
                        );
                    });
                    break;
                    
                case 'code':
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: token.text,
                                    font: { name: 'Courier New' },
                                    size: 20
                                })
                            ],
                            spacing: { before: 100, after: 100 },
                            shading: { fill: 'F5F5F5' }
                        })
                    );
                    break;

                case 'table':
                    const header = new TableRow({
                        children: token.header.map(cell => new TableCell({
                            children: [new Paragraph({ children: this.parseInlineTokens(cell.tokens) })],
                            shading: { fill: 'F4F4F4' },
                        })),
                    });

                    const rows = token.rows.map(row => new TableRow({
                        children: row.map(cell => new TableCell({
                            children: [new Paragraph({ children: this.parseInlineTokens(cell.tokens) })]
                        })),
                    }));

                    children.push(
                        new Table({
                            rows: [header, ...rows],
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                                bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                                left: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                                right: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                                insideH: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                                insideV: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                            }
                        })
                    );
                    break;

                case 'blockquote':
                    children.push(
                        new Paragraph({
                            children: this.parseInlineTokens(token.tokens),
                            style: "IntenseQuote" // Use a built-in Word style
                        })
                    );
                    break;

                case 'space':
                    children.push(new Paragraph({ text: '' }));
                    break;

                case 'hr':
                     children.push(new Paragraph({
                        border: { bottom: { color: "auto", space: 1, style: "single", size: 6 } }
                    }));
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
     * Helper to map markdown heading depth to docx HeadingLevel
     * @param {number} depth - Heading level (1-6)
     * @returns {HeadingLevel}
     */
    getDocxHeading(depth) {
        switch (depth) {
            case 1: return HeadingLevel.HEADING_1;
            case 2: return HeadingLevel.HEADING_2;
            case 3: return HeadingLevel.HEADING_3;
            case 4: return HeadingLevel.HEADING_4;
            case 5: return HeadingLevel.HEADING_5;
            case 6: return HeadingLevel.HEADING_6;
            default: return HeadingLevel.HEADING_1;
        }
    }

    /**
     * Helper to parse inline markdown tokens (bold, italic, code) into TextRun objects
     * @param {Array} tokens - Array of inline tokens from marked
     * @returns {Array<TextRun>}
     */
    parseInlineTokens(tokens) {
        if (!tokens) return [new TextRun("")];

        return tokens.map(token => {
            let text = token.text || token.raw || '';
            
            // Handle HTML-escaped characters in text tokens
            if (token.type === 'text' || token.type === 'paragraph') {
                text = text.replace(/&lt;/g, '<')
                           .replace(/&gt;/g, '>')
                           .replace(/&amp;/g, '&')
                           .replace(/&quot;/g, '"');
            }

            const options = { text: text };

            switch (token.type) {
                case 'strong':
                    options.bold = true;
                    break;
                case 'em':
                    options.italics = true;
                    break;
                case 'codespan':
                    options.font = { name: 'Courier New' };
                    options.shading = { fill: 'F5F5F5' };
                    break;
                case 'del':
                    options.strike = true;
                    break;
                case 'link':
                    options.text = token.text; // Or token.href
                    options.style = "Hyperlink";
                    break;
                case 'text':
                default:
                    // Text already handled above
                    break;
            }
            return new TextRun(options);
        });
    }
}

// Export singleton instance
export default new DocumentExportService();