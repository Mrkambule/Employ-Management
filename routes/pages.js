const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
    res.render("index"); // Remove the leading slash
});

router.get("/register", (req, res) => {
    res.render("register"); // Remove the leading slash
});

router.get("/login", (req, res) => {
   res.render("login"); // Remove the leading slash
}); 

router.get("/admin-login", (req, res) => {
    res.render("admin-login"); // Remove the leading slash
 }); 

 router.get("/admin-verify", (req, res) => {
    res.render("admin-verify"); // Remove the leading slash
 });

 router.get("/admin-home", (req, res) => {
    res.render("admin-home"); // Remove the leading slash
 });

 router.get("/admin-register", (req, res) => {
   res.render("admin-register"); // Remove the leading slash
});

 router.get("/user-verification", (req, res) => {
  res.render("user-verification"); // Remove the leading slash
});

router.get("/register-employee", (req, res) => {
   res.render("register-employee"); // Remove the leading slash
 });











module.exports = router;