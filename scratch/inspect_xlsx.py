import openpyxl

wb = openpyxl.load_workbook(r"C:\Users\Try Hard\Desktop\Nexte\informes-andar\informes\Juan Pablo Herrera .xlsx", data_only=True)

def inspect_sheet(sheet, max_row=100, max_col=15):
    print(f"\n================ SHEET: {sheet.title} ================")
    # Print non-empty cells
    for r in range(1, max_row + 1):
        row_vals = []
        for c in range(1, max_col + 1):
            val = sheet.cell(row=r, column=c).value
            row_vals.append((c, val))
        
        # If the row has any non-empty values, print it
        if any(v is not None for col, v in row_vals):
            # Format output: show column index and value
            formatted = []
            for col, v in row_vals:
                if v is not None:
                    # Clean up strings
                    v_str = str(v).strip().replace('\n', ' ')
                    if len(v_str) > 40:
                        v_str = v_str[:37] + "..."
                    formatted.append(f"C{col}: {v_str}")
            print(f"Row {r:03d} -> " + " | ".join(formatted))

# Let's inspect PCP
inspect_sheet(wb['PCP'], max_row=60, max_col=10)

# Let's inspect JULIO
inspect_sheet(wb['JULIO'], max_row=120, max_col=10)
