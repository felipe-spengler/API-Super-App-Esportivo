&lt;!DOCTYPE html&gt;
&lt;html lang="pt-BR"&gt;
&lt;head&gt;
    &lt;meta charset="UTF-8"&gt;
    &lt;meta name="viewport" content="width=device-width, initial-scale=1.0"&gt;
    &lt;title&gt;🎨 Teste de Remoção de Fundo - IA&lt;/title&gt;
    &lt;style&gt;
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            margin-bottom: 30px;
        }

        .upload-area {
            border: 3px dashed #667eea;
            border-radius: 15px;
            padding: 60px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #f8f9ff;
        }

        .upload-area:hover {
            border-color: #764ba2;
            background: #f0f2ff;
            transform: translateY(-2px);
        }

        .upload-area.dragover {
            border-color: #4caf50;
            background: #e8f5e9;
        }

        .upload-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }

        .upload-text {
            font-size: 1.2rem;
            color: #667eea;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .upload-hint {
            color: #999;
            font-size: 0.9rem;
        }

        input[type="file"] {
            display: none;
        }

        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 40px;
            font-size: 1.1rem;
            font-weight: 600;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            margin-top: 20px;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .results {
            display: none;
            margin-top: 40px;
        }

        .results.show {
            display: block;
        }

        .comparison {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 30px;
        }

        @media (max-width: 768px) {
            .comparison {
                grid-template-columns: 1fr;
            }
        }

        .image-box {
            text-align: center;
        }

        .image-box h3 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.3rem;
        }

        .image-container {
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            background: 
                repeating-conic-gradient(#ddd 0% 25%, white 0% 50%) 
                50% / 20px 20px;
            min-height: 300px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .image-container img {
            max-width: 100%;
            height: auto;
            display: block;
        }

        .loading {
            display: none;
            text-align: center;
            padding: 40px;
        }

        .loading.show {
            display: block;
        }

        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .error {
            background: #ffebee;
            color: #c62828;
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
            display: none;
        }

        .error.show {
            display: block;
        }

        .success {
            background: #e8f5e9;
            color: #2e7d32;
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }

        .info-card {
            background: #f8f9ff;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }

        .info-card h4 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 0.9rem;
            text-transform: uppercase;
        }

        .info-card p {
            font-size: 1.5rem;
            font-weight: 600;
            color: #333;
        }

        .download-btn {
            background: #4caf50;
            margin-top: 15px;
        }

        .download-btn:hover {
            background: #45a049;
        }
    &lt;/style&gt;
&lt;/head&gt;
&lt;body&gt;
    &lt;div class="container"&gt;
        &lt;div class="header"&gt;
            &lt;h1&gt;🎨 Teste de Remoção de Fundo&lt;/h1&gt;
            &lt;p&gt;Testando IA para remover fundo de fotos de jogadores&lt;/p&gt;
        &lt;/div&gt;

        &lt;div class="card"&gt;
            &lt;form id="uploadForm" enctype="multipart/form-data"&gt;
                &lt;div class="upload-area" id="uploadArea"&gt;
                    &lt;div class="upload-icon"&gt;📸&lt;/div&gt;
                    &lt;div class="upload-text"&gt;Clique ou arraste uma foto aqui&lt;/div&gt;
                    &lt;div class="upload-hint"&gt;Formatos: JPG, PNG, WEBP (máx 4MB)&lt;/div&gt;
                    &lt;input type="file" id="photoInput" name="photo" accept="image/jpeg,image/png,image/webp"&gt;
                &lt;/div&gt;

                &lt;div id="preview" style="margin-top: 20px; text-align: center; display: none;"&gt;
                    &lt;img id="previewImg" style="max-width: 300px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"&gt;
                &lt;/div&gt;

                &lt;div style="text-align: center;"&gt;
                    &lt;button type="submit" class="btn" id="processBtn" disabled&gt;
                        🚀 Processar com IA
                    &lt;/button&gt;
                &lt;/div&gt;
            &lt;/form&gt;

            &lt;div class="loading" id="loading"&gt;
                &lt;div class="spinner"&gt;&lt;/div&gt;
                &lt;h3&gt;Processando com IA...&lt;/h3&gt;
                &lt;p&gt;Isso pode levar alguns segundos&lt;/p&gt;
            &lt;/div&gt;

            &lt;div class="error" id="error"&gt;&lt;/div&gt;
        &lt;/div&gt;

        &lt;div class="results" id="results"&gt;
            &lt;div class="card"&gt;
                &lt;div class="success"&gt;
                    ✅ &lt;strong&gt;Sucesso!&lt;/strong&gt; Fundo removido com IA
                &lt;/div&gt;

                &lt;div class="comparison"&gt;
                    &lt;div class="image-box"&gt;
                        &lt;h3&gt;📷 Imagem Original&lt;/h3&gt;
                        &lt;div class="image-container"&gt;
                            &lt;img id="originalImg"&gt;
                        &lt;/div&gt;
                    &lt;/div&gt;

                    &lt;div class="image-box"&gt;
                        &lt;h3&gt;✨ Sem Fundo (IA)&lt;/h3&gt;
                        &lt;div class="image-container"&gt;
                            &lt;img id="processedImg"&gt;
                        &lt;/div&gt;
                        &lt;button class="btn download-btn" id="downloadBtn"&gt;
                            ⬇️ Baixar Imagem
                        &lt;/button&gt;
                    &lt;/div&gt;
                &lt;/div&gt;

                &lt;div class="info-grid"&gt;
                    &lt;div class="info-card"&gt;
                        &lt;h4&gt;Tempo de Processamento&lt;/h4&gt;
                        &lt;p id="processingTime"&gt;-&lt;/p&gt;
                    &lt;/div&gt;
                    &lt;div class="info-card"&gt;
                        &lt;h4&gt;Tamanho Original&lt;/h4&gt;
                        &lt;p id="originalSize"&gt;-&lt;/p&gt;
                    &lt;/div&gt;
                    &lt;div class="info-card"&gt;
                        &lt;h4&gt;Tamanho Processado&lt;/h4&gt;
                        &lt;p id="processedSize"&gt;-&lt;/p&gt;
                    &lt;/div&gt;
                &lt;/div&gt;

                &lt;div style="text-align: center; margin-top: 30px;"&gt;
                    &lt;button class="btn" onclick="location.reload()"&gt;
                        🔄 Testar Outra Imagem
                    &lt;/button&gt;
                &lt;/div&gt;
            &lt;/div&gt;
        &lt;/div&gt;
    &lt;/div&gt;

    &lt;script&gt;
        const uploadArea = document.getElementById('uploadArea');
        const photoInput = document.getElementById('photoInput');
        const preview = document.getElementById('preview');
        const previewImg = document.getElementById('previewImg');
        const processBtn = document.getElementById('processBtn');
        const uploadForm = document.getElementById('uploadForm');
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const results = document.getElementById('results');
        
        let selectedFile = null;
        let startTime = null;

        // Click to upload
        uploadArea.addEventListener('click', () => photoInput.click());

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length &gt; 0) {
                photoInput.files = files;
                handleFileSelect(files[0]);
            }
        });

        // File selection
        photoInput.addEventListener('change', (e) => {
            if (e.target.files.length &gt; 0) {
                handleFileSelect(e.target.files[0]);
            }
        });

        function handleFileSelect(file) {
            selectedFile = file;
            
            // Preview
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
                processBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }

        // Form submission
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!selectedFile) return;

            // Hide previous results/errors
            results.classList.remove('show');
            error.classList.remove('show');
            
            // Show loading
            loading.classList.add('show');
            processBtn.disabled = true;
            
            startTime = Date.now();

            const formData = new FormData();
            formData.append('photo', selectedFile);
            formData.append('remove_bg', '1');

            try {
                const response = await fetch('/api/test-remove-bg', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                loading.classList.remove('show');

                if (response.ok &amp;&amp; data.photo_nobg_url) {
                    // Success
                    const endTime = Date.now();
                    const processingTime = ((endTime - startTime) / 1000).toFixed(2);
                    
                    document.getElementById('originalImg').src = data.photo_url;
                    document.getElementById('processedImg').src = data.photo_nobg_url;
                    document.getElementById('processingTime').textContent = processingTime + 's';
                    document.getElementById('originalSize').textContent = formatBytes(selectedFile.size);
                    
                    // Download button
                    document.getElementById('downloadBtn').onclick = () => {
                        window.open(data.photo_nobg_url, '_blank');
                    };
                    
                    results.classList.add('show');
                    
                    // Fetch processed file size
                    fetch(data.photo_nobg_url)
                        .then(r => r.blob())
                        .then(blob => {
                            document.getElementById('processedSize').textContent = formatBytes(blob.size);
                        });
                    
                } else {
                    // Error
                    error.textContent = '❌ Erro: ' + (data.message || data.ai_error || 'Falha ao processar imagem');
                    error.classList.add('show');
                    processBtn.disabled = false;
                }
            } catch (err) {
                loading.classList.remove('show');
                error.textContent = '❌ Erro de conexão: ' + err.message;
                error.classList.add('show');
                processBtn.disabled = false;
            }
        });

        function formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }
    &lt;/script&gt;
&lt;/body&gt;
&lt;/html&gt;
