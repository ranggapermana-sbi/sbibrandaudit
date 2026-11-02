import { jsPDF } from 'jspdf';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Brand Excellence certificate, laid out after the 2026 Branding Audit certificate template.
// Each weighted category is one of the four audit departments; its score is the department's percentage.

export const CERTIFICATE_AUDIT_YEAR = 2026;

export const CERTIFICATE_WEIGHTS: { department: string; label: string; weight: number }[] = [
    { department: 'Branding & Marketing', label: 'Branding & Marketing', weight: 40 },
    { department: 'Digital Marketing', label: 'Digital Marketing', weight: 30 },
    { department: 'Online Reputation', label: 'Online Reputation (ReviewPro)', weight: 15 },
    { department: 'CRM & Loyalty', label: 'CRM & Loyalty', weight: 15 },
];

export interface CertificateCategoryScore {
    label: string;
    weight: number;
    earned: number;
    max: number;
    percentage: number | null;
    bonusPoints: number;
}

export interface CertificateBonusRow {
    label: string;
    passed: number;
    rate: number;
    points: number;
}

export interface CertificateInput {
    hotelName: string;
    hotelCode: string;
    status: 'passed' | 'failed' | 'not_audited';
    // Final score: audit percentage plus bonus, capped at 100
    overallPercentage: number | null;
    basePercentage: number | null;
    bonusRows: CertificateBonusRow[];
    bonusTotal: number;
    categories: CertificateCategoryScore[];
    weightedTotal: number;
}

export interface CertificateResult {
    status: 'passed' | 'failed' | 'not_audited';
    percentage: number | null;
    basePercentage: number | null;
    bonusRows: CertificateBonusRow[];
    bonusTotal: number;
}

interface ResultCategory {
    departmentId: string;
    earned: number;
    max: number;
    isBonus: boolean;
}

interface DepartmentRef {
    id: string;
    name: string;
}

// Builds the certificate figures from one hotel's audit result. Bonus categories carry no points and are left out.
export const buildCertificateInput = (
    hotel: { name: string; code: string },
    result: CertificateResult,
    resultCategories: ResultCategory[],
    departments: DepartmentRef[]
): CertificateInput => {
    const scored = resultCategories.filter(c => !c.isBonus);

    const categories: CertificateCategoryScore[] = CERTIFICATE_WEIGHTS.map(def => {
        const department = departments.find(d => d.name === def.department);
        const rows = department ? scored.filter(c => c.departmentId === String(department.id)) : [];
        const earned = rows.reduce((sum, c) => sum + c.earned, 0);
        const max = rows.reduce((sum, c) => sum + c.max, 0);
        return {
            label: def.label,
            weight: def.weight,
            earned,
            max,
            percentage: max > 0 ? Math.round((earned / max) * 100) : null,
            bonusPoints: result.bonusRows.find(row => row.label === def.department)?.points ?? 0
        };
    });

    // Weighted total out of 100: a department with no scored points contributes 0
    // The weighted audit score comes from the calculation, so the table and the final score use the same figure
    const weightedTotal = result.basePercentage ?? 0;

    return {
        hotelName: hotel.name,
        hotelCode: hotel.code,
        status: result.status,
        overallPercentage: result.percentage,
        basePercentage: result.basePercentage,
        bonusRows: result.bonusRows,
        bonusTotal: result.bonusTotal,
        categories,
        weightedTotal
    };
};

const PAGE_WIDTH = 297;
const PAGE_HEIGHT = 210;
const GOLD: [number, number, number] = [166, 124, 82];
const BROWN: [number, number, number] = [169, 119, 58];
const INK: [number, number, number] = [28, 30, 40];
const MUTED: [number, number, number] = [100, 106, 118];
const WHITE: [number, number, number] = [255, 255, 255];
const PASS_GREEN: [number, number, number] = [16, 120, 80];
const FAIL_RED: [number, number, number] = [190, 40, 60];

const loadLogo = async (): Promise<string | null> => {
    try {
        const base = (import.meta as any).env?.BASE_URL || '/';
        const response = await fetch(`${base}certificate/sbi-logo.png`);
        if (!response.ok) return null;
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
};

const drawFrame = (doc: jsPDF) => {
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1.2);
    doc.rect(8, 8, PAGE_WIDTH - 16, PAGE_HEIGHT - 16);
    doc.setLineWidth(0.3);
    doc.rect(11, 11, PAGE_WIDTH - 22, PAGE_HEIGHT - 22);
};

const drawLogo = (doc: jsPDF, logo: string | null, y: number, width: number) => {
    if (!logo) return;
    const height = (width * 159) / 562;
    doc.addImage(logo, 'PNG', (PAGE_WIDTH - width) / 2, y, width, height);
};

const drawCentered = (doc: jsPDF, text: string, y: number, font: 'times' | 'helvetica', style: 'normal' | 'bold' | 'italic', size: number, color: [number, number, number] = INK) => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(text, PAGE_WIDTH / 2, y, { align: 'center' });
};

// Centres a line made of plain and bold segments
const drawMixedCentered = (doc: jsPDF, segments: { text: string; bold?: boolean; color?: [number, number, number] }[], y: number, size: number) => {
    let total = 0;
    segments.forEach(s => {
        doc.setFont('helvetica', s.bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        total += doc.getTextWidth(s.text);
    });
    let x = (PAGE_WIDTH - total) / 2;
    segments.forEach(s => {
        doc.setFont('helvetica', s.bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        doc.setTextColor(...(s.color ?? INK));
        doc.text(s.text, x, y);
        x += doc.getTextWidth(s.text);
    });
};

const drawSummaryPage = (doc: jsPDF, input: CertificateInput, logo: string | null) => {
    drawFrame(doc);
    drawLogo(doc, logo, 16, 50);

    drawCentered(doc, 'BRANDING AUDIT SUMMARY & SCORE BREAKDOWN', 42, 'times', 'bold', 15);
    drawCentered(doc, `The audit was conducted across ${input.categories.length} categories, each weighted based on its overall impact on brand health:`, 50, 'helvetica', 'normal', 9.5, MUTED);

    // Table
    const x0 = 31;
    const colWidths = [78, 36, 46, 38, 38];
    const headerY = 58;
    const headerHeight = 10;
    const rowHeight = 12;
    const headers = ['CATEGORY', 'AUDIT WEIGHTAGE', 'HOTEL / APPLICABLE FULL SCORE', 'HOTEL % SCORE', 'BONUS SCORE'];

    const colX: number[] = [];
    colWidths.reduce((x, w, i) => { colX[i] = x; return x + w; }, x0);
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    doc.setFillColor(...BROWN);
    doc.rect(x0, headerY, tableWidth, headerHeight, 'F');
    headers.forEach((header, i) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...WHITE);
        doc.text(header, colX[i] + colWidths[i] / 2, headerY + 6.2, { align: 'center' });
    });

    doc.setDrawColor(90, 90, 90);
    doc.setLineWidth(0.25);
    input.categories.forEach((cat, row) => {
        const y = headerY + headerHeight + row * rowHeight;
        doc.rect(x0, y, tableWidth, rowHeight);
        colX.slice(1).forEach(x => doc.line(x, y, x, y + rowHeight));

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...INK);
        doc.text(cat.label.toUpperCase(), colX[0] + colWidths[0] / 2, y + 7, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text(`${cat.weight}%`, colX[1] + colWidths[1] / 2, y + 7.8, { align: 'center' });

        doc.setFontSize(9.5);
        const points = cat.max > 0 ? `${cat.earned} / ${cat.max} pts` : '—';
        doc.text(points, colX[2] + colWidths[2] / 2, y + 7.5, { align: 'center' });

        doc.setFontSize(12);
        // Weighted share of the total: the department's percentage multiplied by its audit weightage
        const pct = cat.max > 0 ? `${((cat.weight * cat.earned) / cat.max).toFixed(2)}%` : '—';
        doc.text(pct, colX[3] + colWidths[3] / 2, y + 7.8, { align: 'center' });

        doc.text(`+${cat.bonusPoints}%`, colX[4] + colWidths[4] / 2, y + 7.8, { align: 'center' });
    });

    // Total row
    const totalY = headerY + headerHeight + input.categories.length * rowHeight + 2;
    doc.setFillColor(...BROWN);
    doc.rect(x0, totalY, tableWidth, 11, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text('TOTAL SCORE', colX[0] + colWidths[0] / 2, totalY + 7, { align: 'center' });
    doc.text('100%', colX[1] + colWidths[1] / 2, totalY + 7, { align: 'center' });
    doc.text(`${input.weightedTotal.toFixed(2)}%`, colX[3] + colWidths[3] / 2, totalY + 7, { align: 'center' });
    doc.text(`+${input.bonusTotal}%`, colX[4] + colWidths[4] / 2, totalY + 7, { align: 'center' });

    // Status
    const passed = input.status === 'passed';
    const statusWord = passed ? 'PASSED' : 'FAILED';
    const statusColor = passed ? PASS_GREEN : FAIL_RED;
    // Final score row: weighted total plus the bonus
    const finalY = totalY + 11;
    doc.setFillColor(122, 84, 42);
    doc.rect(x0, finalY, tableWidth, 11, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    const finalText = input.overallPercentage !== null ? input.overallPercentage.toFixed(2) : '—';
    doc.text(`FINAL SCORE: ${finalText}%`, x0 + tableWidth / 2, finalY + 7.2, { align: 'center' });

    const statusY = totalY + 34;
    drawMixedCentered(doc, [
        { text: input.hotelName, bold: true },
        { text: passed ? ' demonstrated exceptional performance,' : ' did not yet meet the required standard,' }
    ], statusY, 11);
    drawMixedCentered(doc, [
        { text: 'earning a status of ' },
        { text: statusWord, bold: true, color: statusColor },
        { text: '.' }
    ], statusY + 7, 11);
    drawCentered(
        doc,
        passed
            ? 'reflecting a highly recognisable and polished appearance across all categories.'
            : 'reflecting areas for improvement across the brand categories.',
        statusY + 14,
        'helvetica',
        'normal',
        10,
        MUTED
    );

    drawLogo(doc, logo, 182, 40);
};

// Page 1 is the 2025 award template. The hotel name and score are written onto its blank lines.
// The template's own page 2 is replaced by the generated summary page.
const AWARD_TEMPLATE_FILE = 'certificate/award-template.pdf';
// Positions measured in points from the top of the page (A4 landscape, 842 x 595)
const AWARD_NAME_BASELINE_FROM_TOP = 287;
const AWARD_SCORE_BASELINE_FROM_TOP = 391;
const AWARD_NAME_MAX_WIDTH = 560;

const loadAwardTemplate = async (): Promise<ArrayBuffer> => {
    const base = (import.meta as any).env?.BASE_URL || '/';
    const response = await fetch(`${base}${AWARD_TEMPLATE_FILE}`);
    if (!response.ok) {
        throw new Error(`Certificate template not found (HTTP ${response.status})`);
    }
    return response.arrayBuffer();
};

// Writes the hotel name and score onto page 1 of the award template
export const writeAwardPage = async (templateBytes: ArrayBuffer, hotelName: string, scoreText: string): Promise<PDFDocument> => {
    const pdf = await PDFDocument.load(templateBytes);
    const page = pdf.getPage(0);
    const { width, height } = page.getSize();
    const font = await pdf.embedFont(StandardFonts.TimesRomanBold);

    let nameSize = 26;
    while (nameSize > 14 && font.widthOfTextAtSize(hotelName, nameSize) > AWARD_NAME_MAX_WIDTH) {
        nameSize -= 1;
    }
    const nameWidth = font.widthOfTextAtSize(hotelName, nameSize);
    page.drawText(hotelName, {
        x: (width - nameWidth) / 2,
        y: height - AWARD_NAME_BASELINE_FROM_TOP,
        size: nameSize,
        font,
        color: rgb(0.11, 0.12, 0.16)
    });

    const scoreSize = 30;
    const scoreWidth = font.widthOfTextAtSize(scoreText, scoreSize);
    page.drawText(scoreText, {
        x: (width - scoreWidth) / 2,
        y: height - AWARD_SCORE_BASELINE_FROM_TOP,
        size: scoreSize,
        font,
        color: rgb(GOLD[0] / 255, GOLD[1] / 255, GOLD[2] / 255)
    });

    return pdf;
};

// Builds the certificate (award page from the template, summary page generated) and downloads it as a PDF
export const downloadHotelCertificate = async (input: CertificateInput) => {
    const logo = await loadLogo();
    const summaryDoc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    drawSummaryPage(summaryDoc, input, logo);
    const summaryBytes = summaryDoc.output('arraybuffer');

    const scoreText = input.overallPercentage !== null ? `${input.overallPercentage.toFixed(2)}%` : '—';
    const certificate = await writeAwardPage(await loadAwardTemplate(), input.hotelName, scoreText);

    // Keep the template's page 1 and replace its page 2 with the generated summary
    const summary = await PDFDocument.load(summaryBytes);
    const [summaryPage] = await certificate.copyPages(summary, [0]);
    certificate.removePage(1);
    certificate.addPage(summaryPage);

    const bytes = await certificate.save();
    const safeCode = input.hotelCode.replace(/[^A-Za-z0-9_-]/g, '') || 'hotel';
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Brand-Excellence-Certificate-${safeCode}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
