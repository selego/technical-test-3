const express = require("express");
const ExcelJS = require('exceljs');
const passport = require("passport");
const router = express.Router();

const UserObject = require("../models/user");
const AuthObject = require("../auth");

const { validatePassword } = require("../utils");

const UserAuth = new AuthObject(UserObject);

const SERVER_ERROR = "SERVER_ERROR";
const USER_ALREADY_REGISTERED = "USER_ALREADY_REGISTERED";
const PASSWORD_NOT_VALIDATED = "PASSWORD_NOT_VALIDATED";

router.post("/signin", (req, res) => UserAuth.signin(req, res));
router.post("/logout", (req, res) => UserAuth.logout(req, res));
router.post("/signup", (req, res) => UserAuth.signup(req, res));

router.get("/signin_token", passport.authenticate("user", { session: false }), (req, res) => UserAuth.signinToken(req, res));

router.get("/available", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const users = await UserObject.find({ availability: { $ne: "not available" }, organisation: req.user.organisation }).sort("-last_login_at");

    return res.status(200).send({ ok: true, data: users });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.get("/print_users", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const users = await UserObject.find({ ...req.query, organisation: req.user.organisation }).sort("-last_login_at");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 25},
      { header: 'Email', key: 'email', width: 25},
      { header: 'Status', key: 'status', width: 25},
      { header: 'Job title', key: 'job_title', width: 25},
      { header: 'Days worked', key: 'days_worked', width: 25},
      { header: 'Cost per day', key: 'cost_per_day', width: 25},
      { header: 'Sell per day', key: 'sell_per_day', width: 25}
    ];
    users.forEach(user => {
      worksheet.addRow({
        name: user.name,
        email: user.email,
        status: user.status,
        job_title: user.job_title,
        days_worked: user.days_worked,
        cost_per_day: user.costPerDay,
        sell_per_day: user.sellPerDay
      });
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=users.xlsx");
    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.get("/:id", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const data = await UserObject.findOne({ _id: req.params.id });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.post("/", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    if (!validatePassword(req.body.password)) return res.status(400).send({ ok: false, user: null, code: PASSWORD_NOT_VALIDATED });

    const user = await UserObject.create({ ...req.body, organisation: req.user.organisation });

    return res.status(200).send({ data: user, ok: true });
  } catch (error) {
    if (error.code === 11000) return res.status(409).send({ ok: false, code: USER_ALREADY_REGISTERED });
    console.log(error);
    return res.status(500).send({ ok: false, code: SERVER_ERROR });
  }
});

router.get("/", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const users = await UserObject.find({ ...req.query, organisation: req.user.organisation }).sort("-last_login_at");
    return res.status(200).send({ ok: true, data: users });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.put("/:id", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const obj = req.body;

    const user = await UserObject.findByIdAndUpdate(req.params.id, obj, { new: true });
    res.status(200).send({ ok: true, user });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.put("/", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const obj = req.body;
    const data = await UserObject.findByIdAndUpdate(req.user._id, obj, { new: true });
    res.status(200).send({ ok: true, data });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.delete("/:id", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    await UserObject.findOneAndRemove({ _id: req.params.id });
    res.status(200).send({ ok: true });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

module.exports = router;
