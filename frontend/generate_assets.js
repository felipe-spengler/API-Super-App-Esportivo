import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const outDir = 'C:\\Users\\Felipe\\Desktop\\app-esportivo\\imgs';
const logoPath = 'C:\\Users\\Felipe\\Desktop\\app-esportivo\\backend\\frontend\\public\\logo.png';

// Garantir que a pasta de saída existe
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Transformar logo path em URL
const logoUrl = 'file:///' + logoPath.replace(/\\/g, '/');

async function generate() {
    console.log('Iniciando Puppeteer...');
    const browser = await puppeteer.launch({ headless: true });
    
    // 1. Gerar Ícone (512x512)
    console.log('Gerando ícone...');
    const iconPage = await browser.newPage();
    await iconPage.setViewport({ width: 512, height: 512 });
    await iconPage.setContent(`
        <html>
            <body style="margin:0; padding:0; background-color: #ffffff; display: flex; align-items: center; justify-content: center; width: 512px; height: 512px;">
                <img src="${logoUrl}" style="max-width: 400px; max-height: 400px; object-fit: contain;" />
            </body>
        </html>
    `);
    await iconPage.screenshot({ path: path.join(outDir, 'icon_512.png') });
    
    // 2. Gerar Banner (1024x500)
    console.log('Gerando banner...');
    const bannerPage = await browser.newPage();
    await bannerPage.setViewport({ width: 1024, height: 500 });
    await bannerPage.setContent(`
        <html>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@800&display=swap');
                body {
                    margin: 0; padding: 0; 
                    width: 1024px; height: 500px; 
                    background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%);
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    font-family: 'Inter', sans-serif;
                    position: relative;
                    overflow: hidden;
                }
                .container {
                    display: flex;
                    align-items: center;
                    gap: 60px;
                    z-index: 10;
                }
                .text-content {
                    color: white;
                }
                h1 {
                    font-size: 64px;
                    margin: 0;
                    line-height: 1.1;
                    letter-spacing: -2px;
                }
                p {
                    font-size: 28px;
                    color: #a5b4fc;
                    margin-top: 16px;
                    font-weight: 600;
                }
                .decor-circle {
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.05);
                }
            </style>
            <body>
                <!-- Decorative elements -->
                <div class="decor-circle" style="width: 600px; height: 600px; top: -200px; right: -100px;"></div>
                <div class="decor-circle" style="width: 400px; height: 400px; bottom: -150px; left: -100px;"></div>
                
                <div class="container">
                    <div style="background: white; padding: 30px; border-radius: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                        <img src="${logoUrl}" style="width: 250px; height: 250px; object-fit: contain;" />
                    </div>
                    <div class="text-content">
                        <h1>Gestão<br/>Esportiva</h1>
                        <p>O aplicativo oficial dos seus campeonatos.</p>
                    </div>
                </div>
            </body>
        </html>
    `);
    
    // Esperar a fonte carregar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await bannerPage.screenshot({ path: path.join(outDir, 'banner_1024x500.png') });
    
    await browser.close();
    console.log('Imagens geradas com sucesso em: ' + outDir);
}

generate().catch(console.error);
