/* Reusable auth utilities for auth pages */
(function(global) {
  let retryCountdownTimer = null;
  let lockedSubmitButton = null;
  let lockedSubmitButtonText = '';

  function setFormMessage(msg, type = 'info') {
    const formMessage = document.getElementById('formMessage');
    if (!formMessage) {
      alert(msg);
      return;
    }

    formMessage.textContent = msg;
    formMessage.className = `form-message ${type}`;
  }

  function releaseLockedSubmitButton() {
    if (!lockedSubmitButton) return;

    lockedSubmitButton.disabled = false;
    lockedSubmitButton.textContent = lockedSubmitButtonText;
    lockedSubmitButton.removeAttribute('aria-disabled');
    lockedSubmitButton = null;
    lockedSubmitButtonText = '';
  }

  function clearRetryCountdown() {
    if (retryCountdownTimer) {
      window.clearInterval(retryCountdownTimer);
      retryCountdownTimer = null;
    }

    releaseLockedSubmitButton();
  }

  function formatRetryCountdown(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
      return `${seconds}s`;
    }

    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  const AuthUtils = {
    postJson: async (url, data) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data)
      });

      const payload = await res.json().catch(() => null);
      return {
        ok: res.ok,
        status: res.status,
        data: payload
      };
    },

    getErrorMessage: (payload, fallback = 'Request failed.') => {
      if (!payload || typeof payload !== 'object') {
        return fallback;
      }

      if (typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message;
      }

      if (typeof payload.error === 'string' && payload.error.trim()) {
        return payload.error;
      }

      return fallback;
    },

    startRetryCountdown: (payload, submitButton) => {
      const retryAfterSeconds = Number.parseInt(payload?.retryAfterSeconds, 10);
      if (Number.isNaN(retryAfterSeconds) || retryAfterSeconds <= 0) {
        return false;
      }

      clearRetryCountdown();

      if (submitButton) {
        lockedSubmitButton = submitButton;
        lockedSubmitButtonText = submitButton.textContent;
        lockedSubmitButton.disabled = true;
        lockedSubmitButton.setAttribute('aria-disabled', 'true');
      }

      let remainingSeconds = retryAfterSeconds;

      const render = () => {
        const countdownText = formatRetryCountdown(remainingSeconds);
        setFormMessage(`Too many attempts. Please wait ${countdownText} before trying again.`, 'error');

        if (lockedSubmitButton) {
          lockedSubmitButton.textContent = `Wait ${countdownText}`;
        }
      };

      render();
      retryCountdownTimer = window.setInterval(() => {
        remainingSeconds -= 1;

        if (remainingSeconds <= 0) {
          clearRetryCountdown();
          setFormMessage('You can try again now.', 'info');
          return;
        }

        render();
      }, 1000);

      return true;
    },

    validatePassword: (password) => {
      const rules = [
        { test: (p) => p.length >= 8, message: 'At least 8 characters' },
        { test: (p) => /[A-Z]/.test(p), message: 'At least one uppercase letter' },
        { test: (p) => /[a-z]/.test(p), message: 'At least one lowercase letter' },
        { test: (p) => /[0-9]/.test(p), message: 'At least one number' },
        { test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p), message: 'At least one special character' }
      ];

      const errors = rules.filter((rule) => !rule.test(password)).map((rule) => rule.message);
      return { valid: errors.length === 0, errors };
    },

    displayPasswordValidation: (result, targetElement) => {
      if (!targetElement) return;

      targetElement.innerHTML = '';
      const list = document.createElement('ul');
      list.className = 'password-validation-list';

      const rules = [
        'At least 8 characters',
        'At least one uppercase letter',
        'At least one lowercase letter',
        'At least one number',
        'At least one special character'
      ];

      rules.forEach((rule) => {
        const item = document.createElement('li');
        item.textContent = rule;
        item.className = result.errors.includes(rule) ? 'invalid' : 'valid';
        list.appendChild(item);
      });

      targetElement.appendChild(list);
    },

    getReturnTo: () => {
      const params = new URLSearchParams(window.location.search);
      let returnTo = params.get('returnTo');

      if (!returnTo) {
        const ref = document.referrer;
        if (ref && ref.startsWith(window.location.origin) && !ref.includes('/Login.html') && !ref.includes('/Register.html')) {
          returnTo = ref;
        }
      }

      if (!returnTo) {
        returnTo = `${window.location.pathname}${window.location.search}`;
      }

      return returnTo;
    },

    safeRedirect: (url) => {
      if (!url) return '/';
      try {
        const target = new URL(url, window.location.origin);
        if (!target.pathname.startsWith('/')) return '/';
        return target.toString();
      } catch {
        return '/';
      }
    },

    showMessage: (msg, type = 'info') => {
      clearRetryCountdown();
      setFormMessage(msg, type);
    }
  };

  global.AuthUtils = AuthUtils;
})(window);
