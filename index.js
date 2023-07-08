const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.DB_PATH;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ status: 'error', message: 'Unauthorized Access' });
    }
    // Bearer token
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).send({ status: 'error', message: 'Unauthorized Access' });
        }
        req.user = user;
        next();
    })
}


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

        const verifyAdmin =async (req, res, next) => {
            const email = req.user.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ status: 'error', message: 'Forbiden Access' });
            }
            next();
            
        }

        const userCollection = client.db("bistroDb").collection("user");
        const menuCollection = client.db("bistroDb").collection("menu");
        const reviewsCollection = client.db("bistroDb").collection("reviews");
        const cartCollection = client.db("bistroDb").collection("carts");

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_SECRET_KEY, { expiresIn: "1h" });
            res.send({ token });
        })

        // Get All the menu
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find({}).toArray();
            res.send(result);
        })

        // User Collection api
        app.get('/users',verifyJWT,verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const exixtingUser = await userCollection.findOne({ email: user.email });
            if (exixtingUser) {
                return res.send({ status: 'error', message: 'User already exists' });
            }
            const result = await userCollection.insertOne(user);
            res.json(result);
        })

        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (email !== req.user.email) {
                return res.status(403).send({ status: 'error', message: 'Forbiden Access' });
            }    
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const result = {admin : user?.role === 'admin'};
            res.send(result);
            console.log(result);
        })


        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
        // delete user
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.json(result);
        })

        // Get All the reviews
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find({}).toArray();
            res.send(result);
        })

        // ---------Cart Colection-------------//

        // Get All the carts
        app.get('/carts',verifyJWT, async (req, res) => {
            const email = req.query.email;

            if (email !== req.user.email) {
                return res.status(403).send({ status: 'error', message: 'Forbiden Access' });
            }

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