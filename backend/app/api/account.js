const { Router } = require('express');
const { hash } = require('../account/helper');
const Session = require('../account/session');
const { setSession, authenticatedAccount } = require('./helper');
const AccountTable = require('../account/table');

const router = new Router();

router.post('/signup', (req, res, next) => {
  const { username, password } = req.body;

  const usernameHash = hash(username);
  const passwordHash = hash(password);

  AccountTable.getAccount({ usernameHash })
    .then(({ account }) => {
      if (!account) {
        return AccountTable.storeAccount({ usernameHash, passwordHash })
      } else {
        const error = new Error('This username has been taken');

        error.statusCode = 409;

        throw error;
      }
    })
    .then(() => {
      return setSession({ username, res });
    })
    .then(({ message }) => res.json({ message }))
    .catch(error => next(error));
});

router.post('/login', (req, res, next) => {
  const { username, password } = req.body;

  AccountTable.getAccount({ usernameHash: hash(username) })
    .then(({ account }) => {
      if (account && account.passwordHash === hash(password)) {
        const { sessionId } = account;

        return setSession({ username, res, sessionId });
      } else {
        const error = new Error('Incorrect username/password');

        error.statusCode = 409;

        throw error;
      }
    })
    .then(({ message }) => res.json({ message }))
    .catch(error => next(error));
});

router.get('/logout', (req, res, next) => {
  const { username } = Session.parse(req.cookies.sessionString);

  AccountTable.updateSessionId({
    sessionId: null,
    usernameHash: hash(username)
  }).then(() => {
      // removeSession({ res });
      res.clearCookie('sessionString');

      res.json({ message: 'Successful logout'});
    }).catch(error => next(error));
});

router.get('/authenticated', (req, res, next) => {
  authenticatedAccount({ sessionString: req.cookies.sessionString })
    .then(({ authenticated }) => {
      res.json({ authenticated });
    })
    .catch(error => next(error));
});

// router.get('/authenticated', (req, res, next) => {
//   const { sessionString } = req.cookies;

//   if (!sessionString || Session.verify(sessionString)) {
//     const error = new Error('Invalid session');

//     error.statusCode = 400;

//     return next(error);
//   }

//   const { username, id } = Session.parse(sessionString);

//   AccountTable.getAccount({ usernameHash: hash(username) })
//     .then(({ account }) => {
//       const authenticated = account.sessionId === id;

//       // if authenticated is false, account should be undefined anyway
//       res.json({ authenticated });
//     })
//     .catch(error => next(error));
// });

module.exports = router;
