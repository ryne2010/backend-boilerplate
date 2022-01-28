// Interfaces
import { IBudgetGroup } from '../interfaces';

// ****************************************************************
/**
 * @summary This function checks for required budget Fields
 *
 * @param budgetGroup
 * @returns
 */
export const checkReqBudgetFields = (
  budgetGroup: IBudgetGroup
): {
  costCode: boolean;
  receipt: boolean;
} => {
  const requiredActions = {
    costCode: false,
    receipt: budgetGroup.requireReceipt || false,
    //description: budgetGroup.requireDescription || false,
  };

  if (budgetGroup.costCodes && budgetGroup.costCodes.length > 0) {
    requiredActions.costCode = true;
  }
  return requiredActions;
};
