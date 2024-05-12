require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

const app = express();

// express middleware
const corsObj = {
    origin: [
        "http://localhost:5173",
        "*",
    ],
    credentials: true,
}
app.use(cors(corsObj));
app.use(express.json());
app.use(cookieParser());

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};


app.get("/", (req, res) => res.send("Server for assignment_11 is running ..."));
app.listen(port, () => console.log(`Sever running on port: ${port}`))


const uri = `mongodb+srv://${process.env.USER_KEY}:${process.env.PASS_KEY}@cluster0.s7sbkwf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// custom middleware=> verify token;
const verifyToken = async (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: "Unauthorized" })
    }
    jwt.verify(token, process.env.SECRET_KEY, (error, decoded) => {
        if (error) {
            return res.status(401).send({ message: "Unauthorized" })
        }
        req.user = decoded;
        next();

    })
}

async function run() {
    try {

        const databaseCollection_1 = client.db("assignment_11").collection("volunteer");
        const databaseCollection_2 = client.db("assignment_11").collection("becomeVolunteer");


        // creating jwt
        app.post("/jwt", async (req, res) => {
            const email = req.body;
            const token = jwt.sign(email, process.env.SECRET_KEY, {
                expiresIn: "2h"
            })
            res.cookie("token", token, cookieOptions).send({ message: "success" })
        });

        app.post("/logout", async (req, res) => {
            const userEmail = req.body;
            res.clearCookie("token", { maxAge: 0 }).send({ message: "success" })
        })

        // create post for volunteer

        app.post("/volunteer", async (req, res) => {
            const volunteerData = req.body;
            const result = await databaseCollection_1.insertOne(volunteerData);
            res.send(result);
        });

        app.get("/volunteer", async (req, res) => {

            const filter = req.query.find;
            const sort = req.query.sort;
            const pageNumber = parseInt(req.query.pageNo);
            const size = parseInt(req.query.size);
            let query = {};
            const regEx = { $regex: filter, $options: "i" };
            let options = {};
            if (sort) {
                options = {
                    sort: { deadLine: sort === "asc" ? 1 : -1 }
                }
            }

            if (filter) {
                query = { category: regEx }
            }
            const result = await databaseCollection_1.find(query, options).skip(pageNumber * size).limit(size).toArray();
            res.send(result);
        });

        app.get("/volunteerSecure", verifyToken, async (req, res) => {
            const email = req.query.email;
            const emailWithToken = req.user.email;
            if (email !== emailWithToken) {
                return res.status(403).send({ message: "forbidden" })
            }

            let query = {};
            if (email) {
                query = { organizationEmail: email };
            }
            const result = await databaseCollection_1.find(query).toArray();
            res.send(result)
        })
        app.get("/count", async (req, res) => {
            const query = req.query.filter;
            const regEx = { $regex: query, $options: "i" };
            let options = {};
            if (query) {
                options = { category: regEx }
            }
            const result = await databaseCollection_1.countDocuments(options);
            res.send({ count: result });
        })

        app.get("/volunteer/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await databaseCollection_1.findOne(query);
            res.send(result);
        });
        app.post("/becomeVolunteer", async (req, res) => {
            const id = req.query.id;
            const docs = req.body;
            const condition = [
                { $set: { numberOfVolunteer: { $toInt: "$numberOfVolunteer" } } },
                { $set: { numberOfVolunteer: { $subtract: ["$numberOfVolunteer", 1] } } }
            ]
            let filter = {};
            if (id) {
                filter = { _id: new ObjectId(id) }
            }
            await databaseCollection_1.findOneAndUpdate(filter, condition)

            const result = await databaseCollection_2.insertOne(docs);
            res.send(result);
        });

        app.get("/becomeVolunteer", verifyToken, async (req, res) => {
            const email = req?.query?.email;
            const emailWithToken = req?.user?.email;
            if (email !== emailWithToken) {
                return res.status(403).send({ message: "Forbidden" })
            }
            let query = {};
            if (email) {
                query = { volunteerEmail: email }
            }
            const result = await databaseCollection_2.find(query).toArray();
            res.send(result);
        })
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
