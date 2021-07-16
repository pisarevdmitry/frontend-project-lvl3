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
  cardBody.innerHTML = `<h2 class="card-title h4">${content}</h2>`;
  card.append(cardBody);
  return card;
};

const renderFeedback = (feedbackContainer, { type, value }) => {
  if (type === 'error') {
    feedbackContainer.classList.remove('text-success');
    feedbackContainer.classList.add('text-danger');
  } else {
    feedbackContainer.classList.remove('text-danger');
    feedbackContainer.classList.add('text-success');
  }
  feedbackContainer.textContent = value;
};

const renderFeeds = (feeds) => {
  const feedsContainer = document.querySelector('.feeds');
  feedsContainer.innerHTML = '';
  const card = createCard('Фиды');
  const listGroup = createElem('ul', 'list-group', 'border-0', 'rounded-0');
  feeds.forEach((feed) => {
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
const renderPosts = (posts, ui) => {
  const postsContainer = document.querySelector('.posts');
  postsContainer.innerHTML = '';
  const card = createCard('Посты');
  const listGroup = createElem('ul', 'list-group', 'border-0', 'rounded-0');
  const sorted = _.orderBy(posts, 'pubDate', 'desc');
  sorted.forEach((post) => {
    const item = createElem('li', 'list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
    const linkClass = ui.visitedLinks[post.id] ? 'fw-normal' : 'fw-bold';
    const link = createElem('a', linkClass);
    link.dataset.id = post.id;
    link.setAttribute('src', post.link);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    link.setAttribute('role', 'link');
    link.textContent = post.title;
    const button = createElem('button', 'btn', 'btn-outline-primary', 'btn-sm');
    button.setAttribute('type', 'button');
    button.dataset.id = post.id;
    button.dataset.bsToggle = 'modal';
    button.dataset.bsTarget = '#modal';
    button.textContent = 'Просмотр';
    item.append(link);
    item.append(button);
    listGroup.append(item);
  });
  card.append(listGroup);
  postsContainer.append(card);
};
const updateForm = (form, state) => {
  const input = form.querySelector('input');
  const button = form.querySelector('button');
  switch (state) {
    case 'ready': {
      button.removeAttribute('disabled');
      input.removeAttribute('readonly');
      input.classList.remove('is-invalid');
      break;
    }
    case 'processed': {
      button.setAttribute('disabled', null);
      input.setAttribute('readonly', null);
      break;
    }
    case 'invalid': {
      button.removeAttribute('disabled');
      input.removeAttribute('readonly');
      input.classList.add('is-invalid');
      break;
    }
    default:
      throw new Error('unknow state');
  }
};

const renderModal = (e, state, uiState) => {
  const title = e.target.querySelector('.modal-title');
  const body = e.target.querySelector('.modal-body');
  const link = e.target.querySelector('.full-article');
  const { id } = e.relatedTarget.dataset;
  uiState.visitedLinks[id] = id;
  const post = _.find(state.posts, (el) => el.id === id);
  title.textContent = post.title;
  body.textContent = post.description;
  link.setAttribute('href', post.link);
};

const updatePostHeader = (id) => {
  const header = document.querySelector(`a[data-id="${id}"]`);
  header.classList.remove('fw-bold');
  header.classList.add('fw-normal');
};

const watch = (state) => {
  const form = document.querySelector('form');
  const formFeedback = document.querySelector('.feedback');
  const modal = document.querySelector('#modal');
  const ui = {
    visitedLinks: {},
  };
  const watchedUi = onChange(ui, (path, value) => {
    if (path.includes('visitedLinks')) {
      updatePostHeader(value);
    }
  });
  const watched = onChange(state, (path, value) => {
    switch (path) {
      case 'formMessage': {
        renderFeedback(formFeedback, value);
        break;
      }
      case 'formState': {
        updateForm(form, value);
        break;
      }
      case 'feeds': {
        renderFeeds(value);
        break;
      }
      case 'posts': {
        renderPosts(value, watchedUi);
        break;
      }
      default:
        break;
    }
  });
  modal.addEventListener('show.bs.modal', (e) => renderModal(e, watched, watchedUi));
  return watched;
};

export default watch;
