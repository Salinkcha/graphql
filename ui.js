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
                                <div class="chart-container">
            <h3>Audit Ratio</h3>
            ${generateAuditChart(up, down)}
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
    
    const svgWidth = 800;
    const svgHeight = 300;
    const margin = { top: 40, right: 40, bottom: 60, left: 40 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;
    
    // Calculate positions
    const maxXP = data[data.length - 1].cumulativeXP;
    const xScale = width / (data.length - 1);
    const yScale = height / maxXP;
    
    // Generate path data for the line
    let pathData = '';
    data.forEach((month, index) => {
        const x = margin.left + (index * xScale);
        const y = margin.top + height - (month.cumulativeXP * yScale);
        
        if (index === 0) {
            pathData += `M ${x} ${y}`;
        } else {
            pathData += ` L ${x} ${y}`;
        }
    });
    
    // Generate circles and labels
    let circles = '';
    let labels = '';
    let valueLabels = '';
    
    data.forEach((month, index) => {
        const x = margin.left + (index * xScale);
        const y = margin.top + height - (month.cumulativeXP * yScale);
        
        // Circle
        circles += `<circle cx="${x}" cy="${y}" r="4" class="data-point" />`;
        
        // Month label
        labels += `<text x="${x}" y="${height + margin.top + 20}" class="month-label">${month.label}</text>`;
        
        // Value label
        valueLabels += `
            <text x="${x}" y="${y - 10}" class="value-label">
                ${month.cumulativeXP} XP
            </text>
        `;
    });
    
    return `
        <svg width="100%" viewBox="0 0 ${svgWidth} ${svgHeight}" class="xp-svg-chart">
            <!-- Line path -->
            <path d="${pathData}" class="line-path" />
            
            <!-- Data points -->
            ${circles}
            
            <!-- Value labels -->
            ${valueLabels}
            
            <!-- Month labels -->
            ${labels}
        </svg>
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
function generateAuditChart(up, down) {
    const total = up + down;
    const upPercent = total ? (up / total) * 100 : 50;
    const downPercent = total ? (down / total) * 100 : 50;
    
    const formatValue = (value) => {
        if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
        if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
        return value;
    };
    
    return `
        <svg width="100%" height="120" viewBox="0 0 600 120" class="audit-svg-chart">
            <!-- Done audits -->
            <g transform="translate(100, 20)">
                <text x="-90" y="25" class="audit-label">Done</text>
                <rect width="${400 * upPercent / 100}" height="40" class="audit-bar" />
                <text x="${400 * upPercent / 100 + 10}" y="25" class="audit-value">${formatValue(up)}</text>
            </g>
            
            <!-- Received audits -->
            <g transform="translate(100, 70)">
                <text x="-90" y="25" class="audit-label">Received</text>
                <rect width="${400 * downPercent / 100}" height="40" class="audit-bar received" />
                <text x="${400 * downPercent / 100 + 10}" y="25" class="audit-value">${formatValue(down)}</text>
            </g>
        </svg>
    `;
}
// Initialize the app with login screen
showLogin();
