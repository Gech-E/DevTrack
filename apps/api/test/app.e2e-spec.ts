import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';

function cookieHeader(setCookie: string[] | string | undefined): string {
  if (!setCookie) {
    return '';
  }
  const values = Array.isArray(setCookie) ? setCookie : [setCookie];
  return values.map((entry) => entry.split(';')[0]).join('; ');
}

describe('DevTrack API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns database status', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.service).toBe('DevTrack');
    expect(['ok', 'degraded']).toContain(response.body.status);
    expect(['up', 'down']).toContain(response.body.database);
  });

  it('logs in with httpOnly cookies and manages project/task/goal', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'demo@devtrack.local', password: 'password123' });

    expect([200, 201]).toContain(login.status);
    expect(login.body.user.email).toBe('demo@devtrack.local');
    expect(login.body.accessToken).toBeUndefined();

    let cookies = cookieHeader(login.headers['set-cookie']);
    expect(cookies).toContain('devtrack_access=');
    expect(cookies).toContain('devtrack_refresh=');

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies)
      .expect(200);

    expect(refreshed.body.ok).toBe(true);
    cookies = cookieHeader(refreshed.headers['set-cookie']) || cookies;

    const projectRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Cookie', cookies)
      .send({ name: 'E2E Project', description: 'From integration test' })
      .expect(201);

    const projectId = projectRes.body.id as string;

    const taskRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', cookies)
      .send({ title: 'E2E Task', priority: 'HIGH' })
      .expect(201);

    expect(taskRes.body.title).toBe('E2E Task');

    const goalRes = await request(app.getHttpServer())
      .post('/api/v1/goals')
      .set('Cookie', cookies)
      .send({ title: 'E2E Goal', status: 'ACTIVE', projectId })
      .expect(201);

    expect(goalRes.body.title).toBe('E2E Goal');
    expect(goalRes.body.projectId).toBe(projectId);
    expect(goalRes.body.project.name).toBe('E2E Project');

    await request(app.getHttpServer())
      .delete(`/api/v1/goals/${goalRes.body.id}`)
      .set('Cookie', cookies)
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}/tasks/${taskRes.body.id}`)
      .set('Cookie', cookies)
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}`)
      .set('Cookie', cookies)
      .expect(204);
  });

  it('rejects unauthenticated project access', async () => {
    await request(app.getHttpServer()).get('/api/v1/projects').expect(401);
  });
});
