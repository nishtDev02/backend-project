import dotenv from "dotenv"
import connectDB from "./db/mongoDB.js"
import { app } from "./app.js"

dotenv.config({
    path: "./env",
})

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`App is listening on port http://localhost:${process.env.PORT || 8000}`)
    })
})
.catch((err) => {
    console.log("MONGO DB connection failed ", err)
})


















/*
Method one: Mongodb connection


import express from "express"
const app = express()

( async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
        app.on("error", (error) => {
            console.log("ERR: ", error)
            throw error;
        }) 

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on http://localhost:${process.env.PORT}`)
        })
    } catch (error) {
        console.error("ERROR: ", error)
        throw error;
    }
})() //iife syntax
*/