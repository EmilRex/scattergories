/**
 * Toast Notification Component
 */

import { TIMING } from '../../config.js';

const container = () => document.getElementById('toast-container');

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'warning', or 'info'
 * @param {number} duration - Duration in ms (default from config)
 */
export function showToast(message, type = 'info', duration = TIMING.TOAST_DURATION) {
    const toastContainer = container();
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

/**
 * Show success toast
 */
export function showSuccess(message, duration) {
    showToast(message, 'success', duration);
}

/**
 * Show error toast
 */
export function showError(message, duration) {
    showToast(message, 'error', duration);
}

/**
 * Show warning toast
 */
export function showWarning(message, duration) {
    showToast(message, 'warning', duration);
}

export default {
    showToast,
    showSuccess,
    showError,
    showWarning
};
