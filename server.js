// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000; 

const API_KEY = process.env.CARBONE_API_KEY;
const TEMPLATE_ID = process.env.CARBONE_TEMPLATE_ID;
const API_BASE_URL = process.env.CARBONE_API_BASE_URL;

const processingQueue = {};
const generateJobId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public'))); 

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});


// 1. Endpoint to RECEIVE and SAVE the Job in the queue
app.post('/submit-job', (req, res) => {
    const jobData = req.body;
    const jobId = generateJobId();

    if (!API_KEY || !TEMPLATE_ID) {
        return res.status(500).json({ success: false, error: "API credentials not loaded on the server." });
    }

    processingQueue[jobId] = {
        data: jobData,
        status: 'PENDING',
        renderId: null
    };

    console.log(`[Queue] Job ${jobId} received. Awaiting processing.`);

    res.status(202).json({ 
        success: true, 
        jobId: jobId, 
        message: "Document received and saved for later processing." 
    });
});

// 2. Endpoint to PROCESS (Render) the Job
app.post('/process-job/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const job = processingQueue[jobId];

    if (!job) {
        return res.status(404).json({ success: false, error: "Job ID not found." });
    }
    
    if (job.status === 'DONE') {
        return res.json({ success: true, renderId: job.renderId });
    }

    // CARBONE.IO COMMUNICATION LOGIC (POST Rendering)
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
        console.log(`[Queue] Job ${jobId} completed. Render ID: ${renderId}`);

        res.json({ success: true, renderId: renderId });

    } catch (error) {
        job.status = 'FAILED';
        console.error(`[Queue] Error processing Job ${jobId}:`, error.message);
        const errorMessage = error.response ? (error.response.data || error.message) : error.message;
        res.status(500).json({ success: false, error: "Rendering error (Backend)", details: errorMessage });
    }
});

// 3. Endpoint for PDF DOWNLOAD
app.get('/download/:renderId', async (req, res) => {
    const { renderId } = req.params;
    
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

        res.setHeader('Content-Type', 'application/pdf');
        res.send(downloadResponse.data);
    } catch (error) {
        console.error("Error downloading PDF:", error.message);
        res.status(500).json({ success: false, error: "Error downloading PDF from Carbone.io" });
    }
});

app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
    console.log(`Access the application locally at: http://localhost:${port}`);
});