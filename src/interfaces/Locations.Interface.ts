// Modules

import { ObjectId } from 'bson';

export interface ICategories {
  _id: ObjectId;
  vendorId: ObjectId;
  location: {
    type: 'Point';
    coordinates: [number, number];
    formattedAddress: string;
    street: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
  };
  displayName: string;
  // The Approved Auth Data is filled from any approved vendors
  approvedAuthData?: [
    {
      //vendorId: ObjectId;
      authorization: {
        acceptLocation: string;
        vendorName: string;
        vendorCity: string;
        vendorState: string;
        mcc: number;
        mccDescription: string;
      };
      post?: {
        acceptLocation: string;
        vendorName: string;
        vendorCity: string;
        vendorState: string;
        mcc: number;
        mccDescription: string;
      };
    }
  ];
}
