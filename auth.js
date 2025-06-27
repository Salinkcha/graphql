// Key for storing the authentication token in localStorage
const TOKEN_KEY = 'gql_token';

/**
 * Retrieves the authentication token from localStorage
 * @returns {string|null} The stored token or null if not found
 */
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Stores the authentication token in localStorage
 * @param {string|object} token - The token to store (can be string or response object)
 */
function setToken(token) {
    // Handle both direct token strings and response objects
    const tokenValue = token.token ? token.token : token;
    localStorage.setItem(TOKEN_KEY, tokenValue);
}

/**
 * Removes the authentication token from localStorage
 */
function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
}

/**
 * Authenticates user with username and password
 * @param {string} username - User login
 * @param {string} password - User password
 * @returns {Promise<object>} Authentication response
 * @throws {Error} If authentication fails
 */
async function login(username, password) {
    // Create Basic Auth header
    const authHeader = 'Basic ' + btoa(username + ':' + password);
    
    const response = await fetch('https://zone01normandie.org/api/auth/signin', {
        method: 'POST',
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error.includes('invalid') ? 'Invalid credentials' : error);
    }

    return response.json();
}