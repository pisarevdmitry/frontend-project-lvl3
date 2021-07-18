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
const mock = (status, reply) => {
  nock('https://hexlet-allorigins.herokuapp.com').defaultReplyHeaders({
    'access-control-allow-origin': '*',
    'access-control-allow-credentials': 'true',
  }).get('/get')
    .query(true)
    .reply(status, reply);
};

nock.disableNetConnect();

const validRss = fs.readFileSync(getFixturePath('initialRss.xml')).toString();

beforeEach(() => {
  const initHtml = fs.readFileSync(getFixturePath('index.html')).toString();
  document.body.innerHTML = initHtml;
  app();
});

describe('validation', () => {
  test('invalid url', async () => {
    const input = screen.getByLabelText('Ссылка RSS');
    const button = screen.getByText(/Добавить/i);
    userEvent.type(input, 'wrong');
    userEvent.click(button);
    await screen.findByText('Ссылка должна быть валидным URL');
    expect(input).toHaveClass('is-invalid');
  });
  test('empty', async () => {
    const input = screen.getByLabelText('Ссылка RSS');
    const button = screen.getByText(/Добавить/i);
    userEvent.type(input, ' ');
    userEvent.click(button);
    const msg = await screen.findByText('Не должно быть пустым');
    expect(msg).toHaveClass('text-danger');
  });
  test('invalid Rss', async () => {
    const input = screen.getByLabelText('Ссылка RSS');
    const button = screen.getByText(/Добавить/i);
    const invalidRss = fs.readFileSync(getFixturePath('invalidRss.html')).toString();
    mock(200, { contents: invalidRss });
    userEvent.type(input, 'https://ru.hexlet.io/lessons.rss');
    userEvent.click(button);
    const msg = await screen.findByText('Ресурс не содержит валидный RSS');
    expect(msg).toHaveClass('text-danger');
  });
  test('rss exists', async () => {
    const input = screen.getByLabelText('Ссылка RSS');
    const button = screen.getByText(/Добавить/i);
    userEvent.type(input, 'https://ru.hexlet.io/lessons.rss');
    userEvent.click(button);
    mock(200, { contents: validRss });
    await screen.findByText(/RSS успешно загружен/i);
    userEvent.type(input, 'https://ru.hexlet.io/lessons.rss');
    userEvent.click(button);
    const msg = await screen.findByText('Rss уже существует');
    expect(msg).toHaveClass('text-danger');
  });
});
test('load Rss', async () => {
  const input = screen.getByLabelText('Ссылка RSS');
  const button = screen.getByText(/Добавить/i);
  userEvent.type(input, 'https://ru.hexlet.io/lessons.rss');
  userEvent.click(button);
  mock(200, { contents: validRss });
  const msg = await screen.findByText(/RSS успешно загружен/i);
  await screen.findByText(/Новые уроки на Хекслете/);
  await screen.findByText(/Kubernetes \/ DevOps: Деплой и эксплуатация/i);
  await screen.findByText(/Errors-handling \/ DevOps: Деплой и эксплуатация/i);
  expect(msg).toHaveClass('text-success');
});

test('update Rss', async () => {
  const input = screen.getByLabelText('Ссылка RSS');
  const button = screen.getByText(/Добавить/i);
  const updatedRss = fs.readFileSync(getFixturePath('updatedRss.xml')).toString();
  userEvent.type(input, 'https://ru.hexlet.io/lessons.rss');
  userEvent.click(button);
  mock(200, { contents: validRss });
  setTimeout(async () => {
    mock(200, { contents: updatedRss });
  }, 1500);
  const newPost = await screen.findByText(/Storybooks \/ Фронтенд: Браузер и JSDOM/i, {}, { timeout: 5000 });
  expect(newPost).toHaveClass('fw-bold');
});

test('modal', async () => {
  const input = screen.getByLabelText('Ссылка RSS');
  const button = screen.getByText(/Добавить/i);
  userEvent.type(input, 'https://ru.hexlet.io/lessons.rss');
  userEvent.click(button);
  mock(200, { contents: validRss });
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
