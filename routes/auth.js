const express = require("express");
const authController = require('../controllers/auth');
const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post('/admin-login', authController.adminLogin);
router.post('/admin-verify', authController.adminVerify);


router.post('/user-verification', authController.userVerification);
router.post('/create-task', authController.createTask);
router.post('/register-employee', authController.registerEmployee);
module.exports = router;
