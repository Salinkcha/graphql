// Main app container element
const app = document.getElementById('app');

/**
 * Displays the login form
 * @param {string|null} error - Optional error message to display
 */
function showLogin(error = null) {
    app.innerHTML = `
        <div class="login-box">
            <h2>Zone01 Login</h2>
            ${error ? `<div class="error">${error}</div>` : ''}
            <input type="text" id="username" placeholder="Login" required>
            <input type="password" id="password" placeholder="Password" required>
            <button onclick="handleLogin()">Log in</button>
        </div>
    `;
}

/**
 * Displays the user profile with all statistics
 */
async function showProfile() {
    try {
        // Fetch all required data
        const user = await getUserData();
        const { level, xp } = await getUserLevel();
        const { up, down, ratio } = await getAuditRatio();
        const xpHistory = await getMonthlyXP();

        // Format user's full name
        let fullName = user.login;
        if (user.attrs) {
            try {
                const attrs = typeof user.attrs === 'string' ? JSON.parse(user.attrs) : user.attrs;
                fullName = attrs.name || `${attrs.firstName || ''} ${attrs.lastName || ''}`.trim() || user.login;
            } catch (e) {
                console.error("Error parsing attrs:", e);
            }
        }

        // Format audit values for display
        const formatAuditValue = (value) => {
            if (value >= 1000000) return (value / 1000000).toFixed(2) + ' MB';
            return (value / 1000).toFixed(2) + ' kB';
        };

        // Process XP data
        const monthlyData = groupByMonth(xpHistory);
        const cumulativeData = calculateCumulative(monthlyData, xp);
        const maxXP = Math.max(...monthlyData.map(m => m.totalXP), 1);
        const totalAudits = up + down;

        // Generate profile HTML
        app.innerHTML = `
            <div class="profile">
                <div class="profile-header">
                    <h2>${user.login}</h2>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Profile</h3>
                        <h4>${fullName}</h4>
                        <h4>Level: ${level}</h4>
                    </div>
                    
                    <div class="stat-card">
                        <h3>Total XP</h3>
                        <p class="stat-value">${xp}</p>
                    </div>
                    
                    <div class="stat-card">
                        <h3>Audit Ratio</h3>
                        <p class="stat-value">${ratio}</p>
                    </div>
                </div>
                
                <!-- Audit Ratio Chart -->
                <div class="chart-container">
                    <h3>Audit Ratio</h3>
                    <div class="audit-chart">
                        <div class="audit-bar">
                            <div class="audit-label">Done</div>
                            <div class="audit-line" style="--audit-received: ${totalAudits ? (up/totalAudits)*100 : 50}%">
                             <span class="value">${formatAuditValue(up)}</span>
                            </div>
                        </div>
                        <div class="audit-bar">
                            <div class="audit-label">Received</div>
                            <div class="audit-line" style="--audit-received: ${totalAudits ? (down/totalAudits)*100 : 50}%">
                             <span class="value">${formatAuditValue(down)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- XP Progress Chart -->
                    <h3 style="margin-top: 40px;">Monthly Progress</h3>
                    <div class="xp-chart-container">
                        ${generateMonthlyChart(cumulativeData)}
                    </div>
                </div>
                <button class="logout-btn" onclick="logout()">Logout</button>
            </div>
        `;

    } catch (error) {
        console.error("Error:", error);
        showLogin("Error loading profile");
    }
}

/**
 * Groups XP transactions by month
 * @param {Array} xpHistory - Array of XP transactions
 * @returns {Array} Monthly aggregated data
 */
function groupByMonth(xpHistory) {
    const months = {};
    
    xpHistory.forEach(({ amount, createdAt }) => {
        const date = new Date(createdAt);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        
        if (!months[monthKey]) {
            months[monthKey] = {
                month: date.getMonth(),
                year: date.getFullYear(),
                totalXP: 0,
                date: new Date(date.getFullYear(), date.getMonth(), 1),
                label: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date)
            };
        }
        
        months[monthKey].totalXP += amount;
    });
    
    return Object.values(months).sort((a, b) => a.date - b.date);
}

/**
 * Calculates cumulative XP without exceeding total XP
 * @param {Array} monthlyData - Monthly XP data
 * @param {number} totalXP - User's total XP
 * @returns {Array} Cumulative XP data
 */
function calculateCumulative(monthlyData, totalXP) {
    let cumulativeXP = 0;
    return monthlyData.map(month => {
        // Ensure we don't exceed total XP
        const newXP = Math.min(month.totalXP, totalXP - cumulativeXP);
        cumulativeXP += newXP;
        return { 
            ...month, 
            totalXP: newXP,
            cumulativeXP: cumulativeXP 
        };
    });
}

/**
 * Generates the monthly XP chart HTML
 * @param {Array} data - Processed monthly XP data
 * @returns {string} HTML for the chart
 */
function generateMonthlyChart(data) {
    if (data.length === 0) return '<div class="no-data">No data available</div>';
  
    return `
      <div class="simple-line-chart">
        <div class="simple-line">
          ${data.map((month, index) => `
            <div class="data-point-container" style="height: ${(month.cumulativeXP / data[data.length-1].cumulativeXP) * 100}%">
              <div class="data-point-info">
                ${month.totalXP} XP this month<br>
                Total: ${month.cumulativeXP} XP<br>
                ${month.label}
              </div>
              <div class="data-point-circle"></div>
              <div class="data-point-month">${month.label}</div>
              ${index < data.length - 1 ? '<div class="simple-line-path"></div>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
}

/**
 * Handles login form submission
 */
async function handleLogin() {
    try {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            throw new Error('Login and password required');
        }
        
        const token = await login(username, password);
        setToken(token);
        showProfile();
    } catch (error) {
        showLogin(error.message);
    }
}

/**
 * Handles user logout
 */
function logout() {
    removeToken();
    showLogin();
}

// Initialize the app with login screen
showLogin();