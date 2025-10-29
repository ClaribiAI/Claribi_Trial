// Simple notification bus to trigger global snackbars from non-React modules (e.g., axios)

let handler = null;

export function setNotificationHandler(fn) {
  handler = fn;
}

export function notify(message, severity = 'info') {
  if (handler) {
    handler(message, severity);
  }
}


