# 🚀 Carbone.io Asynchronous Document Rendering Queue
![Demonstration of Asynchronous Queue Flow](https://github.com/user-attachments/assets/8f5bc76e-6633-4d20-a62b-65756b35d9e9)


This repository contains the source code for a demonstration application that simulates a microservices architecture for orchestrating the asynchronous generation of documents using the external **Carbone.io API**. 

The goal of this demo is to illustrate the importance of **separation of concerns** (frontend, orchestrator, and worker) and the use of **queuing** to prevent system overload in high-demand document generation workflows.

## 🌟 Live Demo

The application is hosted for free on **Render** and can be accessed here:

**Public URL:** [https://carbone-queue-app.onrender.com/](https://carbone-queue-app.onrender.com/)

## 🏗️ Architecture and Workflow (Simulation)

While the entire codebase is implemented as a **simple monolith (Node.js)** for ease of deployment and demonstration, the internal logic clearly simulates the interaction between three distinct microservices necessary for a scalable production system.

| Microservice | Code Component | Primary Responsibility |
| :--- | :--- | :--- |
| **A (Frontend/UI)** | `public/index.html` (JS) | JSON data input and submission of the request (`/submit-job`). |
| **B (Orchestrator/Middleware)** | `server.js` | Receives the submission, stores the Job (in memory), and initiates the timer (queue simulation). |
| **C (Worker/Carbone Client)** | `server.js` | After the 10s timer, executes the Job, calls the external Carbone.io API, and returns the `renderId`. |

**The Asynchronous Processing Flow:**

1.  The **Frontend (A)** sends the JSON data to the backend (`/submit-job`).
2.  The **Orchestrator (B)** saves the Job in an in-memory queue (`processingQueue` variable).
3.  A **10-second timer** simulates the waiting time in the queue before a dedicated worker processes the job.
4.  After the timer, the **Worker (C)** is called (`/process-job`) to render the document via Carbone.io.
5.  The job status is updated, and the user can download the final PDF (`/download`).

## 🛠️ Technologies Used

* **Backend:** Node.js, Express (for routing and API)
* **External API:** Carbone.io (for document rendering)
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
* **Deployment:** Render (Free Node.js web service hosting)

## ⚙️ Local Configuration

To run the application locally, you will need a Carbone.io API key (available from your Carbone.io account).

### Prerequisites

* Node.js (version 18+)
* npm or yarn

### 1. Clone the Repository

```bash
git clone [https://github.com/padilhalucas/Carbone.io.git](https://github.com/padilhalucas/Carbone.io.git)
cd Carbone.io
