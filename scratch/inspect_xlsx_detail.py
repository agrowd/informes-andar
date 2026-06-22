import openpyxl

wb = openpyxl.load_workbook(r"C:\Users\Try Hard\Desktop\Nexte\informes-andar\informes\Juan Pablo Herrera .xlsx", data_only=True)
sheet = wb['JULIO']

print("=== DETAIL OF ROWS 5-20 ===")
for r in range(5, 21):
    row_str = f"Row {r:02d}: "
    for c in range(1, 13):
        cell = sheet.cell(row=r, column=c)
        val = cell.value
        # If merged or styled, let's see color
        fill_color = "NONE"
        if cell.fill and cell.fill.start_color and cell.fill.start_color.rgb:
            fill_color = cell.fill.start_color.rgb
        val_str = f"'{val}'" if val is not None else "None"
        row_str += f"[C{c}: {val_str} (Color: {fill_color})] "
    print(row_str)
