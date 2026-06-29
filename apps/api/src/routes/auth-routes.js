import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authService, requireRole } from '../services/auth-service.js';

export const authRoutes = Router();

authRoutes.post('/register', async (req, res, next) => {
  try {
    const input = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(['admin', 'analyst', 'viewer']).optional(),
    }).parse(req.body);
    res.status(201).json(await authService.register(input));
  } catch (error) { next(error); }
});

authRoutes.post('/login', async (req, res, next) => {
  try {
    const input = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    res.json(await authService.login(input.email, input.password));
  } catch (error) { next(error); }
});

authRoutes.post('/refresh', async (req, res, next) => {
  try {
    const input = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
    res.json(await authService.refresh(input.refreshToken));
  } catch (error) { next(error); }
});

authRoutes.post('/logout', async (req, res, next) => {
  try {
    const input = z.object({ refreshToken: z.string().optional() }).parse(req.body);
    await authService.logout(input.refreshToken);
    res.status(204).send();
  } catch (error) { next(error); }
});

authRoutes.post('/send-reset', async (req, res, next) => {
  try {
    const input = z.object({ email: z.string().email() }).parse(req.body);
    await authService.sendPasswordReset(input.email, req.headers.origin);
    res.status(202).json({ message: 'If the account exists, a reset link has been sent.' });
  } catch (error) { next(error); }
});

authRoutes.post('/reset-password', async (req, res, next) => {
  try {
    const input = z.object({ token: z.string().min(1), password: z.string().min(8) }).parse(req.body);
    await authService.resetPassword(input.token, input.password);
    res.json({ message: 'Password reset successfully.' });
  } catch (error) { next(error); }
});

authRoutes.get('/me', authenticate, (req, res) => {
  res.json({ user: { id: req.user.sub, email: req.user.email, name: req.user.name, role: req.user.role, active: true } });
});

authRoutes.get('/users', authenticate, requireRole('admin'), async (_req, res, next) => {
  try { res.json({ data: await authService.listUsers() }); }
  catch (error) { next(error); }
});
