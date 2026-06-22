import openpyxl

wb = openpyxl.load_workbook(r"C:\Users\Try Hard\Desktop\Nexte\informes-andar\informes\Juan Pablo Herrera .xlsx", data_only=True)

# List of sheets to inspect
sheets = ['MARZO - ABRIL', 'MAYO ', 'JULIO', 'AGOSTO', 'NOVIEMBRE']

for sname in sheets:
    sheet = wb[sname]
    print(f"\n=== Ticks/Values in Sheet: {sname} ===")
    
    # We will iterate through rows 5 to 60, cols 1 to 12
    for r in range(5, 61):
        for c in range(1, 13):
            cell = sheet.cell(row=r, column=c)
            val = cell.value
            fill = cell.fill
            color = fill.start_color.rgb if fill and fill.start_color and fill.start_color.rgb else "NONE"
            
            # Print if value is not None, or if the cell has a background color and is not white
            # We want to identify what represents a checked box
            if val is not None or (color != "00000000" and color != "FFFFFFFF" and color != "NONE"):
                # Clean up value
                val_str = str(val).strip().replace('\n', ' ') if val is not None else ""
                # If it's a Taller heading or item name, print it briefly, otherwise print details
                if "TALLER" in val_str:
                    print(f"Row {r:02d} C{c}: {val_str} (HEADING)")
                elif len(val_str) > 2:
                    # It's an item name or description
                    print(f"  Row {r:02d} C{c}: '{val_str[:30]}' (Item/Text, Color: {color})")
                else:
                    # It's a tick or color block
                    print(f"  Row {r:02d} C{c}: '{val_str}' (Value/Color: {color})")
