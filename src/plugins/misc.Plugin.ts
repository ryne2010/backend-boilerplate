// ****************************************************************
export const toTitleCase = (phrase: string): string =>
  phrase
    .trim()
    .replace(/  +/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
