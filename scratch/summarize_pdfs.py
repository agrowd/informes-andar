import os
from pypdf import PdfReader

escalas_dir = r"C:\Users\Try Hard\Desktop\Nexte\informes-andar\escalas"
pdf_files = [f for f in os.listdir(escalas_dir) if f.endswith('.pdf')]

for filename in pdf_files:
    filepath = os.path.join(escalas_dir, filename)
    print(f"\n================ FILE: {filename} ================")
    try:
        reader = PdfReader(filepath)
        num_pages = len(reader.pages)
        print(f"Number of pages: {num_pages}")
        
        # Read outline if available
        outline = reader.outline
        if outline:
            print("Outline (TOC):")
            # Print first 10 outline items
            for item in outline[:10]:
                if isinstance(item, dict):
                    print(f"  - {item.get('/Title')}")
                else:
                    print(f"  - {item}")
        else:
            print("No outline found.")
            
        # Extract first 3 pages text
        print("First 3 pages sample text:")
        for p in range(min(3, num_pages)):
            text = reader.pages[p].extract_text()
            print(f"--- Page {p+1} ---")
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            for line in lines[:15]:  # print first 15 lines of each page
                print(f"  {line}")
    except Exception as e:
        print(f"Error reading PDF: {e}")
