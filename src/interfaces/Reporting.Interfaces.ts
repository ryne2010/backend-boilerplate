// Interfaces
import { IBudgetGroup, ICardTransaction, ICompany, IUser, IUserRole } from '.';

// ***************************************************************************************

export interface IValidateErrorJSON {
  message: 'Validation failed';
  details: { [name: string]: unknown };
}

export interface IQueryResults extends Record<string, any> {
  results:
    | Record<string, string | number>[]
    | IBudgetGroup[]
    | ICompany[]
    | ICardTransaction[]
    | IUser[]
    | IUserRole[]
    | null;
  budgets?: string[];
}

export interface IQueryParams extends Record<string, any> {
  periodStartDate: string;
  periodEndDate: string;
  userId?: string;
  companyId?: string;
}

export interface IReportingResponse extends Record<string, any> {
  success: boolean;
  data: IQueryResults | null;
  message?: string;
  error?: string;
  details?: Record<string, any>;
}

export interface IAuth0User {
  'https://d/vndx/cocompanyId': string;
  'https://d/vndx/covendrixId': string;
  'https://d/vndx/coemail': string;
  'https://d/vndx/coidentities': string[];
  iss: string;
  sub: string;
  aud: string[];
  iat: number;
  exp: number;
  azp: string;
  scope: string;
  permissions: string[];
  companyId?: string;
  userId?: string;
}
