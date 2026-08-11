/**
 * Escapes characters that have special meaning in regular expressions.
 * This is crucial to prevent ReDoS (Regular Expression Denial of Service)
 * when allowing users to provide search strings that will be used in MongoDB $regex queries.
 *
 * @param {string} text The user-provided search string
 * @returns {string} The escaped string safe for regex compilation
 */
const escapeRegex = (text) => {
    if (typeof text !== 'string') {
        return '';
    }
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default escapeRegex;
