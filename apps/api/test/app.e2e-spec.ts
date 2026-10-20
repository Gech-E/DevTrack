import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';

describe('DevTrack API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

  it('logs in the seeded user and manages a project/task', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'demo@devtrack.local', password: 'password123' });

    expect([200, 201]).toContain(login.status);

    const refreshToken = login.body.refreshToken as string;
    expect(login.body.accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(refreshed.body.accessToken).toBeTruthy();
    expect(refreshed.body.refreshToken).toBeTruthy();
    expect(refreshed.body.refreshToken).not.toBe(refreshToken);

    const token = refreshed.body.accessToken as string;

    const projectRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Project', description: 'From integration test' })
      .expect(201);

    const projectId = projectRes.body.id as string;

    const taskRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'E2E Task', priority: 'HIGH' })
      .expect(201);

    expect(taskRes.body.title).toBe('E2E Task');

    const goalRes = await request(app.getHttpServer())
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'E2E Goal', status: 'ACTIVE' })
      .expect(201);

    expect(goalRes.body.title).toBe('E2E Goal');

    await request(app.getHttpServer())
      .delete(`/api/v1/goals/${goalRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}/tasks/${taskRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });

  it('rejects unauthenticated project access', async () => {
    await request(app.getHttpServer()).get('/api/v1/projects').expect(401);
  });
});
