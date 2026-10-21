import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

type Session = {
  email: string;
  accessToken: string;
  refreshToken: string;
};

const PASSWORD = 'correct-horse-battery';
const runId = Date.now().toString(36);

describe('DevTrack API (e2e)', () => {
  let app: NestExpressApplication;
  const sessions: Session[] = [];

  const http = () => request(app.getHttpServer());

  async function register(label: string): Promise<Session> {
    const email = `e2e-${label}-${runId}@devtrack.local`;
    const response = await http()
      .post('/api/v1/auth/register')
      .send({ email, password: PASSWORD, name: `E2E ${label}` })
      .expect(201);

    const session: Session = {
      email,
      accessToken: response.body.accessToken as string,
      refreshToken: response.body.refreshToken as string,
    };
    sessions.push(session);
    return session;
  }

  const bearer = (session: Session) => ({ Authorization: `Bearer ${session.accessToken}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Same bootstrap as production, so tests cannot drift from main.ts.
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    // Best-effort cleanup of the accounts this run created (cascades to their data).
    for (const session of sessions) {
      await http()
        .delete('/api/v1/auth/me')
        .set(bearer(session))
        .send({ password: PASSWORD })
        .catch(() => undefined);
    }
    await app.close();
  });

  describe('health and platform headers', () => {
    it('reports liveness without touching the database', async () => {
      const response = await http().get('/health/live').expect(200);
      expect(response.body.status).toBe('ok');
    });

    it('reports readiness with database status', async () => {
      for (const path of ['/health', '/health/ready']) {
        const response = await http().get(path).expect(200);
        expect(response.body).toMatchObject({ service: 'DevTrack', status: 'ok', database: 'up' });
      }
    });

    it('sends security headers, a request id, and hides the framework', async () => {
      const response = await http().get('/health/live').set('X-Request-Id', 'trace-abc-12345');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['content-security-policy']).toContain("default-src 'none'");
      expect(response.headers['x-request-id']).toBe('trace-abc-12345');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('returns a consistent error shape with the request id', async () => {
      const response = await http().get('/api/v1/projects').expect(401);

      expect(response.body).toMatchObject({ statusCode: 401 });
      expect(response.body.requestId).toBe(response.headers['x-request-id']);
    });
  });

  describe('authentication', () => {
    it('registers, logs in, rotates refresh tokens and logs out', async () => {
      const session = await register('auth');

      await http()
        .post('/api/v1/auth/register')
        .send({ email: session.email, password: PASSWORD, name: 'Duplicate' })
        .expect(409);

      const login = await http()
        .post('/api/v1/auth/login')
        .send({ email: session.email.toUpperCase(), password: PASSWORD })
        .expect(200);
      expect(login.body.user.email).toBe(session.email);
      expect(login.body.user).not.toHaveProperty('passwordHash');

      const refreshed = await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: login.body.refreshToken })
        .expect(200);
      expect(refreshed.body.refreshToken).not.toBe(login.body.refreshToken);

      // Replaying the rotated token straight away is treated as a race: rejected, but the new
      // token (and any other session) stays valid.
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: login.body.refreshToken })
        .expect(401);

      const again = await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: refreshed.body.refreshToken })
        .expect(200);

      await http()
        .post('/api/v1/auth/logout')
        .send({ refreshToken: again.body.refreshToken })
        .expect(204);
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: again.body.refreshToken })
        .expect(401);
    });

    it('gives the same generic error for unknown emails and wrong passwords', async () => {
      const session = await register('generic');

      const unknown = await http()
        .post('/api/v1/auth/login')
        .send({ email: `nobody-${runId}@devtrack.local`, password: PASSWORD })
        .expect(401);
      const wrong = await http()
        .post('/api/v1/auth/login')
        .send({ email: session.email, password: 'definitely-wrong' })
        .expect(401);

      expect(unknown.body.message).toBe(wrong.body.message);
    });

    it('rejects unauthenticated and forged tokens on every protected route', async () => {
      await http().get('/api/v1/auth/me').expect(401);
      await http().get('/api/v1/projects').expect(401);
      await http().get('/api/v1/goals').expect(401);

      const unsigned = [
        Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url'),
        Buffer.from('{"sub":"user_1","email":"x@y.z"}').toString('base64url'),
        '',
      ].join('.');
      await http().get('/api/v1/auth/me').set('Authorization', `Bearer ${unsigned}`).expect(401);
    });

    it('changes the password, ends other sessions, and deletes the account', async () => {
      const session = await register('lifecycle');
      const newPassword = 'a-different-secure-passphrase';

      await http()
        .post('/api/v1/auth/change-password')
        .set(bearer(session))
        .send({ currentPassword: 'not-my-password', newPassword })
        .expect(401);

      const changed = await http()
        .post('/api/v1/auth/change-password')
        .set(bearer(session))
        .send({ currentPassword: PASSWORD, newPassword })
        .expect(200);
      expect(changed.body.accessToken).toBeTruthy();

      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);
      await http()
        .post('/api/v1/auth/login')
        .send({ email: session.email, password: PASSWORD })
        .expect(401);
      await http()
        .post('/api/v1/auth/login')
        .send({ email: session.email, password: newPassword })
        .expect(200);

      await http()
        .delete('/api/v1/auth/me')
        .set({ Authorization: `Bearer ${changed.body.accessToken as string}` })
        .send({ password: 'wrong' })
        .expect(401);
      await http()
        .delete('/api/v1/auth/me')
        .set({ Authorization: `Bearer ${changed.body.accessToken as string}` })
        .send({ password: newPassword })
        .expect(204);
      await http()
        .post('/api/v1/auth/login')
        .send({ email: session.email, password: newPassword })
        .expect(401);
    });

    it('answers forgot-password identically for known and unknown emails', async () => {
      const session = await register('forgot');

      const known = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: session.email })
        .expect(202);
      const unknown = await http()
        .post('/api/v1/auth/forgot-password')
        .send({ email: `ghost-${runId}@devtrack.local` })
        .expect(202);

      expect(known.body).toEqual(unknown.body);

      await http()
        .post('/api/v1/auth/reset-password')
        .send({ token: 'f'.repeat(64), password: 'a-brand-new-password' })
        .expect(400);
    });
  });

  describe('projects, tasks and goals', () => {
    it('supports the full project/task/goal lifecycle', async () => {
      const owner = await register('owner');

      const project = await http()
        .post('/api/v1/projects')
        .set(bearer(owner))
        .send({ name: 'E2E Project', description: 'From integration test' })
        .expect(201);
      const projectId = project.body.id as string;

      const task = await http()
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set(bearer(owner))
        .send({ title: 'E2E Task', priority: 'HIGH', dueDate: '2030-01-15' })
        .expect(201);
      expect(task.body.title).toBe('E2E Task');

      const updated = await http()
        .patch(`/api/v1/projects/${projectId}/tasks/${task.body.id as string}`)
        .set(bearer(owner))
        .send({ status: 'DONE', dueDate: null })
        .expect(200);
      expect(updated.body).toMatchObject({ status: 'DONE', dueDate: null });

      const goal = await http()
        .post('/api/v1/goals')
        .set(bearer(owner))
        .send({ title: 'E2E Goal', status: 'ACTIVE' })
        .expect(201);
      await http()
        .delete(`/api/v1/goals/${goal.body.id as string}`)
        .set(bearer(owner))
        .expect(204);

      await http()
        .delete(`/api/v1/projects/${projectId}/tasks/${task.body.id as string}`)
        .set(bearer(owner))
        .expect(204);
      await http().delete(`/api/v1/projects/${projectId}`).set(bearer(owner)).expect(204);
    });

    it("never exposes one user's data to another", async () => {
      const alice = await register('alice');
      const bob = await register('bob');

      const project = await http()
        .post('/api/v1/projects')
        .set(bearer(alice))
        .send({ name: 'Alice private project' })
        .expect(201);
      const projectId = project.body.id as string;
      const task = await http()
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set(bearer(alice))
        .send({ title: 'Alice private task' })
        .expect(201);
      const taskId = task.body.id as string;
      const goal = await http()
        .post('/api/v1/goals')
        .set(bearer(alice))
        .send({ title: 'Alice private goal' })
        .expect(201);

      await http().get(`/api/v1/projects/${projectId}`).set(bearer(bob)).expect(404);
      await http().get(`/api/v1/projects/${projectId}/tasks`).set(bearer(bob)).expect(404);
      await http()
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set(bearer(bob))
        .send({ title: 'Injected' })
        .expect(404);
      await http()
        .get(`/api/v1/projects/${projectId}/tasks/${taskId}`)
        .set(bearer(bob))
        .expect(404);
      await http()
        .patch(`/api/v1/projects/${projectId}/tasks/${taskId}`)
        .set(bearer(bob))
        .send({ title: 'Hijacked' })
        .expect(404);
      await http()
        .delete(`/api/v1/projects/${projectId}/tasks/${taskId}`)
        .set(bearer(bob))
        .expect(404);
      await http()
        .patch(`/api/v1/projects/${projectId}`)
        .set(bearer(bob))
        .send({ name: 'Hijacked' })
        .expect(404);
      await http().delete(`/api/v1/projects/${projectId}`).set(bearer(bob)).expect(404);
      await http()
        .get(`/api/v1/goals/${goal.body.id as string}`)
        .set(bearer(bob))
        .expect(404);

      const bobsProjects = await http().get('/api/v1/projects').set(bearer(bob)).expect(200);
      expect(bobsProjects.body).toEqual([]);

      // Alice's data is untouched.
      const intact = await http()
        .get(`/api/v1/projects/${projectId}/tasks/${taskId}`)
        .set(bearer(alice))
        .expect(200);
      expect(intact.body.title).toBe('Alice private task');
    });

    it('validates input and pagination at the HTTP boundary', async () => {
      const user = await register('validation');
      const project = await http()
        .post('/api/v1/projects')
        .set(bearer(user))
        .send({ name: 'Validation' })
        .expect(201);
      const tasksUrl = `/api/v1/projects/${project.body.id as string}/tasks`;

      await http().post(tasksUrl).set(bearer(user)).send({ title: 'x', dueDate: '1' }).expect(400);
      await http()
        .post(tasksUrl)
        .set(bearer(user))
        .send({ title: 'x', dueDate: 'not-a-date' })
        .expect(400);
      await http()
        .post(tasksUrl)
        .set(bearer(user))
        .send({ title: 'x', unexpected: true })
        .expect(400);
      await http().get(`${tasksUrl}?limit=100000`).set(bearer(user)).expect(400);
      await http().get(`${tasksUrl}?status=NOPE`).set(bearer(user)).expect(400);

      for (const title of ['one', 'two', 'three']) {
        await http().post(tasksUrl).set(bearer(user)).send({ title }).expect(201);
      }
      const firstPage = await http().get(`${tasksUrl}?limit=2`).set(bearer(user)).expect(200);
      const secondPage = await http()
        .get(`${tasksUrl}?limit=2&offset=2`)
        .set(bearer(user))
        .expect(200);
      expect(firstPage.body).toHaveLength(2);
      expect(secondPage.body).toHaveLength(1);
    });
  });
});
