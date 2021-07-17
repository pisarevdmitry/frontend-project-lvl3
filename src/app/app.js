import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/js/dist/modal';
import axios from 'axios';
import * as yup from 'yup';
import i18n from 'i18next';
import _ from 'lodash';
import watch from './view';
import resources from '../locales';
import parse from './parser';

const validate = (value, state) => {
  const addedUrls = state.feeds.map((feed) => feed.fetchUrl);
  const schema = yup.string().required().url().notOneOf(addedUrls);
  try {
    schema.validateSync(value);
    return null;
  } catch (e) {
    return e.message;
  }
};

const parseRssData = (rss) => {
  const data = parse(rss);
  const items = data.items.map((item) => ({
    title: item.title,
    description: item.description,
    link: item.link,
    pubDate: new Date(item.pubDate),
    guid: item.guid,
  }));
  const feed = {
    title: data.title,
    description: data.description,
  };
  return { feed, posts: items };
};

const getRssData = (url) => {
  const fetchUrl = `https://hexlet-allorigins.herokuapp.com/get?url=${encodeURIComponent(url)}&disableCache=true`;
  return axios.get(fetchUrl)
    .then((res) => {
      const { data: { contents } } = res;
      return contents;
    }).catch(() => Promise.reject(new Error(i18n.t('networkError'))));
};

const addRss = (url, state) => {
  state.formState = 'processing';
  const validationError = validate(url, state);
  if (validationError) {
    state.formState = 'invalid';
    state.formMessage = { type: 'error', value: validationError };
    return;
  }

  getRssData(url)
    .then((data) => {
      state.formState = 'processed';
      if (!data) Promise.reject(new Error(i18n.t('invalidRss')));
      const { feed, posts } = parseRssData(data);
      const feedId = _.uniqueId();
      feed.id = feedId;
      const createdPosts = posts.map((elem) => ({ ...elem, feedId, id: _.uniqueId() }));
      state.formMessage = { type: 'success', value: i18n.t('added') };
      state.formState = 'empty';
      const newFeeds = [{ fetchUrl: url, feed }, ...state.feeds];
      const newPosts = [...state.posts, ...createdPosts];
      state.feeds = newFeeds;
      state.posts = newPosts;
    })
    .catch((error) => {
      state.formMessage = { type: 'error', value: error.message };
    });
};

const findNewPosts = (state, feedId, posts) => {
  const existedPosts = state.posts.filter((post) => post.feedId === feedId);
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
    getRssData(fetchUrl).then((data) => ({ feedId: feed.id, data })).catch(() => null)
  ));
  Promise.all(promises).then((data) => {
    const filtered = data.filter((el) => el);
    const processed = filtered.map((el) => {
      const parsedData = parseRssData(el.data);
      const newPosts = findNewPosts(state, el.feedId, parsedData.posts);
      return newPosts.map((post) => ({ ...post, feedId: el.feedId, id: _.uniqueId() }));
    });
    const createdPosts = processed.flat();
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
        required: i18n.t('validate.required'),
        url: i18n.t('validate.url'),
      },
    });
    const state = {
      mainLogic: {
        formMessage: null,
        formState: 'ready',
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
