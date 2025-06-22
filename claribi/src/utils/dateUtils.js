/**
 * Parses a date string from the API format
 * @param {string} dateString - Date string from the API (e.g., "Fri, 16 May 2025 22:39:21 GMT")
 * @returns {Date} - JavaScript Date object
 */
function parseApiDate(dateString) {
  if (!dateString) return null;
  
  // Check if the string contains "GMT" - this is a standard format
  if (dateString.includes('GMT')) {
    return new Date(dateString);
  }
  
  // Check if it's an ISO date (2023-05-16T22:39:00Z format)
  if (dateString.includes('T') || dateString.includes('-')) {
    return new Date(dateString);
  }
  
  // Handle API format: "Fri, 16 May 2025 22:39" (without GMT)
  try {
    // Extract components: day, month, year, time
    const parts = dateString.split(', ');
    if (parts.length < 2) return new Date(dateString); // Fallback to default parsing
    
    const dateParts = parts[1].split(' ');
    if (dateParts.length < 3) return new Date(dateString); // Fallback to default parsing
    
    const day = parseInt(dateParts[0]);
    const month = dateParts[1];
    const yearAndTime = dateParts[2].split(' ');
    const year = parseInt(yearAndTime[0]);
    const time = parts.length > 2 ? parts[2] : yearAndTime.length > 1 ? yearAndTime[1] : '00:00';
    
    // Convert month name to month number (0-11)
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const monthIndex = months[month];
    
    if (isNaN(day) || monthIndex === undefined || isNaN(year)) {
      return new Date(dateString); // Fallback to default parsing
    }
    
    // Parse time (HH:MM)
    const [hours, minutes] = time.split(':').map(n => parseInt(n));
    
    return new Date(year, monthIndex, day, hours || 0, minutes || 0);
  } catch (e) {
    console.error('Error parsing date:', e);
    return new Date(dateString); // Fallback to default parsing
  }
}

/**
 * Formats a date string to a user-friendly format using the user's local timezone
 * @param {string} dateString - Date string from the database
 * @param {boolean} useOriginalTimezone - No longer used, kept for backward compatibility
 * @returns {string} - Formatted date string in user's local timezone
 */
export const formatLastModified = (dateString, useOriginalTimezone = false) => {
  if (!dateString) return 'Unknown date';
  
  // Always parse the date to display in user's local timezone
  const date = parseApiDate(dateString);
  const now = new Date();
  
  // Check if date is valid
  if (!date || isNaN(date.getTime())) {
    return dateString; // Return the original string if we can't parse it
  }
  
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Today
  if (diffDays <= 1 && now.getDate() === date.getDate()) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Yesterday
  if (diffDays <= 2 && now.getDate() - date.getDate() === 1) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Within last week
  if (diffDays <= 7) {
    return date.toLocaleDateString([], { weekday: 'long' }) + 
           `, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // More than a week ago
  return date.toLocaleDateString([], { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}; 