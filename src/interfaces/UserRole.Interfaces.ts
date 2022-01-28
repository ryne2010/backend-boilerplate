// Modules
import { ObjectId, Decimal128 } from 'bson';

// ***************************************************************************************
export interface IUserRole {
  name: string;
  defaultRole: boolean;
  company: ObjectId;
  description: string;
  reGenLowTransactions: boolean;
  canDelegateCAP: boolean;
  canCreateBudget: boolean;
  canFundBudget: boolean;
  canSelfApprove: boolean;
  canApproveTransactions: boolean;
  canUpdateAutoBudget: boolean;
  canCreateAutoBudget: boolean;
  enforceStrictMerchant: boolean;
  maxBudgetFundAmount: Decimal128;
  maxTransactionApproval: Decimal128;
  singleTransactionAuthAmount: Decimal128;
  cycleType: string;
  cycleDay: string;
}
