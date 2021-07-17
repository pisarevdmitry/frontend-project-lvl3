import i18n from 'i18next';

const parseItem = (item) => (
  Array.from(item.children).reduce((acc, child) => {
    const name = child.tagName;
    acc[name] = child.textContent;
    return acc;
  }, {})
);

const parseRss = (rss) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rss, 'application/xml');
  const channel = doc.querySelector('channel');
  if (!channel) throw new Error(i18n.t('invalidRss'));
  const result = Array.from(channel.children).reduce((acc, child) => {
    const name = child.tagName;
    if (name === 'item') {
      const item = parseItem(child);
      acc.items = acc.items ? [...acc.items, item] : [item];
    } else {
      acc[name] = child.textContent;
    }
    return acc;
  }, {});
  return result;
};

export default parseRss;
