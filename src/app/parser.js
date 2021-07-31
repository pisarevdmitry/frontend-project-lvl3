const parseItem = (item) => {
  const itemTitle = item.querySelector('title');
  const itemDescription = item.querySelector('description');
  const itemLink = item.querySelector('link');
  const itemPubDate = item.querySelector('pubDate');
  const itemGuId = item.querySelector('guid');
  return {
    title: itemTitle.textContent,
    description: itemDescription.textContent,
    link: itemLink.textContent,
    pubDate: new Date(itemPubDate.textContent),
    guid: itemGuId.textContent,
  };
};

const parseRss = (rss) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rss, 'application/xml');
  const error = doc.querySelector('parsererror');
  if (error) {
    const parsingError = new Error(error.textContent);
    parsingError.isParsingError = true;
    throw parsingError;
  }
  const channelTitle = doc.querySelector('channel > title');
  const channelDescription = doc.querySelector('channel > description');
  const channelItems = doc.querySelectorAll('channel > item');
  const parsedItems = Array.from(channelItems).map(parseItem);
  return {
    title: channelTitle.textContent,
    description: channelDescription.textContent,
    items: parsedItems,
  };
};

export default parseRss;
