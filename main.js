// main.js
document.addEventListener('DOMContentLoaded', () => {
    if (getToken()) {
        showProfile();
    } else {
        showLogin();
    }
});

// Expose functions to global scope
window.handleLogin = handleLogin;
window.logout = logout;