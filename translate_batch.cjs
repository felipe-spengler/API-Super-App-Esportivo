const fs = require('fs');
const https = require('https');

const inputFile = 'relatorio_alteracoes.csv';
const outputFile = 'relatorio_alteracoes_pt.csv';

function translateBatch(texts) {
    return new Promise((resolve, reject) => {
        // We join texts with a unique delimiter that Google Translate preserves, like a newline.
        const joinedText = texts.join('\n');
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(joinedText)}`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    // Google Translate single returns translated segments. Let's merge them correctly.
                    // The structure is [[ [trans1, orig1], [trans2, orig2] ]]
                    // Sometimes it splits a single line into multiple segments, so we join and then split by \n.
                    const fullTranslation = json[0].map(item => item[0]).join('');
                    const lines = fullTranslation.split('\n').map(l => l.trim());
                    resolve(lines);
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

// Maps prefix names to Portuguese standard terms
function translatePrefix(message) {
    let prefix = '';
    let remainder = message;

    const match = message.match(/^([a-zA-Z0-9_\-]+)(\([^)]+\))?\s*:\s*(.*)$/);
    if (match) {
        let type = match[1].toLowerCase();
        let scope = match[2] || '';
        remainder = match[3];

        switch(type) {
            case 'feat':
                type = 'Recurso';
                break;
            case 'fix':
                type = 'Correção';
                break;
            case 'refactor':
                type = 'Refatoração';
                break;
            case 'style':
                type = 'Estilo';
                break;
            case 'perf':
                type = 'Desempenho';
                break;
            case 'chore':
                type = 'Tarefa';
                break;
            case 'docs':
                type = 'Documentação';
                break;
            case 'test':
            case 'tests':
                type = 'Testes';
                break;
        }

        prefix = `${type}${scope}: `;
    }

    return { prefix, remainder };
}

async function run() {
    if (!fs.existsSync(inputFile)) {
        console.error(`Input file ${inputFile} not found.`);
        process.exit(1);
    }

    const content = fs.readFileSync(inputFile, 'utf-8');
    const lines = content.split(/\r?\n/);
    const header = lines[0];
    const outputLines = [header];

    console.log(`Starting batch translation of ${lines.length - 1} lines...`);

    // Prepare translation payloads
    const batchSize = 30;
    const itemsToTranslate = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const semicolonIndex = line.indexOf(';');
        if (semicolonIndex === -1) {
            itemsToTranslate.push({ index: i, date: '', original: line, prefix: '', remainder: line, skip: true });
            continue;
        }

        const date = line.substring(0, semicolonIndex);
        let subject = line.substring(semicolonIndex + 1);
        if (subject.startsWith('"') && subject.endsWith('"')) {
            subject = subject.substring(1, subject.length - 1);
        }

        const cleanSubject = subject.replace(/""/g, '"');
        
        // Don't translate if there are no letters or it's already in Portuguese
        // Let's check for common Portuguese words or non-english features
        const hasEnglish = /[a-zA-Z]/.test(cleanSubject);
        
        if (!hasEnglish) {
            itemsToTranslate.push({ index: i, date, original: cleanSubject, prefix: '', remainder: cleanSubject, skip: true });
        } else {
            const { prefix, remainder } = translatePrefix(cleanSubject);
            itemsToTranslate.push({ index: i, date, original: cleanSubject, prefix, remainder, skip: false });
        }
    }

    // Now process in batches
    for (let i = 0; i < itemsToTranslate.length; i += batchSize) {
        const batch = itemsToTranslate.slice(i, i + batchSize);
        const batchToTranslate = batch.filter(item => !item.skip);

        if (batchToTranslate.length > 0) {
            const remainders = batchToTranslate.map(item => item.remainder);
            try {
                console.log(`Translating batch ${i} to ${i + batch.length}...`);
                const translatedRemainders = await translateBatch(remainders);
                
                // Assign translations back
                batchToTranslate.forEach((item, idx) => {
                    const trans = translatedRemainders[idx] || item.remainder;
                    item.translated = item.prefix + trans;
                });
            } catch (err) {
                console.error(`Error translating batch: ${err.message}. Retrying individually...`);
                // Fallback to translating individual items in the batch
                for (const item of batchToTranslate) {
                    try {
                        await delay(100);
                        const trans = (await translateBatch([item.remainder]))[0] || item.remainder;
                        item.translated = item.prefix + trans;
                    } catch (individualErr) {
                        item.translated = item.original; // fallback to original
                    }
                }
            }
        }

        // Add to outputLines
        batch.forEach(item => {
            const finalVal = item.skip ? item.original : (item.translated || item.original);
            const escaped = finalVal.replace(/"/g, '""');
            outputLines.push(`${item.date};"${escaped}"`);
        });

        await delay(300); // polite pause between batches
    }

    fs.writeFileSync(outputFile, '\uFEFF' + outputLines.join('\r\n'), 'utf-8');
    console.log(`Success! File generated at ${outputFile}`);
}

run();
