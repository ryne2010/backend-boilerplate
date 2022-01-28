// Modules
import { ObjectId, Decimal128, Int32 } from 'bson';

import { IComdataCardEvent } from './index';

// ***************************************************************************************
export interface ICardTransaction {
  _id: ObjectId;
  amount: string;
  approver: ObjectId;
  approverAvatarLink?: string;
  approverName?: string;
  budgetGroup?: ObjectId;
  budgetGroupName?: string;
  card: ObjectId;
  cardEventIds?: string[];
  company: ObjectId;
  createdAt: Date;
  decimalAmount?: Decimal128;
  decimalPreAuthAmount?: Decimal128;
  delegatedPurchase?: boolean;
  displayDate?: Date;
  event: IComdataCardEvent[];
  flexPay?: boolean;
  fuel?: boolean;
  idMatchNumber?: string[];
  mcc?: Int32;
  mccArray: Int32[];
  mccGroup?: Int32;
  merchantName?: string;
  preAuthAmount?: string;
  reGen?: boolean;
  reGenIfEligible?: boolean;
  receiptUploaded?: boolean;
  requiredActions?: { costCode: boolean; receipt: boolean };
  state?:
    | 'CREATED-INCOMPLETE'
    | 'PENDING-APPROVAL'
    | 'PENDING-SWIPE'
    | 'AUTHORIZED'
    | 'APPROVED'
    | 'COMPLETE'
    | 'DELETED'
    | 'CREDIT';
  tagA?: string;
  tagB?: string;
  tagC?: string;
  transactionSwipedAt?: Date;
  transactionType?:
    | 'authorization'
    | 'authorizationRequest'
    | 'createAPurchase'
    | 'createAPurchaseApproval'
    | 'autoBudget'
    | 'Credit';
  user?: ObjectId;
  userAvatarLink?: string;
  userFirstName?: string;
  userLastName?: string;
  userStatus?:
    | 'Complete'
    | 'Charge Pending'
    | 'Awaiting Approval'
    | 'Auto Approved'
    | 'Approved'
    | 'Credit'
    | 'Archived';
  verifiedMerchant?: boolean;
  __v: Int32;
  costCode?: { costCode: string; description: string };
  network?: 'MASTERCARD' | 'VISA' | 'DISCOVER' | 'AMEX';
  notifyApproverEmail?: boolean;
  notifyApproverSMS?: boolean;
  onlinePurchase?: boolean;
  receiptURL?: string[];
  updatedAt?: Date;
  decimalPostedAmount?: Decimal128;
  mccState: Record<string, Int32>;
  postedAmount?: string;
  transactionPostedAt?: Date;
  status: { isPDFConverting: boolean };

  matchScore?: any;
  delegatedUserId?: ObjectId;
  delegatedUserName?: string;
  description?: string;
  creditAmount?: string;
  decimalCreditAmount?: Decimal128;
  address?: string;
  location?: unknown;
  merchant?: ObjectId;
  transactionRiskScore?: Int32;
  accountRiskScore?: Decimal128;
  cardAcceptor?: Record<string, unknown>;
  pos?: Record<string, unknown>;
  userTransaction?: ObjectId;
  approveTransactionToken?: string;
  approveTransactionTokenExpire?: Date;
  reversalAt?: Date;
  reversalFlag?: string;
  approvalCode?: string;
}
