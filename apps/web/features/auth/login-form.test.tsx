import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LoginForm } from './login-form';

const login = jest.fn();
const replace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace,
    push: jest.fn(),
  }),
}));

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({
    login,
  }),
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong',
}));

describe('LoginForm', () => {
  beforeEach(() => {
    login.mockReset();
    replace.mockReset();
  });

  it('submits credentials and redirects to projects', async () => {
    login.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'demo@devtrack.local');
    await user.clear(screen.getByLabelText(/password/i));
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('demo@devtrack.local', 'password123');
      expect(replace).toHaveBeenCalledWith('/projects');
    });
  });

  it('shows an error message when login fails', async () => {
    login.mockRejectedValue(new Error('Invalid email or password'));
    const user = userEvent.setup();

    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), 'demo@devtrack.local');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
