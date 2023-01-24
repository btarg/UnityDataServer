const { MongoClient, ObjectId } = require('mongodb')

const connectionUrl = 'mongodb://127.0.0.1:27017'
const dbName = 'store'

let db

const init = () =>
    MongoClient.connect(connectionUrl, { useNewUrlParser: true }).then((client) => {
        db = client.db(dbName)
        
    })

const insertPost = (item) => {
    const postCollection = db.collection('posts')
    postCollection.createIndex( { "createdAt": 1 }, { expireAfterSeconds: 259200 } ) // three days
    return postCollection.insertOne(item)

}

const removeItem = (id) => {
    const collection = db.collection('posts')
    return collection.deleteOne({ "_id": new ObjectId(id) });
}

const getPost = (id) => {
    const collection = db.collection('posts')
    return collection.find({ "_id": new ObjectId(id) })
}

const getPostsInRange = (lng, lat, md) => {

    try {
        // get all posts in range
        const postCollection = db.collection('posts')

        postCollection.createIndex({location:"2dsphere"});

        console.log("md:" + md);

        return postCollection.find({
        location: {
            $near: [parseFloat(lng), parseFloat(lat)],
            $maxDistance: parseFloat(md)
        }})

    } catch (error) {
        console.log(error)
    }
    

}



module.exports = { init, insertPost, removeItem, getPost, getPostsInRange }