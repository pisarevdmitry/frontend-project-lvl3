import 'bootstrap/js/dist/modal';
import axios from 'axios';
import * as yup from 'yup';
import i18n from 'i18next';
import _ from 'lodash';
import watch from './view';
import { ru, en, yup as yupLocale } from '../locales';
import parse from './parser';

const updatingInterval = 5000;

const validate = (value, addedUrls) => {
  const schema = yup.string().required().url().notOneOf(addedUrls);
  return schema.validate(value);
};

const addProxy = (url) => `https://hexlet-allorigins.herokuapp.com/get?url=${encodeURIComponent(url)}&disableCache=true`;

const identifyError = (error) => {
  if (axios.isAxiosError(error)) return 'errors.network';
  if (_.has(error, 'isParsingError')) return 'errors.invalidRss';
  return 'errors.unknow';
};

const addRss = (url, state) => {
  state.loadingProccess.status = 'loading';
  const fetchUrl = addProxy(url);
  axios.get(fetchUrl)
    .then(({ data: { contents } }) => {
      const { title, description, items: posts } = parse(contents);
      const newFeed = { title, description, id: _.uniqueId() };
      const createdPosts = posts.map((elem) => ({ ...elem, feedId: newFeed.id, id: _.uniqueId() }));
      const newFeeds = [{ url, feed: newFeed }, ...state.feeds];
      const newPosts = [...state.posts, ...createdPosts];
      state.loadingProccess.status = 'success';
      state.feeds = newFeeds;
      state.posts = newPosts;
    })
    .catch((error) => {
      state.loadingProccess.status = 'failure';
      state.loadingProccess.error = identifyError(error);
    });
};

const handleSubmit = (e, state) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const url = data.get('url');
  state.form.status = 'validating';
  const addedUrls = state.feeds.map((feed) => feed.url);
  validate(url.trim(), addedUrls)
    .then(() => {
      state.form.status = 'valid';
      state.form.error = '';
      addRss(url, state);
    })
    .catch((error) => {
      state.form.status = 'invalid';
      state.form.error = error.message;
    });
};

const findNewPosts = (existedPosts, posts) => {
  const keyed = (_.keyBy(existedPosts, 'guid'));
  return posts.filter((post) => !keyed[post.guid]);
};

const updateRss = (state) => {
  const promises = state.feeds.map(({ url, feed }) => {
    const fetchUrl = addProxy(url);
    return axios.get(fetchUrl).then(({ data: { contents } }) => {
      const { items: posts } = parse(contents);
      const existingPosts = state.posts.filter((post) => post.feedId === feed.id);
      const newPosts = findNewPosts(existingPosts, posts);
      return newPosts.map((post) => ({ ...post, feedId: feed.id, id: _.uniqueId() }));
    }).catch(() => null);
  });

  Promise.all(promises).then((data) => {
    const filtered = data.filter((el) => el !== null);
    const createdPosts = filtered.flat();
    if (createdPosts.length !== 0) {
      state.posts = [...state.posts, ...createdPosts];
    }
    setTimeout(() => {
      updateRss(state);
    }, updatingInterval);
  });
};

const app = () => {
  const i18Instance = i18n.createInstance();
  yup.setLocale(yupLocale);
  const state = {
    form: {
      status: 'valid',
      error: '',
    },
    loadingProccess: {
      status: 'success',
      error: '',
    },
    modal: {
      postId: null,
    },
    feeds: [],
    posts: [],
    ui: {
      viewedPosts: new Set(),
    },
  };
  const elements = {
    form: document.querySelector('form'),
    modal: document.querySelector('#modal'),
    postsContainer: document.querySelector('.posts'),
    formFeedback: document.querySelector('.feedback'),
    feedsContainer: document.querySelector('.feeds'),
    modalTitle: document.querySelector('.modal-title'),
    modalBody: document.querySelector('.modal-body'),
    modalLink: document.querySelector('.modal .full-article'),
    formButton: document.querySelector('form button'),
    formInput: document.querySelector('form input'),
  };

  i18Instance.init({
    lng: 'ru',
    resources: { ru, en },
  }).then(() => {
    const watched = watch(state, elements, i18Instance);
    elements.form.addEventListener('submit', (e) => handleSubmit(e, watched));
    elements.postsContainer.addEventListener('click', (e) => {
      const { id } = e.target.dataset;
      if (!id) return;
      watched.modal.postId = id;
      watched.ui.viewedPosts.add(id);
    });

    setTimeout(() => {
      updateRss(watched);
    }, updatingInterval);
  });
};

export default app;
