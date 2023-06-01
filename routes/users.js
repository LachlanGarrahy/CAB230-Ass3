const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/register', function (req, res, next) {
  // Retrieve email and password from req.body
  const email = req.body.email;
  const password = req.body.password;

  // Verify body
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password needed"
    });
    return;
  }

  // Determine if user already exists in table
  const queryUsers = req.db.from("users").select("*").where("email", "=", email);
  queryUsers.then(users => {
    if (users.length > 0) {
      throw new Error("User already exists");
    }

    // Insert user into DB
    const saltRounds = 10;
    const hash = bcrypt.hashSync(password, saltRounds);
    return req.db.from("users").insert({ email, hash });
  })
  .then(() => {
    res.status(201).json({ success: true, message: "User created" });
  })
  .catch(e => {
    res.status(500).json({ success: false, message: e.message });
  });
});

router.post('/login', async function(req, res, next) {
  const email = req.body.email;
  const password = req.body.password;

  try{
    // Verify body
    if (!email || !password) { throw {status: 400, message: "Request body incomplete - email and password needed"}}
    const queryUsers = await req.db.from("users").select("*").where("email", "=", email);
    const users = queryUsers;
    if (users.length === 0){ throw {status: 401, message: "User does not exist"}}
    const user = users[0]
    const passwordOK = await bcrypt.compare(password, user.hash)
    if (!passwordOK) {throw {status: 401, message: "Passwords do not match"}}


    // Create and return JWT token
    const bearer_expires_in = !req.body.bearerExpiresInSeconds ? 600 : req.body.bearerExpiresInSeconds; // 10 minutes or whats specified
    const bearer_exp = Math.floor(Date.now() / 1000) + bearer_expires_in;
    const bearer_token = jwt.sign({ email, bearer_exp }, JWT_SECRET);
    const bearer = {
      token: bearer_token,
      token_type: "Bearer",
      expires_in: bearer_expires_in
    }
    const refresh_expires_in = 60*60*24; // 1 day
    const refresh_exp = Math.floor(Date.now() / 1000) + refresh_expires_in;
    const refresh_token = jwt.sign({ email, refresh_exp }, JWT_SECRET);
    const refresh = {
      token: refresh_token,
      token_type: "Refresh",
      expires_in: refresh_expires_in
    }
    res.status(200)
    res.send({
      bearerToken: bearer,
      refreshToken: refresh
    });
  } catch (error) {
    res.status(error.status)
    res.send({ error: true, message: error.message });
  }
});


module.exports = router;
