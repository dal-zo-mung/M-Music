/* Client-side signup handling for Register.html */
(function() {
  function init() {
    const container = document.getElementById('container');
    if (!container) return;

    const firstNameInput = document.getElementById('box11');
    const lastNameInput = document.getElementById('box12');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const confirmPasswordInput = document.getElementById('confirmPasswordInput');
    const checkbox = document.getElementById('checkbox');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    const setPasswordVisibility = (input, toggleButton) => {
      if (!input || !toggleButton) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      const icon = toggleButton.querySelector('img.password-toggle-icon');
      if (icon) {
        icon.src = isPassword ? '/icons/visibility_off.svg' : '/icons/visibility.svg';
        icon.alt = isPassword ? `Hide ${input.id === 'passwordInput' ? 'new' : 'confirm'} password` : `Show ${input.id === 'passwordInput' ? 'new' : 'confirm'} password`;
      }

      toggleButton.setAttribute('aria-label', `${isPassword ? 'Hide' : 'Show'} ${input.id === 'passwordInput' ? 'new' : 'confirm'} password`);
    };

    if (togglePassword) {
      togglePassword.addEventListener('click', () => {
        setPasswordVisibility(passwordInput, togglePassword);
      });
    }

    if (toggleConfirmPassword) {
      toggleConfirmPassword.addEventListener('click', () => {
        setPasswordVisibility(confirmPasswordInput, toggleConfirmPassword);
      });
    }

    const passwordValidationContainer = document.getElementById('passwordValidation');
    if (passwordInput && passwordValidationContainer) {
      passwordInput.addEventListener('input', () => {
        const validation = AuthUtils.validatePassword(passwordInput.value);
        AuthUtils.displayPasswordValidation(validation, passwordValidationContainer);
      });
    }

    container.addEventListener('submit', async (event) => {
      event.preventDefault();

      const firstName = (firstNameInput?.value || '').trim();
      const lastName = (lastNameInput?.value || '').trim();
      const username = (usernameInput?.value || '').trim();
      const password = passwordInput?.value || '';
      const confirmPassword = confirmPasswordInput?.value || '';

      if (!firstName || !lastName || !username || !password || !confirmPassword) {
        AuthUtils.showMessage('Please complete every field.', 'error');
        return;
      }

      const passwordValidation = AuthUtils.validatePassword(password);
      if (!passwordValidation.valid) {
        AuthUtils.showMessage(`Password validation failed: ${passwordValidation.errors.join(', ')}`, 'error');
        return;
      }

      if (password !== confirmPassword) {
        AuthUtils.showMessage('Passwords do not match.', 'error');
        return;
      }

      if (!checkbox?.checked) {
        AuthUtils.showMessage('You must agree to the terms before registering.', 'error');
        return;
      }

      AuthUtils.showMessage('Creating your account ... . .', 'info');

      try {
        const response = await AuthUtils.postJson('/api/register', {
          username,
          password,
          firstName,
          lastName
        });

        if (!response.ok || !response.data?.success) {
          AuthUtils.showMessage(response.data?.message || 'Registration failed.', 'error');
          return;
        }

        AuthUtils.showMessage('Account created. Redirecting ... . .', 'success');
        window.setTimeout(() => {
          const redirectTarget = AuthUtils.safeRedirect(AuthUtils.getReturnTo());
          window.location.href = redirectTarget || '/';
        }, 700);
      } catch (error) {
        console.error('Registration request failed:', error);
        AuthUtils.showMessage('Unable to register right now. Please try again.', 'error');
      }
    });

    container.addEventListener('reset', () => {
      AuthUtils.showMessage('', 'info');
    });

    const returnTo = AuthUtils.getReturnTo();
    if (returnTo) {
      const loginLink = document.querySelector('#loginLink a');
      const googleLink = document.getElementById('loginwithGoogle');

      if (loginLink) {
        loginLink.href = `Login.html?returnTo=${encodeURIComponent(returnTo)}`;
      }

      if (googleLink) {
        googleLink.href = `/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
