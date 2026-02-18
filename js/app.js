/**
 * Afterschool Program Cost Estimator
 * Calculation Engine & UI Controller
 */

'use strict';

// ============================================================
// CHART INSTANCES
// ============================================================
let pieChartInstance = null;
let barChartInstance = null;
let projectionChartInstance = null;

// ============================================================
// CHART COLOR PALETTE
// ============================================================
const CATEGORY_COLORS = {
  staffing:    { fill: '#3b82f6', border: '#2563eb' },
  facility:    { fill: '#f97316', border: '#ea580c' },
  programming: { fill: '#22c55e', border: '#16a34a' },
  nutrition:   { fill: '#ef4444', border: '#dc2626' },
  operations:  { fill: '#8b5cf6', border: '#7c3aed' },
};

const CATEGORY_LABELS = {
  staffing:    'Staffing',
  facility:    'Facility & Space',
  programming: 'Programming',
  nutrition:   'Nutrition',
  operations:  'Operations & Overhead',
};

// ============================================================
// UTILITY: FORMAT CURRENCY
// ============================================================
function fmt(n, decimals = 0) {
  if (!isFinite(n) || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function fmtShort(n) {
  if (!isFinite(n) || isNaN(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return fmt(n / 1_000_000, 2) + 'M';
  if (Math.abs(n) >= 1_000) return fmt(n / 1_000, 1) + 'K';
  return fmt(n, 0);
}

function fmtNumber(n, decimals = 0) {
  if (!isFinite(n) || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

// ============================================================
// UTILITY: GET NUMERIC INPUT VALUE
// ============================================================
function val(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const v = parseFloat(el.value);
  return isNaN(v) ? 0 : v;
}

function checked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

// ============================================================
// CORE CALCULATION ENGINE
// ============================================================
function calculate() {
  // --- SCHEDULE ---
  const daysPerWeek   = val('daysPerWeek');
  const weeksPerYear  = val('weeksPerYear');
  const operatingDays = daysPerWeek * weeksPerYear;
  const hoursPerDay   = val('hoursPerDay');
  const facilityMonths = val('facilityMonths');

  // Auto-update operating days (read-only computed field)
  const opdEl = document.getElementById('operatingDays');
  if (opdEl) opdEl.value = operatingDays;

  // --- ENROLLMENT ---
  const studentsEnrolled = Math.max(1, val('studentsEnrolled'));
  const ada              = Math.max(1, val('avgDailyAttendance'));

  // ---- STAFFING ----
  const numDirectors    = val('numDirectors');
  const directorSalary  = val('directorSalary');
  const numStaff        = val('numStaff');
  const staffHourlyWage = val('staffHourlyWage');
  const staffHrsPerDay  = val('staffHoursPerDay');
  const benefitsRate    = val('benefitsRate') / 100;

  const directorCost = numDirectors * directorSalary * (1 + benefitsRate);
  const staffWageCost = numStaff * staffHourlyWage * staffHrsPerDay * daysPerWeek * weeksPerYear;
  const staffBenefits = staffWageCost * benefitsRate;
  const staffingCost  = directorCost + staffWageCost + staffBenefits;

  // ---- FACILITY ----
  const facilityFree = checked('facilityFree');
  let facilityCost = 0;
  if (!facilityFree) {
    const monthlyRent     = val('monthlyRent');
    const monthlyUtils    = val('monthlyUtilities');
    const monthlyClean    = val('custodialMonthly');
    facilityCost = (monthlyRent + monthlyUtils + monthlyClean) * facilityMonths;
  }

  // ---- PROGRAMMING ----
  const materialsPerStudent  = val('materialsPerStudent');
  const activitiesPerStudent = val('activitiesPerStudent');
  const techAnnual           = val('techAnnual');
  const profDevAnnual        = val('professionalDev');

  const programmingCost = (materialsPerStudent + activitiesPerStudent) * studentsEnrolled
                        + techAnnual + profDevAnnual;

  // ---- NUTRITION ----
  const snackCost     = val('snackCostPerDay');
  const hasMeals      = checked('provideMeals');
  const mealCost      = hasMeals ? val('mealCostPerDay') : 0;
  const nutritionReim = val('nutritionReimbursement');

  const grossNutrition = (snackCost + mealCost) * ada * operatingDays;
  const nutritionCost  = Math.max(0, grossNutrition - nutritionReim);

  // ---- OPERATIONS ----
  const directCosts     = staffingCost + facilityCost + programmingCost + nutritionCost;
  const overheadRate    = val('adminOverheadRate') / 100;
  const adminOverhead   = directCosts * overheadRate;
  const insuranceAnnual = val('insuranceAnnual');
  const hasTransport    = checked('provideTransport');
  const transportCost   = hasTransport ? val('transportAnnual') : 0;
  const marketingCost   = val('marketingAnnual');
  const evalCost        = val('evaluationAnnual');

  const operationsCost = adminOverhead + insuranceAnnual + transportCost + marketingCost + evalCost;

  // ---- TOTALS ----
  const totalCost = staffingCost + facilityCost + programmingCost + nutritionCost + operationsCost;

  // ---- REVENUE ----
  const grantRevenue    = val('grantRevenue');
  const feeRevenue      = val('feeRevenue');
  const donationRevenue = val('donationRevenue');
  const inKindValue     = val('inKindValue');
  const totalRevenue    = grantRevenue + feeRevenue + donationRevenue + inKindValue;
  const fundingGap      = totalCost - totalRevenue;

  // ---- METRICS ----
  const annualParticipantHours = ada * hoursPerDay * operatingDays;
  const costPerEnrolled        = studentsEnrolled > 0 ? totalCost / studentsEnrolled : 0;
  const costPerADA             = ada > 0 ? totalCost / ada : 0;
  const costPerHour            = annualParticipantHours > 0 ? totalCost / annualParticipantHours : 0;
  const staffRatio             = (numDirectors + numStaff) > 0 ? ada / (numDirectors + numStaff) : 0;
  const monthlyOpCost          = weeksPerYear > 0 ? totalCost / (weeksPerYear / 4.333) : 0;

  return {
    staffingCost, facilityCost, programmingCost, nutritionCost, operationsCost,
    totalCost,
    totalRevenue, fundingGap,
    grantRevenue, feeRevenue, donationRevenue, inKindValue,
    costPerEnrolled, costPerADA, costPerHour,
    staffRatio, annualParticipantHours, monthlyOpCost,
    studentsEnrolled, ada, operatingDays, hoursPerDay,
    daysPerWeek, weeksPerYear,
    directCosts, adminOverhead,
  };
}

// ============================================================
// UPDATE UI
// ============================================================
function updateUI() {
  const r = calculate();

  // --- Hero summary ---
  setContent('summaryTotal', fmt(r.totalCost));
  setContent('summaryCPS',   fmt(r.costPerEnrolled));
  setContent('summaryCPH',   fmt(r.costPerHour, 2));

  // --- Subsection cost indicators ---
  setContent('staffCostDisplay',      fmt(r.staffingCost));
  setContent('facilityCostDisplay',   fmt(r.facilityCost));
  setContent('programCostDisplay',    fmt(r.programmingCost));
  setContent('nutritionCostDisplay',  fmt(r.nutritionCost));
  setContent('operationsCostDisplay', fmt(r.operationsCost));

  // --- Sidebar summary ---
  setContent('sl-staffing',     fmt(r.staffingCost));
  setContent('sl-facility',     fmt(r.facilityCost));
  setContent('sl-programming',  fmt(r.programmingCost));
  setContent('sl-nutrition',    fmt(r.nutritionCost));
  setContent('sl-operations',   fmt(r.operationsCost));
  setContent('sl-total',        fmt(r.totalCost));

  setContent('sl-grants',        fmt(r.grantRevenue));
  setContent('sl-fees',          fmt(r.feeRevenue));
  setContent('sl-donations',     fmt(r.donationRevenue));
  setContent('sl-inkind',        fmt(r.inKindValue));
  setContent('sl-revenue-total', fmt(r.totalRevenue));

  // --- Funding gap ---
  const gapBox  = document.getElementById('fundingGapBox');
  const gapVal  = document.getElementById('fundingGap');
  const gapNote = document.getElementById('fundingGapNote');

  if (gapBox && gapVal && gapNote) {
    gapVal.textContent = fmt(Math.abs(r.fundingGap));
    if (r.fundingGap <= 0) {
      gapBox.className   = 'funding-gap-box surplus';
      document.querySelector('.gap-label').textContent = 'Funding Surplus';
      gapNote.textContent = `Program is ${fmt(Math.abs(r.fundingGap))} over budget`;
    } else {
      gapBox.className   = 'funding-gap-box';
      document.querySelector('.gap-label').textContent = 'Net Funding Gap';
      gapNote.textContent = r.totalRevenue > 0
        ? `${Math.round((r.fundingGap / r.totalCost) * 100)}% of total cost unfunded`
        : 'Enter revenue sources above to see your gap';
    }
  }

  // --- Key metrics ---
  setContent('m-cpe',    fmt(r.costPerEnrolled));
  setContent('m-cada',   fmt(r.costPerADA));
  setContent('m-cph',    fmt(r.costPerHour, 2));
  setContent('m-ratio',  r.staffRatio > 0 ? `1:${r.staffRatio.toFixed(1)}` : '—');
  setContent('m-hours',  r.annualParticipantHours > 0 ? fmtNumber(r.annualParticipantHours, 0) + ' hrs' : '—');
  setContent('m-monthly', fmt(r.monthlyOpCost));

  // --- Breakdown tab charts & table ---
  if (document.getElementById('tab-breakdown').classList.contains('active')) {
    updateBreakdownTab(r);
  }

  return r;
}

function setContent(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ============================================================
// BREAKDOWN TAB
// ============================================================
function updateBreakdownTab(r) {
  if (!r) r = calculate();

  const categories = [
    { key: 'staffing',    amount: r.staffingCost    },
    { key: 'facility',    amount: r.facilityCost    },
    { key: 'programming', amount: r.programmingCost },
    { key: 'nutrition',   amount: r.nutritionCost   },
    { key: 'operations',  amount: r.operationsCost  },
  ];

  const total = r.totalCost;

  // PIE CHART
  const pieCtx = document.getElementById('pieChart');
  if (pieCtx) {
    const labels   = categories.map(c => CATEGORY_LABELS[c.key]);
    const data     = categories.map(c => c.amount);
    const colors   = categories.map(c => CATEGORY_COLORS[c.key].fill);
    const borders  = categories.map(c => CATEGORY_COLORS[c.key].border);

    if (pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 2,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)} (${total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0}%)`
            }
          }
        },
        cutout: '60%',
      }
    });

    // Custom legend
    const legendEl = document.getElementById('pieLegend');
    if (legendEl) {
      legendEl.innerHTML = categories.map((c, i) => `
        <div class="legend-item">
          <span class="legend-dot" style="background:${colors[i]}"></span>
          <span>${labels[i]}: ${total > 0 ? ((c.amount / total) * 100).toFixed(1) : 0}%</span>
        </div>
      `).join('');
    }
  }

  // BAR CHART — Cost Per Student vs Benchmarks
  const barCtx = document.getElementById('barChart');
  if (barCtx) {
    const cpe = r.costPerEnrolled;
    if (barChartInstance) barChartInstance.destroy();
    barChartInstance = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: ['Your Program', 'Low End\n(National)', 'Typical\n(National)', 'High End\n(National)'],
        datasets: [{
          label: 'Cost Per Enrolled Student',
          data: [cpe, 1500, 4250, 9000],
          backgroundColor: [
            '#2563eb',
            '#94a3b8',
            '#64748b',
            '#334155',
          ],
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${fmt(ctx.raw)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: v => fmtShort(v),
              font: { size: 11 }
            },
            grid: { color: '#f1f5f9' }
          },
          x: {
            ticks: { font: { size: 11 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  // BREAKDOWN TABLE
  const tbody = document.getElementById('breakdownTableBody');
  if (tbody) {
    tbody.innerHTML = categories.map(c => {
      const pct    = total > 0 ? ((c.amount / total) * 100).toFixed(1) : '0.0';
      const perStu = r.studentsEnrolled > 0 ? c.amount / r.studentsEnrolled : 0;
      const perDay = r.operatingDays > 0 ? c.amount / r.operatingDays : 0;
      return `
        <tr>
          <td>
            <span style="display:inline-flex;align-items:center;gap:8px">
              <span style="width:10px;height:10px;border-radius:50%;background:${CATEGORY_COLORS[c.key].fill};display:inline-block;flex-shrink:0"></span>
              ${CATEGORY_LABELS[c.key]}
            </span>
          </td>
          <td><strong>${fmt(c.amount)}</strong></td>
          <td>
            <span style="display:inline-flex;align-items:center;gap:8px">
              <span style="display:inline-block;height:6px;border-radius:3px;background:${CATEGORY_COLORS[c.key].fill};width:${Math.round(parseFloat(pct))}px;max-width:80px"></span>
              ${pct}%
            </span>
          </td>
          <td>${fmt(perStu)}</td>
          <td>${fmt(perDay)}</td>
        </tr>
      `;
    }).join('');
  }

  setContent('tbl-total', fmt(total));
  setContent('tbl-cps',   fmt(r.costPerEnrolled));
  setContent('tbl-cpd',   r.operatingDays > 0 ? fmt(total / r.operatingDays) : '—');

  // PROJECTION CHART
  updateProjectionChart(r);
}

// ============================================================
// PROJECTION CHART
// ============================================================
function updateProjectionChart(r) {
  if (!r) r = calculate();

  const inflationRate   = val('inflationRate') / 100;
  const enrollGrowth    = val('enrollmentGrowth') / 100;

  const years = ['Year 1\n(Current)', 'Year 2', 'Year 3', 'Year 4'];
  const totalCosts     = [];
  const costsPerStu    = [];

  let baseCost    = r.totalCost;
  let baseEnroll  = r.studentsEnrolled;

  for (let i = 0; i < 4; i++) {
    totalCosts.push(baseCost);
    costsPerStu.push(baseEnroll > 0 ? baseCost / baseEnroll : 0);
    baseCost   *= (1 + inflationRate);
    baseEnroll *= (1 + enrollGrowth);
  }

  const projCtx = document.getElementById('projectionChart');
  if (!projCtx) return;

  if (projectionChartInstance) projectionChartInstance.destroy();
  projectionChartInstance = new Chart(projCtx, {
    type: 'bar',
    data: {
      labels: years,
      datasets: [
        {
          label: 'Total Cost',
          data: totalCosts,
          backgroundColor: 'rgba(37, 99, 235, 0.85)',
          borderRadius: 6,
          borderSkipped: false,
          yAxisID: 'y',
        },
        {
          label: 'Cost / Student',
          data: costsPerStu,
          type: 'line',
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          borderWidth: 2.5,
          pointBackgroundColor: '#f97316',
          pointRadius: 5,
          tension: 0.3,
          fill: false,
          yAxisID: 'y2',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { size: 11 }, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}`
          }
        }
      },
      scales: {
        y: {
          position: 'left',
          beginAtZero: false,
          ticks: {
            callback: v => fmtShort(v),
            font: { size: 11 }
          },
          grid: { color: '#f1f5f9' }
        },
        y2: {
          position: 'right',
          beginAtZero: false,
          ticks: {
            callback: v => fmtShort(v),
            font: { size: 11 }
          },
          grid: { display: false }
        },
        x: {
          ticks: { font: { size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

// ============================================================
// TAB SWITCHING
// ============================================================
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

  const tabEl  = document.getElementById(`tab-${tabName}`);
  const navBtn = document.querySelector(`[data-tab="${tabName}"]`);

  if (tabEl)  tabEl.classList.add('active');
  if (navBtn) navBtn.classList.add('active');

  if (tabName === 'breakdown') {
    const r = calculate();
    updateBreakdownTab(r);
  }

  // Update methodology nav links
  if (tabName === 'methodology') {
    updateMethodologyNav();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// METHODOLOGY NAV ACTIVE STATE
// ============================================================
function updateMethodologyNav() {
  const sections = document.querySelectorAll('.method-section');
  const links    = document.querySelectorAll('.method-nav-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.method-nav-link[href="#${entry.target.id}"]`);
        if (activeLink) activeLink.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });

  sections.forEach(s => observer.observe(s));
}

// ============================================================
// TOGGLE HANDLERS
// ============================================================
function setupToggles() {
  // Facility free toggle
  const facilityFreeToggle = document.getElementById('facilityFree');
  const facilityGrid       = document.getElementById('facilityGrid');
  if (facilityFreeToggle && facilityGrid) {
    facilityFreeToggle.addEventListener('change', () => {
      facilityGrid.style.opacity       = facilityFreeToggle.checked ? '0.35' : '1';
      facilityGrid.style.pointerEvents = facilityFreeToggle.checked ? 'none' : 'auto';
      updateUI();
    });
  }

  // Meals toggle
  const mealsToggle    = document.getElementById('provideMeals');
  const mealCostGroup  = document.getElementById('mealCostGroup');
  const mealLabel      = document.getElementById('mealToggleLabel');
  if (mealsToggle && mealCostGroup) {
    mealsToggle.addEventListener('change', () => {
      const on = mealsToggle.checked;
      mealCostGroup.style.opacity       = on ? '1' : '0.4';
      mealCostGroup.style.pointerEvents = on ? 'auto' : 'none';
      if (mealLabel) mealLabel.textContent = on ? 'Yes' : 'No';
      updateUI();
    });
  }

  // Transportation toggle
  const transportToggle = document.getElementById('provideTransport');
  const transportGroup  = document.getElementById('transportCostGroup');
  const transportLabel  = document.getElementById('transportToggleLabel');
  if (transportToggle && transportGroup) {
    transportToggle.addEventListener('change', () => {
      const on = transportToggle.checked;
      transportGroup.style.opacity       = on ? '1' : '0.4';
      transportGroup.style.pointerEvents = on ? 'auto' : 'none';
      if (transportLabel) transportLabel.textContent = on ? 'Yes' : 'No';
      updateUI();
    });
  }
}

// ============================================================
// PROJECTION RANGE INPUTS
// ============================================================
function setupProjectionControls() {
  const inflationInput = document.getElementById('inflationRate');
  const growthInput    = document.getElementById('enrollmentGrowth');
  const inflationLabel = document.getElementById('inflationLabel');
  const growthLabel    = document.getElementById('growthLabel');

  if (inflationInput && inflationLabel) {
    inflationInput.addEventListener('input', () => {
      inflationLabel.textContent = `${inflationInput.value}%`;
      updateProjectionChart();
    });
  }

  if (growthInput && growthLabel) {
    growthInput.addEventListener('input', () => {
      growthLabel.textContent = `${growthInput.value}%`;
      updateProjectionChart();
    });
  }
}

// ============================================================
// EXPORT PDF
// ============================================================
function exportPDF() {
  // Switch to estimator tab first
  switchTab('estimator');
  setTimeout(() => window.print(), 300);
}

// ============================================================
// BIND ALL INPUTS
// ============================================================
function bindInputs() {
  const inputs = document.querySelectorAll('input[type="number"], input[type="text"], select');
  inputs.forEach(input => {
    input.addEventListener('input', updateUI);
    input.addEventListener('change', updateUI);
  });
}

// ============================================================
// NAV BUTTON BINDING
// ============================================================
function bindNavButtons() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      if (tabName) switchTab(tabName);
    });
  });
}

// ============================================================
// INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  bindInputs();
  bindNavButtons();
  setupToggles();
  setupProjectionControls();
  updateUI();

  // Kick off breakdown charts on initial load so they're ready
  // when user switches tabs
  setTimeout(() => {
    const r = calculate();
    updateBreakdownTab(r);
  }, 100);
});
