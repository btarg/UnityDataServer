const { validateAccessToken } = require("../middleware/auth0.middleware.js");
const express = require('express');
const { insertPost, getPost, removeItem, getPostsInRange } = require('../db')

var postingRouter = express.Router();
const Joi = require('joi');

const Filter = require('bad-words');


const itemSchema = Joi.object().keys({
    textBody: Joi.string(),
    image: Joi.string(),
    location: Joi.array().items(Joi.number()),
    timestamp: Joi.number(),
    authorName: Joi.string(),
    authorPic: Joi.string(),

})

postingRouter.get('/test', validateAccessToken, async (req, res) => {
    res.status(200).send("Your token is valid");

})

postingRouter.post('/post', validateAccessToken, async (req, res) => {

    let item = req.body
    const result = itemSchema.validate(item)

    if (result.error) {
        console.log(result.error)
        res.status(400).end()
        return
    }

    // get lat and long
    const long = item.location[0]
    const lat = item.location[1]

    try {

        var tooClose = getPostsInRange(long, lat, (0.02 / 111.12)) // 2m, social distance

        tooClose.count(async function (err, count) {
            if (count > 0) {

                await tooClose.forEach(post => {
                    // Check the last post's timestamp and overwrite the closest post if its a new day
                    var datePosted = new Date(post["timestamp"] * 1000)
                    var today = new Date(req.body["timestamp"] * 1000)

                    if (datePosted.getDay() != today.getDay() && req.body["timestamp"] > post["timestamp"]) {

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
                        res.status(420).send("CANNOT_OVERWRITE_TODAY").end()

                    }
                })

            } else {
                // nothing posted here yet!
                insertPost(item)
                    .then(() => {
                        res.status(200).send("POST_SUCCESS").end()
                    })
                    .catch((err) => {
                        console.log(err)
                        res.status(500).end()
                    })
            }
        })



    } catch (error) {
        console.log(error)
        res.status(500).send("CANNOT_GET_POSTS").end()
        return
    }


})

postingRouter.get('/remove/:id', validateAccessToken, (req, res) => {
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

postingRouter.get('/viewpost/:id', validateAccessToken, async (req, res) => {
    const { id } = req.params
    var post

    try {
        post = getPost(id)
    } catch (error) {
        console.log(error)
        res.status(500).send("CANNOT_GET_POSTS").end()
        return
    }
    var docs = new Array()

    // i have no idea why we have to do a for loop here
    await post.forEach(doc => {
        if (doc !== undefined) {
            docs.push(JSON.stringify(doc));
        }

    })
    res.status(200).send(docs[0])

})

postingRouter.post('/getposts/:lat/:long', validateAccessToken, async (req, res) => {

    // swear filter
    var useFilter = false
    if (req.body.toString().length > 0) {
        useFilter = req.body.filter;
    }

    const { lat, long } = req.params

    var posts;
    try {
        posts = getPostsInRange(long, lat, (0.12 / 111.12))
    } catch (error) {
        res.status(500).send("CANNOT_GET_POSTS")
    }

    var docs = new Array();
    await posts.forEach(doc => {

        if (doc !== undefined) {

            var stringDoc = JSON.stringify(doc)

            if (useFilter) {
                filter = new Filter();
                stringDoc = filter.clean(stringDoc);
            }
            
            docs.push(stringDoc);

        }

    })


    res.status(200).send(docs)

})

module.exports = { postingRouter };