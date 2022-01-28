"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIfCardCheck = exports.checkPostedPreAuth = void 0;
// Modules
const bson_1 = require("bson");
const decimal_js_1 = __importDefault(require("decimal.js"));
// ****************************************************************
//
/**
 * @summary This funciton takes into account when a card is pre-authed for $1 then subsequently charged for the full amount, both transactions post Equaling the purchase total
 *
 * @param event
 * @param transaction
 * @returns
 */
const checkPostedPreAuth = (event, transaction) => {
    let postedAmount;
    let decimalPostedAmount;
    if (!transaction.postedAmount) {
        postedAmount = event.postedAmount.toString();
        decimalPostedAmount = bson_1.Decimal128.fromString(event.postedAmount.toString());
        return { postedAmount, decimalPostedAmount };
    }
    postedAmount = new decimal_js_1.default(event.postedAmount.toString())
        .plus(transaction.postedAmount)
        .toString();
    decimalPostedAmount = bson_1.Decimal128.fromString(new decimal_js_1.default(event.postedAmount.toString())
        .plus(transaction.postedAmount)
        .toString());
    return { postedAmount, decimalPostedAmount };
};
exports.checkPostedPreAuth = checkPostedPreAuth;
/**
 *
 * @param event
 * @returns
 */
const checkIfCardCheck = (event) => {
    // Also same code in an exports in this file checkIfReGenEligible
    // Know card check amounts
    const preAuthAmounts = [1, 0.01, 0];
    const isCardCheck = preAuthAmounts.includes(parseFloat(event.preAuthAmount.toString())) &&
        !preAuthAmounts.includes(parseFloat(event.postedAmount.toString()));
    return isCardCheck;
};
exports.checkIfCardCheck = checkIfCardCheck;
//# sourceMappingURL=CardTransaction.Plugin.js.map