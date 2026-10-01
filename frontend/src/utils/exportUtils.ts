import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportData {
  user: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  companies: Array<{
    id: number;
    name: string;
    website?: string;
    industry?: string;
    location?: string;
    created_at?: string;
  }>;
  people: Array<{
    id: number;
    name: string;
    designation?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin_url?: string;
    created_at?: string;
  }>;
  applications: Array<{
    id: number;
    job_position__company__name?: string;
    job_position__title?: string;
    current_status?: string;
    created_at?: string;
  }>;
}

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerDownload(blob: Blob, filename: string) {
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
 * Exports all user data into a clean, well-formatted multi-section CSV file.
 */
export function exportToCsv(data: ExportData, filename?: string) {
  const user = data.user || { username: 'user', email: '', first_name: '', last_name: '' };
  const targetFilename = filename || `pathly-export-${user.username || 'user'}.csv`;

  const lines: string[] = [];

  // Metadata / Summary
  lines.push('# PATHLY CAREER GRAPH EXPORT');
  lines.push(`Generated At,${escapeCsvCell(new Date().toISOString())}`);
  lines.push(`User,${escapeCsvCell(user.username)}`);
  lines.push(`Email,${escapeCsvCell(user.email)}`);
  lines.push(`Full Name,${escapeCsvCell(`${user.first_name || ''} ${user.last_name || ''}`.trim())}`);
  lines.push('');

  // 1. COMPANIES
  lines.push('# TARGET COMPANIES');
  lines.push(['ID', 'Company Name', 'Website', 'Industry', 'Location', 'Added At'].map(escapeCsvCell).join(','));
  (data.companies || []).forEach((c) => {
    lines.push([
      c.id,
      c.name,
      c.website || '',
      c.industry || '',
      c.location || '',
      c.created_at ? new Date(c.created_at).toLocaleDateString() : ''
    ].map(escapeCsvCell).join(','));
  });
  lines.push('');

  // 2. PEOPLE & CONTACTS
  lines.push('# PEOPLE & PROFESSIONAL CONTACTS');
  lines.push(['ID', 'Full Name', 'Role / Designation', 'Email', 'Phone', 'Location', 'LinkedIn URL', 'Added At'].map(escapeCsvCell).join(','));
  (data.people || []).forEach((p) => {
    lines.push([
      p.id,
      p.name,
      p.designation || '',
      p.email || '',
      p.phone || '',
      p.location || '',
      p.linkedin_url || '',
      p.created_at ? new Date(p.created_at).toLocaleDateString() : ''
    ].map(escapeCsvCell).join(','));
  });
  lines.push('');

  // 3. JOB APPLICATIONS
  lines.push('# JOB APPLICATIONS');
  lines.push(['ID', 'Company', 'Job Title', 'Current Status', 'Added At'].map(escapeCsvCell).join(','));
  (data.applications || []).forEach((a) => {
    lines.push([
      a.id,
      a.job_position__company__name || 'Unknown Company',
      a.job_position__title || 'Unknown Title',
      a.current_status || '',
      a.created_at ? new Date(a.created_at).toLocaleDateString() : ''
    ].map(escapeCsvCell).join(','));
  });

  const csvString = '\uFEFF' + lines.join('\r\n'); // Add UTF-8 BOM for Excel compatibility
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, targetFilename);
}

/**
 * Exports just the companies list to CSV.
 */
export function exportCompaniesToCsv(companies: any[], filename = 'pathly-companies.csv') {
  const lines: string[] = [];
  lines.push(['ID', 'Company Name', 'Website', 'Industry', 'Location', 'Added At'].map(escapeCsvCell).join(','));
  (companies || []).forEach((c) => {
    lines.push([
      c.id,
      c.name,
      c.website || '',
      c.industry || '',
      c.location || '',
      c.created_at ? new Date(c.created_at).toLocaleDateString() : ''
    ].map(escapeCsvCell).join(','));
  });
  const csvString = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}


/**
 * Exports user data as a styled executive PDF document with tables and branding.
 */
export function exportToPdf(data: ExportData, filename?: string) {
  const user = data.user || { username: 'user', email: '', first_name: '', last_name: '' };
  const targetFilename = filename || `pathly-career-report-${user.username || 'user'}.pdf`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner with Indigo Gradient Aesthetic
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, pageWidth, 75, 'F');

  // Title & Tagline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('PATHLY', margin, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(224, 231, 255); // Indigo 100
  doc.text('CAREER GRAPH & APPLICATION INTELLIGENCE REPORT', margin, 58);

  // Report Date on top right
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  doc.setFontSize(9);
  doc.text(`Generated: ${dateStr}`, pageWidth - margin, 42, { align: 'right' });
  doc.text(`User: @${user.username}`, pageWidth - margin, 58, { align: 'right' });

  // Overview / KPI Section
  let currentY = 100;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('Executive Summary', margin, currentY);

  currentY += 14;

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`Account Owner: ${fullName} (${user.email || 'No email provided'})`, margin, currentY);

  currentY += 16;

  // 3 Metric Badges
  const boxWidth = (contentWidth - 20) / 3;
  const boxHeight = 44;

  const metrics = [
    { label: 'TARGET COMPANIES', value: (data.companies || []).length },
    { label: 'NETWORK CONTACTS', value: (data.people || []).length },
    { label: 'JOB APPLICATIONS', value: (data.applications || []).length },
  ];

  metrics.forEach((m, idx) => {
    const boxX = margin + idx * (boxWidth + 10);
    // Background card
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 6, 6, 'FD');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, boxX + 12, currentY + 16);

    // Number
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text(String(m.value), boxX + 12, currentY + 34);
  });

  currentY += boxHeight + 24;

  // 1. Target Companies Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Target Companies (${(data.companies || []).length})`, margin, currentY);

  const companiesBody = (data.companies || []).map((c, i) => [
    i + 1,
    c.name,
    c.industry || '—',
    c.location || '—',
    c.website ? c.website.replace(/^https?:\/\//, '') : '—'
  ]);

  autoTable(doc, {
    startY: currentY + 8,
    head: [['#', 'Company', 'Industry', 'Location', 'Website']],
    body: companiesBody.length > 0 ? companiesBody : [['—', 'No companies added yet', '—', '—', '—']],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 22;

  // Check if we need space for next section, otherwise let autoTable handle page break
  if (currentY > pageHeight - 120) {
    doc.addPage();
    currentY = 40;
  }

  // 2. People & Network Contacts Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`People & Network Contacts (${(data.people || []).length})`, margin, currentY);

  const peopleBody = (data.people || []).map((p, i) => [
    i + 1,
    p.name,
    p.designation || '—',
    p.email || '—',
    p.phone || '—',
    p.location || '—'
  ]);

  autoTable(doc, {
    startY: currentY + 8,
    head: [['#', 'Name', 'Designation / Role', 'Email', 'Phone', 'Location']],
    body: peopleBody.length > 0 ? peopleBody : [['—', 'No contacts added yet', '—', '—', '—', '—']],
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo 600
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 22;

  if (currentY > pageHeight - 120) {
    doc.addPage();
    currentY = 40;
  }

  // 3. Applications Pipeline Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Job Applications Pipeline (${(data.applications || []).length})`, margin, currentY);

  const appBody = (data.applications || []).map((a, i) => [
    i + 1,
    a.job_position__company__name || '—',
    a.job_position__title || '—',
    (a.current_status || 'SAVED').replace(/_/g, ' '),
    a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'
  ]);

  autoTable(doc, {
    startY: currentY + 8,
    head: [['#', 'Target Company', 'Position Title', 'Status', 'Date Added']],
    body: appBody.length > 0 ? appBody : [['—', 'No applications created yet', '—', '—', '—']],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: margin, right: margin },
  });

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      'Pathly Career Graph • Confidential Personal Report',
      margin,
      pageHeight - 20
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 20,
      { align: 'right' }
    );
  }

  doc.save(targetFilename);
}
