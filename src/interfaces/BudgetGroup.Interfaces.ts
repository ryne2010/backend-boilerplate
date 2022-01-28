// Modules
import { ObjectId, Decimal128 } from 'bson';

// ***************************************************************************************
export interface IAutoBudget {
  _id: ObjectId;
}
export interface IAutoBudgetUser {
  _id: ObjectId;
  card: ObjectId;
  firstName: string;
  lastName: string;
  avatarLink: string;
  lastFour: string;
}

export interface ITeamMember {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  avatarLink: string;
}

export interface IBudgetGroup {
  _id: ObjectId;
  createdAt: Date;
  amount: string;
  updatedAt?: Date;
  active?: boolean;
  userTransaction?: ObjectId;
  autoBudgetMember?: boolean;
  costCodes?: Record<string, unknown>[];
  requireReceipt?: boolean;
  enrolledAutoBudgetCards?: string[];
  enrolledAutoBudgetUsers?: string[];
  enrolledAutoBudgetUserDetails?: IAutoBudgetUser[];
  state?:
    | 'CREATED-INCOMPLETE'
    | 'PENDING-APPROVAL'
    | 'FUNDED'
    | 'FUNDED-DISABLED'
    | 'APPROVER-REJECTED'
    | 'REVISE-RESUBMIT'
    | 'ARCHIVED'
    | 'DELETED';
  funded?: boolean;
  refreshIntervalValue?:
    | 'Daily'
    | 'Monthly'
    | 'Weekly'
    | 'One-Time'
    | 'Bi-Weekly';
  refreshIntervalDate?: Date;
  gcpSchedulerId?: string;
  lastGCPSchedulerUpdate?: Date;
  tagA?: string;
  tagB?: string;
  tagC?: string;
  name?: string;
  description?: string;
  approver?: ObjectId;
  fuelBudget?: boolean;
  company?: ObjectId;
  budgetOwner?: ITeamMember;
  budgetOwnerName?: string;
  approverName?: string;
  selfApprove?: boolean;
  approvers?: ITeamMember[];
  members?: ITeamMember[];
  decimalAmount?: Decimal128;
  remainingBudget?: Decimal128;
  pendingCharges?: Decimal128;
  pendingApproval?: Decimal128;
  address?: string;
  location?: {
    type: string;
    coordinates: Decimal128[];
    formattedAddress: string;
    street: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
  };
  approveBudgetGroupToken?: string;
  approveBudgetGroupTokenExpire?: Date;
  approverAvatarLink?: string;
  transactionsAuthorized?: ObjectId[];
  transactionsPosted?: ObjectId[];
  transactionsCredited?: ObjectId[];
  cardEventIds?: ObjectId[];
}
