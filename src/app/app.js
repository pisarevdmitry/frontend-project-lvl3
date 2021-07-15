import axios from 'axios';
import * as yup from 'yup';
import i18n from 'i18next';
import _ from 'lodash';
import watch from './view';
import resources from '../locales';

const validate = (value, state) => {
  const schema = yup.string().required().url().notOneOf(state.addedUrls);
  try {
    schema.validateSync(value);
    return null;
  } catch (e) {
    return e.message;
  }
};

const parseRss = (rss) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rss, 'application/xml');
  const feedId = _.uniqueId();
  const posts = Array.from(doc.querySelectorAll('item'));
  const mapped = posts.map((post) => (
    {
      feedId,
      id: _.uniqueId(),
      title: post.querySelector('title').textContent,
      description: post.querySelector('description').textContent,
      link: post.querySelector('link'),
      pubDate: new Date(post.querySelector('pubDate').textContent),
    }
  ));

  return {
    feed: {
      id: feedId,
      title: doc.querySelector('channel title').textContent,
      description: doc.querySelector('channel description').textContent,
    },
    posts: mapped,
  };
};

const getRssData = (url) => {
  const fetchUrl = `https://hexlet-allorigins.herokuapp.com/get?url=${encodeURIComponent(url)}`;
  return axios.get(fetchUrl)
    .then(({ data }) => {
      const { contents, status: { http_code: statusCode } } = data;
      if (statusCode !== 200) {
        return Promise.reject(new Error(i18n.t('networkError')));
      }
      return contents;
    });
};

const addRss = (e, state) => {
  e.preventDefault();
  const { value } = e.target.url;
  const validationError = validate(value, state);
  if (validationError) {
    state.formState = 'invalid';
    state.formMessage = { type: 'error', value: validationError };
    return;
  }
  state.formState = 'valid';
  getRssData(value)
    .then((data) => {
      state.addedUrls.push(value);
      e.target.reset();
      const parsedData = parseRss(data);
      state.formMessage = { type: 'success', value: i18n.t('added') };
      const newFeeds = [parsedData.feed, ...state.feeds];
      const newPosts = [...state.posts, ...parsedData.posts];
      state.feeds = newFeeds;
      state.posts = newPosts;
    })
    .catch((error) => {
      state.formMessage = { type: 'error', value: error.message };
    });
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
    const form = document.querySelector('form');
    const state = {
      formMessage: null,
      addedUrls: [],
      formState: 'valid',
      feeds: [],
      posts: [],
    };
    const watched = watch(state);
    form.addEventListener('submit', (e) => addRss(e, watched));
  });
};

export default app;
