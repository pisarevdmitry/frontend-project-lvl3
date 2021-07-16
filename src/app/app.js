import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/js/dist/modal';
import axios from 'axios';
import * as yup from 'yup';
import i18n from 'i18next';
import _ from 'lodash';
import watch from './view';
import resources from '../locales';

const validate = (value, state) => {
  const addedUrls = state.addedUrls.map((url) => url.link);
  const schema = yup.string().required().url().notOneOf(addedUrls);
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
  const channel = doc.querySelector('channel');
  if (!channel) throw new Error(i18n.t('invalidRss'));
  const posts = Array.from(doc.querySelectorAll('item'));
  const mapped = posts.map((post) => (
    {
      title: post.querySelector('title').textContent,
      description: post.querySelector('description').textContent,
      link: post.querySelector('link').textContent,
      pubDate: new Date(post.querySelector('pubDate').textContent),
      guid: post.querySelector('guid').textContent,
    }
  ));

  return {
    feed: {
      title: channel.querySelector('title').textContent,
      description: channel.querySelector('description').textContent,
    },
    posts: mapped,
  };
};

const getRssData = (url) => {
  const fetchUrl = `https://hexlet-allorigins.herokuapp.com/get?url=${encodeURIComponent(url)}&disableCache=true`;
  return axios.get(fetchUrl)
    .then((res) => {
      const { data: { contents } } = res;
      return contents;
    }).catch(() => Promise.reject(new Error(i18n.t('networkError'))));
};

const addRss = (e, state) => {
  e.preventDefault();
  state.formState = 'processed';
  const { value } = e.target.querySelector('input');
  const validationError = validate(value, state);
  if (validationError) {
    state.formState = 'invalid';
    state.formMessage = { type: 'error', value: validationError };
    return;
  }
  getRssData(value)
    .then((data) => {
      state.formState = 'ready';
      if (!data) Promise.reject(new Error(i18n.t('invalidRss')));
      const { feed, posts } = parseRss(data);
      e.target.reset();
      const feedId = _.uniqueId();
      state.addedUrls.push({ link: value, feedId });
      feed.id = feedId;
      const createdPosts = posts.map((elem) => ({ ...elem, feedId, id: _.uniqueId() }));
      state.formMessage = { type: 'success', value: i18n.t('added') };
      const newFeeds = [feed, ...state.feeds];
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
  if (state.addedUrls.length === 0) {
    setTimeout(() => {
      updateRss(state);
    }, 5000);
    return;
  }
  const promises = state.addedUrls.map(({ link, feedId }) => (
    getRssData(link).then((data) => ({ feedId, data })).catch(() => null)
  ));
  Promise.all(promises).then((data) => {
    const filtered = data.filter((el) => el);
    const processed = filtered.map((el) => {
      const parsedData = parseRss(el.data);
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
      formState: 'ready',
      feeds: [],
      posts: [],
    };
    const watched = watch(state);
    form.addEventListener('submit', (e) => addRss(e, watched));
    setTimeout(() => {
      updateRss(watched);
    }, 5000);
  });
};

export default app;
