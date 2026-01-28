const fs = require('fs');
const path = require('path');

const dumpDir = path.join(__dirname, 'sistema antigo', 'Dumps_bancos');
const outputDir = __dirname;

if (!fs.existsSync(dumpDir)) {
    console.error(`Directory not found: ${dumpDir}`);
    // Fallback to current dir or txt file if needed
}

const files = fs.readdirSync(dumpDir).filter(f => f.endsWith('.sql'));

if (files.length === 0) {
    console.log("No .sql files found.");
}

files.forEach(file => {
    const inputFile = path.join(dumpDir, file);
    console.log(`Reading ${inputFile}...`);

    try {
        const content = fs.readFileSync(inputFile, 'utf8');

        // Regex to find INSERT statements: INSERT INTO `table` VALUES (...);
        const regex = /INSERT INTO `?(\w+)`? VALUES (.*?);/gs;
        let match;

        while ((match = regex.exec(content)) !== null) {
            const table = match[1];
            let valuesBlock = match[2];
            console.log(`  Processing table: ${table}`);

            // Split rows by `),(` or `), (` 
            // Note: simple split might break on string content, but sufficient for standard dump
            const rawRows = valuesBlock.split(/\),\s*\(/);

            const csvRows = rawRows.map(rowStr => {
                let clean = rowStr.trim();
                // Remove leading ( and trailing ) for first/last items
                if (clean.startsWith('(')) clean = clean.substring(1);
                if (clean.endsWith(')')) clean = clean.substring(0, clean.length - 1);

                // Parse CSV columns
                const cols = parseSqlValueRow(clean);
                return cols.join(',');
            });

            // Write/Overwrite CSV
            const outputPath = path.join(outputDir, `${table}.csv`);
            fs.writeFileSync(outputPath, csvRows.join('\n'));
            console.log(`    Created ${table}.csv with ${csvRows.length} rows.`);
        }
    } catch (e) {
        console.error(`Error processing ${file}: ${e.message}`);
    }
});

function parseSqlValueRow(rowString) {
    const cols = [];
    let buffer = '';
    let inQuote = false;
    let escape = false; // Add escape handling

    for (let i = 0; i < rowString.length; i++) {
        const char = rowString[i];

        if (escape) {
            buffer += char;
            escape = false;
            continue;
        }

        if (char === '\\') {
            escape = true;
            // buffer += char; // Keep backslash? SQL strings usually don't keep them unless escaped.
            // For simplicity let's just ignore escape char logic for CSV export unless necessary
            // Actually, keep it simple: if in quote, append char.
            // But if char is quote...
        }

        if (char === "'" && !escape) {
            inQuote = !inQuote;
            // Don't add quote to buffer, we want clean value
            continue;
        }

        if (char === ',' && !inQuote) {
            cols.push(formatCsvCell(buffer));
            buffer = '';
            continue;
        }

        buffer += char;
    }
    cols.push(formatCsvCell(buffer));
    return cols;
}

function formatCsvCell(val) {
    let v = val.trim();
    if (v === 'NULL') return '';

    // If it was numeric but handled as string in parser above?
    // The parser removes quotes.

    // Escape for CSV (Excel style)
    if (v.includes('"') || v.includes(',') || v.includes('\n')) {
        v = v.replace(/"/g, '""');
        return `"${v}"`;
    }
    return v;
}
