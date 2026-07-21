const fs = require('fs');
const https = require('https');

const inputFile = 'relatorio_alteracoes.csv';
const outputFile = 'relatorio_alteracoes_pt.csv';

function translateText(text) {
    return new Promise((resolve, reject) => {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(text)}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    // The API returns structure: [[[translation, original, ...], ...]]
                    const translation = json[0].map(item => item[0]).join('');
                    resolve(translation);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    if (!fs.existsSync(inputFile)) {
        console.error(`Input file ${inputFile} not found.`);
        process.exit(1);
    }

    const content = fs.readFileSync(inputFile, 'utf-8');
    const lines = content.split('\r\n');
    const header = lines[0];
    const newLines = [header];

    console.log(`Starting translation of ${lines.length - 1} lines...`);

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // format is date;"subject"
        const semicolonIndex = line.indexOf(';');
        if (semicolonIndex === -1) {
            newLines.push(line);
            continue;
        }

        const date = line.substring(0, semicolonIndex);
        let subject = line.substring(semicolonIndex + 1);
        if (subject.startsWith('"') && subject.endsWith('"')) {
            subject = subject.substring(1, subject.length - 1);
        }

        // Clean subject (unescape double quotes)
        let cleanSubject = subject.replace(/""/g, '"');

        // Check if it looks like English (or if we want to translate everything not already in PT)
        // Usually, English commits have words like "fix", "feat", "add", "remove", "update", "resolve", "improve", "create", "delete", "error", "route" etc.
        // Let's translate it if it contains letters.
        let translated = cleanSubject;
        if (/[a-zA-Z]/.test(cleanSubject)) {
            try {
                // Short wait to avoid rate limit
                await delay(200);
                translated = await translateText(cleanSubject);
                console.log(`Translated [${i}/${lines.length}]: "${cleanSubject}" -> "${translated}"`);
            } catch (err) {
                console.error(`Failed to translate line ${i}: ${cleanSubject}. Error: ${err.message}`);
                // fallback to original
                translated = cleanSubject;
            }
        }

        const escapedTranslated = translated.replace(/"/g, '""');
        newLines.push(`${date};"${escapedTranslated}"`);
    }

    fs.writeFileSync(outputFile, newLines.join('\r\n'), 'utf-8');
    console.log(`Done! Output written to ${outputFile}`);
}

run();
