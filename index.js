const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.DB_PATH;

// middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Boss is here!'))

// mongodb connection
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const menuCollection = client.db("bistroDb").collection("menu");
        const reviewsCollection = client.db("bistroDb").collection("reviews");

        // Get All the menu
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find({}).toArray();
            res.send(result);
        })

        // Get All the reviews
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find({}).toArray();
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (err) {
        console.log(err);
    }
}
run().catch(console.dir);


app.listen(port, () => console.log(`app listening on port ${port}!`))