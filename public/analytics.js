let revenueChart, jobsChart;

async function loadAnalytics() {
  const [analyticsRes, driversRes, jobsRes] = await Promise.all([
    fetch('/api/analytics'),
    fetch('/api/analytics/drivers'),
    fetch('/api/jobs')
  ]);
  
  const analytics = await analyticsRes.json();
  const drivers = await driversRes.json();
  const jobs = await jobsRes.json();
  
  // Update stats
  document.getElementById('todayRevenue').textContent = `$${analytics.today.revenue.toFixed(2)}`;
  document.getElementById('completedJobs').textContent = analytics.today.completedJobs;
  document.getElementById('jobsChange').textContent = `${analytics.today.jobs} created today`;
  document.getElementById('activeJobs').textContent = jobs.length;
  document.getElementById('pendingJobs').textContent = `${jobs.filter(j => j.status === 'pending').length} pending`;
  
  const onDuty = drivers.filter(d => d.shiftStatus === 'on-duty').length;
  const available = drivers.filter(d => d.status === 'available').length;
  document.getElementById('onDutyDrivers').textContent = onDuty;
  document.getElementById('availableDrivers').textContent = `${available} available`;
  
  // Update charts
  updateRevenueChart();
  updateJobsChart(jobs);
  updateDriversTable(drivers);
}

function updateRevenueChart() {
  const ctx = document.getElementById('revenueChart').getContext('2d');
  
  // Simulate weekly data (in production, fetch from server)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = [450, 520, 380, 620, 580, 720, 650];
  
  if (revenueChart) {
    revenueChart.destroy();
  }
  
  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Revenue ($)',
        data: data,
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value;
            }
          }
        }
      }
    }
  });
}

function updateJobsChart(jobs) {
  const ctx = document.getElementById('jobsChart').getContext('2d');
  
  const statusCounts = {
    pending: jobs.filter(j => j.status === 'pending').length,
    accepted: jobs.filter(j => j.status === 'accepted').length,
    in_progress: jobs.filter(j => j.status === 'in_progress' || j.status === 'picked_up').length,
  };
  
  if (jobsChart) {
    jobsChart.destroy();
  }
  
  jobsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'Accepted', 'In Progress'],
      datasets: [{
        data: [statusCounts.pending, statusCounts.accepted, statusCounts.in_progress],
        backgroundColor: [
          '#f39c12',
          '#3498db',
          '#27ae60'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function updateDriversTable(drivers) {
  const tbody = document.getElementById('driversTableBody');
  
  tbody.innerHTML = drivers.map(driver => `
    <tr>
      <td><strong>${driver.name}</strong></td>
      <td>
        <span class="status-badge status-${driver.status}">
          ${driver.status}
        </span>
      </td>
      <td>
        <span class="rating-stars">
          ${'★'.repeat(Math.round(driver.rating))}${'☆'.repeat(5 - Math.round(driver.rating))}
        </span>
        ${driver.rating.toFixed(1)}
      </td>
      <td>${driver.todayJobs}</td>
      <td>$${driver.todayEarnings.toFixed(2)}</td>
      <td>${driver.totalJobs}</td>
      <td>$${driver.totalEarnings.toFixed(2)}</td>
    </tr>
  `).join('');
}

// Load data on page load
loadAnalytics();

// Refresh every 10 seconds
setInterval(loadAnalytics, 10000);
