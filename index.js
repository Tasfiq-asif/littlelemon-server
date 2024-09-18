const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const dayjs = require('dayjs');
const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const port = process.env.PORT || 8000 ;


const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

var jwt = require('jsonwebtoken');
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.onhj8vc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//availble times slots

const availableTimes = [
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
  "10:00 PM",
];

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    //DBcollections

    const reservationCollection = client.db('LittleLemon').collection('reservations')
    const usersCollection = client.db('LittleLemon').collection('users')
    const menuCollection = client.db('LittleLemon').collection('menu')
    const orderCollection = client.db('LittleLemon').collection('order')



    app.post('/reservation',async(req,res)=>{
        const {userId,name,email,phone,date,time,guest} =req.body;

        let bookinguserId;

        if(!userId){
            bookinguserId = uuidv4();
        }else{
            bookinguserId=userId
        }

        //create a new booking

        const newBooking={
            userId:bookinguserId,
            name,
            email,
            phone,
            date,
            time,
            guest,
            status:'pending'
        }
        const result = await reservationCollection.insertOne(newBooking)

        res.status(201).json({
            message:"Reservation was successfully created",
            bookingId:result.insertedId,
            userId:bookinguserId
        })

    })

    app.get('/available-slots', async (req, res) => {
        const today =dayjs()
        const twoWeeksLater = today.add(8,"week")

        //find  existing reservations for next 2 weeks

        const reservations = await reservationCollection.find({
            date:{
                $gte:today.format('YYYY-MM-DD'),
                $lte:twoWeeksLater.format('YYYY-MM-DD')
            }
        }).toArray()

        //generate all dates for next 2 weeks
        const availableDates = []
        for(let i=0; i<56; i++) {
            const date = today.add(i,'day').format('YYYY-MM-DD')
            const reservedSlots = reservations.filter(
                res => res.date === date
            ).map(res=>res.time)

            //check available slots
            const availableSlotsForDate = availableTimes.filter(
                time => !reservedSlots.includes(time))
            if  (availableSlotsForDate.length > 0 ) {
                availableDates.push({
                    date,
                    availableSlots: availableSlotsForDate
                })
            }
        }
        res.json(availableDates)

    })
  // ********************************Cart related API ********************************

  app.post('/confirm-order', async (req, res) => {
    const order = req.body
    const result = await orderCollection.insertOne(order)
    res.json(result)
  })

   // ********************************Admin dashboard related API ********************************

   app.post('/menuitem',async (req, res) => {
    const item = req.body
    const result =  await menuCollection.insertOne(item)
    res.send(result)
   })

   app.get('/menu',async (req, res) => {
      const items = await menuCollection.find().toArray()
      res.send(items)
   })

     //Route to delete a menu item
       //Route to delete a menu item
   app.delete('/deletereservation/:id', async function (req, res) {
    try {
      const {id} = req.params
      const result = await reservationCollection.deleteOne({_id: new ObjectId(id)})
      res.json(result)
    } catch (error) {
      console.log(error)
    }
   })

   //route to edit an existing item

   app.put('/edititem/:id', async (req, res) => {
    try {
      const {id} = req.params
      const updatedItem = req.body
      const result = await menuCollection.updateOne(
        {_id: new ObjectId(id)},
        {$set:updatedItem}
      )
      res.json(result)
    } catch (error) {
      console.log(error)
    }
   })

   //Route to delete a menu item
   app.delete('/deleteitem/:id', async function (req, res) {
    try {
      const id = req.params.id
      const result = await menuCollection.deleteOne({_id: new ObjectId(id)})
      res.json(result)
    } catch (error) {
      console.log(error)
    }
   })

   app.get('/reservation-request', async (req, res) => {
    const reservations =  await reservationCollection.find().toArray()
    res.send(reservations)
   })

   app.patch('/update-reservation-status', async (req, res) =>{
    const {_id,status} = req.body
    console.log(_id)
    const query ={_id: new ObjectId(_id)}
    const update ={$set:{status:status}}
    const result = await reservationCollection.updateOne(query,update)

    res.send(result)
   })

    // ******************************* JWT related API*******************************

    app.post('/jwt', async (req, res) =>{
      const email=req.body

      const token = jwt.sign(email,process.env.ACCESS_TOKEN_SECRET,{expiresIn:3600})

      res.send({success:true})
      res.cookie('token', token,{
        httpOnly: true,
        sameSite:false,
        secure:false
      })
    })


    // *******************************User related API*******************************

    app.post('/user', async (req, res) => {
      const user = req.body
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query)
      if (existingUser){
        return res.send({message: 'User already exists',insertedId:null})
      }

      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    app.get('/users',async (req, res) => {
      const users = await usersCollection.find().toArray()
      res.send(users)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})