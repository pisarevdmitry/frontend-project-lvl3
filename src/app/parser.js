const parseItem = (item) => ({
  title: item.querySelector('title').textContent,
  description: item.querySelector('description').textContent,
  link: item.querySelector('link').textContent,
  pubDate: new Date(item.querySelector('pubDate').textContent),
  guid: item.querySelector('guid').textContent,
});

const parseRss = (rss) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rss, 'application/xml');
  const error = doc.querySelector('parsererror');
  if (error) {
    const parsingError = new Error(error.textContent);
    parsingError.isParsingError = true;
    throw parsingError;
  }
  const channelTitle = doc.querySelector('channel > title').textContent;
  const channelDescription = doc.querySelector('channel > description').textContent;
  const channelItems = doc.querySelectorAll('channel > item');
  const parsedItems = Array.from(channelItems).map(parseItem);
  return {
    title: channelTitle,
    description: channelDescription,
    items: parsedItems,
  };
};

export default parseRss;
