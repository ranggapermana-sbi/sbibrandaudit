import sys

with open('src/components/AdminPanelScreen.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Replace CSV export
target_csv = "const total = items.length || 1;"
if target_csv in text:
    print("Found target_csv!")

# Let's inspect line around items.length
lines = text.split('\n')
for i, line in enumerate(lines):
    if "const total = items.length || 1;" in line:
        print(f"CSV total line {i+1}: {line}")
    if "let totalPossibleItemsOverall = totalHotels * (items.length || 1);" in line:
        print(f"Cards total line {i+1}: {line}")
    if "const totalItemsCount = items.length || 1;" in line:
        print(f"Table total line {i+1}: {line}")
