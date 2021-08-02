import onChange from 'on-change';
import _ from 'lodash';

const createElem = (elemName, ...classes) => {
  const elem = document.createElement(elemName);
  elem.classList.add(...classes);
  return elem;
};

const createCard = (content) => {
  const card = createElem('div', 'card', 'border-0');
  const cardBody = createElem('div', 'card-body');
  const cardTitle = createElem('h2', 'card-title', 'h4');
  cardTitle.textContent = content;
  cardBody.append(cardTitle);
  card.append(cardBody);
  return card;
};

const renderFeedback = ({ formFeedback }, type, value, i18Instance) => {
  if (type === 'error') {
    formFeedback.classList.remove('text-success');
    formFeedback.classList.add('text-danger');
  } else {
    formFeedback.classList.remove('text-danger');
    formFeedback.classList.add('text-success');
  }
  formFeedback.textContent = i18Instance.t(value);
};

const handleFeeds = ({ feedsContainer }, { feeds }, i18n) => {
  feedsContainer.innerHTML = '';
  const card = createCard(i18n.t('feeds'));
  const listGroup = createElem('ul', 'list-group', 'border-0', 'rounded-0');
  feeds.forEach(({ feed }) => {
    const item = createElem('li', 'list-group-item', 'border-0', 'border-end-0');
    const title = createElem('h3', 'h6', 'm-0');
    const desc = createElem('p', 'm-0', 'small', 'text-black-50');
    title.textContent = feed.title;
    desc.textContent = feed.description;
    item.append(title);
    item.append(desc);
    listGroup.append(item);
  });
  card.append(listGroup);
  feedsContainer.append(card);
};

const handlePosts = ({ postsContainer }, { posts, ui: { viewedPosts } }, i18n) => {
  postsContainer.innerHTML = '';
  const card = createCard(i18n.t('posts'));
  const listGroup = createElem('ul', 'list-group', 'border-0', 'rounded-0');
  const sorted = _.orderBy(posts, 'pubDate', 'desc');
  sorted.forEach((post) => {
    const item = createElem('li', 'list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
    const linkClass = viewedPosts.has(post.id) ? 'fw-normal' : 'fw-bold';
    const link = createElem('a', linkClass);
    link.dataset.id = post.id;
    link.setAttribute('href', post.link);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    link.setAttribute('role', 'link');
    link.textContent = post.title;
    const button = createElem('button', 'btn', 'btn-outline-primary', 'btn-sm');
    button.setAttribute('type', 'button');
    button.dataset.id = post.id;
    button.dataset.testid = post.id;
    button.dataset.bsToggle = 'modal';
    button.dataset.bsTarget = '#modal';
    button.textContent = i18n.t('view');
    item.append(link);
    item.append(button);
    listGroup.append(item);
  });
  card.append(listGroup);
  postsContainer.append(card);
};

const handleForm = (elements, { form }, i18n) => {
  const { formInput: input, formButton: button } = elements;
  switch (form.status) {
    case 'validating': {
      button.setAttribute('disabled', null);
      input.setAttribute('readonly', null);
      break;
    }
    case 'invalid': {
      button.removeAttribute('disabled');
      input.removeAttribute('readonly');
      input.classList.add('is-invalid');
      renderFeedback(elements, 'error', form.error, i18n);
      break;
    }
    case 'valid': {
      button.removeAttribute('disabled');
      input.removeAttribute('readonly');
      input.classList.remove('is-invalid');
      break;
    }
    default:
      throw new Error('unknow state');
  }
};

const handleLoadingStatus = (elements, { loading }, i18n) => {
  const { form, formInput: input, formButton: button } = elements;
  switch (loading.status) {
    case 'loading': {
      button.setAttribute('disabled', null);
      input.setAttribute('readonly', null);
      break;
    }
    case 'failure': {
      button.removeAttribute('disabled');
      input.removeAttribute('readonly');
      renderFeedback(elements, 'error', loading.error, i18n);
      break;
    }
    case 'success': {
      button.removeAttribute('disabled');
      input.removeAttribute('readonly');
      renderFeedback(elements, 'success', 'added', i18n);
      form.reset();
      input.focus();
      break;
    }
    default:
      throw new Error('unknow state');
  }
};

const handleModal = ({ modalTitle, modalBody, modalLink }, { posts, modal }) => {
  const post = _.find(posts, (el) => el.id === modal.postId);
  modalTitle.textContent = post.title;
  modalBody.textContent = post.description;
  modalLink.setAttribute('href', post.link);
};

const watch = (state, elements, i18Instance) => {
  const mapping = {
    feeds: handleFeeds,
    posts: handlePosts,
    form: handleForm,
    loading: handleLoadingStatus,
    'modal.postId': handleModal,
    'ui.viewedPosts': handlePosts,
  };
  return onChange(state, (path) => {
    if (!_.has(mapping, path)) return;
    mapping[path](elements, state, i18Instance);
  });
};

export default watch;
