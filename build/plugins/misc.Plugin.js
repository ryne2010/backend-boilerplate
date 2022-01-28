"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTitleCase = void 0;
// ****************************************************************
const toTitleCase = (phrase) => phrase
    .trim()
    .replace(/  +/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
exports.toTitleCase = toTitleCase;
//# sourceMappingURL=misc.Plugin.js.map