// Modules
import { CompaniesController } from '@api/Company.Controller';
import { Router } from 'express';

const router = Router({ mergeParams: true });
CompaniesController.getCompany;

// DYNAMIC ROUTES
router.route('/:companyId').get(CompaniesController.getCompany);

export default router;
