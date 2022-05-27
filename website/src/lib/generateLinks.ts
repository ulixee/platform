import kebabCase from 'lodash.kebabcase';

export default function generateLinks(linkGroups: any[], pathPrefix: string, editingUrl: string): INavGroup[] {
  const allLinks: INavGroup[] = [];
  for (const group of linkGroups) {
    const link = `${pathPrefix}/${kebabCase(group.title)}`;
    const editBaseLink = `${editingUrl}/${group.title}`;
    const navGroup: INavGroup = {
      title: group.title,
      link,
      items: group.items.map((x: any) => itemToNavLink(link, editBaseLink, x)),
    };
    allLinks.push(navGroup);
  }
  return allLinks;
}

function itemToNavLink(groupLink: string, editBaseLink: string, item: INavLink | string): INavLink {
  const title = typeof item === 'string' ? item : item.title;
  const newBaseEditLink = `${editBaseLink}/${title}`;
  const newItem: INavLink = {
    title,
    link: `${groupLink}/${kebabCase(title)}`,
    editLink: `${newBaseEditLink}.md`,
  };
  const nestedItems = (item as INavLink).items;
  if (nestedItems) {
    newItem.items = nestedItems.map(x => itemToNavLink(newItem.link, newBaseEditLink, x));
  }
  return newItem;
}

export interface INavGroup {
  title: string;
  link: string;
  items: INavLink[];
}

export interface INavLink {
  title: string;
  link: string;
  editLink: string;
  items?: INavLink[];
}
