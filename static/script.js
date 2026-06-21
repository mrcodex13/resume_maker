// ── DOM REFS ──────────────────────────────────────────────────────────────────

const fileInput   = document.getElementById('fileInput');
const fileInfo    = document.getElementById('fileInfo');
const fileName    = document.getElementById('fileName');
const removeFile  = document.getElementById('removeFile');
const uploadZone  = document.getElementById('uploadZone');
const jdTextarea  = document.querySelector('.jd-textarea');
const charCount   = document.getElementById('charCount');
const generateBtn = document.getElementById('generateBtn');
const loadingCard = document.getElementById('loadingCard');
const resultCard  = document.getElementById('resultCard');
const loadingStep = document.getElementById('loadingStep');
const progressFill= document.getElementById('progressFill');

// Phase 2 elements
const atsPanel     = document.getElementById('atsPanel');
const heatmapPanel = document.getElementById('heatmapPanel');
const ringFill     = document.getElementById('ringFill');
const ringScore    = document.getElementById('ringScore');
const kwBar = document.getElementById('kwBar'); const kwVal = document.getElementById('kwVal');
const skBar = document.getElementById('skBar'); const skVal = document.getElementById('skVal');
const exBar = document.getElementById('exBar'); const exVal = document.getElementById('exVal');
const hitChips  = document.getElementById('hitChips');
const missChips = document.getElementById('missChips');

// ── FILE UPLOAD ───────────────────────────────────────────────────────────────

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) showFile(fileInput.files[0]);
});

function showFile(file) {
  fileName.textContent = file.name;
  fileInfo.style.display = 'flex';
  uploadZone.style.display = 'none';
}

removeFile.addEventListener('click', () => {
  fileInput.value = '';
  fileInfo.style.display = 'none';
  uploadZone.style.display = 'block';
});

uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) showFile(e.dataTransfer.files[0]);
});

// ── CHAR COUNT ────────────────────────────────────────────────────────────────

jdTextarea.addEventListener('input', () => {
  charCount.textContent = jdTextarea.value.length + ' chars';
});

// ── FAKE PROGRESS ─────────────────────────────────────────────────────────────

const steps = [
  'Analyzing job description...',
  'Extracting skills & keywords...',
  'Parsing your existing resume...',
  'Generating ATS-optimized content...',
  'Running NLP keyword analysis...',
  'Finalizing PDF & DOCX...'
];

let progressInterval = null;

function startProgress() {
  let i = 0;
  progressFill.style.width = '0%';
  loadingStep.textContent = steps[0];
  progressInterval = setInterval(() => {
    if (i < steps.length - 1) {
      i++;
      loadingStep.textContent = steps[i];
      progressFill.style.width = ((i / steps.length) * 90) + '%';
    }
  }, 5000);
}

function stopProgress() {
  clearInterval(progressInterval);
  progressFill.style.width = '100%';
}

// ── ATS SCORE RING RENDERER ───────────────────────────────────────────────────

function getScoreColor(score) {
  if (score >= 75) return '#22c55e';   // green
  if (score >= 50) return '#f59e0b';   // amber
  return '#ef4444';                     // red
}

function animateRing(score) {
  const circumference = 314; // 2π × 50
  const color = getScoreColor(score);

  ringFill.style.stroke = color;
  ringScore.style.color = color;

  let current = 0;
  const target = Math.round((score / 100) * circumference);
  const step   = target / 40; // 40 frames

  const anim = setInterval(() => {
    current = Math.min(current + step, target);
    ringFill.style.strokeDashoffset = circumference - current;
    ringScore.textContent = Math.round((current / circumference) * 100);
    if (current >= target) clearInterval(anim);
  }, 18);
}

function animateBar(barEl, valEl, pct, color) {
  valEl.textContent = pct + '%';
  let w = 0;
  const step = pct / 30;
  barEl.style.background = color;
  const anim = setInterval(() => {
    w = Math.min(w + step, pct);
    barEl.style.width = w + '%';
    if (w >= pct) clearInterval(anim);
  }, 18);
}

function renderAtsScore(data) {
  atsPanel.style.display = 'flex';

  // Ring
  animateRing(data.ats_score);

  // Sub-bars
  const kwColor = getScoreColor(data.keyword_coverage);
  const skColor = getScoreColor(data.skills_match);
  const exColor = getScoreColor(data.experience_relevance);

  setTimeout(() => animateBar(kwBar, kwVal, data.keyword_coverage,    kwColor), 100);
  setTimeout(() => animateBar(skBar, skVal, data.skills_match,         skColor), 200);
  setTimeout(() => animateBar(exBar, exVal, data.experience_relevance, exColor), 300);
}

// ── KEYWORD HEATMAP RENDERER ──────────────────────────────────────────────────

function chip(text, type) {
  const span = document.createElement('span');
  span.className = `kw-chip kw-${type}`;
  span.textContent = text;
  return span;
}

function renderHeatmap(hits, misses) {
  heatmapPanel.style.display = 'block';
  hitChips.innerHTML  = '';
  missChips.innerHTML = '';

  if (hits.length)  hits.forEach(k  => hitChips.appendChild(chip(k, 'hit')));
  else hitChips.innerHTML  = '<span class="kw-empty">None detected</span>';

  if (misses.length) misses.forEach(k => missChips.appendChild(chip(k, 'miss')));
  else missChips.innerHTML = '<span class="kw-empty">All keywords covered!</span>';
}

// ── SKILLS GAP (Phase 1, kept) ────────────────────────────────────────────────

function renderSkillsGap(matched, missing) {
  const container = document.getElementById('skillsGap');
  if (!container) return;
  container.style.display = 'block';

  container.innerHTML = `
    <h3 style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;color:var(--text);margin-bottom:18px;">
      Skills Analysis
    </h3>
    <div style="margin-bottom:16px;">
      <p style="font-size:12px;font-weight:500;color:#22c55e;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">
        ✓ You already have these
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${matched.length ? matched.map(s => `
          <span style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);color:#22c55e;font-size:13px;padding:4px 12px;border-radius:20px;font-weight:500;">${s}</span>
        `).join('') : '<span style="font-size:13px;color:var(--text3);">None detected</span>'}
      </div>
    </div>
    <div>
      <p style="font-size:12px;font-weight:500;color:#f97316;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">
        ⚠ Skills you lack for this role
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${missing.length ? missing.map(s => `
          <span style="background:rgba(249,115,22,.1);border:1px solid rgba(249,115,22,.3);color:#f97316;font-size:13px;padding:4px 12px;border-radius:20px;font-weight:500;">${s}</span>
        `).join('') : '<span style="font-size:13px;color:var(--text3);">None — great match!</span>'}
      </div>
    </div>
  `;
}

// ── GENERATE ──────────────────────────────────────────────────────────────────

generateBtn.addEventListener('click', async () => {
  if (!fileInput.files[0])       { alert('Please upload your current resume.');  return; }
  if (!jdTextarea.value.trim())  { alert('Please paste the job description.');   return; }

  const formData = new FormData();
  formData.append('name',           document.getElementById('inp-name').value);
  formData.append('email',          document.getElementById('inp-email').value);
  formData.append('phone',          document.getElementById('inp-phone').value);
  formData.append('location',       document.getElementById('inp-location').value);
  formData.append('linkedin',       document.getElementById('inp-linkedin').value);
  formData.append('github',         document.getElementById('inp-github').value);
  formData.append('targetRole',     document.getElementById('inp-role').value);
  formData.append('resume',         fileInput.files[0]);
  formData.append('jobDescription', jdTextarea.value.trim());

  // Reset Phase 2 panels
  atsPanel.style.display     = 'none';
  heatmapPanel.style.display = 'none';
  document.getElementById('skillsGap').style.display = 'none';
  ringFill.style.strokeDashoffset = '314';
  ringScore.textContent = '0';
  [kwBar, skBar, exBar].forEach(b => b.style.width = '0%');

  loadingCard.style.display  = 'block';
  resultCard.style.display   = 'none';
  generateBtn.disabled       = true;
  generateBtn.style.opacity  = '0.6';
  startProgress();

  try {
    const res  = await fetch('/api/generate', { method: 'POST', body: formData });
    const data = await res.json();
    stopProgress();

    if (!res.ok || data.error) {
      alert('Error: ' + (data.error || 'Something went wrong.'));
      return;
    }

    loadingCard.style.display = 'none';
    resultCard.style.display  = 'flex';

    // Phase 1 — skills gap
    renderSkillsGap(data.matched_skills || [], data.missing_skills || []);

    // Phase 2 — ATS score + heatmap
    renderAtsScore(data);
    renderHeatmap(data.keyword_hits || [], data.keyword_misses || []);

  } catch (err) {
    stopProgress();
    alert('Network error: ' + err.message);
  } finally {
    generateBtn.disabled      = false;
    generateBtn.style.opacity = '1';
    loadingCard.style.display = 'none';
  }
});

// ── DOWNLOADS ─────────────────────────────────────────────────────────────────

document.getElementById('dlPdfBtn').addEventListener('click', () => {
  window.location.href = '/api/download/pdf';
});

document.getElementById('dlDocxBtn').addEventListener('click', () => {
  window.location.href = '/api/download/docx';
});