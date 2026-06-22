import openpyxl

wb = openpyxl.load_workbook(r"C:\Users\Try Hard\Desktop\Nexte\informes-andar\informes\Juan Pablo Herrera .xlsx", data_only=True)
sheet = wb['JULIO']

print("=== MERGED RANGES ===")
for r in sorted(sheet.merged_cells.ranges, key=lambda x: (x.min_row, x.min_col)):
    print(r)
