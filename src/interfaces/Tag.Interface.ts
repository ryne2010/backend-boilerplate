import { ObjectId } from 'bson';

// Modules
export interface ITag {
  _id: ObjectId;
  user: ObjectId;
  company: ObjectId;
  displayName: string;
  global: boolean;
  required: boolean;
  tagType: 'fixed' | 'multi' | 'input';
  values: [
    {
      fieldName: string;
      fieldValue: string;
    }
  ];
}

// Sampple

const company = {
  _id: '12341kjfqjhofiuhdlskj',
  displayName: 'Divisions',
  tagType: 'multi',
  company: '34oifj8934u09r8que98q',
  values: [
    { fieldName: 'South Central', fieldValue: 'US-South-Central' },
    { fieldName: 'South East', fieldValue: 'US-South-East' },
  ],
};
