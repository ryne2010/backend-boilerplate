// Modules
import { Decimal128 } from 'bson';
import Decimal from 'decimal.js';

// Models / Interfaces
import { IComdataCardEvent, ICardTransaction } from '../interfaces';

// ****************************************************************
//
/**
 * @summary This funciton takes into account when a card is pre-authed for $1 then subsequently charged for the full amount, both transactions post Equaling the purchase total
 *
 * @param event
 * @param transaction
 * @returns
 */
export const checkPostedPreAuth = (
  event: IComdataCardEvent,
  transaction: ICardTransaction
): { postedAmount: string; decimalPostedAmount: Decimal128 } => {
  let postedAmount;
  let decimalPostedAmount;
  if (!transaction.postedAmount) {
    postedAmount = event.postedAmount.toString();
    decimalPostedAmount = Decimal128.fromString(event.postedAmount.toString());
    return { postedAmount, decimalPostedAmount };
  }
  postedAmount = new Decimal(event.postedAmount.toString())
    .plus(transaction.postedAmount)
    .toString();
  decimalPostedAmount = Decimal128.fromString(
    new Decimal(event.postedAmount.toString())
      .plus(transaction.postedAmount)
      .toString()
  );
  return { postedAmount, decimalPostedAmount };
};

/**
 *
 * @param event
 * @returns
 */
export const checkIfCardCheck = (event: IComdataCardEvent): boolean => {
  // Also same code in an exports in this file checkIfReGenEligible
  // Know card check amounts
  const preAuthAmounts = [1, 0.01, 0];
  const isCardCheck =
    preAuthAmounts.includes(parseFloat(event.preAuthAmount.toString())) &&
    !preAuthAmounts.includes(parseFloat(event.postedAmount.toString()));

  return isCardCheck;
};
