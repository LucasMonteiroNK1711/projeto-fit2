const STORAGE_KEYS = {
  measures: 'fit_tracker_measures',
  workouts: 'fit_tracker_workouts',
  exerciseLibrary: 'fit_tracker_exercise_library',
  workoutSessions: 'fit_tracker_workout_sessions',
  theme: 'fit_tracker_theme',
};

const DEFAULT_LIBRARY = [
  { id: 'ex-1', group: 'Peito', exercise: 'Supino reto', reps: '4x10', setLoads: ['20', '22', '22', '24'] },
  { id: 'ex-2', group: 'Peito', exercise: 'Supino inclinado', reps: '4x10', setLoads: ['18', '20', '20', '22'] },
  { id: 'ex-3', group: 'Peito', exercise: 'Crossover', reps: '4x12', setLoads: ['12', '12', '14', '14'] },
  { id: 'ex-4', group: 'Peito', exercise: 'Crucifixo máquina', reps: '3x12', setLoads: ['25', '25', '30'] },
  { id: 'ex-5', group: 'Peito', exercise: 'Peck deck', reps: '3x15', setLoads: ['30', '35', '35'] },
  { id: 'ex-6', group: 'Bíceps', exercise: 'Rosca direta', reps: '4x10', setLoads: ['12', '12', '14', '14'] },
  { id: 'ex-7', group: 'Bíceps', exercise: 'Rosca alternada', reps: '3x12', setLoads: ['10', '10', '12'] },
  { id: 'ex-8', group: 'Bíceps', exercise: 'Rosca martelo', reps: '3x12', setLoads: ['10', '10', '12'] },
  { id: 'ex-9', group: 'Costas', exercise: 'Puxada frontal', reps: '4x12', setLoads: ['35', '35', '40', '40'] },
  { id: 'ex-10', group: 'Costas', exercise: 'Remada baixa', reps: '4x10', setLoads: ['40', '45', '45', '50'] },
  { id: 'ex-11', group: 'Pernas', exercise: 'Agachamento livre', reps: '5x8', setLoads: ['50', '60', '60', '70', '70'] },
  { id: 'ex-12', group: 'Pernas', exercise: 'Leg press', reps: '4x12', setLoads: ['120', '140', '140', '160'] },
];

const DEFAULT_WORKOUTS = {
  1: buildWorkoutFromExercises(DEFAULT_LIBRARY.filter((item) => item.group === 'Peito').slice(0, 5), ['Peito']),
  2: buildWorkoutFromExercises(DEFAULT_LIBRARY.filter((item) => item.group === 'Costas').slice(0, 2), ['Costas']),
  3: buildWorkoutFromExercises(DEFAULT_LIBRARY.filter((item) => item.group === 'Pernas').slice(0, 2), ['Pernas']),
  4: buildWorkoutFromExercises(DEFAULT_LIBRARY.filter((item) => item.group === 'Bíceps').slice(0, 3), ['Bíceps']),
  5: { groups: [], exercises: [] },
  6: { groups: [], exercises: [] },
};

const state = {
  measures: readStorage(STORAGE_KEYS.measures, []),
  exerciseLibrary: normalizeLibrary(readStorage(STORAGE_KEYS.exerciseLibrary, DEFAULT_LIBRARY)),
  workouts: normalizeWorkouts(readStorage(STORAGE_KEYS.workouts, DEFAULT_WORKOUTS)),
  workoutSessions: readStorage(STORAGE_KEYS.workoutSessions, {}),
};

const dom = {
  screens: document.querySelectorAll('.screen'),
  navButtons: document.querySelectorAll('.nav-btn'),
  screenTitle: document.getElementById('screenTitle'),
  modal: document.getElementById('measureModal'),
  measureForm: document.getElementById('measureForm'),
  measureTableBody: document.getElementById('measureTableBody'),
  workoutManagerModal: document.getElementById('workoutManagerModal'),
  workoutGeneratorForm: document.getElementById('workoutGeneratorForm'),
  groupSelector: document.getElementById('groupSelector'),
  exerciseForm: document.getElementById('exerciseForm'),
  saveExerciseBtn: document.getElementById('saveExerciseBtn'),
  workoutPlan: document.getElementById('workoutPlan'),
  exerciseLibrary: document.getElementById('exerciseLibrary'),
  weekStrip: document.getElementById('weekStrip'),
  weekSummary: document.getElementById('weekSummary'),
  todayWorkoutLabel: document.getElementById('todayWorkoutLabel'),
  todayWorkoutList: document.getElementById('todayWorkoutList'),
  themeToggle: document.getElementById('themeToggle'),
};

bindEvents();
initTheme();
refreshAll();
window.addEventListener('resize', renderDashboard);

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.measures, JSON.stringify(state.measures));
  localStorage.setItem(STORAGE_KEYS.exerciseLibrary, JSON.stringify(state.exerciseLibrary));
  localStorage.setItem(STORAGE_KEYS.workouts, JSON.stringify(state.workouts));
  localStorage.setItem(STORAGE_KEYS.workoutSessions, JSON.stringify(state.workoutSessions));
}

function normalizeLibrary(items) {
  return (items || []).map((item) => {
    const reps = item.reps || '4x10';
    return {
      id: item.id || `ex-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      group: normalizeGroupName(item.group || item.muscle || 'Geral'),
      exercise: String(item.exercise || '').trim(),
      reps,
      setLoads: normalizeSetLoads(item.setLoads ?? item.loads ?? item.load ?? '', reps),
    };
  });
}

function normalizeWorkouts(workouts) {
  const normalized = {};

  for (let day = 1; day <= 6; day += 1) {
    const source = workouts?.[day] || workouts?.[String(day)] || { groups: [], exercises: [] };
    const rawExercises = Array.isArray(source) ? source : source.exercises || [];
    const groups = Array.isArray(source.groups)
      ? source.groups.map(normalizeGroupName).filter(Boolean)
      : deriveGroupsFromExercises(rawExercises);

    normalized[day] = {
      groups,
      exercises: rawExercises.map((item) => ({
        id: item.id || `wk-${day}-${Math.random().toString(16).slice(2)}`,
        group: normalizeGroupName(item.group || item.muscle || 'Geral'),
        exercise: String(item.exercise || '').trim(),
        reps: item.reps || '4x10',
        setLoads: normalizeSetLoads(item.setLoads ?? item.loads ?? item.load ?? '', item.reps || '4x10'),
      })),
    };
  }

  return normalized;
}

function deriveGroupsFromExercises(exercises) {
  return [...new Set((exercises || []).map((item) => normalizeGroupName(item.group || item.muscle || 'Geral')).filter(Boolean))];
}

function buildWorkoutFromExercises(exercises, groups) {
  return {
    groups: [...new Set((groups || []).map(normalizeGroupName).filter(Boolean))],
    exercises: (exercises || []).map((item) => ({
      id: item.id || `wk-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      group: normalizeGroupName(item.group || 'Geral'),
      exercise: item.exercise,
      reps: item.reps,
      setLoads: normalizeSetLoads(item.setLoads, item.reps),
    })),
  };
}

function bindEvents() {
  document.getElementById('openMeasureModal').onclick = () => dom.modal.showModal();
  document.getElementById('openMeasureModalHeader').onclick = () => dom.modal.showModal();
  document.getElementById('closeModal').onclick = () => dom.modal.close();
  document.getElementById('openWorkoutManager').onclick = () => dom.workoutManagerModal.showModal();
  document.getElementById('closeWorkoutManager').onclick = () => dom.workoutManagerModal.close();
  dom.themeToggle.onclick = toggleTheme;

  dom.navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      dom.navButtons.forEach((b) => b.classList.remove('active'));
      dom.screens.forEach((s) => s.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(button.dataset.target).classList.add('active');
      dom.screenTitle.textContent = button.textContent;
    });
  });

  dom.measureForm.addEventListener('submit', onMeasureSubmit);
  dom.exerciseForm.addEventListener('submit', onExerciseSubmit);
  dom.workoutGeneratorForm.addEventListener('submit', onWorkoutGeneratorSubmit);
}

function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initialTheme);
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
  renderDashboard();
}

function applyTheme(theme) {
  document.body.classList.toggle('theme-dark', theme === 'dark');
  dom.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function onMeasureSubmit(event) {
  event.preventDefault();
  const form = new FormData(dom.measureForm);
  const entry = Object.fromEntries(form.entries());

  ['weight', 'height', 'neck', 'waist', 'hip', 'arm', 'leg'].forEach((field) => {
    entry[field] = entry[field] ? Number(entry[field]) : null;
  });

  state.measures.push(entry);
  state.measures.sort((a, b) => new Date(a.date) - new Date(b.date));
  saveState();

  dom.measureForm.reset();
  dom.modal.close();
  refreshAll();
}

function onExerciseSubmit(event) {
  event.preventDefault();
  const form = new FormData(dom.exerciseForm);
  const editId = String(form.get('editId') || '');
  const payload = {
    id: editId || `ex-${Date.now()}`,
    group: normalizeGroupName(form.get('group')),
    exercise: String(form.get('exercise') || '').trim(),
    reps: String(form.get('reps') || '').trim(),
    setLoads: normalizeSetLoads(form.get('loads'), String(form.get('reps') || '').trim()),
  };

  if (editId) {
    const index = state.exerciseLibrary.findIndex((item) => item.id === editId);
    if (index >= 0) state.exerciseLibrary[index] = payload;
    syncEditedExerciseWithWorkouts(payload);
  } else {
    state.exerciseLibrary.push(payload);
  }

  resetExerciseForm();
  saveState();
  refreshWorkoutArea();
}

function onWorkoutGeneratorSubmit(event) {
  event.preventDefault();
  const form = new FormData(dom.workoutGeneratorForm);
  const day = Number(form.get('day'));
  const count = Math.max(1, Math.min(10, Number(form.get('count')) || 5));
  const groups = getSelectedGroups();

  if (!groups.length) {
    dom.weekSummary.textContent = 'Selecione pelo menos um grupo muscular para gerar o treino.';
    return;
  }

  const matchingExercises = shuffleArray(
    state.exerciseLibrary.filter((item) => groups.includes(normalizeGroupName(item.group))),
  ).slice(0, count);

  state.workouts[day] = buildWorkoutFromExercises(matchingExercises, groups);
  clearSessionEntriesForDay(day);
  saveState();
  refreshWorkoutArea();

  const selectedCount = matchingExercises.length;
  dom.weekSummary.textContent = selectedCount < count
    ? `Foram encontrados ${selectedCount} exercícios para ${groups.join(' + ')}. Adicione mais itens na biblioteca para completar ${count}.`
    : `Treino de ${dayName(day)} gerado com ${selectedCount} exercícios para ${groups.join(' + ')}.`;
}

function syncEditedExerciseWithWorkouts(exercise) {
  Object.values(state.workouts).forEach((workout) => {
    workout.exercises = workout.exercises.map((item) => {
      if (item.id !== exercise.id) return item;
      return {
        ...item,
        group: exercise.group,
        exercise: exercise.exercise,
        reps: exercise.reps,
        setLoads: [...exercise.setLoads],
      };
    });
  });
}

function resetExerciseForm() {
  dom.exerciseForm.reset();
  dom.exerciseForm.editId.value = '';
  dom.saveExerciseBtn.textContent = 'Adicionar exercício';
}

function fillExerciseForm(item) {
  dom.exerciseForm.editId.value = item.id;
  dom.exerciseForm.group.value = item.group;
  dom.exerciseForm.exercise.value = item.exercise;
  dom.exerciseForm.reps.value = item.reps;
  dom.exerciseForm.loads.value = item.setLoads.join(', ');
  dom.saveExerciseBtn.textContent = 'Salvar edição';
}

function normalizeGroupName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeSetLoads(loadValue, reps) {
  const setCount = parseWorkoutReps(reps).sets;

  if (Array.isArray(loadValue)) {
    return ensureLoadCount(loadValue.map((item) => String(item ?? '').trim()), setCount);
  }

  const raw = String(loadValue || '').trim();
  if (!raw) return ensureLoadCount([], setCount);

  const parts = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return ensureLoadCount(parts, setCount);
}

function ensureLoadCount(loads, setCount) {
  const normalized = [...(loads || [])].map((item) => String(item ?? '').trim());
  const target = Math.max(setCount, 1);

  while (normalized.length < target) {
    normalized.push(normalized[normalized.length - 1] || '');
  }

  return normalized.slice(0, target);
}

function parseWorkoutReps(reps) {
  const match = String(reps || '').trim().match(/^(\d+)\s*x\s*(.+)$/i);
  if (!match) return { sets: 1, detail: String(reps || '').trim() || 'Execução livre' };
  return { sets: Number(match[1]), detail: match[2].trim() };
}

function refreshAll() {
  renderMeasuresTable();
  renderDashboard();
  refreshWorkoutArea();
}

function refreshWorkoutArea() {
  renderGroupSelector();
  renderTodayWorkout();
  renderWeekStrip();
  renderWorkoutPlan();
  renderExerciseLibrary();
}

function renderMeasuresTable() {
  dom.measureTableBody.innerHTML = '';
  if (!state.measures.length) {
    dom.measureTableBody.innerHTML = '<tr><td colspan="9">Nenhuma medida registrada ainda.</td></tr>';
    return;
  }

  state.measures.forEach((m, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.date || '-'}</td>
      <td>${m.weight ?? '-'}</td>
      <td>${m.height ?? '-'}</td>
      <td>${m.neck ?? '-'}</td>
      <td>${m.waist ?? '-'}</td>
      <td>${m.hip ?? '-'}</td>
      <td>${m.arm ?? '-'}</td>
      <td>${m.leg ?? '-'}</td>
      <td class="row-actions"><button class="trash-btn" data-measure-index="${index}" title="Excluir medida">🗑</button></td>
    `;
    dom.measureTableBody.appendChild(tr);
  });

  dom.measureTableBody.querySelectorAll('[data-measure-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.measures.splice(Number(btn.dataset.measureIndex), 1);
      saveState();
      refreshAll();
    });
  });
}

function renderDashboard() {
  const latest = state.measures.at(-1) || {};
  const fat = navyBodyFat(latest);
  const bmi = latest.weight && latest.height ? latest.weight / ((latest.height / 100) ** 2) : null;
  const lean = latest.weight && fat != null ? latest.weight * (1 - fat / 100) : null;

  setText('kpiWeight', latest.weight ? `${latest.weight} kg` : '-- kg');
  setText('kpiFat', fat != null ? `${fat}%` : '--%');
  setText('kpiHeight', latest.height ? `${latest.height} cm` : '-- cm');
  setText('kpiAge', calculateAge(latest.birthDate));
  setText('kpiBmi', bmi ? bmi.toFixed(1) : '--');
  setText('kpiLean', lean ? `${lean.toFixed(1)} kg` : '-- kg');
  setText('bodyFatValue', fat != null ? `${fat}%` : '--%');
  setText('bodyFatClass', classifyFat(fat));
  setGauge(fat);

  const weightSeries = state.measures.filter((m) => m.weight != null).map((m) => ({ x: m.date?.slice(5), y: m.weight }));
  const fatSeries = state.measures.map((m) => ({ x: m.date?.slice(5), y: navyBodyFat(m) })).filter((m) => m.y != null);

  drawLineChart('weightChart', weightSeries, '#0f9d8b');
  drawLineChart('fatChart', fatSeries, '#4a78d6');
}

function renderGroupSelector() {
  const groups = [...new Set(state.exerciseLibrary.map((item) => normalizeGroupName(item.group)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  dom.groupSelector.innerHTML = groups.length
    ? groups.map((group) => `
        <label class="group-chip">
          <input type="checkbox" name="groups" value="${escapeAttribute(group)}" />
          <span>${group}</span>
        </label>
      `).join('')
    : '<p class="muted">Cadastre exercícios na biblioteca para montar grupos.</p>';
}

function renderWeekStrip() {
  const today = new Date().getDay();
  const activeDays = [1, 2, 3, 4, 5, 6].filter((day) => (state.workouts[day]?.exercises || []).length > 0).length;

  dom.weekStrip.innerHTML = [0, 1, 2, 3, 4, 5, 6]
    .map((day) => {
      const count = day === 0 ? 'REST' : (state.workouts[day]?.exercises || []).length;
      const classes = `week-day ${day === today ? 'today' : ''} ${day === 0 ? 'rest' : ''}`;
      return `<div class="${classes}">${dayName(day).slice(0, 3)}<strong>${count}</strong></div>`;
    })
    .join('');

  dom.weekSummary.textContent = `${activeDays} de 6 dias com treino montado nesta semana.`;
}

function renderWorkoutPlan() {
  dom.workoutPlan.className = 'workout-plan-grid';
  dom.workoutPlan.innerHTML = Array.from({ length: 6 }, (_, index) => {
    const day = index + 1;
    const workout = state.workouts[day] || { groups: [], exercises: [] };
    const groupLabel = workout.groups.length ? workout.groups.join(' + ') : 'Nenhum grupo selecionado';
    const list = workout.exercises.length
      ? workout.exercises
          .map((item, exerciseIndex) => `
            <li>
              <strong>${item.exercise}</strong> · ${item.group} · ${item.reps}
              <span class="muted">${formatSetLoads(item.setLoads)}</span>
              <span class="button-group">
                <button class="trash-btn" data-remove-day="${day}" data-remove-index="${exerciseIndex}">🗑</button>
              </span>
            </li>
          `)
          .join('')
      : '<li>Treino ainda não montado.</li>';

    return `
      <details class="workout-day-card">
        <summary>${dayName(day)} (${workout.exercises.length})</summary>
        <p class="muted day-groups">${groupLabel}</p>
        <ul>${list}</ul>
      </details>
    `;
  }).join('');

  dom.workoutPlan.querySelectorAll('[data-remove-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const day = Number(btn.dataset.removeDay);
      const index = Number(btn.dataset.removeIndex);
      state.workouts[day].exercises.splice(index, 1);
      state.workouts[day].groups = deriveGroupsFromExercises(state.workouts[day].exercises);
      clearSessionEntryForWorkout(day, index);
      saveState();
      refreshWorkoutArea();
    });
  });
}

function renderExerciseLibrary() {
  const groups = [...new Set(state.exerciseLibrary.map((item) => item.group))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  if (!groups.length) {
    dom.exerciseLibrary.innerHTML = '<p class="muted">Nenhum exercício cadastrado na biblioteca.</p>';
    return;
  }

  dom.exerciseLibrary.className = 'library-list';
  dom.exerciseLibrary.innerHTML = groups.map((group) => {
    const items = state.exerciseLibrary
      .filter((item) => item.group === group)
      .sort((a, b) => a.exercise.localeCompare(b.exercise, 'pt-BR'));

    return `
      <section class="library-group">
        <div class="library-group-header">
          <h3>${group}</h3>
          <span>${items.length} exercícios</span>
        </div>
        <div class="library-group-list">
          ${items.map((item) => `
            <div class="library-item">
              <div>
                <strong>${item.exercise}</strong>
                <span class="muted">${item.reps} · ${formatSetLoads(item.setLoads)}</span>
              </div>
              <div class="button-group">
                <button class="action-btn" data-lib-edit="${item.id}">Editar</button>
                <button class="trash-btn" data-lib-delete="${item.id}">🗑</button>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }).join('');

  dom.exerciseLibrary.querySelectorAll('[data-lib-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = state.exerciseLibrary.find((exercise) => exercise.id === btn.dataset.libEdit);
      if (!item) return;
      fillExerciseForm(item);
    });
  });

  dom.exerciseLibrary.querySelectorAll('[data-lib-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.libDelete;
      state.exerciseLibrary = state.exerciseLibrary.filter((item) => item.id !== id);
      removeExerciseFromWorkouts(id);
      if (dom.exerciseForm.editId.value === id) resetExerciseForm();
      saveState();
      refreshWorkoutArea();
    });
  });
}

function removeExerciseFromWorkouts(exerciseId) {
  Object.entries(state.workouts).forEach(([day, workout]) => {
    const previousLength = workout.exercises.length;
    workout.exercises = workout.exercises.filter((item) => item.id !== exerciseId);
    workout.groups = deriveGroupsFromExercises(workout.exercises);
    if (workout.exercises.length !== previousLength) {
      clearSessionEntriesForDay(Number(day));
    }
  });
}

function renderTodayWorkout() {
  const today = new Date().getDay();

  if (today === 0) {
    dom.todayWorkoutLabel.textContent = 'Hoje é domingo: descanso ativo 🧘';
    dom.todayWorkoutList.innerHTML = '<p class="muted">Aproveite para recuperação, mobilidade e hidratação.</p>';
    return;
  }

  const workout = state.workouts[today] || { groups: [], exercises: [] };
  const exercises = workout.exercises || [];
  dom.todayWorkoutLabel.textContent = exercises.length
    ? `${dayName(today)} · ${workout.groups.join(' + ')}`
    : `${dayName(today)} · Treino ainda não montado`;

  if (!exercises.length) {
    dom.todayWorkoutList.innerHTML = '<p class="muted">Nenhum treino montado para hoje. Abra o gerenciador e gere os exercícios do dia.</p>';
    return;
  }

  dom.todayWorkoutList.innerHTML = exercises.map((item, index) => {
    const sessionEntry = getSessionEntry(today, index, item);
    const totalSets = sessionEntry.totalSets;
    const completedSets = Math.min(sessionEntry.completedSets, totalSets);
    const progress = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;
    const completed = completedSets >= totalSets;

    return `
      <article class="swipe-workout-card ${completed ? 'completed' : ''}" data-swipe-card="${today}-${index}">
        <div class="swipe-track"></div>
        <div class="swipe-card-content">
          <div class="workout-card-header">
            <div>
              <span class="chip">${item.group}</span>
              <strong>${item.exercise}</strong>
              <div class="muted">${item.reps}</div>
            </div>
            <div class="series-badge">${completedSets}/${totalSets} séries</div>
          </div>
          <div class="progress-row">
            <div class="progress-bar">
              <span style="width:${progress}%"></span>
            </div>
            <span class="progress-label">${completed ? 'Exercício concluído' : `Faltam ${Math.max(totalSets - completedSets, 0)} séries`}</span>
          </div>
          <div class="set-load-grid">
            ${sessionEntry.setLoads.map((load, setIndex) => `
              <label class="set-load-item ${setIndex < completedSets ? 'done' : ''}">
                <span>Série ${setIndex + 1}</span>
                <input type="number" step="0.5" value="${escapeAttribute(load)}" data-set-load-day="${today}" data-set-load-index="${index}" data-set-load-set="${setIndex}" />
              </label>
            `).join('')}
          </div>
          <div class="workout-card-footer">
            <span class="swipe-hint">Direita conclui 1 série. Esquerda desfaz 1 série.</span>
          </div>
        </div>
      </article>
    `;
  }).join('');

  dom.todayWorkoutList.querySelectorAll('[data-set-load-day]').forEach((input) => {
    input.addEventListener('change', () => {
      updateWorkoutSetLoad(
        Number(input.dataset.setLoadDay),
        Number(input.dataset.setLoadIndex),
        Number(input.dataset.setLoadSet),
        input.value,
      );
    });
  });

  dom.todayWorkoutList.querySelectorAll('[data-swipe-card]').forEach((card) => {
    const [day, index] = card.dataset.swipeCard.split('-').map(Number);
    attachSwipeGesture(card, day, index);
  });
}

function getSelectedGroups() {
  return [...dom.groupSelector.querySelectorAll('input[name="groups"]:checked')]
    .map((input) => normalizeGroupName(input.value))
    .filter(Boolean);
}

function getSessionEntry(day, index, workoutItem) {
  const sessionKey = todaySessionKey();
  const workoutKey = `${day}-${index}`;
  const existing = state.workoutSessions[sessionKey]?.[workoutKey];
  const totalSets = parseWorkoutReps(workoutItem.reps).sets;
  const baseLoads = normalizeSetLoads(existing?.setLoads ?? workoutItem.setLoads ?? [], workoutItem.reps);

  return {
    totalSets,
    completedSets: existing?.completedSets || 0,
    setLoads: ensureLoadCount(baseLoads, totalSets),
  };
}

function ensureTodaySession() {
  const sessionKey = todaySessionKey();
  state.workoutSessions[sessionKey] = state.workoutSessions[sessionKey] || {};
  return state.workoutSessions[sessionKey];
}

function updateWorkoutSetLoad(day, index, setIndex, value) {
  const workout = state.workouts[day]?.exercises?.[index];
  if (!workout) return;

  const session = ensureTodaySession();
  const current = getSessionEntry(day, index, workout);
  current.setLoads[setIndex] = String(value || '').trim();

  session[`${day}-${index}`] = {
    totalSets: current.totalSets,
    completedSets: current.completedSets,
    setLoads: current.setLoads,
  };

  saveState();
}

function advanceWorkoutSet(day, index) {
  const workout = state.workouts[day]?.exercises?.[index];
  if (!workout) return;

  const session = ensureTodaySession();
  const current = getSessionEntry(day, index, workout);
  session[`${day}-${index}`] = {
    totalSets: current.totalSets,
    completedSets: Math.min(current.completedSets + 1, current.totalSets),
    setLoads: current.setLoads,
  };

  saveState();
  renderTodayWorkout();
}

function undoWorkoutSet(day, index) {
  const workout = state.workouts[day]?.exercises?.[index];
  if (!workout) return;

  const session = ensureTodaySession();
  const current = getSessionEntry(day, index, workout);
  session[`${day}-${index}`] = {
    totalSets: current.totalSets,
    completedSets: Math.max(current.completedSets - 1, 0),
    setLoads: current.setLoads,
  };

  saveState();
  renderTodayWorkout();
}

function clearSessionEntryForWorkout(day, removedIndex) {
  Object.values(state.workoutSessions).forEach((session) => {
    if (!session) return;

    const updated = {};
    Object.entries(session).forEach(([key, value]) => {
      const [entryDay, entryIndex] = key.split('-').map(Number);
      if (entryDay !== day) {
        updated[key] = value;
        return;
      }
      if (entryIndex < removedIndex) {
        updated[key] = value;
        return;
      }
      if (entryIndex > removedIndex) {
        updated[`${entryDay}-${entryIndex - 1}`] = value;
      }
    });

    Object.keys(session).forEach((key) => delete session[key]);
    Object.assign(session, updated);
  });
}

function clearSessionEntriesForDay(day) {
  Object.values(state.workoutSessions).forEach((session) => {
    if (!session) return;
    Object.keys(session)
      .filter((key) => Number(key.split('-')[0]) === day)
      .forEach((key) => delete session[key]);
  });
}

function attachSwipeGesture(card, day, index) {
  let startX = 0;
  let dragging = false;

  const resetCard = () => {
    card.classList.remove('dragging');
    card.style.setProperty('--swipe-x', '0px');
  };

  card.addEventListener('pointerdown', (event) => {
    if (event.target.closest('input, button, select')) return;
    startX = event.clientX;
    dragging = true;
    card.classList.add('dragging');
    card.setPointerCapture(event.pointerId);
  });

  card.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - startX;
    const clamped = Math.max(-140, Math.min(deltaX, 140));
    card.style.setProperty('--swipe-x', `${clamped}px`);
  });

  card.addEventListener('pointerup', (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - startX;
    dragging = false;

    if (card.hasPointerCapture(event.pointerId)) {
      card.releasePointerCapture(event.pointerId);
    }

    if (deltaX > 90) {
      card.style.setProperty('--swipe-x', '140px');
      window.setTimeout(() => advanceWorkoutSet(day, index), 140);
      return;
    }

    if (deltaX < -90) {
      card.style.setProperty('--swipe-x', '-140px');
      window.setTimeout(() => undoWorkoutSet(day, index), 140);
      return;
    }

    resetCard();
  });

  card.addEventListener('pointercancel', () => {
    dragging = false;
    resetCard();
  });
}

function todaySessionKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSetLoads(loads) {
  return loads && loads.length ? `${loads.map((load) => load || '--').join(' / ')} kg` : 'Sem cargas definidas';
}

function shuffleArray(items) {
  const array = [...items];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function calculateAge(birthDate) {
  if (!birthDate) return '--';
  const today = new Date();
  const birth = new Date(birthDate);

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return `${years}a ${months}m ${days}d`;
}

function navyBodyFat({ sex, waist, neck, hip, height }) {
  if (!waist || !neck || !height) return null;

  if (sex === 'female') {
    if (!hip) return null;
    return Number((495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(height)) - 450).toFixed(1));
  }

  return Number((495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450).toFixed(1));
}

function classifyFat(value) {
  if (value == null) return 'Sem dados';
  if (value < 10) return 'Atleta';
  if (value < 18) return 'Bom';
  if (value < 25) return 'Moderado';
  return 'Alto';
}

function setGauge(value) {
  const normalized = Math.max(0, Math.min(value || 0, 45));
  document.getElementById('gaugeProgress').style.strokeDashoffset = String(252 - (normalized / 45) * 252);
}

function drawLineChart(canvasId, points, color) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const axisColor = getCssVar('--border');
  const labelColor = getCssVar('--muted');
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth * ratio;
  const height = 180 * ratio;
  const pad = 24 * ratio;

  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  if (points.length < 2) {
    ctx.fillStyle = labelColor;
    ctx.font = `${14 * ratio}px sans-serif`;
    ctx.fillText('Adicione pelo menos 2 medições para ver o gráfico', pad, height / 2);
    return;
  }

  const values = points.map((p) => p.y);
  const min = Math.min(...values) * 0.98;
  const max = Math.max(...values) * 1.02;

  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();

  points.forEach((point, index) => {
    const x = pad + ((width - 2 * pad) * index) / (points.length - 1);
    const y = height - pad - ((point.y - min) / (max - min || 1)) * (height - 2 * pad);

    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4 * ratio, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = labelColor;
    ctx.font = `${10 * ratio}px sans-serif`;
    ctx.fillText(point.x || '', x - 15, height - 6);
  });

  ctx.stroke();
}

function getCssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function dayName(day) {
  return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][day];
}

function escapeAttribute(value) {
  return String(value ?? '').replace(/"/g, '&quot;');
}
