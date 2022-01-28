"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Modules
const Company_Controller_1 = require("@api/Company.Controller");
const express_1 = require("express");
const router = (0, express_1.Router)({ mergeParams: true });
Company_Controller_1.CompaniesController.getCompany;
// DYNAMIC ROUTES
router.route('/:companyId').get(Company_Controller_1.CompaniesController.getCompany);
exports.default = router;
//# sourceMappingURL=Company.Routes.js.map