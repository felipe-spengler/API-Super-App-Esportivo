const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'sistema antigo', 'Dumps_bancos', 'Dump RunEvents Atualizado.sql');

if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
}

const content = fs.readFileSync(inputFile, 'utf8');

const regex = /INSERT INTO `(\w+)`[\s\S]*?VALUES\s*(.*?);/gs;
let match;
let found = false;

while ((match = regex.exec(content)) !== null) {
    found = true;
    const table = match[1];

    if (!['usuarios', 'eventos', 'categorias', 'inscricoes', 'resultados'].includes(table)) continue;

    let valuesBlock = match[2];
    console.log(`Processing table: ${table}`);

    // This regex split is naive but worked for Previous dump.
    // However, some dumps structure might be `VALUES (1, ...), (2, ...);`
    // The previous regex `VALUES (.*?);` in line 13 captures everything.
    // Let's rely on the previous logic splitting by `),\s*\(`.

    const rawRows = valuesBlock.split(/\),\s*\(/);
    const csvRows = rawRows.map(rowStr => {
        let clean = rowStr.trim();
        if (clean.startsWith('(')) clean = clean.substring(1);
        if (clean.endsWith(')')) clean = clean.substring(0, clean.length - 1);
        const cols = [];
        let buffer = '';
        let inQuote = false;
        let escaped = false;

        for (let i = 0; i < clean.length; i++) {
            const char = clean[i];

            if (escaped) {
                buffer += char;
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true; // Handle basic escaping if present
                // buffer += char; // Keep backslash? SQL dumps usually escape details.
                // For ' or " escaping.
                continue;
            }

            if (char === "'") { inQuote = !inQuote; }
            if (char === ',' && !inQuote) {
                cols.push(formatCsvCell(buffer));
                buffer = '';
                continue;
            }
            buffer += char;
        }
        cols.push(formatCsvCell(buffer));
        return cols.join(',');
    });

    fs.writeFileSync(path.join(__dirname, `${table}.csv`), csvRows.join('\n'));
    console.log(`Created ${table}.csv with ${csvRows.length} rows.`);
}

function formatCsvCell(val) {
    let v = val.trim();
    if (v === 'NULL') return '';
    if (v.startsWith("'") && v.endsWith("'")) {
        v = v.substring(1, v.length - 1);
        // Map common SQL escapes back if needed or let CSV handle it
        v = v.replace(/"/g, '""'); // Escape double quotes for CSV
        return `"${v}"`;
    }
    // Numeric
    return v;
}
