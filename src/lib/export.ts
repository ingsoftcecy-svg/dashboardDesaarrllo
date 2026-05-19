import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  console.log("Starting PDF generation with html2canvas for:", elementId);

  // Add a class to indicate export is in progress
  element.classList.add("pdf-exporting");

  try {
    // html2canvas is often more robust for large tables
    const canvas = await html2canvas(element, {
      scale: 1, // Reduced to 1 to ensure it fits within browser limits
      useCORS: true,
      logging: false,
      backgroundColor: "#f8fafc",
      ignoreElements: (node) => {
        return node.classList.contains("no-pdf");
      },
      // Remove specific dimensions to let html2canvas handle it naturally
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.overflow = "visible";
          clonedElement.style.height = "auto";
        }
      }
    });

    const dataUrl = canvas.toDataURL("image/jpeg", 0.7); // Higher compression
    
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(dataUrl, "JPEG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${filename}.pdf`);
    console.log("PDF saved successfully:", filename);

  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("La generación del PDF está tomando demasiado tiempo o el tablero es muy grande. Se abrirá el menú de impresión como alternativa.");
    window.print();
  } finally {
    element.classList.remove("pdf-exporting");
  }
}
