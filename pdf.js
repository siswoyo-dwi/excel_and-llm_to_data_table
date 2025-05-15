const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');

async function createRiskControlPDF() {
  // Data yang akan ditampilkan
  const data = [
    {
      "Control ID": "RMiT-004",
      "Domain": "IT Asset Management",
      "Description": "IT Asset Management control item 4",
      "Applicable To": "Islamic Bank",
      "Status": "Not Implemented",
      "Risk Rating": "Medium",
      "Evidence Link": "",
      "Remarks": ""
    },
    {
      "Control ID": "RMiT-003",
      "Domain": "Third-Party Risk",
      "Description": "Third-Party Risk control item 3",
      "Applicable To": "Digital Bank",
      "Status": "In Progress",
      "Risk Rating": "Medium",
      "Evidence Link": "/evidence/rmit_003.pdf",
      "Remarks": "Verified by compliance team"
    },
    {
      "Control ID": "RMiT-002",
      "Domain": "Change Management",
      "Description": "Change Management control item 2",
      "Applicable To": "Retail Bank",
      "Status": "In Progress",
      "Risk Rating": "Low",
      "Evidence Link": "/evidence/rmit_002.pdf",
      "Remarks": "Verified by compliance team"
    },
    {
      "Control ID": "RMiT-001",
      "Domain": "Incident Response",
      "Description": "Incident Response control item 1",
      "Applicable To": "General Insurance",
      "Status": "In Progress",
      "Risk Rating": "Medium",
      "Evidence Link": "/evidence/rmit_001.pdf",
      "Remarks": "Needs review"
    }
  ];

  // Header yang diinginkan
  const headers = [
    "Control ID",
    "Domain",
    "Description",
    "Applicable To",
    "Status",
    "Risk Rating"
  ];

  // Membuat dokumen PDF baru
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  
  // Set font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Ukuran dan posisi tabel
  const margin = 50;
  const rowHeight = 20;
  const columnWidths = [70, 80, 120, 80, 80, 60]; // Sesuaikan lebar kolom
  const tableTop = height - margin;
  
  // Fungsi untuk menggambar garis
  const drawLine = (y) => {
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  };
  
  // Draw header
  let x = margin;
  let y = tableTop;
  
  // Garis header atas
  drawLine(y);
  
  // Teks header
  headers.forEach((header, i) => {
    page.drawText(header, {
      x,
      y: y - 15,
      size: 10,
      font: boldFont,
    });
    x += columnWidths[i];
  });
  
  y -= rowHeight;
  
  // Garis header bawah
  drawLine(y);
  
  // Draw rows
  data.forEach(row => {
    x = margin;
    
    // Draw cell contents
    headers.forEach((header, i) => {
      const value = row[header] || '';
      page.drawText(value.toString(), {
        x,
        y: y - 15,
        size: 8,
        font,
        maxWidth: columnWidths[i] - 5,
      });
      x += columnWidths[i];
    });
    
    y -= rowHeight;
    
    // Draw line between rows
    drawLine(y);
  });
  
  // Tambahkan judul
  page.drawText('Risk Control Report', {
    x: margin,
    y: height - 30,
    size: 14,
    font: boldFont,
  });
  
  // Simpan PDF ke file
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('RiskControls.pdf', pdfBytes);
  console.log('PDF berhasil dibuat: RiskControls.pdf');
}

// Jalankan fungsi pembuatan PDF
createRiskControlPDF().catch(err => console.error('Error:', err));