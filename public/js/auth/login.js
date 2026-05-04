/* Client-side login handling for Login.html */
(function() {
  function init() {
    const container = document.getElementById('container');
    if (!container) return;

    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const togglePassword = document.getElementById('togglePassword');
    const submitButton = document.getElementById('loginbt');

    // Ensure password is hidden by default
    if (passwordInput) {
      passwordInput.type = 'password';
    }

    const togglePasswordIcon = document.getElementById('togglePasswordIcon');

    if (togglePassword && passwordInput && togglePasswordIcon) {
      const updateToggle = () => {
        const showing = passwordInput.type === 'text';
        togglePasswordIcon.src = showing ? '/icons/visibility.svg' : '/icons/visibility_off.svg';
        togglePasswordIcon.alt = showing ? 'Hide password' : 'Show password';
        togglePassword.setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
      };

      togglePassword.addEventListener('click', () => {
        passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
        updateToggle();
      });

      togglePassword.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          togglePassword.click();
        }
      });

      updateToggle();
    }

    container.addEventListener('submit', async (event) => {
      event.preventDefault();

      const username = (usernameInput?.value || '').trim();
      const password = passwordInput?.value || '';

      if (!username || !password) {
        AuthUtils.showMessage('Please enter both username and password.', 'error');
        return;
      }

      const passwordValidation = AuthUtils.validatePassword(password);
      if (!passwordValidation.valid) {
        AuthUtils.showMessage(`Password format is weak: ${passwordValidation.errors.join('; ')}`, 'warning');
        // do not block existing users (legacy weak accounts may exist), but keep warning on UI.
      }

      AuthUtils.showMessage('Signing you in...', 'info');

      try {
        const response = await AuthUtils.postJson('/api/login', { username, password });

        if (!response.ok || !response.data?.success) {
          if (response.status === 429 && AuthUtils.startRetryCountdown(response.data, submitButton)) {
            return;
          }
          AuthUtils.showMessage(AuthUtils.getErrorMessage(response.data, 'Login failed.'), 'error');
          return;
        }

        const userInfo = response.data.user;
        if (userInfo) {
          localStorage.setItem('mMusicUser', JSON.stringify(userInfo));
        }

        AuthUtils.showMessage('Login successful. Redirecting ... . .', 'success');
        window.setTimeout(() => {
          const returnToLocation = AuthUtils.getReturnTo();
          const redirectTarget = AuthUtils.safeRedirect(returnToLocation);
          if (redirectTarget && redirectTarget !== window.location.href) {
            window.location.href = redirectTarget;
          } else {
            window.location.reload();
          }
        }, 500);
      } catch (error) {
        console.error('Login request failed:', error);
        AuthUtils.showMessage('Unable to login right now. Please try again.', 'error');
      }
    });

    container.addEventListener('reset', () => {
      AuthUtils.showMessage('', 'info');
    });

    const params = new URLSearchParams(window.location.search);
    const returnTo = AuthUtils.getReturnTo();

    if (returnTo) {
      const registerLink = document.getElementById('registerbt');
      const googleLink = document.getElementById('loginWithGoogle');

      if (registerLink) {
        registerLink.href = `Register.html?returnTo=${encodeURIComponent(returnTo)}`;
      }
      if (googleLink) {
        googleLink.href = `/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
      }
    }

    const error = params.get('error');
    if (error === 'google-login-failed') {
      AuthUtils.showMessage('Google login failed. Try again.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
