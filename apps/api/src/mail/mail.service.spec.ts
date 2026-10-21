import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { MailService } from './mail.service';

describe('MailService', () => {
  const message = {
    to: 'user@devtrack.local',
    subject: 'Reset your password',
    text: 'Use the link',
  };

  async function build(values: Record<string, string>): Promise<MailService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
            getOrThrow: jest.fn((key: string) => {
              const value = values[key];
              if (value === undefined) throw new Error(`Missing ${key}`);
              return value;
            }),
          },
        },
      ],
    }).compile();
    return module.get(MailService);
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts to the Resend API with the configured credentials', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    const service = await build({
      MAIL_TRANSPORT: 'resend',
      RESEND_API_KEY: 're_test',
      MAIL_FROM: 'DevTrack <no-reply@devtrack.local>',
    });

    await service.send(message);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    const init = call?.[1];
    expect(call?.[0]).toBe('https://api.resend.com/emails');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer re_test');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      to: ['user@devtrack.local'],
      subject: 'Reset your password',
    });
  });

  it('throws when the provider rejects the message', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 422 } as Response);
    const service = await build({
      MAIL_TRANSPORT: 'resend',
      RESEND_API_KEY: 're_test',
      MAIL_FROM: 'no-reply@devtrack.local',
    });

    await expect(service.send(message)).rejects.toThrow('HTTP 422');
  });

  it('does not call the network with the log transport', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const service = await build({ MAIL_TRANSPORT: 'log', NODE_ENV: 'test' });

    await service.send(message);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
