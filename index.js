const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.DB_PATH;


//-------- middleware Start -----------//
app.use(cors());
app.use(express.json());
// JWT token verify for all user access Middleware
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ status: 'error', message: 'Unauthorized Access' });
    }
    // Bearer token cut from header
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).send({ status: 'error', message: 'Unauthorized Access' });
        }
        req.user = user;
        next();
    })
}
//-------- middleware End -----------//

// app Home page
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

        const userCollection = client.db("bistroDb").collection("user");
        const menuCollection = client.db("bistroDb").collection("menu");
        const reviewsCollection = client.db("bistroDb").collection("reviews");
        const cartCollection = client.db("bistroDb").collection("carts");

        // JWT token Generate
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_SECRET_KEY, { expiresIn: "1h" });
            res.send({ token });
        })
        // JWT token verify for admin access
        const verifyAdmin = async (req, res, next) => {
            const email = req.user.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ status: 'error', message: 'Forbiden Access' });
            }
            next();

        }

        // Get All the menu
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find({}).toArray();
            res.send(result);
        })
        // Add new item to menu
        app.post('/menu', verifyJWT, verifyAdmin, async (req, res) => {
            const item = req.body;
            const result = await menuCollection.insertOne(item);
            res.json(result);
        })
        // delete item from menu
        app.delete('/menu/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await menuCollection.deleteOne(query);
            res.json(result);
        })

        // ---------------------User Collection api----------------
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })
        // input user data to database
        app.post('/users', async (req, res) => {
            const user = req.body;
            const exixtingUser = await userCollection.findOne({ email: user.email });
            if (exixtingUser) {
                return res.send({ status: 'error', message: 'User already exists' });
            }
            const result = await userCollection.insertOne(user);
            res.json(result);
        })
        //-----------------------Admin api---------------------
        // find user is admin or not
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (email !== req.user.email) {
                return res.status(403).send({ status: 'error', message: 'Forbiden Access' });
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const result = { admin: user?.role === 'admin' };
            res.send(result);
        })
        // add admin role
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
        // ---------------Admin api end------------------
        // delete user
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.json(result);
        })
        // ---------------------User Collection api end----------------

        // Get All the reviews
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find({}).toArray();
            res.send(result);
        })

        // ---------Cart Colection-------------//
        // Get All the carts
        app.get('/carts', verifyJWT, async (req, res) => {
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
        // add to cart
        app.post('/carts', async (req, res) => {
            const item = req.body;
            const result = await cartCollection.insertOne(item);
            res.json(result);
        })
        // delete from cart
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.json(result);
        })
        // ---------Cart Colection End-------------//

        // Payment Intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: price * 100,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (err) {
        console.log(err);
    }
}
run().catch(console.dir);


app.listen(port, () => console.log(`app listening on port ${port}!`))