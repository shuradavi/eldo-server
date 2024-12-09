const express = require("express");
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const cookieParser = require("cookie-parser");
const fs = require('fs')
const path = require('path');
const raw = fs.readFileSync(path.join(__dirname, 'goods.json'))
const goodsJson = JSON.parse(raw)
const app = express();

const PORT = 4002
const users = [];

const sessions = {};

const corsConfig = {
	origin: true,
	credentials: true,
}


app.use(express.json());
app.use(cookieParser());
app.use(cors(corsConfig));

const pick = (obj, props) => props.reduce((result, prop) => {
    result[prop] = obj[prop];
    return result;
  }, {});



const cookieMiddleware = (req, res, next) => {
	const sessionToken = req.cookies["my_app_token"];
	console.log('SESSION TOKEN => => =>: ', sessionToken);
	const currentUserSession = sessions[sessionToken]
	console.log('CURRENT USER SESSION => => =>: ', sessionToken);

	if (!sessionToken || !currentUserSession || currentUserSession.expiresAt < new Date()) {
    return res.status(401).send('Have no current session');
  }
  const user = users.find(
    (user) => user.id === currentUserSession.userId
  );
  req.user = user
  next()
}

app.get("/goods", (req, res) => {
  res.send(goodsJson.map((g) => pick(g, ['id', 'name', 'price', 'currency', 'category', 'hasDiscount', 'discountPercent', 'cashbackPercent', 'imgSource'])));
});

app.get("/goods/:id", (req, res) => {
  const findedGood = goodsJson.find((g) => g.id === req.params.id)
  if (!findedGood) {
    res.status(404).send('Not found')
  } else {
    res.send(findedGood)
  }
})

app.post('/saveOrder', cookieMiddleware, (req, res) => {
  res.send('Order saved!')
})

app.post("/signin", (req, res) => {
	const { login, password } = req.body
	console.log('/signin -> login: ', login, 'password: ', password);
  const existingUser = users.find((user) => login === user.login);

  if (!existingUser) {
    return res.status(404).send("User not found")
  }

  if (existingUser.password !== password) {
    return res.status(401).send("Wrong password")
  }

  const sessionToken = uuidv4();
  const expiresAt = new Date().setMinutes(new Date().getMinutes() + 1);

  sessions[sessionToken] = {
    expiresAt,
    userId: existingUser.id,
  };

  res.cookie("my_app_token", sessionToken, { maxAge: expiresAt });

  res.send(existingUser);
});

app.post("/signup", async (req, res, next) => {
	const { login, password } = req.body
	
  if (!login || !password) {
    return res.status(500).send("Empty login or password")
  }
  const findedUser = users.find((u) => u.login === login)
  if (findedUser) {
    return res.status(500).send("This login already exists")
  }
  const newUser = { login, password, id: uuidv4() }
  users.push(newUser)

  const sessionToken = uuidv4();
  const expiresAt = new Date().setMinutes(new Date().getMinutes() + 5);

  sessions[sessionToken] = {
    expiresAt,
    userId: newUser.id,
	};

	console.log('Session token: ', sessionToken);
	console.log('req Cookies: ', req.cookies);
	console.log('Signed Cookies: ', req.signedCookies)

  res.cookie("my_app_token", sessionToken, { maxAge: expiresAt });
  res.send(newUser);

})

app.get('/logout', cookieMiddleware, (req, res) => {
	const sessionToken = req.cookies["my_app_token"];
	
	if (sessions[sessionToken]) {
    	delete sessions[sessionToken]
    	res.send("OK")
  	} else {
    	res.status(404).send('session not found')
	}
})

app.listen(PORT, () => {
  console.log(`Cookie server listening on port ${PORT}`)
})
