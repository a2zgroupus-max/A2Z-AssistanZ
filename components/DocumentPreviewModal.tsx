import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PdfIcon } from './icons/PdfIcon';
import { ShareIcon } from './icons/ShareIcon';
import { WordIcon } from './icons/WordIcon';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    documentContent: string;
    onClose: () => void;
    onOpenShareModal: () => void;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ isOpen, documentContent, onClose, onOpenShareModal }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableContent, setEditableContent] = useState(documentContent);

    useEffect(() => {
        setEditableContent(documentContent);
    }, [documentContent]);

    if (!isOpen) return null;

    const handleDownloadPdf = async () => {
        const previewEl = document.getElementById('doc-preview-modal');
        if (previewEl) {
            const originalBg = previewEl.style.backgroundColor;
            previewEl.style.backgroundColor = 'transparent'; // Ensure transparent background for PDF capture
            await html2canvas(previewEl, {
                scale: 2, // Increase scale for better resolution
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-surface'),
                onclone: (doc) => {
                    const clonedPreview = doc.getElementById('doc-preview-modal');
                    if (clonedPreview) {
                        clonedPreview.classList.add('prose');
                        clonedPreview.style.padding = '1.5rem'; // Add padding for PDF
                    }
                }
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save("A2Z-Group-Legal-Document.pdf");
            });
            previewEl.style.backgroundColor = originalBg; // Revert background color
        }
    };

    const handleDownloadDocx = () => {
        const htmlContent = marked.parse(documentContent);
        const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Document</title>
    <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 20mm; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Times New Roman', serif; margin-top: 1em; margin-bottom: 0.5em; }
        p { margin-bottom: 1em; }
        ul, ol { margin-left: 20px; margin-bottom: 1em; }
        strong { font-weight: bold; }
        em { font-style: italic; }
        blockquote { border-left: 4px solid #ccc; padding-left: 10px; color: #666; }
        code { background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
        img { max-width: 100%; height: auto; display: block; margin: 1em 0; }
        img.signature-image { background-color: white; padding: 4px; border-radius: 4px; max-width: 200px; height: auto; margin-top: 0.5rem; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
`;
        const blob = new Blob([fullHtml], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `A2Z-Group-Legal-Document.doc`; // Use .doc extension for MS Word compatibility
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem'
        }} className="animate-fade-in">
            <div className="smoked-glass-pane animate-pop-in" style={{
                width: '100%', maxWidth: '50rem', height: '90vh',
                display: 'flex', flexDirection: 'column', padding: '1.5rem'
            }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem', flexShrink: 0 }}>
                    {isEditing ? 'Edit Document' : 'Document Preview'}
                </h2>
                
                <div style={{ flexGrow: 1, minHeight: 0, border: '1px solid var(--color-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                    {isEditing ? (
                        <textarea
                            value={editableContent}
                            onChange={(e) => setEditableContent(e.target.value)}
                            style={{ width: '100%', height: '100%', resize: 'none', padding: '1rem' }}
                        />
                    ) : (
                         <div id="doc-preview-modal" className="prose" style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}
                            dangerouslySetInnerHTML={{ __html: marked.parse(editableContent || '') }}
                        />
                    )}
                </div>

                <div style={{ flexShrink: 0, paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    {isEditing ? (
                        <div>
                            <button onClick={() => { setIsEditing(false); setEditableContent(documentContent); }} className="btn btn-secondary" style={{marginRight: '0.5rem'}}>Cancel</button>
                            <button onClick={() => setIsEditing(false)} className="btn btn-primary">Save</button>
                        </div>
                    ) : (
                        <button onClick={onClose} className="btn btn-secondary">Close</button>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {!isEditing && <button onClick={() => setIsEditing(true)} className="btn btn-secondary">Edit</button>}
                        <button onClick={onOpenShareModal} title="Share Document" className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                            <ShareIcon style={{ width: '24px', height: '24px' }} />
                        </button>
                        <button onClick={handleDownloadDocx} title="Download DOCX" className="btn" style={{backgroundColor: 'var(--color-secondary)', color: 'white', padding: '0.5rem', marginRight: '0.5rem'}}><WordIcon style={{width: '24px', height: '24px'}} /></button>
                        <button onClick={handleDownloadPdf} title="Download PDF" className="btn" style={{ backgroundColor: 'var(--color-destructive)', color: 'white', padding: '0.5rem' }}>
                            <PdfIcon style={{ width: '24px', height: '24px' }} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentPreviewModal;