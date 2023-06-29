const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const cartCollection = client.db("bistroDb").collection("carts");

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

        // ---------Cart Colection-------------//

        // Get All the carts
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            if (!email) { res.send([]) }
            else {
                const query = { userEmail: email };
                const result = await cartCollection.find(query).toArray();
                res.send(result);
            }
        })

        app.post('/carts', async (req, res) => {
            const item = req.body;
            const result = await cartCollection.insertOne(item);
            res.json(result);
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.json(result);
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