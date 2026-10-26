let selectedFile = null;
let currentScore = 0;
let totalQuestions = 0;
let answeredQuestions = 0;

const dropZone = document.getElementById('dropZone');
const pdfInput = document.getElementById('pdfInput');
const uploadBtn = document.getElementById('uploadBtn');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const statusMessage = document.getElementById('statusMessage');
const statusText = document.getElementById('statusText');
const quizContainer = document.getElementById('quizContainer');
const summaryContainer = document.getElementById('summaryContainer');
const finalScoreText = document.getElementById('finalScoreText');

// File Selection Listeners
dropZone.addEventListener('click', () => pdfInput.click());

pdfInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#2563eb";
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = "#e2e8f0";
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#e2e8f0";
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

function handleFile(file) {
    const validExtensions = ['.pdf', '.txt'];
    const isValid = file && validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (isValid) {
        selectedFile = file;
        fileNameDisplay.innerHTML = `Selected: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
        uploadBtn.disabled = false;
    } else {
        alert("Please upload a valid .pdf or .txt file.");
    }
}

// Upload & Generate Quiz
uploadBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('pdf', selectedFile);

    // Update UI states
    uploadBtn.disabled = true;
    quizContainer.innerHTML = '';
    summaryContainer.style.display = 'none';
    statusMessage.style.display = 'flex';
    statusText.innerText = "Extracting text and synthesizing quiz...";

    try {
        const response = await fetch('/api/generate-quiz', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.quiz) {
            statusMessage.style.display = 'none';
            renderQuiz(data.quiz);
        } else {
            throw new Error(data.error || 'Failed to generate quiz.');
        }
    } catch (err) {
        statusMessage.style.display = 'flex';
        statusText.innerText = `Error: ${err.message}`;
        uploadBtn.disabled = false;
    }
});

// Render Quiz Cards
function renderQuiz(quiz) {
    totalQuestions = quiz.length;
    answeredQuestions = 0;
    currentScore = 0;
    quizContainer.innerHTML = '';

    quiz.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'quiz-card';

        const questionTitle = document.createElement('h3');
        questionTitle.innerText = `Q${index + 1}: ${q.question}`;
        card.appendChild(questionTitle);

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options';

        q.options.forEach((opt) => {
            const btn = document.createElement('button');
            btn.className = 'opt-btn';
            btn.innerText = opt;

            btn.addEventListener('click', () => {
                checkAnswer(btn, opt, q.correct_answer, q.explanation, q.source_quote, optionsDiv, card);
            });

            optionsDiv.appendChild(btn);
        });

        card.appendChild(optionsDiv);
        quizContainer.appendChild(card);
    });
}

// Answer Selection and Checking
function checkAnswer(selectedBtn, chosenOpt, correctOpt, explanation, quote, optionsDiv, card) {
    const allButtons = optionsDiv.querySelectorAll('.opt-btn');
    allButtons.forEach(btn => btn.disabled = true);

    answeredQuestions++;

    const isCorrect = chosenOpt.trim().toLowerCase() === correctOpt.trim().toLowerCase();

    if (isCorrect) {
        selectedBtn.classList.add('correct');
        currentScore++;
    } else {
        selectedBtn.classList.add('incorrect');
        // Highlight the correct answer for clarity
        allButtons.forEach(btn => {
            if (btn.innerText.trim().toLowerCase() === correctOpt.trim().toLowerCase()) {
                btn.classList.add('correct');
            }
        });
    }

    // Feedback Container with Source Citation
    const feedbackBox = document.createElement('div');
    feedbackBox.className = 'feedback-box';
    feedbackBox.innerHTML = `
        <div class="explanation"><strong>Explanation:</strong> ${explanation}</div>
        <div class="source-quote"><strong>Source Excerpt:</strong> "${quote}"</div>
    `;
    card.appendChild(feedbackBox);

    // Show summary once all questions are answered
    // Trigger enhanced summary once all questions are answered
    if (answeredQuestions === totalQuestions) {
        summaryContainer.style.display = 'block';

        const incorrectCount = totalQuestions - currentScore;
        const percentage = Math.round((currentScore / totalQuestions) * 100);

        // Update Matrix Stats
        document.getElementById('statCorrect').innerText = currentScore;
        document.getElementById('statIncorrect').innerText = incorrectCount;
        document.getElementById('statTotal').innerText = totalQuestions;

        // Contextual Badge Assignment
        const scoreBadge = document.getElementById('scoreBadge');
        if (percentage >= 80) {
            scoreBadge.innerText = 'Distinction • Master';
            scoreBadge.style.background = '#dcfce7';
            scoreBadge.style.color = '#15803d';
        } else if (percentage >= 50) {
            scoreBadge.innerText = 'Good Effort • Proficient';
            scoreBadge.style.background = '#fef3c7';
            scoreBadge.style.color = '#b45309';
        } else {
            scoreBadge.innerText = 'Needs Review • Learner';
            scoreBadge.style.background = '#fee2e2';
            scoreBadge.style.color = '#b91c1c';
        }

        // Animate Numerical Percentage (Count-Up)
        const percentageEl = document.getElementById('scorePercentage');
        let currentDisplay = 0;
        const countStep = Math.max(1, Math.floor(percentage / 30));
        const countInterval = setInterval(() => {
            currentDisplay = Math.min(percentage, currentDisplay + countStep);
            percentageEl.innerText = `${currentDisplay}%`;
            if (currentDisplay >= percentage) clearInterval(countInterval);
        }, 20);

        // Animate Radial SVG Circle Fill
        const circle = document.getElementById('progressRingFill');
        const circumference = 2 * Math.PI * 66; // r = 66
        const offset = circumference - (percentage / 100) * circumference;
        setTimeout(() => {
            circle.style.strokeDashoffset = offset;
        }, 100);

        // Retry Button Listener (triggers a new randomized quiz from the current file)
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.onclick = () => uploadBtn.click();
        }

        summaryContainer.scrollIntoView({ behavior: 'smooth' });
    }
}
// --- 3D PARTICLE MESH BACKGROUND ENGINE ---
const canvas = document.getElementById('bg3d');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
const PARTICLE_COUNT = 55;
const FOV = 280;

let mouseX = 0;
let mouseY = 0;

function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - width / 2) * 0.05;
    mouseY = (e.clientY - height / 2) * 0.05;
});

class Particle3D {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = (Math.random() - 0.5) * width * 1.5;
        this.y = (Math.random() - 0.5) * height * 1.5;
        this.z = Math.random() * 800 + 100;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.vz = -0.8;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;

        // Reset if it comes too close or flies out of bounds
        if (this.z <= 10 || Math.abs(this.x) > width || Math.abs(this.y) > height) {
            this.reset();
            this.z = 800;
        }
    }

    project() {
        const perspective = FOV / (FOV + this.z);
        return {
            x: (this.x + mouseX * 2) * perspective + width / 2,
            y: (this.y + mouseY * 2) * perspective + height / 2,
            scale: perspective,
            alpha: Math.min(1, Math.max(0, (1 - this.z / 900) * 0.9))
        };
    }
}

// Generate nodes
for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle3D());
}

function animate3D() {
    ctx.clearRect(0, 0, width, height);

    const projected = [];

    // Update and project points
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        projected.push(particles[i].project());
    }

    // Draw connecting 3D mesh lines
    for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
            const p1 = projected[i];
            const p2 = projected[j];

            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 130) {
                const lineAlpha = (1 - dist / 130) * Math.min(p1.alpha, p2.alpha) * 0.45;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(99, 102, 241, ${lineAlpha})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }

    // Draw glowing 3D particle nodes
    for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const radius = Math.max(1, p.scale * 4.5);

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
        ctx.shadowColor = '#818cf8';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0; // reset blur
    }

    requestAnimationFrame(animate3D);
}

animate3D();