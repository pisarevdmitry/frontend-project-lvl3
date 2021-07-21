/**
 * @jest-environment jsdom
 */
import {
  test,
  describe,
  beforeEach,
  expect,
} from '@jest/globals';
import '@testing-library/jest-dom';
import nock from 'nock';
import path from 'path';
import process from 'process';
import fs from 'fs';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import app from '../src/app/app';

const getFixturePath = (filename) => path.join(process.cwd(), '__fixtures__', filename);
const mock = (url, status, reply) => (
  nock('https://hexlet-allorigins.herokuapp.com').defaultReplyHeaders({
    'access-control-allow-origin': '*',
    'access-control-allow-credentials': 'true',
  })
    .persist()
    .get(`/get?url=${encodeURIComponent(url)}&disableCache=true`)
    .reply(status, reply)
);

const submitUrl = (url) => {
  const input = screen.getByLabelText('Ссылка RSS');
  const button = screen.getByText(/Добавить/i);
  userEvent.type(input, url);
  userEvent.click(button);
};

nock.disableNetConnect();

const validRss = fs.readFileSync(getFixturePath('initialRss.xml')).toString();
jest.setTimeout(10000);
beforeEach(() => {
  const initHtml = fs.readFileSync(getFixturePath('index.html')).toString();
  document.body.innerHTML = initHtml;
  app();
});

describe('validation', () => {
  test('invalid url', async () => {
    submitUrl('wrong');
    const input = screen.getByLabelText('Ссылка RSS');
    await screen.findByText(/Ссылка должна быть валидным URL/i);
    expect(input).toHaveClass('is-invalid');
  });
  test('empty', async () => {
    submitUrl(' ');
    const msg = await screen.findByText(/Не должно быть пустым/i);
    expect(msg).toHaveClass('text-danger');
  });
  test('invalid Rss', async () => {
    const url = 'https://ru.hexlet.io/invalid.rss';
    const invalidRss = fs.readFileSync(getFixturePath('invalidRss.html')).toString();
    mock(url, 200, { contents: invalidRss });
    submitUrl(url);
    const msg = await screen.findByText(/Ресурс не содержит валидный RSS/i);
    expect(msg).toHaveClass('text-danger');
  });

  test('rss exists', async () => {
    const url = 'https://ru.hexlet.io/valid1.rss';
    submitUrl(url);
    mock(url, 200, { contents: validRss });
    await screen.findByText(/RSS успешно загружен/i);
    submitUrl(url);
    const msg = await screen.findByText(/Rss уже существует/i);
    expect(msg).toHaveClass('text-danger');
  });
});
test('load Rss', async () => {
  const url = 'https://ru.hexlet.io/valid2.rss';
  submitUrl(url);
  mock(url, 200, { contents: validRss });
  await screen.findByText(/RSS успешно загружен/i);
  await screen.findByText(/Новые уроки на Хекслете/);
  await screen.findByText(/Errors-handling \/ DevOps: Деплой и эксплуатация/i);
  const posts = screen.getAllByRole('link');
  expect(posts.length).toBe(2);
});

test('update Rss', async () => {
  const url = 'https://ru.hexlet.io/valid3.rss';
  const updatedRss = fs.readFileSync(getFixturePath('updatedRss.xml')).toString();
  submitUrl(url);
  const scope = mock(url, 200, { contents: validRss });
  scope.persist(false);
  setTimeout(async () => {
    mock(url, 200, { contents: updatedRss });
  }, 1500);
  await screen.findByText(/Storybooks \/ Фронтенд: Браузер и JSDOM/i, {}, { timeout: 7000 });
  const posts = screen.getAllByRole('link');
  expect(posts.length).toBe(3);
});

test('modal', async () => {
  const url = 'https://ru.hexlet.io/valid4.rss';
  submitUrl(url);
  mock(url, 200, { contents: validRss });
  const link = await screen.findByText(/Kubernetes \/ DevOps: Деплой и эксплуатация/i);
  expect(link).toHaveClass('fw-bold');
  const { id } = link.dataset;
  const buttonView = screen.getByTestId(id);
  userEvent.click(buttonView);
  const modal = await screen.findByRole('dialog');
  expect(modal).toBeVisible();
  expect(link).toHaveClass('fw-normal');
  const header = screen.getByRole('modal-title');
  const body = screen.getByRole('modal-body');
  expect(header.textContent.trim()).toBe('Kubernetes / DevOps: Деплой и эксплуатация');
  expect(body.textContent.trim()).toBe('Цель: Познакомиться с Kubernetes');
});
