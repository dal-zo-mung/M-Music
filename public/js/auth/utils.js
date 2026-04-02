/* Reusable auth utilities for auth pages */
(function(global) {
  const AUTH_PAGES = new Set(['/Login.html', '/Register.html']);

  function normalizeReturnTo(url) {
    try {
      if (typeof url !== 'string') return '/';

      const trimmed = url.trim();
      if (!trimmed || trimmed.startsWith('//')) return '/';

      const target = new URL(trimmed, window.location.origin);
      if (target.origin !== window.location.origin) return '/';

      return `${target.pathname}${target.search}${target.hash}` || '/';
    } catch {
      return '/';
    }
  }

  const AuthUtils = {
    postJson: async (url, data) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
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

      targetElement.replaceChildren();
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
      const queryReturnTo = normalizeReturnTo(params.get('returnTo'));
      if (queryReturnTo !== '/' || params.has('returnTo')) {
        return queryReturnTo;
      }

      if (document.referrer) {
        try {
          const ref = new URL(document.referrer);
          if (ref.origin === window.location.origin && !AUTH_PAGES.has(ref.pathname)) {
            return normalizeReturnTo(`${ref.pathname}${ref.search}${ref.hash}`);
          }
        } catch {
          return '/';
        }
      }

      return '/';
    },

    safeRedirect: (url) => normalizeReturnTo(url),

    showMessage: (msg, type = 'info') => {
      const formMessage = document.getElementById('formMessage');
      if (!formMessage) {
        if (msg) alert(msg);
        return;
      }

      formMessage.textContent = msg;
      formMessage.className = `form-message ${type}`;
    }
  };

  global.AuthUtils = AuthUtils;
})(window);
