// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
port = process.env.PORT || 3000;

// Variáveis de Ambiente
const API_KEY = process.env.CARBONE_API_KEY;
const TEMPLATE_ID = process.env.CARBONE_TEMPLATE_ID;
const API_BASE_URL = process.env.CARBONE_API_BASE_URL;

// ** CACHE DE PROCESSAMENTO (Simulação em Memória) **
// Armazena jobs: { jobId: { data: { seu_json }, status: 'PENDING' | 'DONE' | 'FAILED', renderId: null } }
const processingQueue = {};
const generateJobId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

// --- Middlewares ---
app.use(express.json());
// Serve arquivos estáticos da pasta 'public'
app.use(express.static('public')); 

// Middleware CORS (para desenvolvimento)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// --- 1. Endpoint para RECEBER e SALVAR o Job na fila ---
app.post('/submit-job', (req, res) => {
    const jobData = req.body;
    const jobId = generateJobId();

    if (!API_KEY || !TEMPLATE_ID) {
        return res.status(500).json({ success: false, error: "Credenciais da API não carregadas no servidor." });
    }

    processingQueue[jobId] = {
        data: jobData,
        status: 'PENDING',
        renderId: null
    };

    console.log(`[Queue] Job ${jobId} recebido. Aguardando processamento.`);

    // Retorna imediatamente o status de recebimento (202 Accepted)
    res.status(202).json({ 
        success: true, 
        jobId: jobId, 
        message: "Documento recebido e salvo para posterior processamento." 
    });
});

// --- 2. Endpoint para PROCESSAR (Renderizar) o Job ---
// Chamado pelo frontend após o timer de 10s
app.post('/process-job/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const job = processingQueue[jobId];

    if (!job) {
        return res.status(404).json({ success: false, error: "Job ID não encontrado." });
    }
    
    // Se o job já foi processado, retorna o ID imediatamente sem chamar a API de novo.
    if (job.status === 'DONE') {
        return res.json({ success: true, renderId: job.renderId });
    }

    // --- LÓGICA DE COMUNICAÇÃO COM O CARBONE.IO (Renderização POST) ---
    const RENDER_URL = `${API_BASE_URL}/render/${TEMPLATE_ID}`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'carbone-version': '5'
    };
    
    try {
        const renderResponse = await axios.post(RENDER_URL, job.data, { headers });

        if (!renderResponse.data.success) {
            job.status = 'FAILED';
            return res.status(400).json(renderResponse.data);
        }

        const renderId = renderResponse.data.data.renderId;
        
        job.status = 'DONE';
        job.renderId = renderId;
        console.log(`[Queue] Job ${jobId} concluído. Render ID: ${renderId}`);

        res.json({ success: true, renderId: renderId });

    } catch (error) {
        job.status = 'FAILED';
        console.error(`[Queue] Erro ao processar Job ${jobId}:`, error.message);
        const errorMessage = error.response ? (error.response.data || error.message) : error.message;
        res.status(500).json({ success: false, error: "Erro na renderização (Backend)", details: errorMessage });
    }
});

// --- 3. Endpoint para DOWNLOAD do PDF ---
// Chamado pelo frontend quando o usuário clica em "Visualizar PDF"
app.get('/download/:renderId', async (req, res) => {
    const { renderId } = req.params;
    
    // Lógica de download (GET)
    const DOWNLOAD_URL = `${API_BASE_URL}/render/${renderId}`;
    const headers = {
        'carbone-version': '5',
        'Authorization': `Bearer ${API_KEY}`
    };

    try {
        const downloadResponse = await axios.get(DOWNLOAD_URL, {
            headers,
            responseType: 'arraybuffer'
        });

        // Retorna o PDF para o navegador
        res.setHeader('Content-Type', 'application/pdf');
        res.send(downloadResponse.data);
    } catch (error) {
        console.error("Erro ao baixar PDF:", error.message);
        res.status(500).json({ success: false, error: "Erro ao baixar PDF do Carbone.io" });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Acesse a aplicação em: http://localhost:${port}/index.html`);
});