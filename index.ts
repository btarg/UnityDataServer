const express = require('express')
const bodyParser = require('body-parser')
const { init, insertPost, getPost, removeItem, getPostsInRange } = require('./db')
const Joi = require('joi');
require("dotenv").config();

const app = express()
app.use(bodyParser.json())

const { auth, requiresAuth } = require('express-openid-connect');

const config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.SECRET,
    baseURL: 'http://localhost:3000',
    clientID: process.env.CLIENT_ID,
    issuerBaseURL: 'https://dev-psfdse0phh3q85qw.uk.auth0.com'
};

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));


const itemSchema = Joi.object().keys({
    textBody: Joi.string(),
    image: Joi.string(),
    location: Joi.array().items(Joi.number()),
    timestamp: Joi.number(),
    authorName: Joi.string(),
    authorPic: Joi.string(),

})

init().then(() => {
    console.log('starting server on port 3000')
    app.listen(3000)
})

app.post('/post', requiresAuth(), async (req, res) => {
    let item = req.body
    const result = itemSchema.validate(item)

    if (result.error) {
        console.log(result.error)
        res.status(400).end()
        return
    }

    // add author details from oauth provider
    item["authorName"] = req.oidc.user["name"]
    item["authorPic"] = req.oidc.user["picture"]

    // get lat and long
    const long = item.location[0]
    const lat = item.location[1]
    

    var tooClose

    try {
        tooClose = getPostsInRange(long, lat, (0.02 / 111.12)) // 2m, social distance
    } catch (error) {
        res.status(500).send("CANNOT_GET_POSTS").end()
        return
    }
    

    await tooClose.forEach(post => {
        
        // Check the last post's timestamp and overwrite the closest post if its a new day
        var datePosted = new Date(post["timestamp"] * 1000)
        var today = new Date()

        if (datePosted.getDay() != today.getDay()) {
            removeItem(post["_id"])
                .then(() => {

                    console.log("It's a new day, we can post!")
                    insertPost(item)
                        .then(() => {
                            res.status(200).send("POST_SUCCESS_OVERWRITE").end()
                        })
                        .catch((err) => {
                            console.log(err)
                            res.status(500).end()
                        })

                })
        } else {
            res.status(420).send("NOT_TODAY").end()
        }
        
    })

// nothing posted here yet!
    insertPost(item)
        .then(() => {
            res.status(200).send("POST_SUCCESS").end()
        })
        .catch((err) => {
            console.log(err)
            res.status(500).end()
        })

})

app.put('/remove/:id', requiresAuth(), (req, res) => {
    const { id } = req.params

    removeItem(id)
        .then(() => {
            res.status(200).send("REMOVE_SUCCESS").end()
        })
        .catch((err) => {
            console.log(err)
            res.status(500).end()
        })
})

app.get('/getposts/:lat/:long', requiresAuth(), async (req, res) => {

    const { lat, long } = req.params
    var docs = new Array();

    var posts
    try {
        posts = getPostsInRange(long, lat, (0.12 / 111.12))
    } catch (error) {
        res.status(500).send("CANNOT_GET_POSTS").end()
        return
    }
    

    await posts.forEach(doc => {
        if (doc !== undefined) {
            docs.push(JSON.stringify(doc));
        }
        
    })
    var postsJSON = {
        posts: docs
    }
    res.send(postsJSON)


})

// req.isAuthenticated is provided from the auth router
app.get('/', (req, res) => {

    if (req.oidc.isAuthenticated()) {

        res.send(`Welcome back, ${req.oidc.user["name"]}<br><img src="${req.oidc.user['picture']}" />`)

    } else {
        res.redirect('/login');
    }
});

