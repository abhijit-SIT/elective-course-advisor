/**
 * Elective Course Advisor - UI Application Controller
 */

(function () {
  'use strict';

  // Application State
  let electivesData = [];
  let studentsData = [];
  let engine = null;
  let currentStudentId = null;
  let batchFilter = 'all';

  // DOM Elements
  const tabAdvisor = document.getElementById('tab-advisor');
  const tabBatch = document.getElementById('tab-batch');
  const tabData = document.getElementById('tab-data');

  const viewAdvisor = document.getElementById('view-advisor');
  const viewBatch = document.getElementById('view-batch');
  const viewData = document.getElementById('view-data');

  const studentSelector = document.getElementById('student-selector');
  const quickStudentSummary = document.getElementById('quick-student-summary');
  const studentProfileDisplay = document.getElementById('student-profile-display');
  const unmetNeedsAlert = document.getElementById('unmet-needs-alert');
  const recommendationsGrid = document.getElementById('recommendations-grid');

  const batchResultsTable = document.getElementById('batch-table-body');
  const batchMetricsContainer = document.getElementById('batch-metrics-container');
  const totalStudentsBadge = document.getElementById('total-students-badge');
  const btnRerunBatch = document.getElementById('btn-rerun-batch');

  // Initialization
  function init() {
    loadDefaultDatasets();
    setupNavigation();
    setupEventListeners();
    renderAllViews();
  }

  // Load default data
  function loadDefaultDatasets() {
    electivesData = parseCSV(DEFAULT_ELECTIVES_CSV);
    studentsData = parseCSV(DEFAULT_STUDENTS_CSV);
    engine = new AdvisorEngine(electivesData, studentsData);
    if (studentsData.length > 0) {
      currentStudentId = studentsData[0].student_id;
    }
  }

  // Navigation tab toggles
  function setupNavigation() {
    const tabs = [
      { btn: tabAdvisor, view: viewAdvisor },
      { btn: tabBatch, view: viewBatch },
      { btn: tabData, view: viewData }
    ];

    tabs.forEach(({ btn, view }) => {
      btn.addEventListener('click', () => {
        tabs.forEach(t => {
          t.btn.classList.remove('active');
          t.btn.setAttribute('aria-selected', 'false');
          t.view.classList.add('hidden');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        view.classList.remove('hidden');

        if (btn === tabBatch) {
          renderBatchView();
        } else if (btn === tabData) {
          renderDataManagementView();
        }
      });
    });
  }

  let simulatedStudent = null;

  // Event listeners
  function setupEventListeners() {
    studentSelector.addEventListener('change', (e) => {
      currentStudentId = e.target.value;
      const baseStudent = studentsData.find(s => s.student_id === currentStudentId);
      if (baseStudent) {
        simulatedStudent = JSON.parse(JSON.stringify(baseStudent));
        syncSimulatorInputs(simulatedStudent);
      }
      renderAdvisorView(simulatedStudent);
    });

    // Simulator inputs
    const simCgpaSlider = document.getElementById('sim-cgpa-slider');
    const simCgpaVal = document.getElementById('sim-cgpa-val');
    const simWorkloadSelect = document.getElementById('sim-workload-select');
    const simReqPe = document.getElementById('sim-req-pe');
    const simReqOe = document.getElementById('sim-req-oe');
    const simGoalSelect = document.getElementById('sim-goal-select');
    const btnResetSim = document.getElementById('btn-reset-simulator');

    if (simCgpaSlider) {
      simCgpaSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value).toFixed(2);
        simCgpaVal.textContent = val;
        if (simulatedStudent) {
          simulatedStudent.cgpa = parseFloat(val);
          renderAdvisorView(simulatedStudent);
        }
      });
    }

    if (simWorkloadSelect) {
      simWorkloadSelect.addEventListener('change', (e) => {
        if (simulatedStudent) {
          simulatedStudent.workload_preference = e.target.value;
          renderAdvisorView(simulatedStudent);
        }
      });
    }

    if (simReqPe) {
      simReqPe.addEventListener('change', (e) => {
        if (simulatedStudent) {
          simulatedStudent.required_pe = parseInt(e.target.value, 10) || 0;
          renderAdvisorView(simulatedStudent);
        }
      });
    }

    if (simReqOe) {
      simReqOe.addEventListener('change', (e) => {
        if (simulatedStudent) {
          simulatedStudent.required_oe = parseInt(e.target.value, 10) || 0;
          renderAdvisorView(simulatedStudent);
        }
      });
    }

    if (simGoalSelect) {
      simGoalSelect.addEventListener('change', (e) => {
        if (simulatedStudent) {
          simulatedStudent.goal = e.target.value;
          renderAdvisorView(simulatedStudent);
        }
      });
    }

    if (btnResetSim) {
      btnResetSim.addEventListener('click', () => {
        const baseStudent = studentsData.find(s => s.student_id === currentStudentId);
        if (baseStudent) {
          simulatedStudent = JSON.parse(JSON.stringify(baseStudent));
          syncSimulatorInputs(simulatedStudent);
          renderAdvisorView(simulatedStudent);
        }
      });
    }

    // Batch Export CSV
    const btnExportBatch = document.getElementById('btn-export-batch-csv');
    if (btnExportBatch) {
      btnExportBatch.addEventListener('click', () => {
        exportBatchResultsCSV();
      });
    }

    btnRerunBatch.addEventListener('click', () => {
      renderBatchView();
    });

    // Batch filters
    document.querySelectorAll('#batch-filters .filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#batch-filters .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        batchFilter = btn.dataset.filter;
        renderBatchTableOnly();
      });
    });

    // Subtabs in Data View
    const subtabElectives = document.getElementById('subtab-electives');
    const subtabStudents = document.getElementById('subtab-students');
    const tableElectives = document.getElementById('table-container-electives');
    const tableStudents = document.getElementById('table-container-students');

    subtabElectives.addEventListener('click', () => {
      subtabElectives.classList.add('active');
      subtabStudents.classList.remove('active');
      tableElectives.classList.remove('hidden');
      tableStudents.classList.add('hidden');
    });

    subtabStudents.addEventListener('click', () => {
      subtabStudents.classList.add('active');
      subtabElectives.classList.remove('active');
      tableStudents.classList.remove('hidden');
      tableElectives.classList.add('hidden');
    });

    // CSV Downloads
    document.getElementById('btn-download-electives-csv').addEventListener('click', () => {
      downloadCSV(DEFAULT_ELECTIVES_CSV, 'electives.csv');
    });

    document.getElementById('btn-download-students-csv').addEventListener('click', () => {
      downloadCSV(DEFAULT_STUDENTS_CSV, 'students.csv');
    });

    document.getElementById('btn-reset-default-data').addEventListener('click', () => {
      loadDefaultDatasets();
      renderAllViews();
      alert('Data reset to default benchmark datasets.');
    });

    // File Uploads
    setupFileUpload('input-electives-file', (content) => {
      electivesData = parseCSV(content);
      engine = new AdvisorEngine(electivesData, studentsData);
      renderAllViews();
      alert(`Loaded ${electivesData.length} electives from custom CSV.`);
    });

    setupFileUpload('input-students-file', (content) => {
      studentsData = parseCSV(content);
      engine = new AdvisorEngine(electivesData, studentsData);
      currentStudentId = studentsData[0]?.student_id || null;
      renderAllViews();
      alert(`Loaded ${studentsData.length} students from custom CSV.`);
    });
  }

  function syncSimulatorInputs(student) {
    if (!student) return;
    const simCgpaSlider = document.getElementById('sim-cgpa-slider');
    const simCgpaVal = document.getElementById('sim-cgpa-val');
    const simWorkloadSelect = document.getElementById('sim-workload-select');
    const simReqPe = document.getElementById('sim-req-pe');
    const simReqOe = document.getElementById('sim-req-oe');
    const simGoalSelect = document.getElementById('sim-goal-select');

    if (simCgpaSlider) simCgpaSlider.value = student.cgpa;
    if (simCgpaVal) simCgpaVal.textContent = student.cgpa;
    if (simWorkloadSelect) simWorkloadSelect.value = student.workload_preference;
    if (simReqPe) simReqPe.value = student.required_pe;
    if (simReqOe) simReqOe.value = student.required_oe;
    if (simGoalSelect) {
      // Find matching option or default to first
      let found = false;
      for (const opt of simGoalSelect.options) {
        if (opt.value.toLowerCase() === (student.goal || '').toLowerCase()) {
          simGoalSelect.value = opt.value;
          found = true;
          break;
        }
      }
      if (!found) simGoalSelect.selectedIndex = 0;
    }
  }

  function exportBatchResultsCSV() {
    const summary = engine.testAllStudents();
    let csv = "student_id,name,goal,cgpa,required_pe,required_oe,workload_preference,status,combinations_found,top_combination_courses,weekly_hours,unmet_notes\n";
    summary.results.forEach(r => {
      const topCourses = r.topRecommendation ? r.topRecommendation.courses.map(c => `${c.course_code}(${c.slot})`).join(';') : 'None';
      const hours = r.topRecommendation ? r.topRecommendation.totalWeeklyHours : 0;
      const notes = (r.unmetReasons[0] || 'Fully Validated').replace(/"/g, '""');
      csv += `"${r.student_id}","${r.name}","${r.goal}",${r.cgpa},${r.required_pe},${r.required_oe},"${r.workload_preference}","${r.status}",${r.combinationsFound},"${topCourses}",${hours},"${notes}"\n`;
    });
    downloadCSV(csv, 'batch_validation_results.csv');
  }

  function setupFileUpload(inputId, callback) {
    const fileInput = document.getElementById(inputId);
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        callback(evt.target.result);
      };
      reader.readAsText(file);
    });
  }

  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Render everything
  function renderAllViews() {
    populateStudentDropdown();
    renderAdvisorView();
    renderBatchView();
    renderDataManagementView();
  }

  // Populate Student Dropdown
  function populateStudentDropdown() {
    studentSelector.innerHTML = '';
    studentsData.forEach(student => {
      const option = document.createElement('option');
      option.value = student.student_id;
      option.textContent = `${student.student_id} - ${student.name} (${student.goal})`;
      if (student.student_id === currentStudentId) {
        option.selected = true;
      }
      studentSelector.appendChild(option);
    });
    totalStudentsBadge.textContent = studentsData.length;
  }

  // Render Advisor View
  function renderAdvisorView(overrideStudent) {
    const student = overrideStudent || (studentsData.find(s => s.student_id === currentStudentId) || studentsData[0]);
    if (!student) return;

    if (!overrideStudent && (!simulatedStudent || simulatedStudent.student_id !== student.student_id)) {
      simulatedStudent = JSON.parse(JSON.stringify(student));
      syncSimulatorInputs(simulatedStudent);
    }

    renderStudentProfile(student);

    // Call Recommendation Engine
    const result = engine.recommend(student);

    // Render Unmet Needs Alert if applicable
    if (!result.success || result.diagnostics.unmetReasons.length > 0) {
      unmetNeedsAlert.classList.remove('hidden');
      const isFatal = !result.success || result.recommendations.length === 0;
      unmetNeedsAlert.className = `alert-box ${isFatal ? 'alert-danger' : 'alert-warning'}`;

      let reasonsHtml = result.diagnostics.unmetReasons.map(r => `<li>${escapeHtml(r)}</li>`).join('');
      
      let blockedInfo = '';
      if (result.diagnostics.blockedPE.length > 0) {
        blockedInfo += `<p style="margin-top:0.4rem; font-size:0.8rem;">Blocked Program Electives due to missing prerequisites: ${result.diagnostics.blockedPE.map(b => `<b>${b.course.course_code}</b> (needs ${b.missing.join(', ')})`).join(', ')}</p>`;
      }

      unmetNeedsAlert.innerHTML = `
        <div class="alert-icon">${isFatal ? '🚫' : '⚠️'}</div>
        <div class="alert-content">
          <h4>${isFatal ? "Student's Elective Needs Cannot Be Fully Met" : "Constrained Recommendation Warning"}</h4>
          <p>${isFatal 
            ? "The algorithm evaluated all combinations, but strict academic constraints prevent satisfying all requirements:" 
            : "Some constraints restricted the available search space:"}</p>
          <ul>${reasonsHtml}</ul>
          ${blockedInfo}
        </div>
      `;
    } else {
      unmetNeedsAlert.classList.add('hidden');
    }

    // Render Top 3 Recommendation Cards
    renderRecommendationCards(result.recommendations, student, result.diagnostics);
  }

  // Render Student Profile Details
  function renderStudentProfile(student) {
    const clearedList = (student.subjects_cleared || '').split(';').filter(Boolean);
    const weakList = (student.weak_subjects || '').split(';').filter(Boolean);

    // Quick summary pills
    quickStudentSummary.innerHTML = `
      <div class="stat-pill"><span class="label">CGPA:</span> <span class="val">${student.cgpa}</span></div>
      <div class="stat-pill"><span class="label">Pace:</span> <span class="val">${student.workload_preference}</span></div>
      <div class="stat-pill"><span class="label">Quota:</span> <span class="val">${student.required_pe} PE + ${student.required_oe} OE</span></div>
    `;

    studentProfileDisplay.innerHTML = `
      <div class="profile-card">
        <div class="profile-card-title"><span>🎯</span> Target Goal & Aspiration</div>
        <div class="profile-main-val">${escapeHtml(student.goal)}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">Matches career tags, skill tags, and specialization track</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title"><span>📊</span> Academic Standing</div>
        <div class="profile-main-val" style="color: ${student.cgpa >= 8.5 ? '#34d399' : (student.cgpa >= 7.0 ? '#38bdf8' : '#fbbf24')}">${student.cgpa} <span style="font-size:0.85rem; font-weight:500; color:var(--text-muted);">/ 10</span></div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${student.cgpa < 7.0 ? '⚠️ High risk on hard courses' : 'Academic standing in good track'}</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title"><span>✅</span> Prerequisites Cleared (${clearedList.length})</div>
        <div class="tag-list">
          ${clearedList.map(c => `<span class="chip chip-cleared">${escapeHtml(c)}</span>`).join('')}
        </div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title"><span>⚠️</span> Weak Subjects to Avoid</div>
        <div class="tag-list">
          ${weakList.length > 0 
            ? weakList.map(w => `<span class="chip chip-weak">${escapeHtml(w)}</span>`).join('') 
            : '<span style="font-size:0.8rem; color:var(--text-muted);">None reported</span>'}
        </div>
      </div>
    `;
  }

  // Render Top 3 Recommendation Cards
  function renderRecommendationCards(recommendations, student, diagnostics) {
    recommendationsGrid.innerHTML = '';

    if (!recommendations || recommendations.length === 0) {
      recommendationsGrid.innerHTML = `
        <div class="glass-panel" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3 style="font-family: var(--font-display); font-size: 1.4rem; margin-bottom: 0.5rem; color:#fff;">No Valid Elective Combinations Found</h3>
          <p style="color: var(--text-secondary); max-width: 600px; margin: 0 auto 1.5rem auto;">
            The student's cleared subjects do not satisfy prerequisites for enough non-clashing electives, or timetable slot collisions prevent picking ${student.required_pe} Program Electives and ${student.required_oe} Open Electives.
          </p>
          <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border-subtle); display: inline-block; padding: 1rem 1.5rem; border-radius: var(--radius-md); text-align: left;">
            <div style="font-weight: 700; font-size: 0.85rem; color: #fbbf24; margin-bottom: 0.4rem;">Remedy Recommendations:</div>
            <ul style="font-size: 0.82rem; color: #cbd5e1; margin-left: 1.2rem;">
              <li>Clear missing prerequisites (e.g., MA102, CS201, CS202) in upcoming summer/bridge terms.</li>
              <li>Request department approval for slot conflict overrides or alternative elective cross-listing.</li>
              <li>Adjust required elective type ratio if permitted by curriculum policy.</li>
            </ul>
          </div>
        </div>
      `;
      return;
    }

    recommendations.forEach((rec, idx) => {
      const card = document.createElement('div');
      card.className = `rec-card rank-${rec.rank}`;

      // Slot mini timeline blocks
      const allSlots = ['Slot A', 'Slot B', 'Slot C', 'Slot D', 'Slot E', 'Slot F', 'Slot G', 'Slot H', 'Slot I', 'Slot J'];
      const slotHtml = allSlots.map(slotName => {
        const matchingCourse = rec.courses.find(c => c.slot === slotName);
        if (matchingCourse) {
          const slotClass = slotName.toLowerCase().replace(' ', '-');
          return `<div class="slot-box filled ${slotClass}" title="${matchingCourse.course_code}: ${matchingCourse.course_name} (${slotName})">${slotName.replace('Slot ', '')}</div>`;
        }
        return `<div class="slot-box" title="Empty Slot">${slotName.replace('Slot ', '')}</div>`;
      }).join('');

      // Course list HTML
      const coursesHtml = rec.courses.map(course => {
        const slotClass = course.slot.toLowerCase().replace(' ', '-');
        const diffClass = `diff-${course.difficulty.toLowerCase()}`;
        return `
          <div class="course-item">
            <div class="course-item-header">
              <div class="course-code-wrap">
                <span class="course-code">${course.course_code}</span>
                <span class="slot-tag ${slotClass}">${course.slot}</span>
              </div>
              <span class="course-type-pill">${course.type}</span>
            </div>
            <div class="course-name">${escapeHtml(course.course_name)}</div>
            <div class="course-meta">
              <span>⏱️ ${course.weekly_hours} hrs/wk</span>
              <span class="diff-badge ${diffClass}">Difficulty: ${course.difficulty}</span>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:3px; margin-top:5px;">
              ${course.skill_tags.slice(0, 3).map(st => `<span style="font-size:0.65rem; background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:3px; color:#94a3b8;">${escapeHtml(st)}</span>`).join('')}
            </div>
          </div>
        `;
      }).join('');

      // Gains HTML
      const gainsHtml = rec.gains.map(g => `
        <li class="bullet-item">
          <span class="bullet-icon">✨</span>
          <span>${escapeHtml(g)}</span>
        </li>
      `).join('');

      // Trade-offs HTML ("What the student gives up")
      const tradeoffsHtml = rec.tradeoffs.length > 0 
        ? rec.tradeoffs.map(t => `
            <li class="bullet-item">
              <span class="bullet-icon">⚠️</span>
              <span><strong>${escapeHtml(t.type)}:</strong> ${escapeHtml(t.description)}</span>
            </li>
          `).join('')
        : `<li class="bullet-item"><span class="bullet-icon">✔️</span><span>Optimal fit with minimal compromises identified.</span></li>`;

      card.innerHTML = `
        ${rec.rank === 1 ? '<div class="rec-top-badge">⭐ Recommended Option 1</div>' : ''}
        
        <div class="card-header-row">
          <div class="rec-rank-title">
            <span class="rank-tag">Combination Option ${rec.rank}</span>
            <h3 class="archetype-title">${escapeHtml(rec.archetype)}</h3>
          </div>
          <div class="score-badge">
            <div class="score-num">${rec.compositeScore}%</div>
            <div class="score-lbl">Match Score</div>
          </div>
        </div>

        <!-- Weekly Hours & Metric Strip -->
        <div class="stats-strip">
          <div class="strip-item">
            <div class="strip-val">${rec.totalWeeklyHours} hrs</div>
            <div class="strip-lbl">Weekly Hours</div>
          </div>
          <div class="strip-item">
            <div class="strip-val">${rec.courses.length} / ${student.required_pe + student.required_oe}</div>
            <div class="strip-lbl">Courses Picked</div>
          </div>
          <div class="strip-item">
            <div class="strip-val">${rec.hardCount}</div>
            <div class="strip-lbl">Hard Courses</div>
          </div>
        </div>

        <!-- Timetable Slot Grid -->
        <div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; margin-bottom:4px; text-transform:uppercase;">
            Timetable Allocation (No Slot Clashes)
          </div>
          <div class="timetable-mini">
            ${slotHtml}
          </div>
        </div>

        <!-- Enrolled Courses -->
        <div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; margin-bottom:6px; text-transform:uppercase;">
            Courses in Combination
          </div>
          <div class="course-list">
            ${coursesHtml}
          </div>
        </div>

        <!-- Gains & Benefits -->
        <div class="analysis-box gains-box">
          <div class="box-title"><span>🌟</span> Key Strengths & Fit</div>
          <ul class="bullet-list">
            ${gainsHtml}
          </ul>
        </div>

        <!-- What the student gives up (Trade-offs) -->
        <div class="analysis-box tradeoffs-box">
          <div class="box-title"><span>⚖️</span> What the Student Gives Up (Trade-offs)</div>
          <ul class="bullet-list">
            ${tradeoffsHtml}
          </ul>
        </div>
      `;

      recommendationsGrid.appendChild(card);
    });
  }

  // Render Batch View
  function renderBatchView() {
    const summary = engine.testAllStudents();

    // Summary Metrics Cards
    batchMetricsContainer.innerHTML = `
      <div class="metric-card">
        <div class="metric-val">${summary.total}</div>
        <div class="metric-lbl">Total Students</div>
      </div>
      <div class="metric-card success">
        <div class="metric-val">${summary.passedCount}</div>
        <div class="metric-lbl">Fully Feasible</div>
      </div>
      <div class="metric-card warning">
        <div class="metric-val">${summary.partialCount}</div>
        <div class="metric-lbl">Constrained</div>
      </div>
      <div class="metric-card danger">
        <div class="metric-val">${summary.failedCount}</div>
        <div class="metric-lbl">Infeasible</div>
      </div>
      <div class="metric-card">
        <div class="metric-val" style="color:var(--accent-secondary);">${summary.successRate}%</div>
        <div class="metric-lbl">Overall Success</div>
      </div>
    `;

    document.getElementById('count-all').textContent = summary.total;
    document.getElementById('count-passed').textContent = summary.passedCount;
    document.getElementById('count-partial').textContent = summary.partialCount;
    document.getElementById('count-failed').textContent = summary.failedCount;

    renderBatchTableOnly(summary.results);
  }

  function renderBatchTableOnly(cachedResults) {
    const results = cachedResults || engine.testAllStudents().results;
    const filtered = batchFilter === 'all' 
      ? results 
      : results.filter(r => r.status === batchFilter);

    batchResultsTable.innerHTML = '';

    filtered.forEach(item => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.title = 'Click to view full recommendations for this student';

      const statusBadge = `<span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span>`;
      const topComboStr = item.topRecommendation 
        ? item.topRecommendation.courses.map(c => `<b>${c.course_code}</b> (${c.slot})`).join(', ') + ` [${item.topRecommendation.totalWeeklyHours}h]`
        : '<span style="color:var(--color-danger); font-style:italic;">None Possible</span>';

      const notesHtml = item.unmetReasons.length > 0 
        ? `<span style="color:#fbbf24; font-size:0.78rem;">⚠️ ${escapeHtml(item.unmetReasons[0])}</span>`
        : `<span style="color:#34d399; font-size:0.78rem;">✓ 3 distinct combinations validated without slot clash.</span>`;

      tr.innerHTML = `
        <td><strong style="color:#fff;">${item.student_id}</strong></td>
        <td>${escapeHtml(item.name)}</td>
        <td><span style="font-size:0.8rem; color:#cbd5e1;">${escapeHtml(item.goal)}</span></td>
        <td><strong>${item.cgpa}</strong></td>
        <td><span class="chip chip-quota">${item.required_pe} PE + ${item.required_oe} OE</span></td>
        <td>${escapeHtml(item.workload_preference)}</td>
        <td>${statusBadge}</td>
        <td>${topComboStr}</td>
        <td>${notesHtml}</td>
      `;

      tr.addEventListener('click', () => {
        currentStudentId = item.student_id;
        studentSelector.value = item.student_id;
        tabAdvisor.click();
      });

      batchResultsTable.appendChild(tr);
    });
  }

  // Render Data Management Tables
  function renderDataManagementView() {
    document.getElementById('electives-count-tag').textContent = electivesData.length;
    document.getElementById('students-count-tag').textContent = studentsData.length;

    const tbodyElectives = document.getElementById('tbody-electives-raw');
    tbodyElectives.innerHTML = electivesData.map(c => `
      <tr>
        <td><strong>${escapeHtml(c.course_code)}</strong></td>
        <td>${escapeHtml(c.course_name)}</td>
        <td>${escapeHtml(c.type)}</td>
        <td><span class="slot-tag slot-${(c.slot || '').toLowerCase().replace(' ', '-')}">${escapeHtml(c.slot)}</span></td>
        <td><code>${escapeHtml(c.prerequisites || 'None')}</code></td>
        <td>${escapeHtml(c.difficulty)}</td>
        <td>${c.weekly_hours}h</td>
        <td><small>${escapeHtml(c.career_tags)}</small></td>
        <td><small>${escapeHtml(c.skill_tags)}</small></td>
      </tr>
    `).join('');

    const tbodyStudents = document.getElementById('tbody-students-raw');
    tbodyStudents.innerHTML = studentsData.map(s => `
      <tr>
        <td><strong>${escapeHtml(s.student_id)}</strong></td>
        <td>${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.goal)}</td>
        <td>${s.cgpa}</td>
        <td><code>${escapeHtml(s.subjects_cleared)}</code></td>
        <td><span style="color:#f87171;">${escapeHtml(s.weak_subjects || 'None')}</span></td>
        <td>${escapeHtml(s.workload_preference)}</td>
        <td>${s.required_pe}</td>
        <td>${s.required_oe}</td>
      </tr>
    `).join('');
  }

  // Helper escape HTML
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Boot on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
