import pypdf
import sys

def read_pdf(pdf_path):
    print(f"Leyendo PDF: {pdf_path}")
    reader = pypdf.PdfReader(pdf_path)
    print(f"Número de páginas: {len(reader.pages)}")
    for i, page in enumerate(reader.pages):
        print(f"\n--- PÁGINA {i+1} ---")
        print(page.extract_text())

if __name__ == "__main__":
    pdf_path = "c:\\Users\\Try Hard\\Desktop\\Nexte\\informes-andar\\informe-mal.pdf"
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    read_pdf(pdf_path)
