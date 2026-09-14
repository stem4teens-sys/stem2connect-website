const opportunityPrograms = [
  {
    id: 1,
    name: 'STEM Research Fellowship',
    organization: 'STEM Lab Network',
    interests: ['science', 'coding', 'research', 'leadership'],
    ageRanges: ['13-15', '16-18'],
    budget: 'free',
    cost: 'Free',
    format: 'summer',
    timing: 'Summer',
    support: 'mentoring',
    location: 'Boston, MA',
    description: 'A research-intensive summer path where students explore real scientific questions with mentors and lab teams.',
    link: 'https://example.org/fellowship'
  },
  {
    id: 2,
    name: 'City Robotics Competition',
    organization: 'NextGen Robotics',
    interests: ['robotics', 'coding', 'team', 'design'],
    ageRanges: ['9-12', '13-15'],
    budget: 'low',
    cost: 'Low cost',
    format: 'after-school',
    timing: 'After-school',
    support: 'team',
    location: 'Chicago, IL',
    description: 'Teams build, test, and iterate robot prototypes while learning engineering and design thinking.',
    link: 'https://example.org/robotics'
  },
  {
    id: 3,
    name: 'Youth Coding Studio',
    organization: 'Code for Tomorrow',
    interests: ['coding', 'design', 'making', 'business'],
    ageRanges: ['6-8', '9-12'],
    budget: 'low',
    cost: 'Low cost',
    format: 'weekend',
    timing: 'Weekend',
    support: 'beginner',
    location: 'Austin, TX',
    description: 'A beginner-friendly coding club where students create games, apps, and digital projects with guided support.',
    link: 'https://example.org/coding-studio'
  },
  {
    id: 4,
    name: 'Community Garden Leadership',
    organization: 'Urban Roots Alliance',
    interests: ['environment', 'community', 'leadership', 'outdoors'],
    ageRanges: ['9-12', '13-15'],
    budget: 'free',
    cost: 'Free',
    format: 'club',
    timing: 'Community club',
    support: 'leader',
    location: 'Seattle, WA',
    description: 'Students work together on sustainability projects, public outreach, and local food system advocacy.',
    link: 'https://example.org/garden'
  },
  {
    id: 5,
    name: 'Design & Making Lab',
    organization: 'Creative Makers Collective',
    interests: ['design', 'making', 'art', 'engineering'],
    ageRanges: ['9-12', '13-15'],
    budget: 'moderate',
    cost: 'Moderate cost',
    format: 'after-school',
    timing: 'After-school',
    support: 'beginner',
    location: 'Denver, CO',
    description: 'Students prototype products, design models, and build creative physical solutions with coach feedback.',
    link: 'https://example.org/makers'
  },
  {
    id: 6,
    name: 'Young Scientists Program',
    organization: 'Northfield Science Center',
    interests: ['science', 'research', 'environment', 'writing'],
    ageRanges: ['13-15', '16-18'],
    budget: 'scholarship',
    cost: 'Scholarship available',
    format: 'summer',
    timing: 'Summer',
    support: 'mentoring',
    location: 'New York, NY',
    description: 'An intensive science immersion featuring lab work, experiments, and mentorship from local researchers.',
    link: 'https://example.org/science-program'
  },
  {
    id: 7,
    name: 'Sustainable Energy Challenge',
    organization: 'Green Future Initiative',
    interests: ['environment', 'science', 'leadership', 'community'],
    ageRanges: ['13-15', '16-18'],
    budget: 'low',
    cost: 'Low cost',
    format: 'weekend',
    timing: 'Weekend',
    support: 'team',
    location: 'Portland, OR',
    description: 'Students design sustainability solutions and present them to local leaders and environmental partners.',
    link: 'https://example.org/energy'
  },
  {
    id: 8,
    name: 'Student Media & Writing Studio',
    organization: 'StorySpark Collective',
    interests: ['writing', 'community', 'leadership', 'business'],
    ageRanges: ['9-12', '13-15'],
    budget: 'free',
    cost: 'Free',
    format: 'club',
    timing: 'Community club',
    support: 'beginner',
    location: 'Philadelphia, PA',
    description: 'A writing and storytelling lab where students produce articles, podcasts, and community narratives.',
    link: 'https://example.org/media'
  },
  {
    id: 9,
    name: 'Outdoor Adventure Leadership',
    organization: 'Trail Explorers',
    interests: ['outdoors', 'sports', 'leadership', 'community'],
    ageRanges: ['6-8', '9-12'],
    budget: 'low',
    cost: 'Low cost',
    format: 'weekend',
    timing: 'Weekend',
    support: 'leader',
    location: 'Denver, CO',
    description: 'Students build confidence, teamwork, and outdoor skills through guided hikes and team challenges.',
    link: 'https://example.org/outdoors'
  },
  {
    id: 10,
    name: 'Bluebird Music Ensemble',
    organization: 'Harmony House',
    interests: ['music', 'community', 'leadership'],
    ageRanges: ['6-8', '9-12', '13-15'],
    budget: 'low',
    cost: 'Low cost',
    format: 'after-school',
    timing: 'After-school',
    support: 'beginner',
    location: 'Nashville, TN',
    description: 'A welcoming ensemble where students learn music performance, teamwork, and creative expression.',
    link: 'https://example.org/music'
  }
];

const selectedInterests = new Set();

function getInterestButtons() {
  return document.querySelectorAll('[data-interest-selector] .chip');
}

function setSelectedInterestsUI() {
  const buttons = getInterestButtons();
  buttons.forEach((button) => {
    const selected = selectedInterests.has(button.dataset.value);
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function matchesBudget(programBudget, budgetValue) {
  if (budgetValue === 'all') return true;
  if (budgetValue === 'free') return programBudget === 'free';
  if (budgetValue === 'low') return ['free', 'low'].includes(programBudget);
  if (budgetValue === 'moderate') return ['free', 'low', 'moderate'].includes(programBudget);
  if (budgetValue === 'scholarship') return ['free', 'scholarship', 'low'].includes(programBudget);
  return true;
}

function normalizeProgram(program, selected, ageValue, budgetValue, formatValue, supportValue, noteText) {
  let score = 0;

  selected.forEach((interest) => {
    if (program.interests.includes(interest)) {
      score += 4;
    }
  });

  if (ageValue !== 'all' && program.ageRanges.includes(ageValue)) {
    score += 2;
  }

  if (matchesBudget(program.budget, budgetValue)) {
    score += 2;
  }

  if (formatValue !== 'all' && program.format === formatValue) {
    score += 1;
  }

  if (supportValue !== 'all' && program.support === supportValue) {
    score += 1;
  }

  const searchable = `${program.name} ${program.organization} ${program.description} ${program.interests.join(' ')}`.toLowerCase();
  const noteTokens = noteText.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

  if (noteTokens.length) {
    const noteMatches = noteTokens.filter((token) => searchable.includes(token));
    if (noteMatches.length) {
      score += Math.min(noteMatches.length * 2, 6);
    }
  }

  return score;
}

function renderResults(matches, resultState, resultsNode) {
  resultsNode.innerHTML = '';

  if (!matches.length) {
    resultState.textContent = 'No opportunities match the current filters. Try broadening the interest or budget options.';
    return;
  }

  const topMatch = matches[0];
  resultState.textContent = `${matches.length} opportunity${matches.length === 1 ? '' : 'ies'} matched for this student. Highest fit: ${topMatch.program.name}.`;

  matches.forEach(({ program, score }) => {
    const card = document.createElement('article');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="result-card-header">
        <div>
          <h3>${program.name}</h3>
          <p>${program.organization}</p>
        </div>
        <span class="match-score">${Math.min(Math.max(score, 50), 98)}%</span>
      </div>
      <div class="result-meta">
        <span>${program.location}</span>
        <span>${program.cost}</span>
        <span>${program.timing}</span>
      </div>
      <p class="result-description">${program.description}</p>
      <div class="tag-list">
        ${program.interests.slice(0, 4).map((interest) => `<span class="tag">${interest}</span>`).join('')}
      </div>
      <a class="button button-ghost result-link" href="${program.link}" target="_blank" rel="noopener noreferrer">Learn more</a>
    `;

    resultsNode.appendChild(card);
  });
}

function generateRecommendations() {
  const form = document.getElementById('program-form');
  const resultState = document.getElementById('result-state');
  const resultsNode = document.getElementById('results');

  if (!form || !resultState || !resultsNode) return;

  const ageValue = document.getElementById('age-range').value;
  const budgetValue = document.getElementById('budget').value;
  const formatValue = document.getElementById('timing').value;
  const supportValue = document.getElementById('support').value;
  const notesValue = document.getElementById('notes').value.trim();
  const selected = Array.from(selectedInterests);

  if (!selected.length) {
    resultState.textContent = 'Select a few interests to see recommendations.';
    resultsNode.innerHTML = '';
    return;
  }

  const matches = opportunityPrograms
    .map((program) => ({
      program,
      score: normalizeProgram(program, selected, ageValue, budgetValue, formatValue, supportValue, notesValue)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.program.name.localeCompare(b.program.name));

  renderResults(matches.slice(0, 5), resultState, resultsNode);
}

function bindInterestSelection() {
  const buttons = getInterestButtons();
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const { value } = button.dataset;
      if (!value) return;

      if (selectedInterests.has(value)) {
        selectedInterests.delete(value);
      } else {
        selectedInterests.add(value);
      }

      setSelectedInterestsUI();
      generateRecommendations();
    });
  });
}

function initializeRecommendationForm() {
  const form = document.getElementById('program-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    generateRecommendations();
  });

  form.addEventListener('reset', () => {
    setTimeout(() => {
      selectedInterests.clear();
      setSelectedInterestsUI();
      generateRecommendations();
    }, 0);
  });

  setSelectedInterestsUI();
  generateRecommendations();
}

function renderMapResults(filteredPrograms) {
  const mapResults = document.getElementById('map-results');
  const mapNotice = document.getElementById('map-notice');

  if (!mapResults || !mapNotice) return;

  const pins = document.querySelectorAll('.map-pin');
  pins.forEach((pin) => {
    const visible = filteredPrograms.some((program) => Number(pin.dataset.id) === program.id);
    pin.style.opacity = visible ? '1' : '0.25';
    pin.style.transform = visible ? 'scale(1)' : 'scale(0.84)';
  });

  if (!filteredPrograms.length) {
    mapNotice.textContent = 'No nearby opportunities match those filters.';
    mapResults.innerHTML = '<div class="map-empty">Try another interest or age range.</div>';
    return;
  }

  mapNotice.textContent = `Showing ${filteredPrograms.length} nearby opportunity${filteredPrograms.length === 1 ? '' : 'ies'}.`;
  mapResults.innerHTML = filteredPrograms
    .map(
      (program) => `
        <article class="map-result-card">
          <h3>${program.name}</h3>
          <p>${program.location}</p>
          <div class="map-result-meta">
            <span>${program.cost}</span>
            <span>${program.timing}</span>
          </div>
        </article>
      `
    )
    .join('');
}

function initializeMapPage() {
  const mapForm = document.getElementById('map-form');
  if (!mapForm) return;

  const applyMapFilters = () => {
    const interestValue = document.getElementById('map-interest').value;
    const ageValue = document.getElementById('map-age').value;

    const filteredPrograms = opportunityPrograms.filter((program) => {
      const matchesInterest = interestValue === 'all' || program.interests.includes(interestValue);
      const matchesAge = ageValue === 'all' || program.ageRanges.includes(ageValue);
      return matchesInterest && matchesAge;
    });

    renderMapResults(filteredPrograms);
  };

  mapForm.addEventListener('submit', (event) => {
    event.preventDefault();
    applyMapFilters();
  });

  document.querySelectorAll('.map-pin').forEach((pin) => {
    pin.addEventListener('click', () => {
      const id = Number(pin.dataset.id);
      const target = opportunityPrograms.find((program) => program.id === id);
      if (!target) return;

      document.getElementById('map-interest').value = 'all';
      document.getElementById('map-age').value = 'all';
      renderMapResults([target]);
    });
  });

  applyMapFilters();
}

function initializeOpportunityForm() {
  const form = document.getElementById('opportunity-form');
  const successMessage = document.getElementById('form-success');

  if (!form || !successMessage) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    successMessage.hidden = false;
    form.reset();
  });
}

function initializePage() {
  const yearNode = document.getElementById('year');
  if (yearNode) yearNode.textContent = new Date().getFullYear();

  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('active');
      navToggle.classList.toggle('active', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('nav-open', isOpen);
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navToggle.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('nav-open');
      });
    });
  }

  bindInterestSelection();
  initializeRecommendationForm();
  initializeMapPage();
  initializeOpportunityForm();
}

initializePage();
