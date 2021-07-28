import 'bootstrap/js/dist/modal';
import axios from 'axios';
import * as yup from 'yup';
import i18n from 'i18next';
import _ from 'lodash';
import watch from './view';
import { ru, en, yup as yupLocale } from '../locales';
import parse from './parser';

const updateInterval = 5000;

const validate = (value, addedUrls) => {
  const schema = yup.string().min(1).url().notOneOf(addedUrls);
  try {
    schema.validateSync(value);
    return null;
  } catch (e) {
    return e.message;
  }
};

const addProxy = (url) => `https://hexlet-allorigins.herokuapp.com/get?url=${encodeURIComponent(url)}&disableCache=true`;

const identifyError = (error) => {
  if (axios.isAxiosError(error)) return 'errors.network';
  if (_.has(error, 'isParsingError')) return 'errors.invalidRss';
  return 'errors.unknow';
};

const getRssData = (url) => (
  axios.get(url)
    .then((res) => {
      const { data: { contents } } = res;
      return contents;
    })
);

const addRss = (url, state, i18Instance) => {
  state.loadingProccess.status = 'loading';
  state.loadingProccess.successMsg = '';
  const fetchUrl = addProxy(url);
  getRssData(fetchUrl)
    .then((data) => {
      const { title, description, items: posts } = parse(data);
      const newFeed = { title, description, id: _.uniqueId() };
      const createdPosts = posts.map((elem) => ({ ...elem, feedId: newFeed.id, id: _.uniqueId() }));
      const newFeeds = [{ url, feed: newFeed }, ...state.feeds];
      const newPosts = [...state.posts, ...createdPosts];
      state.loadingProccess.status = 'success';
      state.loadingProccess.successMsg = i18Instance.t('added');
      state.feeds = newFeeds;
      state.posts = newPosts;
    })
    .catch((error) => {
      state.loadingProccess.status = 'failure';
      state.loadingProccess.error = i18Instance.t(identifyError(error));
    });
};

const handleSubmit = (e, state, i18Instance) => {
  e.preventDefault();
  const { value } = e.target.querySelector('input');
  state.form.status = 'validating';
  const addedUrls = state.feeds.map((feed) => feed.url);
  const validationError = validate(value.trim(), addedUrls);
  if (validationError) {
    state.form.status = 'invalid';
    state.form.error = i18Instance.t(validationError);
    return;
  }
  state.form.status = 'valid';
  state.form.error = '';
  addRss(value, state, i18Instance);
};

const findNewPosts = (existedPosts, posts) => {
  const keyed = (_.keyBy(existedPosts, 'guid'));
  return posts.filter((post) => !keyed[post.guid]);
};

const updateRss = (state) => {
  const promises = state.feeds.map(({ url, feed }) => {
    const fetchUrl = addProxy(url);
    return getRssData(fetchUrl).then((data) => {
      const { items: posts } = parse(data);
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
    }, updateInterval);
  });
};

const setViewed = (id, state) => {
  state.ui.viewedPosts.add(id);
};

const handleModal = (postId, state) => {
  state.modal.postId = postId;
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
      successMsg: '',
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
  const form = document.querySelector('form');
  const modal = document.querySelector('#modal');
  const postsContainer = document.querySelector('.posts');
  const elements = {
    form,
    modal,
    postsContainer,
    formFeedback: document.querySelector('.feedback'),
    feedsContainer: document.querySelector('.feeds'),
    modalTitle: document.querySelector('.modal-title'),
    modalBody: document.querySelector('.modal-body'),
    modalLink: document.querySelector('.modal .full-article'),
    formButton: form.querySelector('button'),
    formInput: form.querySelector('input'),
  };

  i18Instance.init({
    lng: 'ru',
    resources: { ru, en },
  }).then(() => {
    const watched = watch(state, elements, i18Instance);
    form.addEventListener('submit', (e) => handleSubmit(e, watched, i18Instance));
    modal.addEventListener('show.bs.modal', (e) => {
      setViewed(e.relatedTarget.dataset.id, watched);
      handleModal(e.relatedTarget.dataset.id, watched);
    });
    modal.addEventListener('hide.bs.modal', () => handleModal(null, watched));
    postsContainer.addEventListener('click', (e) => {
      const tagName = e.target.tagName.toLowerCase();
      if (tagName === 'button' || tagName === 'a') {
        const { id } = e.target.dataset;
        setViewed(id, watched);
      }
    });

    setTimeout(() => {
      updateRss(watched);
    }, 5000);
  });
};

export default app;
