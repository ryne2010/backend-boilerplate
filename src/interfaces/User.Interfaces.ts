// Modules
import { ObjectId, Decimal128 } from 'bson';

// ***************************************************************************************
export interface IUser {
  id: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  auth0Id?: string;
  auth0Tenant?: string;
  sessions?: Record<string, unknown>[];
  active?: boolean;
  status?: 'Active' | 'Deleted' | 'Blocked' | 'Pending Activation';
  firstName?: string;
  lastName?: string;
  identities?: Record<string, unknown>[];
  primaryPhysicalCard?: Record<string, unknown>[];
  name?: string;
  lname?: string;
  companyName?: string;
  mobilePhoneNumber?: string;
  autoBudget?: Record<string, unknown>[];
  userRole?: ObjectId;
  currentRoleName?: string;
  roleDetails?: Record<string, unknown>;
  cardHolderEmail?: string;
  validatedEmail?: boolean;
  avatarLink?: string;
  alertServiceFlag?: boolean;
  userType?: 'user' | 'companyAdmin' | 'superUser' | 'admin';
  averageDailySpend?: Decimal128;
  invitationLink?: string;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  company?: ObjectId;
  notifications?: Record<string, unknown>;
  email?: string;
}
