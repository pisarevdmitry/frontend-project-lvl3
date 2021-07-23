import 'bootstrap/js/dist/modal';
import axios from 'axios';
import * as yup from 'yup';
import i18n from 'i18next';
import _ from 'lodash';
import watch from './view';
import resources from '../locales';
import parse from './parser';

const validate = (value, addedUrls) => {
  const schema = yup.string().min(1).url().notOneOf(addedUrls);
  try {
    schema.validateSync(value);
    return null;
  } catch (e) {
    return e.message;
  }
};

const getRssData = (url) => {
  const fetchUrl = `https://hexlet-allorigins.herokuapp.com/get?url=${encodeURIComponent(url)}&disableCache=true`;
  return axios.get(fetchUrl)
    .then((res) => {
      const { data: { contents } } = res;
      return contents;
    });
};

const addRss = (url, state) => {
  state.formState = 'processing';
  const addedUrls = state.feeds.map((feed) => feed.fetchUrl);
  const validationError = validate(url.trim(), addedUrls);
  if (validationError) {
    state.formState = 'invalid';
    state.formMessage = { type: 'error', value: validationError };
    return;
  }

  getRssData(url)
    .then((data) => {
      state.formState = 'processed';
      if (!data) Promise.reject(new Error(i18n.t('invalidRss')));
      const { title, description, items: posts } = parse(data);
      const newFeed = { title, description, id: _.uniqueId() };
      const createdPosts = posts.map((elem) => ({ ...elem, feedId: newFeed.id, id: _.uniqueId() }));
      state.formMessage = { type: 'success', value: i18n.t('added') };
      state.formState = 'clear';
      const newFeeds = [{ fetchUrl: url, feed: newFeed }, ...state.feeds];
      const newPosts = [...state.posts, ...createdPosts];
      state.feeds = newFeeds;
      state.posts = newPosts;
    })
    .catch((error) => {
      if (axios.isAxiosError(error)) {
        state.formMessage = { type: 'error', value: i18n.t('networkError') };
        return;
      }
      if (error.isParsingError) {
        state.formMessage = { type: 'error', value: i18n.t('invalidRss') };
        return;
      }
      state.formMessage = { type: 'error', value: error.message };
    });
};

const findNewPosts = (existedPosts, posts) => {
  const keyed = (_.keyBy(existedPosts, 'guid'));
  return posts.filter((post) => !keyed[post.guid]);
};

const updateRss = (state) => {
  if (state.feeds.length === 0) {
    setTimeout(() => {
      updateRss(state);
    }, 5000);
    return;
  }

  const promises = state.feeds.map(({ fetchUrl, feed }) => (
    getRssData(fetchUrl).then((data) => {
      const { items: posts } = parse(data);
      const existingPosts = state.posts.filter((post) => post.feedId === feed.id);
      const newPosts = findNewPosts(existingPosts, posts);
      return newPosts.map((post) => ({ ...post, feedId: feed.id, id: _.uniqueId() }));
    }).catch(() => null)
  ));

  Promise.all(promises).then((data) => {
    const filtered = data.filter((el) => el !== null);
    const createdPosts = filtered.flat();
    if (createdPosts.length !== 0) {
      state.posts = [...state.posts, ...createdPosts];
    }
    setTimeout(() => {
      updateRss(state);
    }, 5000);
  });
};

const setViewed = (uiState, id) => {
  uiState.viewedPosts[id] = id;
};

const app = () => {
  i18n.init({
    lng: 'ru',
    resources,
  }).then(() => {
    yup.setLocale({
      mixed: {
        notOneOf: i18n.t('validate.exists'),
      },
      string: {
        min: i18n.t('validate.required'),
        url: i18n.t('validate.url'),
      },
    });
    const state = {
      mainLogic: {
        formMessage: null,
        formState: 'clear',
        feeds: [],
        posts: [],
      },
      ui: {
        viewedPosts: {},
      },
    };
    const handlers = {
      addRss,
      setViewed,
      updateRss,
    };
    watch(state, handlers);
  });
};

export default app;
