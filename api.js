// api.js

/**
 * Makes a GraphQL query to the API
 * @param {string} query - The GraphQL query string
 * @returns {Promise<object>} - The response data
 * @throws {Error} - If authentication fails or query is invalid
 */
async function queryGraphQL(query) {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    // Basic query validation
    if (!query.trim().startsWith('query') && !query.trim().startsWith('mutation')) {
        throw new Error('Invalid GraphQL query');
    }

    const response = await fetch('https://zone01normandie.org/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
            query: query,
            variables: {}
        })
    });

    const result = await response.json();
    
    // Handle JWT expiration errors
    if (result.errors) {
        if (result.errors.some(e => e.message.includes('JWT'))) {
            removeToken();
            window.location.reload();
        }
        throw new Error(result.errors[0].message);
    }

    return result.data;
}

/**
 * Gets user's current level and total XP
 * @returns {Promise<{level: number, xp: number}>}
 */
async function getUserLevel() {
    const query = `
        query {
            user {
                events(where: {event: {path: {_ilike: "/rouen/div-01"}}}) {
                    level
                }
                transactions_aggregate(
                    where: {
                        type: {_eq: "xp"},
                        event: {path: {_ilike: "/rouen/div-01"}}
                    }
                ) {
                    aggregate { sum { amount } }
                }
            }
        }
    `;

    const data = await queryGraphQL(query);
    const user = data?.user?.[0];
    
    return {
        level: user?.events[0]?.level || 0, // Current level
        xp: user?.transactions_aggregate?.aggregate?.sum?.amount || 0 // Total XP
    };
}

/**
 * Gets basic user data including login and attributes
 * @returns {Promise<object>} - User data object
 */
async function getUserData() {
    const query = `
        query GetUserData {
            user {
                login
                attrs
                transactions_aggregate(
                    where: {
                        type: {_eq: "xp"},
                        event: {path: {_ilike: "/rouen/div-01"}}
                    }
                ) {
                    aggregate {
                        sum {
                            amount
                        }
                    }
                }
            }
        }
    `;
    
    const data = await queryGraphQL(query);
    return data?.user?.[0];
}

/**
 * Gets monthly XP transactions sorted by date
 * @returns {Promise<Array>} - Array of XP transactions
 */
async function getMonthlyXP() {
    const query = `
        query {
            transaction(
                where: {
                    type: {_eq: "xp"},
                    event: {path: {_ilike: "/rouen/div-01%"}}
                },
                order_by: {createdAt: asc}
            ) {
                amount
                createdAt
            }
        }
    `;
    
    const data = await queryGraphQL(query);
    return data?.transaction || [];
}

/**
 * Calculates audit ratio (upvotes/downvotes)
 * @returns {Promise<{up: number, down: number, ratio: string|number}>}
 */
async function getAuditRatio() {
    const query = `
        query GetAuditRatio {
            user {
                XPup: transactions_aggregate(
                    where: {
                        _and: [
                            {type: {_eq: "up"}},
                            {path: {_ilike: "/rouen/div-01%"}}
                        ]
                    }
                ) {
                    aggregate { sum { amount } }
                }
                XPdown: transactions_aggregate(
                    where: {
                        _and: [
                            {type: {_eq: "down"}},
                            {path: {_ilike: "/rouen/div-01%"}}
                        ]
                    }
                ) {
                    aggregate { sum { amount } }
                }
            }
        }
    `;

    const data = await queryGraphQL(query);
    const user = data?.user?.[0];
    const up = user?.XPup?.aggregate?.sum?.amount || 0;
    const down = user?.XPdown?.aggregate?.sum?.amount || 0;
    
    return {
        up: up,
        down: down,
        ratio: down === 0 ? "N/A" : (up / down).toFixed(1) // Handle division by zero
    };
}

/**
 * Gets completed skills with grades
 * @returns {Promise<Array>} - Array of skill objects
 */
async function getSkills() {
    const query = `
        query {
            user {
                progresses(
                    where: {
                        _and: [
                            {isDone: {_eq: true}},
                            {object: {type: {_eq: "skill"}}},
                            {path: {_ilike: "/rouen/div-01%"}}
                        ]
                    },
                    order_by: {updatedAt: desc}
                ) {
                    object { name }
                    grade
                }
            }
        }
    `;

    const data = await queryGraphQL(query);
    return data?.user?.[0]?.progresses || [];
}