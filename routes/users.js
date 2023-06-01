const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const authorization = require('../middleware/authorization');
const profileAuth = require('../middleware/profileAuth');

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
    const refresh_expires_in = !req.body.refreshExpiresInSeconds ? 86400 : req.body.refreshExpiresInSeconds; // 1 day or whats specified
    const refresh_exp = Math.floor(Date.now() / 1000) + refresh_expires_in;
    const refresh_token = jwt.sign({ email, refresh_exp }, JWT_SECRET);
    const refresh = {
      token: refresh_token,
      token_type: "Refresh",
      expires_in: refresh_expires_in
    }

    await req.db.from("users")
      .where("email", "=", email)
      .update({
        bearer: bearer_token,
        refresh: refresh_token
      });

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

router.get('/:email/profile', profileAuth, async function(req, res, next) {
  try {
    const email = req.params.email;
    let queryUsers;
  
    if (req.isAuthorised) {
      const user = req.user.email;
      if (email === user) {
        queryUsers = await req.db.from("users").select("email", "firstName", "lastName", "dob", "address").where("email", "=", email);
      } else {
        queryUsers = await req.db.from("users").select("email", "firstName", "lastName").where("email", "=", email);
      }
    } else {
      queryUsers = await req.db.from("users").select("email", "firstName", "lastName").where("email", "=", email);
    }
  
    if (queryUsers.length === 0) {
      throw { status: 404, message: "User does not exist" };
    }
  
    const user = queryUsers[0];
    res.status(200).send(user);
  } catch (error) {
    res.status(error.status).send({ error: true, message: error.message });
  }
});

router.put('/:email/profile', authorization, async function(req, res, next) {
  try{
    const email = req.params.email;

    if (email !== req.user.email) {throw { status: 403, message: "Forbidden" };}

    if (!req.body.firstName || !req.body.lastName || !req.body.dob || !req.body.address) { throw { status: 400, message: "Request body incomplete: firstName, lastName, dob and address are required." }; }

    const {firstName, lastName, dob, address} = req.body

    if (typeof firstName !== 'string' || typeof lastName !== 'string' || typeof address !== 'string') { throw { status: 400, message: "Request body invalid: firstName, lastName and address must be strings only." }; }

    const dateFormat = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFormat.test(dob)) { throw { status: 400, message: "Invalid input: dob must be a real date in format YYYY-MM-DD." }; }

    const parsedDate = new Date(dob);
    if (isNaN(parsedDate)){ throw { status: 400, message: "Invalid input: dob must be a real date in format YYYY-MM-DD." }; }

    const currentDate = new Date();
    if (currentDate < parsedDate) { throw { status: 400, message: "Invalid input, dob must be a date in the past." }; }

    const rolloverCheckDate = new Date(year, month - 1, day);
    if (rolloverCheckDate.getFullYear() === dob){}

    const queryUsers = await req.db.from("users")
      .update({
        firstName: firstName,
        lastName: lastName,
        dob: dob,
        address: address
      })
      .where("email", "=", email);

    queryUsers
    console.log({
      email:email,
      firstName: firstName,
      lastName: lastName,
      dob: dob,
      address: address
    })

    res.status(200).send({
      email:email,
      firstName: firstName,
      lastName: lastName,
      dob: dob,
      address: address
    })


  } catch (error) {
    console.log(error)
    res.status(error.status).send({ error: true, message: error.message });
  }
  
});

router.post('/refresh', function(req, res, next) {
  try{
    if (!(req.body.refreshToken)){ throw {status: 400, message: "Request body incomplete - refresh token required"}}
    const oldRefreshToken = req.body.refreshToken
    console.log(oldRefreshToken);

    // Create and return JWT token
    const bearer_expires_in = 600; // 10 minutes
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

//router.post('/logout', function(req, res, next) {});


module.exports = router;
