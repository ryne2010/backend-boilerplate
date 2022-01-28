"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkReqBudgetFields = void 0;
// ****************************************************************
/**
 * @summary This function checks for required budget Fields
 *
 * @param budgetGroup
 * @returns
 */
const checkReqBudgetFields = (budgetGroup) => {
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
exports.checkReqBudgetFields = checkReqBudgetFields;
//# sourceMappingURL=BudgetGroup.Plugin.js.map