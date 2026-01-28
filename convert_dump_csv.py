import re
import csv
import os
import glob

# Directory containing dumps
dump_dir = os.path.join('sistema antigo', 'Dumps_bancos')
output_dir = '.' # Root directory

# List of sql files to process
sql_files = glob.glob(os.path.join(dump_dir, '*.sql'))

if not sql_files:
    print(f"No .sql files found in {dump_dir}")
    # Fallback to the txt file if no sqls (as per original script, though user asked for dumps)
    if os.path.exists('dados_do_dump_para _inserir.txt'):
        sql_files = ['dados_do_dump_para _inserir.txt']

print(f"Processing files: {sql_files}")

for input_file in sql_files:
    print(f"Reading {input_file}...")
    try:
        content = open(input_file, 'r', encoding='utf-8', errors='ignore').read()
    except Exception as e:
        print(f"Error reading {input_file}: {e}")
        continue

    # Find all INSERT statements
    # Format: INSERT INTO `table` VALUES (...);
    # Handling schema prefix if present e.g. INSERT INTO `db`.`table`
    # Also handles case without backticks if necessary, but regex expects backticks for now based on file view
    matches = re.findall(r"INSERT INTO `?(\w+)`? VALUES (.*?);", content, re.DOTALL | re.IGNORECASE)

    print(f"Found {len(matches)} INSERT statements in {input_file}.")

    for table, values_block in matches:
        print(f"  Processing table: {table}")
        
        # values_block contains: (1, 'a'), (2, 'b')
        # We split by `),(` or `), (` 
        # CAUTION: String content might contain `),(` but in SQL dump usually escaped. 
        # For a robust parser we'd need a real tokeniser, but for this task regex split is usually sufficient if data isn't malicious.
        
        # Normalize split pattern
        items = re.split(r'\),\s*\(', values_block)
        
        filename = os.path.join(output_dir, f"{table}.csv")
        
        # Determine mode: key is to overwrite if it's a new table from a different dump, but what if same table split across dumps?
        # Usually dumps are complete. Let's overwrite to ensure fresh data.
        # But if we have multiple dumps for different tables, 'w' works.
        # If multiple dumps have SAME table, last one wins.
        
        # We need to handle headers? The dump doesn't have column names in INSERT VALUES usually.
        # We will write headless CSVs (just data) as per previous examples
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            for item in items:
                # Clean leading ( and trailing ) of the whole block if it's the first/last item
                item_clean = item.strip()
                if item_clean.startswith('('): item_clean = item_clean[1:]
                if item_clean.endswith(')'): item_clean = item_clean[:-1]
                
                # Now Parse CSV row from this string
                # SQL string 'val', 123, NULL
                # We reuse the python csv reader to parse the SQL-like line
                # SQL quotes are ', CSV uses " usually.
                # We need to replace SQL ' with something else or let reader handle it?
                # Python csv default quotechar is "
                # We tell reader that quotechar is '
                
                # Handle NULL
                item_clean = item_clean.replace('NULL', '')
                
                # Parsing logic
                # We treat the string as a CSV line where delimiter is comma and quotechar is single quote
                try:
                    reader = csv.reader([item_clean], quotechar="'", skipinitialspace=True)
                    for row in reader:
                        writer.writerow(row)
                except Exception as e:
                    print(f"Error parsing row in {table}: {item_clean[:50]}... {e}")

        print(f"    Created/Updated {filename}")
