// Utility to normalize various backend error shapes into a consistent { message, code }

export function normalizeApiError(error) {
  // Default fallback
  const fallback = { message: 'An error occurred. Please try again.', code: undefined };

  if (!error) return fallback;

  // Axios error structure
  const response = error.response;
  if (!response) {
    // Network or setup error
    if (error.message) {
      return { message: error.message, code: undefined };
    }
    return fallback;
  }

  const { data, status } = response;

  // Standard envelope: { success:false, error:{ message, code } }
  if (data && data.success === false && data.error) {
    const message = data.error.message || fallback.message;
    const code = data.error.code || String(status);
    return { message, code };
  }

  // Legacy shapes
  if (data) {
    if (typeof data === 'string') {
      return { message: data, code: String(status) };
    }
    // Prioritize message over error field (message is usually more user-friendly)
    if (typeof data.message === 'string') {
      return { message: data.message, code: data.error || String(status) };
    }
                // Special handling for usage limit errors - ensure we use the message
                if (data.error === 'usage_limit_exceeded') {
                    return { 
                        message: data.message || 'You have reached your usage limit. Please upgrade your plan to continue.', 
                        code: 'usage_limit_exceeded' 
                    };
                }
    if (typeof data.error === 'string') {
      return { message: data.error, code: String(status) };
    }
  }

  // Status-based fallback
  switch (status) {
    case 400: return { message: 'Bad request. Please check your input.', code: '400' };
    case 401: return { message: 'You are not authorized. Please log in again.', code: '401' };
    case 403: return { message: 'You do not have permission to access this resource.', code: '403' };
    case 404: return { message: 'The requested resource was not found.', code: '404' };
    case 413: return { message: 'Payload too large. Please reduce the file size.', code: '413' };
    case 500: return { message: 'Server error. Please try again later.', code: '500' };
    default: return { message: `Error ${status}. Please try again.`, code: String(status) };
  }
}


