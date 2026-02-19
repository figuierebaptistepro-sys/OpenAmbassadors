/**
 * API Helper - Safe response handling to avoid "body stream already read" errors
 * 
 * This module provides a single, safe way to make API calls and read responses.
 * NEVER read response.json() or response.text() directly elsewhere in the app.
 */

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Safely read a Response body exactly once
 * @param {Response} response - The fetch Response object
 * @returns {Promise<{ok: boolean, status: number, data: any, isHtml: boolean}>}
 */
export async function readResponseSafely(response) {
  try {
    // Read body as text ONCE
    const rawText = await response.text();
    
    // Check if response is HTML instead of JSON
    const isHtml = rawText.trim().startsWith('<');
    
    if (isHtml) {
      console.error('API returned HTML instead of JSON:', rawText.substring(0, 200));
      return {
        ok: false,
        status: response.status,
        data: { detail: 'Erreur serveur: HTML reçu au lieu de JSON (vérifiez la configuration du proxy /api)' },
        isHtml: true
      };
    }
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('Failed to parse JSON:', rawText.substring(0, 500));
      return {
        ok: false,
        status: response.status,
        data: { detail: 'Réponse invalide du serveur' },
        isHtml: false
      };
    }
    
    return {
      ok: response.ok,
      status: response.status,
      data,
      isHtml: false
    };
  } catch (error) {
    console.error('Error reading response:', error);
    return {
      ok: false,
      status: 0,
      data: { detail: 'Erreur de lecture de la réponse' },
      isHtml: false
    };
  }
}

/**
 * Make a safe API call with proper error handling
 * @param {string} endpoint - API endpoint (will be prefixed with API_URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function apiCall(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  
  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    return await readResponseSafely(response);
  } catch (error) {
    console.error('API call failed:', error);
    return {
      ok: false,
      status: 0,
      data: { detail: 'Erreur de connexion au serveur' },
      isHtml: false
    };
  }
}

/**
 * POST request helper
 */
export async function apiPost(endpoint, body) {
  return apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

/**
 * GET request helper
 */
export async function apiGet(endpoint) {
  return apiCall(endpoint, {
    method: 'GET'
  });
}

export default { apiCall, apiPost, apiGet, readResponseSafely };
