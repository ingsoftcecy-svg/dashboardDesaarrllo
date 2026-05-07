import jsPDF from "jspdf";
import { toPng } from "html-to-image";

export async function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    // html-to-image handles oklch and modern CSS better than html2canvas
    const dataUrl = await toPng(element, {
      cacheBust: true,
      backgroundColor: "#f8fafc",
      style: {
        // Ensure the element is visible and has correct dimensions
        borderRadius: "0",
      }
    });

    // Create an image object to get the dimensions
    const img = new Image();
    img.src = dataUrl;
    
    img.onload = () => {
      const pdf = new jsPDF({
        orientation: img.width > img.height ? "landscape" : "portrait",
        unit: "px",
        format: [img.width, img.height],
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
      pdf.save(`${filename}.pdf`);
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    // Fallback to print if PDF generation fails
    window.print();
  }
}
