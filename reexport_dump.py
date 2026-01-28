import re
import csv
import os

DUMP_FILE = r'c:\Users\Felipe\Desktop\app-esportivo\sistema antigo\Dumps_bancos\Dump Toledao Atualizado.sql'
OUTPUT_DIR = r'c:\Users\Felipe\Desktop\app-esportivo\csv_headers'

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def parse_sql_dump(file_path):
    with open(file_path, 'r', encoding='utf8') as f:
        content = f.read()

    # 1. Extract Table Schemas (Columns)
    tables = {}
    create_table_regex = re.compile(r'CREATE TABLE `(\w+)` \((.*?)\) ENGINE=', re.DOTALL)
    
    for match in create_table_regex.finditer(content):
        table_name = match.group(1)
        schema_body = match.group(2)
        columns = []
        for line in schema_body.split('\n'):
            line = line.strip()
            if line.startswith('`'):
                # Extract column name `col_name`
                col_match = re.match(r'`(\w+)`', line)
                if col_match:
                    columns.append(col_match.group(1))
        tables[table_name] = {'columns': columns, 'data': []}
        print(f"Found Table: {table_name} with headers: {columns}")

    # 2. Extract Data (INSERT statements)
    # INSERT INTO `table` VALUES (val1, val2), (val3, val4);
    insert_regex = re.compile(r'INSERT INTO `(\w+)` VALUES (.*);')
    
    for match in insert_regex.finditer(content):
        table_name = match.group(1)
        values_str = match.group(2)
        
        if table_name in tables:
            # Parse values (simple parser for (a,b), (c,d))
            # Only works if strings are properly quoted and escaped.
            # We can use regex to split by '),(' but be careful about text inside.
            # A robust way is recursive char scanning.
            rows = parse_values(values_str)
            tables[table_name]['data'].extend(rows)

    # 3. Write CSVs
    for table_name, info in tables.items():
        if not info['columns']:
            continue
            
        out_path = os.path.join(OUTPUT_DIR, f"{table_name}.csv")
        with open(out_path, 'w', newline='', encoding='utf8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(info['columns']) # Header
            writer.writerows(info['data'])
        print(f"Wrote {len(info['data'])} rows to {out_path}")

def parse_values(values_str):
    """
    Parses a string like "(1, 'a'), (2, 'b')" into list of lists [[1,'a'], [2,'b']]
    Handles quoted strings and NULL.
    """
    rows = []
    current_row = []
    current_val = []
    in_string = False
    escape = False
    in_parenthesis = False
    
    # Simple state machine
    for char in values_str:
        if not in_parenthesis:
            if char == '(':
                in_parenthesis = True
                current_row = []
                current_val = []
            continue
        
        # Inside parenthesis
        if in_string:
            if escape:
                current_val.append(char)
                escape = False
            elif char == '\\':
                escape = True # Mysql escapes with backslash usually? Or double quote? 
                # Dump Toledao uses single quotes. let's assume standard sql escaping.
                # Actually standard dump uses \ for escape.
                # Let's keep \ generally or handle ' specifically.
                # Wait, if we see \' it is a literal quote.
                current_val.append(char) # Keep raw char for now? No, CSV needs clean.
            elif char == "'":
                in_string = False # End of string
            else:
                current_val.append(char)
        else:
            # Not in string
            if char == "'":
                in_string = True
            elif char == ',':
                # Commit value
                val = "".join(current_val).strip()
                if val == 'NULL': val = None
                current_row.append(val)
                current_val = []
            elif char == ')':
                # End of row
                val = "".join(current_val).strip()
                if val == 'NULL': val = None
                
                # Check if it really ended? (next char should be , or end)
                # But we handle structure: (..), (..)
                # So ) closes the tuple.
                current_row.append(val)
                rows.append(current_row)
                in_parenthesis = False
            else:
                current_val.append(char)
                
    return rows

# Improvement on parser: The above manual parser is risky for complex SQL dumps (binary data, complex escapes).
# But for typical text dumps it works.
# Let's verify standard SQL value syntax.
# 'O\'Reilly' -> escaped quote.
# My logic: char == '\\' -> escape=True. Next char appended literal.
# That handles \' correctly.

# Let's refine the loop slightly for speed and correctness with escapes.

def parse_values_v2(text):
    rows = []
    row = []
    val = []
    state = 0 # 0: outside, 1: inside (...), 2: inside string, 3: escape in string
    
    # We iterate char by char
    i = 0
    n = len(text)
    
    while i < n:
        c = text[i]
        
        if state == 0:
            if c == '(':
                state = 1
                row = []
                val = []
        
        elif state == 1: # Inside row (...)
            if c == "'":
                state = 2
            elif c == ',':
                # Value finished
                v = "".join(val).strip()
                if v == 'NULL': v = None
                row.append(v)
                val = []
            elif c == ')':
                # Row finished
                v = "".join(val).strip()
                if v == 'NULL': v = None
                row.append(v)
                rows.append(row)
                state = 0
            else:
                val.append(c)
                
        elif state == 2: # Inside String '...'
            if c == '\\':
                state = 3
            elif c == "'":
                state = 1 # Back to row
            else:
                val.append(c)
                
        elif state == 3: # Escape
            val.append(c)
            state = 2
            
        i += 1
    return rows

if __name__ == '__main__':
    parse_sql_dump(DUMP_FILE)
